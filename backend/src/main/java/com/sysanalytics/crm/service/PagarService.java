package com.sysanalytics.crm.service;

import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.web.dto.PagarDtos.*;
import com.sysanalytics.crm.web.dto.PaginaResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;

/** Contas a pagar: lançamento (com parcelamento), pagamentos parciais/totais, estorno e indicadores. Gestor/admin. */
@Service
@RequiredArgsConstructor
public class PagarService {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo"); // mesmo fuso do application.yml
    private static final String ABERTO = "c.status IN ('ABERTO', 'PARCIAL')";
    public static final Set<String> CATEGORIAS = Set.of("MERCADORIA", "FRETE", "IMPOSTOS", "PESSOAL", "ALUGUEL",
            "UTILIDADES", "MARKETING", "SERVICOS", "OUTROS");
    private static final Set<String> FORMAS = Set.of("PIX", "BOLETO", "TRANSFERENCIA", "CARTAO", "DINHEIRO", "CHEQUE", "OUTRO");

    private static final String SELECT = """
            SELECT c.id, c.fornecedor_id, f.nome AS fornecedor_nome, c.numero_documento, c.parcela, c.total_parcelas,
                   c.descricao, c.categoria, c.data_emissao, c.data_vencimento, c.valor, c.valor_pago, c.status
              FROM conta_pagar c JOIN fornecedor f ON f.id = c.fornecedor_id
            """;

    private final JdbcTemplate jdbc;

    // ------------------------------------------------------------------ consultas

    @Transactional(readOnly = true)
    public PaginaResponse<ContaResumo> listar(String situacao, Long fornecedorId, String categoria, String busca,
                                              LocalDate vencimentoDe, LocalDate vencimentoAte, int pagina, int tamanho) {
        UsuarioLogado u = UsuarioLogado.atual();
        LocalDate hoje = LocalDate.now(FUSO);
        int tam = Math.min(Math.max(tamanho, 1), 100);
        int pag = Math.max(pagina, 0);

        StringBuilder where = new StringBuilder(" WHERE c.empresa_id = ?");
        List<Object> args = new ArrayList<>();
        args.add(u.empresaId());
        if (fornecedorId != null) {
            where.append(" AND c.fornecedor_id = ?");
            args.add(fornecedorId);
        }
        if (categoria != null && !categoria.isBlank()) {
            where.append(" AND c.categoria = ?");
            args.add(categoriaValida(categoria));
        }
        if (busca != null && !busca.isBlank()) {
            where.append(" AND (LOWER(f.nome) LIKE ? OR LOWER(c.numero_documento) LIKE ?)");
            String termo = "%" + busca.trim().toLowerCase(Locale.ROOT) + "%";
            args.add(termo);
            args.add(termo);
        }
        if (vencimentoDe != null) {
            where.append(" AND c.data_vencimento >= ?");
            args.add(Date.valueOf(vencimentoDe));
        }
        if (vencimentoAte != null) {
            where.append(" AND c.data_vencimento <= ?");
            args.add(Date.valueOf(vencimentoAte));
        }
        String sit = situacao == null || situacao.isBlank() ? "TODOS" : situacao.trim().toUpperCase(Locale.ROOT);
        switch (sit) {
            case "TODOS" -> {
            }
            case "EM_ABERTO" -> where.append(" AND ").append(ABERTO);
            case "A_VENCER" -> {
                where.append(" AND ").append(ABERTO).append(" AND c.data_vencimento >= ?");
                args.add(Date.valueOf(hoje));
            }
            case "VENCIDO" -> {
                where.append(" AND ").append(ABERTO).append(" AND c.data_vencimento < ?");
                args.add(Date.valueOf(hoje));
            }
            case "PAGO" -> where.append(" AND c.status = 'PAGO'");
            case "CANCELADO" -> where.append(" AND c.status = 'CANCELADO'");
            default -> throw new IllegalArgumentException("Situação inválida: " + situacao);
        }

        String from = " FROM conta_pagar c JOIN fornecedor f ON f.id = c.fornecedor_id";
        Long total = jdbc.queryForObject("SELECT COUNT(*)" + from + where, Long.class, args.toArray());

        String ordem = sit.equals("PAGO") ? " ORDER BY c.data_vencimento DESC, c.id DESC"
                : " ORDER BY c.data_vencimento ASC, c.id ASC";
        List<Object> todos = new ArrayList<>(args);
        todos.add(tam);
        todos.add((long) pag * tam);
        List<ContaResumo> itens = jdbc.query(SELECT + where + ordem + " LIMIT ? OFFSET ?",
                (rs, i) -> mapear(rs, hoje), todos.toArray());

        long totalElementos = total == null ? 0 : total;
        return new PaginaResponse<>(itens, pag, tam, totalElementos, (int) Math.ceil(totalElementos / (double) tam));
    }

    @Transactional(readOnly = true)
    public ContaDetalhe detalhe(Long id) {
        return montarDetalhe(UsuarioLogado.atual(), id, LocalDate.now(FUSO));
    }

    @Transactional(readOnly = true)
    public ResumoPagar resumo() {
        UsuarioLogado u = UsuarioLogado.atual();
        LocalDate hoje = LocalDate.now(FUSO);
        Date dHoje = Date.valueOf(hoje);
        Date d7 = Date.valueOf(hoje.plusDays(7));
        Date inicioMes = Date.valueOf(hoje.withDayOfMonth(1));

        record Totais(BigDecimal aberto, BigDecimal aVencer, BigDecimal vence7, BigDecimal vencido, long abertas, long vencidas,
                      BigDecimal b0, BigDecimal b1, BigDecimal b2, BigDecimal b3, BigDecimal b4,
                      long q0, long q1, long q2, long q3, long q4) {
        }
        Totais t = jdbc.queryForObject("""
                        SELECT COALESCE(SUM(c.valor - c.valor_pago), 0) AS aberto,
                               COALESCE(SUM(c.valor - c.valor_pago) FILTER (WHERE c.data_vencimento >= ?), 0) AS a_vencer,
                               COALESCE(SUM(c.valor - c.valor_pago) FILTER (WHERE c.data_vencimento >= ? AND c.data_vencimento <= ?), 0) AS vence7,
                               COALESCE(SUM(c.valor - c.valor_pago) FILTER (WHERE c.data_vencimento < ?), 0) AS vencido,
                               COUNT(*) AS abertas,
                               COUNT(*) FILTER (WHERE c.data_vencimento < ?) AS vencidas,
                               COALESCE(SUM(c.valor - c.valor_pago) FILTER (WHERE c.data_vencimento >= ?), 0) AS b0,
                               COALESCE(SUM(c.valor - c.valor_pago) FILTER (WHERE c.data_vencimento < ? AND c.data_vencimento >= ?::date - 30), 0) AS b1,
                               COALESCE(SUM(c.valor - c.valor_pago) FILTER (WHERE c.data_vencimento < ?::date - 30 AND c.data_vencimento >= ?::date - 60), 0) AS b2,
                               COALESCE(SUM(c.valor - c.valor_pago) FILTER (WHERE c.data_vencimento < ?::date - 60 AND c.data_vencimento >= ?::date - 90), 0) AS b3,
                               COALESCE(SUM(c.valor - c.valor_pago) FILTER (WHERE c.data_vencimento < ?::date - 90), 0) AS b4,
                               COUNT(*) FILTER (WHERE c.data_vencimento >= ?) AS q0,
                               COUNT(*) FILTER (WHERE c.data_vencimento < ? AND c.data_vencimento >= ?::date - 30) AS q1,
                               COUNT(*) FILTER (WHERE c.data_vencimento < ?::date - 30 AND c.data_vencimento >= ?::date - 60) AS q2,
                               COUNT(*) FILTER (WHERE c.data_vencimento < ?::date - 60 AND c.data_vencimento >= ?::date - 90) AS q3,
                               COUNT(*) FILTER (WHERE c.data_vencimento < ?::date - 90) AS q4
                          FROM conta_pagar c WHERE c.empresa_id = ? AND c.status IN ('ABERTO', 'PARCIAL')
                        """,
                (rs, i) -> new Totais(rs.getBigDecimal("aberto"), rs.getBigDecimal("a_vencer"), rs.getBigDecimal("vence7"),
                        rs.getBigDecimal("vencido"), rs.getLong("abertas"), rs.getLong("vencidas"),
                        rs.getBigDecimal("b0"), rs.getBigDecimal("b1"), rs.getBigDecimal("b2"), rs.getBigDecimal("b3"),
                        rs.getBigDecimal("b4"), rs.getLong("q0"), rs.getLong("q1"), rs.getLong("q2"), rs.getLong("q3"),
                        rs.getLong("q4")),
                dHoje, dHoje, d7, dHoje, dHoje,
                dHoje, dHoje, dHoje, dHoje, dHoje, dHoje, dHoje, dHoje,
                dHoje, dHoje, dHoje, dHoje, dHoje, dHoje, dHoje, dHoje, u.empresaId());

        BigDecimal pagoMes = jdbc.queryForObject(
                "SELECT COALESCE(SUM(valor), 0) FROM baixa_pagar WHERE empresa_id = ? AND data_pagamento >= ?",
                BigDecimal.class, u.empresaId(), inicioMes);

        List<FaixaAging> aging = List.of(
                new FaixaAging("A vencer", dinheiro(t.b0()), t.q0()),
                new FaixaAging("1-30 dias", dinheiro(t.b1()), t.q1()),
                new FaixaAging("31-60 dias", dinheiro(t.b2()), t.q2()),
                new FaixaAging("61-90 dias", dinheiro(t.b3()), t.q3()),
                new FaixaAging("Mais de 90", dinheiro(t.b4()), t.q4()));

        List<CategoriaValor> categorias = jdbc.query("""
                        SELECT c.categoria, SUM(c.valor - c.valor_pago) AS valor
                          FROM conta_pagar c WHERE c.empresa_id = ? AND c.status IN ('ABERTO', 'PARCIAL')
                         GROUP BY c.categoria ORDER BY valor DESC
                        """,
                (rs, i) -> new CategoriaValor(rs.getString("categoria"), dinheiro(rs.getBigDecimal("valor"))), u.empresaId());

        List<FornecedorSaldo> fornecedores = jdbc.query("""
                        SELECT f.id, f.nome, SUM(c.valor - c.valor_pago) AS aberto,
                               COALESCE(SUM(c.valor - c.valor_pago) FILTER (WHERE c.data_vencimento < ?), 0) AS vencido
                          FROM conta_pagar c JOIN fornecedor f ON f.id = c.fornecedor_id
                         WHERE c.empresa_id = ? AND c.status IN ('ABERTO', 'PARCIAL')
                         GROUP BY f.id, f.nome ORDER BY aberto DESC LIMIT 5
                        """,
                (rs, i) -> new FornecedorSaldo(rs.getLong("id"), rs.getString("nome"), dinheiro(rs.getBigDecimal("aberto")),
                        dinheiro(rs.getBigDecimal("vencido"))),
                dHoje, u.empresaId());

        return new ResumoPagar(dinheiro(t.aberto()), dinheiro(t.aVencer()), dinheiro(t.vence7()), dinheiro(t.vencido()),
                t.abertas(), t.vencidas(), dinheiro(pagoMes), aging, categorias, fornecedores);
    }

    // ------------------------------------------------------------------ lançamentos

    @Transactional
    public List<ContaResumo> criar(ContaRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        LocalDate hoje = LocalDate.now(FUSO);
        String categoria = categoriaValida(req.categoria());
        Integer fornecedorOk = jdbc.queryForObject(
                "SELECT COUNT(*) FROM fornecedor WHERE id = ? AND empresa_id = ? AND ativo",
                Integer.class, req.fornecedorId(), u.empresaId());
        if (fornecedorOk == null || fornecedorOk == 0) {
            throw new IllegalArgumentException("Fornecedor não encontrado ou inativo");
        }
        String documento = req.numeroDocumento().trim();
        int parcelas = req.parcelas() == null ? 1 : req.parcelas();
        int intervalo = req.intervaloDias() == null ? 30 : req.intervaloDias();
        if (req.primeiroVencimento().isBefore(req.dataEmissao())) {
            throw new IllegalArgumentException("O vencimento não pode ser anterior à emissão");
        }
        Integer existentes = jdbc.queryForObject(
                "SELECT COUNT(*) FROM conta_pagar WHERE empresa_id = ? AND fornecedor_id = ? AND numero_documento = ?",
                Integer.class, u.empresaId(), req.fornecedorId(), documento);
        if (existentes != null && existentes > 0) {
            throw new IllegalArgumentException("Já existe conta deste fornecedor com o documento " + documento);
        }

        BigDecimal base = req.valorTotal().divide(BigDecimal.valueOf(parcelas), 2, RoundingMode.DOWN);
        BigDecimal acumulado = BigDecimal.ZERO;
        for (int i = 1; i <= parcelas; i++) {
            BigDecimal valor = i == parcelas ? req.valorTotal().subtract(acumulado) : base; // última absorve os centavos
            acumulado = acumulado.add(valor);
            jdbc.update("""
                            INSERT INTO conta_pagar (empresa_id, fornecedor_id, numero_documento, parcela, total_parcelas, descricao,
                                                     categoria, data_emissao, data_vencimento, valor, valor_pago, status, criado_por_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'ABERTO', ?)
                            """,
                    u.empresaId(), req.fornecedorId(), documento, i, parcelas, limpar(req.descricao()), categoria,
                    Date.valueOf(req.dataEmissao()), Date.valueOf(req.primeiroVencimento().plusDays((long) intervalo * (i - 1))),
                    valor, u.usuarioId());
        }
        return jdbc.query(SELECT + " WHERE c.empresa_id = ? AND c.fornecedor_id = ? AND c.numero_documento = ? ORDER BY c.parcela",
                (rs, i) -> mapear(rs, hoje), u.empresaId(), req.fornecedorId(), documento);
    }

    @Transactional
    public ContaDetalhe pagar(Long id, PagamentoRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        LocalDate hoje = LocalDate.now(FUSO);
        Linha c = travar(u, id);
        if (!c.aberto()) {
            throw new IllegalArgumentException("Esta conta já está quitada ou cancelada");
        }
        String forma = req.formaPagamento().trim().toUpperCase(Locale.ROOT);
        if (!FORMAS.contains(forma)) {
            throw new IllegalArgumentException("Forma de pagamento inválida: " + req.formaPagamento());
        }
        if (req.dataPagamento().isAfter(hoje)) {
            throw new IllegalArgumentException("A data do pagamento não pode ser futura");
        }
        BigDecimal saldo = c.valor().subtract(c.pago());
        if (req.valor().compareTo(saldo) > 0) {
            throw new IllegalArgumentException("O valor excede o saldo da conta (R$ " + saldo.toPlainString() + ")");
        }
        jdbc.update("""
                        INSERT INTO baixa_pagar (empresa_id, conta_id, data_pagamento, valor, forma_pagamento, observacao, usuario_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                u.empresaId(), id, Date.valueOf(req.dataPagamento()), req.valor(), forma, limpar(req.observacao()), u.usuarioId());
        recalcular(id);
        return montarDetalhe(u, id, hoje);
    }

    @Transactional
    public ContaDetalhe estornar(Long id, Long pagamentoId) {
        UsuarioLogado u = UsuarioLogado.atual();
        travar(u, id);
        int n = jdbc.update("DELETE FROM baixa_pagar WHERE id = ? AND conta_id = ? AND empresa_id = ?",
                pagamentoId, id, u.empresaId());
        if (n == 0) {
            throw new NoSuchElementException("Pagamento não encontrado: " + pagamentoId);
        }
        recalcular(id);
        return montarDetalhe(u, id, LocalDate.now(FUSO));
    }

    @Transactional
    public ContaDetalhe cancelar(Long id) {
        UsuarioLogado u = UsuarioLogado.atual();
        Linha c = travar(u, id);
        if (!c.status().equals("ABERTO") || c.pago().signum() > 0) {
            throw new IllegalArgumentException("Só é possível cancelar conta em aberto e sem pagamentos (estorne os pagamentos antes)");
        }
        jdbc.update("UPDATE conta_pagar SET status = 'CANCELADO' WHERE id = ? AND empresa_id = ?", id, u.empresaId());
        return montarDetalhe(u, id, LocalDate.now(FUSO));
    }

    // ------------------------------------------------------------------ internos

    private record Linha(BigDecimal valor, BigDecimal pago, String status) {
        boolean aberto() {
            return status.equals("ABERTO") || status.equals("PARCIAL");
        }
    }

    /** Trava a conta (FOR UPDATE) para que pagamentos simultâneos não ultrapassem o saldo. */
    private Linha travar(UsuarioLogado u, Long id) {
        List<Linha> linhas = jdbc.query(
                "SELECT valor, valor_pago, status FROM conta_pagar WHERE id = ? AND empresa_id = ? FOR UPDATE",
                (rs, i) -> new Linha(rs.getBigDecimal("valor"), rs.getBigDecimal("valor_pago"), rs.getString("status")),
                id, u.empresaId());
        if (linhas.isEmpty()) {
            throw new NoSuchElementException("Conta não encontrada: " + id);
        }
        return linhas.get(0);
    }

    private void recalcular(Long id) {
        jdbc.update("""
                UPDATE conta_pagar c
                   SET valor_pago = s.soma,
                       status = CASE WHEN s.soma >= c.valor THEN 'PAGO' WHEN s.soma > 0 THEN 'PARCIAL' ELSE 'ABERTO' END,
                       data_quitacao = CASE WHEN s.soma >= c.valor THEN s.ultima ELSE NULL END
                  FROM (SELECT COALESCE(SUM(valor), 0) AS soma, MAX(data_pagamento) AS ultima
                          FROM baixa_pagar WHERE conta_id = ?) s
                 WHERE c.id = ? AND c.status <> 'CANCELADO'
                """, id, id);
    }

    private ContaDetalhe montarDetalhe(UsuarioLogado u, Long id, LocalDate hoje) {
        List<ContaResumo> r = jdbc.query(SELECT + " WHERE c.id = ? AND c.empresa_id = ?",
                (rs, i) -> mapear(rs, hoje), id, u.empresaId());
        if (r.isEmpty()) {
            throw new NoSuchElementException("Conta não encontrada: " + id);
        }
        List<PagamentoItem> pagamentos = jdbc.query("""
                        SELECT b.id, b.data_pagamento, b.valor, b.forma_pagamento, b.observacao, us.nome AS usuario_nome, b.criada_em
                          FROM baixa_pagar b JOIN usuario us ON us.id = b.usuario_id
                         WHERE b.conta_id = ? AND b.empresa_id = ?
                         ORDER BY b.data_pagamento DESC, b.id DESC
                        """,
                (rs, i) -> new PagamentoItem(rs.getLong("id"), rs.getDate("data_pagamento").toLocalDate(), rs.getBigDecimal("valor"),
                        rs.getString("forma_pagamento"), rs.getString("observacao"), rs.getString("usuario_nome"),
                        instante(rs.getTimestamp("criada_em"))),
                id, u.empresaId());
        return new ContaDetalhe(r.get(0), pagamentos);
    }

    private static ContaResumo mapear(ResultSet rs, LocalDate hoje) throws SQLException {
        BigDecimal valor = rs.getBigDecimal("valor");
        BigDecimal pago = rs.getBigDecimal("valor_pago");
        String status = rs.getString("status");
        LocalDate vencimento = rs.getDate("data_vencimento").toLocalDate();
        boolean aberto = status.equals("ABERTO") || status.equals("PARCIAL");
        boolean vencido = aberto && vencimento.isBefore(hoje);
        String situacao = aberto ? (vencido ? "VENCIDO" : "A_VENCER") : status;
        int atraso = vencido ? (int) ChronoUnit.DAYS.between(vencimento, hoje) : 0;
        return new ContaResumo(rs.getLong("id"), rs.getLong("fornecedor_id"), rs.getString("fornecedor_nome"),
                rs.getString("numero_documento"), rs.getInt("parcela"), rs.getInt("total_parcelas"), rs.getString("descricao"),
                rs.getString("categoria"), rs.getDate("data_emissao").toLocalDate(), vencimento, valor, pago,
                valor.subtract(pago), status, situacao, atraso);
    }

    private static String categoriaValida(String categoria) {
        String c = categoria.trim().toUpperCase(Locale.ROOT);
        if (!CATEGORIAS.contains(c)) {
            throw new IllegalArgumentException("Categoria inválida: " + categoria);
        }
        return c;
    }

    private static OffsetDateTime instante(Timestamp ts) {
        return ts == null ? null : OffsetDateTime.ofInstant(ts.toInstant(), FUSO);
    }

    private static BigDecimal dinheiro(BigDecimal v) {
        return (v == null ? BigDecimal.ZERO : v).setScale(2, RoundingMode.HALF_UP);
    }

    private static String limpar(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
