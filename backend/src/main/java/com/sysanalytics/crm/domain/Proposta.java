package com.sysanalytics.crm.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "proposta")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Proposta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false, updatable = false)
    private Long empresaId;

    @Column(name = "oportunidade_id", nullable = false, updatable = false)
    private Long oportunidadeId;

    @Column(name = "criada_por_id", nullable = false, updatable = false)
    private Long criadaPorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private StatusProposta status;

    @Column(name = "validade_ate")
    private LocalDate validadeAte;

    @Column(name = "condicoes_pagamento", length = 200)
    private String condicoesPagamento;

    @Column(length = 1000)
    private String observacoes;

    @Column(name = "criada_em", nullable = false, updatable = false)
    private OffsetDateTime criadaEm;

    @Column(name = "atualizada_em", nullable = false)
    private OffsetDateTime atualizadaEm;
}
