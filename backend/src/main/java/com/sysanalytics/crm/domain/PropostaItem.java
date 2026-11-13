package com.sysanalytics.crm.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/** Linha da proposta. Guarda descrição e preço no momento da cotação (não acompanha o catálogo). */
@Entity
@Table(name = "proposta_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropostaItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false, updatable = false)
    private Long empresaId;

    @Column(name = "proposta_id", nullable = false, updatable = false)
    private Long propostaId;

    /** Nulo para item avulso (fora do catálogo). */
    @Column(name = "produto_id")
    private Long produtoId;

    @Column(nullable = false, length = 160)
    private String descricao;

    @Column(nullable = false, length = 10)
    private String unidade;

    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal quantidade;

    @Column(name = "preco_unitario", nullable = false, precision = 15, scale = 2)
    private BigDecimal precoUnitario;

    @Column(name = "desconto_percentual", nullable = false, precision = 5, scale = 2)
    private BigDecimal descontoPercentual;
}
