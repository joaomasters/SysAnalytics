package com.sysanalytics.crm.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/** Meta de faturamento de um vendedor em um mês ({@code competencia} = dia 1). */
@Entity
@Table(name = "meta")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Meta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false, updatable = false)
    private Long empresaId;

    @Column(name = "vendedor_id", nullable = false, updatable = false)
    private Long vendedorId;

    @Column(nullable = false, updatable = false)
    private LocalDate competencia;

    @Column(name = "valor_meta", nullable = false, precision = 15, scale = 2)
    private BigDecimal valorMeta;

    @Column(name = "atualizada_por_id", nullable = false)
    private Long atualizadaPorId;

    @Column(name = "atualizada_em", nullable = false)
    private OffsetDateTime atualizadaEm;
}
