package com.sysanalytics.crm.service;

import com.sysanalytics.crm.domain.Interacao;
import com.sysanalytics.crm.domain.TipoInteracao;
import com.sysanalytics.crm.repository.ContatoRepository;
import com.sysanalytics.crm.repository.InteracaoRepository;
import com.sysanalytics.crm.repository.UsuarioRepository;
import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.web.dto.InteracaoDtos.InteracaoRequest;
import com.sysanalytics.crm.web.dto.InteracaoDtos.InteracaoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class InteracaoService {

    private static final String LISTAR = """
            SELECT i.id, i.tipo, i.data_hora, i.resumo, i.contato_id, ct.nome AS contato_nome,
                   i.usuario_id, u.nome AS usuario_nome
              FROM interacao i
              JOIN usuario u ON u.id = i.usuario_id
              LEFT JOIN contato ct ON ct.id = i.contato_id
             WHERE i.empresa_id = ? AND i.cliente_id = ?
             ORDER BY i.data_hora DESC, i.id DESC
             LIMIT 50
            """;

    private final JdbcTemplate jdbcTemplate;
    private final InteracaoRepository interacaoRepository;
    private final ContatoRepository contatoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ClienteAcesso clienteAcesso;

    @Transactional(readOnly = true)
    public List<InteracaoResponse> listar(Long clienteId) {
        UsuarioLogado u = UsuarioLogado.atual();
        clienteAcesso.exigir(u, clienteId);
        return jdbcTemplate.query(LISTAR, (rs, i) -> new InteracaoResponse(
                rs.getLong("id"),
                TipoInteracao.valueOf(rs.getString("tipo")),
                rs.getObject("data_hora", OffsetDateTime.class),
                rs.getString("resumo"),
                (Long) rs.getObject("contato_id"),
                rs.getString("contato_nome"),
                rs.getLong("usuario_id"),
                rs.getString("usuario_nome")), u.empresaId(), clienteId);
    }

    @Transactional
    public InteracaoResponse registrar(Long clienteId, InteracaoRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        clienteAcesso.exigir(u, clienteId);
        return salvar(u, clienteId, req.tipo(), req.dataHora(), req.resumo(), req.contatoId());
    }

    /** Também usado ao concluir uma tarefa com resumo. O acesso ao cliente já foi validado por quem chama. */
    @Transactional
    public InteracaoResponse salvar(UsuarioLogado u, Long clienteId, TipoInteracao tipo,
                                    OffsetDateTime dataHora, String resumo, Long contatoId) {
        String contatoNome = null;
        if (contatoId != null) {
            var contato = contatoRepository
                    .findByIdAndEmpresaIdAndClienteIdAndAtivoTrue(contatoId, u.empresaId(), clienteId)
                    .orElseThrow(() -> new IllegalArgumentException("Contato não pertence a este cliente"));
            contatoNome = contato.getNome();
        }
        OffsetDateTime agora = OffsetDateTime.now();
        Interacao salva = interacaoRepository.save(Interacao.builder()
                .empresaId(u.empresaId())
                .clienteId(clienteId)
                .contatoId(contatoId)
                .usuarioId(u.usuarioId())
                .tipo(tipo)
                .dataHora(dataHora != null ? dataHora : agora)
                .resumo(resumo.trim())
                .criadoEm(agora)
                .build());
        String usuarioNome = usuarioRepository.findById(u.usuarioId())
                .map(x -> x.getNome()).orElseThrow(() -> new NoSuchElementException("Usuário não encontrado"));
        return new InteracaoResponse(salva.getId(), salva.getTipo(), salva.getDataHora(), salva.getResumo(),
                contatoId, contatoNome, u.usuarioId(), usuarioNome);
    }
}
