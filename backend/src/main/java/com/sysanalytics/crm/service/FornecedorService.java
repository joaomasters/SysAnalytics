package com.sysanalytics.crm.service;

import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.web.dto.PagarDtos.FornecedorRequest;
import com.sysanalytics.crm.web.dto.PagarDtos.FornecedorResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;

/** Cadastro de fornecedores (gestor/admin). Inativar preserva o histórico de contas. */
@Service
@RequiredArgsConstructor
public class FornecedorService {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    private static final String SELECT = """
            SELECT f.id, f.nome, f.documento, f.contato, f.email, f.telefone, f.ativo,
                   COALESCE(SUM(c.valor - c.valor_pago) FILTER (WHERE c.status IN ('ABERTO', 'PARCIAL')), 0) AS aberto,
                   COALESCE(SUM(c.valor - c.valor_pago) FILTER (WHERE c.status IN ('ABERTO', 'PARCIAL')
                                                                  AND c.data_vencimento < ?), 0) AS vencido
              FROM fornecedor f
              LEFT JOIN conta_pagar c ON c.fornecedor_id = f.id
            """;

    private final JdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public List<FornecedorResponse> listar(String busca, boolean incluirInativos) {
        UsuarioLogado u = UsuarioLogado.atual();
        String termo = "%" + (busca == null ? "" : busca.trim().toLowerCase(Locale.ROOT)) + "%";
        return jdbc.query(SELECT + """
                         WHERE f.empresa_id = ? AND (? OR f.ativo)
                           AND (LOWER(f.nome) LIKE ? OR LOWER(COALESCE(f.documento, '')) LIKE ?)
                         GROUP BY f.id ORDER BY f.nome
                        """,
                (rs, i) -> mapear(rs), java.sql.Date.valueOf(LocalDate.now(FUSO)), u.empresaId(), incluirInativos, termo, termo);
    }

    @Transactional
    public FornecedorResponse criar(FornecedorRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        String documento = limpar(req.documento());
        exigirDocumentoLivre(u.empresaId(), documento, null);
        Long id = jdbc.queryForObject("""
                        INSERT INTO fornecedor (empresa_id, nome, documento, contato, email, telefone, ativo)
                        VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
                        """, Long.class,
                u.empresaId(), req.nome().trim(), documento, limpar(req.contato()), limpar(req.email()),
                limpar(req.telefone()), req.ativo() == null || req.ativo());
        return obter(u.empresaId(), id);
    }

    @Transactional
    public FornecedorResponse atualizar(Long id, FornecedorRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        String documento = limpar(req.documento());
        exigirDocumentoLivre(u.empresaId(), documento, id);
        int n = jdbc.update("""
                        UPDATE fornecedor SET nome = ?, documento = ?, contato = ?, email = ?, telefone = ?,
                                              ativo = COALESCE(?, ativo)
                         WHERE id = ? AND empresa_id = ?
                        """,
                req.nome().trim(), documento, limpar(req.contato()), limpar(req.email()), limpar(req.telefone()),
                req.ativo(), id, u.empresaId());
        if (n == 0) {
            throw new NoSuchElementException("Fornecedor não encontrado: " + id);
        }
        return obter(u.empresaId(), id);
    }

    private FornecedorResponse obter(Long empresaId, Long id) {
        return jdbc.query(SELECT + " WHERE f.empresa_id = ? AND f.id = ? GROUP BY f.id",
                        (rs, i) -> mapear(rs), java.sql.Date.valueOf(LocalDate.now(FUSO)), empresaId, id)
                .stream().findFirst().orElseThrow(() -> new NoSuchElementException("Fornecedor não encontrado: " + id));
    }

    private void exigirDocumentoLivre(Long empresaId, String documento, Long idAtual) {
        if (documento == null) return;
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM fornecedor WHERE empresa_id = ? AND documento = ? AND (? IS NULL OR id <> ?)",
                Integer.class, empresaId, documento, idAtual, idAtual);
        if (n != null && n > 0) {
            throw new IllegalArgumentException("Já existe fornecedor com o documento " + documento);
        }
    }

    private static FornecedorResponse mapear(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new FornecedorResponse(rs.getLong("id"), rs.getString("nome"), rs.getString("documento"),
                rs.getString("contato"), rs.getString("email"), rs.getString("telefone"), rs.getBoolean("ativo"),
                dinheiro(rs.getBigDecimal("aberto")), dinheiro(rs.getBigDecimal("vencido")));
    }

    private static BigDecimal dinheiro(BigDecimal v) {
        return (v == null ? BigDecimal.ZERO : v).setScale(2, RoundingMode.HALF_UP);
    }

    private static String limpar(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
