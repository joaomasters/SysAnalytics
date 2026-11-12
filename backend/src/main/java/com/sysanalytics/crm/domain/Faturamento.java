package com.sysanalytics.crm.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Nota fiscal / faturamento extraído do ERP. */
@Entity
@Table(name = "faturamento", indexes = {
        @Index(name = "idx_faturamento_data", columnList = "data_faturamento"),
        @Index(name = "idx_faturamento_cliente_data", columnList = "cliente_id, data_faturamento")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Faturamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Empresa (tenant) dona do registro. Toda consulta deve filtrar por ela. */
    @Column(name = "empresa_id", nullable = false, updatable = false)
    private Long empresaId;

    @Column(name = "numero_nota", nullable = false, length = 20)
    private String numeroNota;

    @Column(name = "data_faturamento", nullable = false)
    private LocalDate dataFaturamento;

    @Column(name = "valor_total", nullable = false, precision = 15, scale = 2)
    private BigDecimal valorTotal;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendedor_id", nullable = false)
    private Vendedor vendedor;
}
