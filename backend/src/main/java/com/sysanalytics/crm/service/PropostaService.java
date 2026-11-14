package com.sysanalytics.crm.service;

import com.sysanalytics.crm.domain.*;
import com.sysanalytics.crm.repository.*;
import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.web.dto.PropostaDtos;
import com.sysanalytics.crm.web.dto.PropostaDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Propostas comerciais. O acesso segue a oportunidade: vendedor só trabalha nas propostas das suas
 * oportunidades; gestor/admin nas da empresa toda (fora do escopo, 404).
 */
@Service
@RequiredArgsConstructor
public class PropostaService {

    private static final BigDecimal CEM = BigDecimal.valueOf(100);

    /** Total das linhas calculado no SQL com a mesma regra do Java (arredonda cada linha a 2 casas). */
    private static final String RESUMOS = """
            SELECT p.id, p.status, p.validade_ate, p.criada_em, u.nome AS criada_por,
                   COALESCE(SUM(ROUND(i.quantidade * i.preco_unitario * (1 - i.desconto_percentual / 100.0), 2)), 0) AS total
              FROM proposta p
              JOIN usuario u ON u.id = p.criada_por_id
              LEFT JOIN proposta_item i ON i.proposta_id = p.id
             WHERE p.empresa_id = ? AND p.oportunidade_id = ?
             GROUP BY p.id, u.nome
             ORDER BY p.id DESC
            """;

    private final JdbcTemplate jdbcTemplate;
    private final PropostaRepository propostaRepository;
    private final PropostaItemRepository itemRepository;
    private final ProdutoRepository produtoRepository;
    private final OportunidadeRepository oportunidadeRepository;
    private final ClienteRepository clienteRepository;
    private final EmpresaRepository empresaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ContatoRepository contatoRepository;
    private final OportunidadeAcesso oportunidadeAcesso;

    @Transactional(readOnly = true)
    public List<PropostaResumo> listar(Long oportunidadeId) {
        UsuarioLogado u = UsuarioLogado.atual();
        oportunidadeAcesso.exigir(u, oportunidadeId);
        return jdbcTemplate.query(RESUMOS, (rs, i) -> new PropostaResumo(
                rs.getLong("id"),
                PropostaDtos.numero(rs.getLong("id")),
                StatusProposta.valueOf(rs.getString("status")),
                rs.getDate("validade_ate") == null ? null : rs.getDate("validade_ate").toLocalDate(),
                rs.getBigDecimal("total").setScale(2, RoundingMode.HALF_UP),
                rs.getString("criada_por"),
                rs.getObject("criada_em", OffsetDateTime.class)), u.empresaId(), oportunidadeId);
    }

    @Transactional(readOnly = true)
    public PropostaDetalhe obter(Long id) {
        UsuarioLogado u = UsuarioLogado.atual();
        return detalhe(u, propostaDoUsuario(u, id));
    }

    @Transactional
    public PropostaDetalhe criar(Long oportunidadeId, PropostaRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        Oportunidade o = oportunidadeAcesso.exigir(u, oportunidadeId);
        if (o.getEtapa().encerrada()) {
            throw new IllegalArgumentException("Não é possível criar proposta para uma oportunidade encerrada");
        }
        validarValidade(req.validadeAte());
        OffsetDateTime agora = OffsetDateTime.now();
        Proposta p = propostaRepository.save(Proposta.builder()
                .empresaId(u.empresaId())
                .oportunidadeId(oportunidadeId)
                .criadaPorId(u.usuarioId())
                .status(StatusProposta.RASCUNHO)
                .validadeAte(req.validadeAte())
                .condicoesPagamento(limpar(req.condicoesPagamento()))
                .observacoes(limpar(req.observacoes()))
                .criadaEm(agora)
                .atualizadaEm(agora)
                .build());
        salvarItens(u, p.getId(), req.itens());
        return detalhe(u, p);
    }

    @Transactional
    public PropostaDetalhe atualizar(Long id, PropostaRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        Proposta p = propostaDoUsuario(u, id);
        exigirStatus(p, StatusProposta.RASCUNHO, "Só é possível editar uma proposta em rascunho");
        validarValidade(req.validadeAte());
        p.setValidadeAte(req.validadeAte());
        p.setCondicoesPagamento(limpar(req.condicoesPagamento()));
        p.setObservacoes(limpar(req.observacoes()));
        p.setAtualizadaEm(OffsetDateTime.now());
        propostaRepository.save(p);
        itemRepository.apagarDaProposta(id); // limpa o contexto de persistência
        salvarItens(u, id, req.itens());
        return detalhe(u, propostaRepository.findByIdAndEmpresaId(id, u.empresaId()).orElseThrow());
    }

    @Transactional
    public PropostaDetalhe mudarStatus(Long id, StatusProposta novo) {
        UsuarioLogado u = UsuarioLogado.atual();
        Proposta p = propostaDoUsuario(u, id);
        if (!transicaoPermitida(p.getStatus(), novo)) {
            throw new IllegalArgumentException("Não é possível passar de %s para %s".formatted(p.getStatus(), novo));
        }
        if (novo == StatusProposta.ENVIADA) {
            List<PropostaItem> itens = itemRepository.findByPropostaIdOrderByIdAsc(id);
            if (itens.isEmpty()) {
                throw new IllegalArgumentException("Adicione ao menos um item antes de enviar a proposta");
            }
            sincronizarOportunidade(p, totais(itens).total());
        }
        p.setStatus(novo);
        p.setAtualizadaEm(OffsetDateTime.now());
        return detalhe(u, p);
    }

    @Transactional
    public void excluir(Long id) {
        UsuarioLogado u = UsuarioLogado.atual();
        Proposta p = propostaDoUsuario(u, id);
        exigirStatus(p, StatusProposta.RASCUNHO, "Só é possível excluir uma proposta em rascunho");
        propostaRepository.delete(p); // os itens saem por ON DELETE CASCADE
    }

    // ------------------------------------------------------------------

    /**
     * Ao enviar, a proposta passa a ser o valor da oportunidade e, se ela ainda estava antes da etapa
     * Proposta, avança para lá. Oportunidade já encerrada não é alterada.
     */
    private void sincronizarOportunidade(Proposta p, BigDecimal total) {
        Oportunidade o = oportunidadeRepository.findByIdAndEmpresaId(p.getOportunidadeId(), p.getEmpresaId())
                .orElseThrow(() -> new NoSuchElementException("Oportunidade não encontrada"));
        if (o.getEtapa().encerrada()) {
            return;
        }
        o.setValorEstimado(total);
        if (o.getEtapa() == EtapaOportunidade.PROSPECCAO || o.getEtapa() == EtapaOportunidade.QUALIFICACAO) {
            o.setEtapa(EtapaOportunidade.PROPOSTA);
            o.setProbabilidade(EtapaOportunidade.PROPOSTA.getProbabilidadePadrao());
        }
        o.setAtualizadaEm(OffsetDateTime.now());
    }

    private static boolean transicaoPermitida(StatusProposta de, StatusProposta para) {
        return switch (de) {
            case RASCUNHO -> para == StatusProposta.ENVIADA;
            case ENVIADA -> para == StatusProposta.ACEITA || para == StatusProposta.RECUSADA
                    || para == StatusProposta.RASCUNHO;
            default -> false; // ACEITA e RECUSADA são finais
        };
    }

    private void salvarItens(UsuarioLogado u, Long propostaId, List<ItemRequest> itens) {
        if (itens == null || itens.isEmpty()) {
            return;
        }
        List<PropostaItem> novos = new ArrayList<>();
        for (ItemRequest it : itens) {
            if (it.produtoId() != null) {
                produtoRepository.findByIdAndEmpresaId(it.produtoId(), u.empresaId())
                        .orElseThrow(() -> new IllegalArgumentException("Produto não encontrado: " + it.produtoId()));
            }
            novos.add(PropostaItem.builder()
                    .empresaId(u.empresaId())
                    .propostaId(propostaId)
                    .produtoId(it.produtoId())
                    .descricao(it.descricao().trim())
                    .unidade(it.unidade().trim().toUpperCase(java.util.Locale.ROOT))
                    .quantidade(it.quantidade())
                    .precoUnitario(it.precoUnitario())
                    .descontoPercentual(it.descontoPercentual() == null ? BigDecimal.ZERO : it.descontoPercentual())
                    .build());
        }
        itemRepository.saveAll(novos);
    }

    private Proposta propostaDoUsuario(UsuarioLogado u, Long id) {
        Proposta p = propostaRepository.findByIdAndEmpresaId(id, u.empresaId())
                .orElseThrow(() -> new NoSuchElementException("Proposta não encontrada: " + id));
        oportunidadeAcesso.exigir(u, p.getOportunidadeId()); // vendedor fora do escopo = 404
        return p;
    }

    private static void exigirStatus(Proposta p, StatusProposta esperado, String mensagem) {
        if (p.getStatus() != esperado) {
            throw new IllegalArgumentException(mensagem);
        }
    }

    private static void validarValidade(LocalDate validade) {
        if (validade != null && validade.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("A validade não pode estar no passado");
        }
    }

    private PropostaDetalhe detalhe(UsuarioLogado u, Proposta p) {
        Oportunidade o = oportunidadeRepository.findByIdAndEmpresaId(p.getOportunidadeId(), u.empresaId()).orElseThrow();
        Cliente c = clienteRepository.findByIdAndEmpresaId(o.getClienteId(), u.empresaId()).orElseThrow();
        String empresa = empresaRepository.findById(u.empresaId()).map(Empresa::getNome).orElse("");
        String elaboradaPor = usuarioRepository.findById(p.getCriadaPorId()).map(Usuario::getNome).orElse("");
        Contato contato = contatoRepository
                .findByEmpresaIdAndClienteIdAndAtivoTrueOrderByPrincipalDescNomeAsc(u.empresaId(), c.getId())
                .stream().findFirst().orElse(null);

        List<PropostaItem> itens = itemRepository.findByPropostaIdOrderByIdAsc(p.getId());
        Totais t = totais(itens);
        List<ItemResponse> linhas = itens.stream().map(i -> new ItemResponse(
                i.getId(), i.getProdutoId(), i.getDescricao(), i.getUnidade(), i.getQuantidade(),
                i.getPrecoUnitario(), i.getDescontoPercentual(), totalLinha(i))).toList();

        return new PropostaDetalhe(
                p.getId(), PropostaDtos.numero(p.getId()), p.getStatus(),
                o.getId(), o.getTitulo(),
                c.getId(), c.getNomeFantasia(), c.getRazaoSocial(), c.getCnpj(),
                contato == null ? null : contato.getNome(), contato == null ? null : contato.getEmail(),
                empresa, elaboradaPor,
                p.getValidadeAte(), p.getCondicoesPagamento(), p.getObservacoes(),
                linhas, t.subtotal(), t.desconto(), t.total(),
                p.getCriadaEm(), p.getAtualizadaEm());
    }

    private record Totais(BigDecimal subtotal, BigDecimal desconto, BigDecimal total) {
    }

    private static Totais totais(List<PropostaItem> itens) {
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;
        for (PropostaItem i : itens) {
            subtotal = subtotal.add(bruto(i));
            total = total.add(totalLinha(i));
        }
        subtotal = subtotal.setScale(2, RoundingMode.HALF_UP);
        total = total.setScale(2, RoundingMode.HALF_UP);
        return new Totais(subtotal, subtotal.subtract(total), total);
    }

    private static BigDecimal bruto(PropostaItem i) {
        return i.getQuantidade().multiply(i.getPrecoUnitario()).setScale(2, RoundingMode.HALF_UP);
    }

    /** quantidade x preço x (1 - desconto%), arredondado a 2 casas por linha. */
    private static BigDecimal totalLinha(PropostaItem i) {
        BigDecimal fator = BigDecimal.ONE.subtract(i.getDescontoPercentual().divide(CEM, 6, RoundingMode.HALF_UP));
        return i.getQuantidade().multiply(i.getPrecoUnitario()).multiply(fator).setScale(2, RoundingMode.HALF_UP);
    }

    private static String limpar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
