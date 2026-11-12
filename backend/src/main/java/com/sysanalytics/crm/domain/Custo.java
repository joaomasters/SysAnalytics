package com.sysanalytics.crm.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Lançamento de custo operacional (saída de caixa). */
@Entity
@Table(name = "custo", indexes = @Index(name = "idx_custo_data", columnList = "data_lancamento"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Custo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Empresa (tenant) dona do registro. Toda consulta deve filtrar por ela. */
    @Column(name = "empresa_id", nullable = false, updatable = false)
    private Long empresaId;

    @Column(nullable = false, length = 160)
    private String descricao;

    @Column(nullable = false, length = 60)
    private String categoria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TipoCusto tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Periodicidade periodicidade;

    @Column(name = "data_lancamento", nullable = false)
    private LocalDate dataLancamento;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal valor;
}
