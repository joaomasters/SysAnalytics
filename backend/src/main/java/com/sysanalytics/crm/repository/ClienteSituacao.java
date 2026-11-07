package com.sysanalytics.crm.repository;

import com.sysanalytics.crm.domain.NivelRisco;
import org.springframework.jdbc.core.RowMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.LocalDate;

/** Linha resultante de {@link ConsultasAnaliticas#SITUACAO_CLIENTES}. */
public record ClienteSituacao(
        Long clienteId,
        String nomeFantasia,
        String razaoSocial,
        String cnpj,
        String contato,
        String cidade,
        String uf,
        String segmento,
        Long vendedorId,
        String vendedorNome,
        String vendedorEmail,
        String vendedorTelefone,
        String carteira,
        LocalDate ultimaCompra,
        Integer diasInatividade,
        long totalNotas,
        BigDecimal valorTotal,
        BigDecimal ticketMedio,
        NivelRisco nivel
) {

    public static final RowMapper<ClienteSituacao> ROW_MAPPER = (rs, rowNum) -> {
        Date ultima = rs.getDate("ultima_compra");
        Integer dias = (Integer) rs.getObject("dias_inatividade");
        return new ClienteSituacao(
                rs.getLong("cliente_id"),
                rs.getString("nome_fantasia"),
                rs.getString("razao_social"),
                rs.getString("cnpj"),
                rs.getString("contato"),
                rs.getString("cidade"),
                rs.getString("uf"),
                rs.getString("segmento"),
                rs.getLong("vendedor_id"),
                rs.getString("vendedor_nome"),
                rs.getString("vendedor_email"),
                rs.getString("vendedor_telefone"),
                rs.getString("carteira"),
                ultima != null ? ultima.toLocalDate() : null,
                dias,
                rs.getLong("total_notas"),
                rs.getBigDecimal("valor_total").setScale(2, RoundingMode.HALF_UP),
                rs.getBigDecimal("ticket_medio").setScale(2, RoundingMode.HALF_UP),
                NivelRisco.fromDiasInatividade(dias)
        );
    };
}
