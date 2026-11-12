package com.sysanalytics.crm.service;

import com.sysanalytics.crm.domain.*;
import com.sysanalytics.crm.repository.NotificacaoAlertaRepository;
import com.sysanalytics.crm.repository.TarefaRepository;
import com.sysanalytics.crm.repository.UsuarioRepository;
import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.web.dto.TarefaDtos.ConcluirRequest;
import com.sysanalytics.crm.web.dto.TarefaDtos.TarefaRequest;
import com.sysanalytics.crm.web.dto.TarefaDtos.TarefaResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Tarefas do time comercial. Vendedor enxerga e altera só as tarefas em que é responsável;
 * gestor e admin enxergam as da empresa toda. Tarefa de outra pessoa/empresa responde 404.
 */
@Service
@RequiredArgsConstructor
public class TarefaService {

    private static final String SELECT = """
            SELECT t.id, t.cliente_id, c.nome_fantasia AS cliente_nome,
                   t.responsavel_id, u.nome AS responsavel_nome,
                   t.titulo, t.descricao, t.prazo, t.status, t.origem, t.resultado,
                   t.concluida_em, t.criada_em
              FROM tarefa t
              JOIN cliente c ON c.id = t.cliente_id
              JOIN usuario u ON u.id = t.responsavel_id
            """;

    /** Parâmetros: empresa_id, status, responsavel (ou NULL) x2, cliente (ou NULL) x2. */
    private static final String LISTAR = SELECT + """
             WHERE t.empresa_id = ?
               AND t.status = ?
               AND (CAST(? AS bigint) IS NULL OR t.responsavel_id = CAST(? AS bigint))
               AND (CAST(? AS bigint) IS NULL OR t.cliente_id = CAST(? AS bigint))
             ORDER BY CASE WHEN t.status = 'ABERTA' THEN t.prazo END ASC,
                      t.concluida_em DESC NULLS LAST, t.id DESC
             LIMIT 200
            """;

    /** Parâmetros: empresa_id, id. */
    private static final String POR_ID = SELECT + " WHERE t.empresa_id = ? AND t.id = ?";

    private static final RowMapper<TarefaResponse> MAPPER = (rs, i) -> {
        StatusTarefa status = StatusTarefa.valueOf(rs.getString("status"));
        LocalDate prazo = rs.getDate("prazo").toLocalDate();
        String resultado = rs.getString("resultado");
        return new TarefaResponse(
                rs.getLong("id"),
                rs.getLong("cliente_id"),
                rs.getString("cliente_nome"),
                rs.getLong("responsavel_id"),
                rs.getString("responsavel_nome"),
                rs.getString("titulo"),
                rs.getString("descricao"),
                prazo,
                status,
                OrigemTarefa.valueOf(rs.getString("origem")),
                resultado == null ? null : ResultadoTarefa.valueOf(resultado),
                status == StatusTarefa.ABERTA && prazo.isBefore(LocalDate.now()),
                rs.getObject("concluida_em", OffsetDateTime.class),
                rs.getObject("criada_em", OffsetDateTime.class));
    };

    private final JdbcTemplate jdbcTemplate;
    private final TarefaRepository tarefaRepository;
    private final UsuarioRepository usuarioRepository;
    private final NotificacaoAlertaRepository notificacaoRepository;
    private final ClienteAcesso clienteAcesso;
    private final InteracaoService interacaoService;

    @Transactional(readOnly = true)
    public List<TarefaResponse> listar(StatusTarefa status, boolean somenteMinhas, Long clienteId) {
        UsuarioLogado u = UsuarioLogado.atual();
        // vendedor sempre vê só as próprias; gestor/admin podem escolher
        Long responsavel = (u.restritoAoVendedor() || somenteMinhas) ? u.usuarioId() : null;
        return jdbcTemplate.query(LISTAR, MAPPER, u.empresaId(), status.name(),
                responsavel, responsavel, clienteId, clienteId);
    }

    @Transactional
    public TarefaResponse criar(TarefaRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        clienteAcesso.exigir(u, req.clienteId());
        if (req.prazo().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("O prazo não pode estar no passado");
        }
        Long responsavelId = resolverResponsavel(u, req.responsavelId());
        Tarefa tarefa = tarefaRepository.save(Tarefa.builder()
                .empresaId(u.empresaId())
                .clienteId(req.clienteId())
                .responsavelId(responsavelId)
                .criadaPorId(u.usuarioId())
                .titulo(req.titulo().trim())
                .descricao(req.descricao() == null || req.descricao().isBlank() ? null : req.descricao().trim())
                .prazo(req.prazo())
                .status(StatusTarefa.ABERTA)
                .origem(OrigemTarefa.MANUAL)
                .criadaEm(OffsetDateTime.now())
                .build());
        return resposta(u.empresaId(), tarefa.getId());
    }

    @Transactional
    public TarefaResponse concluir(Long id, ConcluirRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        Tarefa tarefa = abertaDoUsuario(u, id);
        tarefa.setStatus(StatusTarefa.CONCLUIDA);
        tarefa.setResultado(req.resultado());
        tarefa.setConcluidaEm(OffsetDateTime.now());

        if (req.resumo() != null && !req.resumo().isBlank()) {
            interacaoService.salvar(u, tarefa.getClienteId(),
                    req.tipoInteracao() != null ? req.tipoInteracao() : TipoInteracao.OUTRO,
                    null, req.resumo(), null);
        }
        tarefaRepository.flush();
        return resposta(u.empresaId(), id);
    }

    @Transactional
    public TarefaResponse cancelar(Long id) {
        UsuarioLogado u = UsuarioLogado.atual();
        Tarefa tarefa = abertaDoUsuario(u, id);
        tarefa.setStatus(StatusTarefa.CANCELADA);
        tarefa.setConcluidaEm(OffsetDateTime.now());
        tarefaRepository.flush();
        return resposta(u.empresaId(), id);
    }

    /**
     * Transforma um alerta de churn em tarefa. Idempotente: se o alerta já gerou tarefa, devolve a mesma.
     * O alerta é marcado como lido. A tarefa vai para o usuário do vendedor da carteira (ou para quem clicou,
     * quando esse vendedor não tem login).
     */
    @Transactional
    public TarefaResponse criarDeAlerta(Long notificacaoId) {
        UsuarioLogado u = UsuarioLogado.atual();
        var existente = tarefaRepository.findByEmpresaIdAndNotificacaoId(u.empresaId(), notificacaoId);
        NotificacaoAlerta alerta = notificacaoRepository.findByIdAndEmpresaId(notificacaoId, u.empresaId())
                .filter(a -> !u.restritoAoVendedor() || u.vendedorIdEscopo().equals(a.getVendedorId()))
                .orElseThrow(() -> new NoSuchElementException("Notificação não encontrada: " + notificacaoId));
        if (existente.isPresent()) {
            return resposta(u.empresaId(), existente.get().getId());
        }
        Cliente cliente = clienteAcesso.exigir(u, alerta.getClienteId());

        Long responsavelId = u.usuarioId();
        if (!u.restritoAoVendedor() && alerta.getVendedorId() != null) {
            responsavelId = usuarioRepository
                    .findFirstByEmpresaIdAndVendedorIdAndAtivoTrue(u.empresaId(), alerta.getVendedorId())
                    .map(Usuario::getId).orElse(u.usuarioId());
        }
        int prazoDias = switch (alerta.getNivel()) {
            case CRITICO -> 1;
            case ATENCAO -> 3;
            default -> 7;
        };
        String titulo = alerta.getDiasInatividade() == null
                ? "Reativar %s (sem faturamento registrado)".formatted(cliente.getNomeFantasia())
                : "Reativar %s (%d dias sem faturar)".formatted(cliente.getNomeFantasia(), alerta.getDiasInatividade());

        Tarefa tarefa = tarefaRepository.save(Tarefa.builder()
                .empresaId(u.empresaId())
                .clienteId(cliente.getId())
                .responsavelId(responsavelId)
                .criadaPorId(u.usuarioId())
                .titulo(titulo.length() > 160 ? titulo.substring(0, 160) : titulo)
                .descricao(alerta.getMensagem())
                .prazo(LocalDate.now().plusDays(prazoDias))
                .status(StatusTarefa.ABERTA)
                .origem(OrigemTarefa.ALERTA)
                .notificacaoId(notificacaoId)
                .criadaEm(OffsetDateTime.now())
                .build());
        alerta.setLida(true);
        return resposta(u.empresaId(), tarefa.getId());
    }

    // ------------------------------------------------------------------

    private Long resolverResponsavel(UsuarioLogado u, Long pedido) {
        if (pedido == null || pedido.equals(u.usuarioId())) {
            return u.usuarioId();
        }
        if (u.restritoAoVendedor()) {
            throw new IllegalArgumentException("Vendedor só pode criar tarefas para si mesmo");
        }
        return usuarioRepository.findByIdAndEmpresaIdAndAtivoTrue(pedido, u.empresaId())
                .map(Usuario::getId)
                .orElseThrow(() -> new IllegalArgumentException("Responsável não encontrado nesta empresa"));
    }

    private Tarefa abertaDoUsuario(UsuarioLogado u, Long id) {
        Tarefa tarefa = tarefaRepository.findByIdAndEmpresaId(id, u.empresaId())
                .filter(t -> !u.restritoAoVendedor() || t.getResponsavelId().equals(u.usuarioId()))
                .orElseThrow(() -> new NoSuchElementException("Tarefa não encontrada: " + id));
        if (tarefa.getStatus() != StatusTarefa.ABERTA) {
            throw new IllegalArgumentException("A tarefa já foi encerrada (" + tarefa.getStatus() + ")");
        }
        return tarefa;
    }

    private TarefaResponse resposta(Long empresaId, Long id) {
        return jdbcTemplate.query(POR_ID, MAPPER, empresaId, id).stream().findFirst()
                .orElseThrow(() -> new NoSuchElementException("Tarefa não encontrada: " + id));
    }
}
