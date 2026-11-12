package com.sysanalytics.crm.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "oportunidade")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Oportunidade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false, updatable = false)
    private Long empresaId;

    @Column(name = "cliente_id", nullable = false, updatable = false)
    private Long clienteId;

    @Column(name = "responsavel_id", nullable = false)
    private Long responsavelId;

    @Column(name = "criada_por_id", nullable = false, updatable = false)
    private Long criadaPorId;

    @Column(nullable = false, length = 160)
    private String titulo;

    @Column(length = 1000)
    private String descricao;

    @Column(name = "valor_estimado", nullable = false, precision = 15, scale = 2)
    private BigDecimal valorEstimado;

    /** 0 a 100. Padrão da etapa; o vendedor pode ajustar nas etapas abertas. */
    @Column(nullable = false)
    private int probabilidade;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EtapaOportunidade etapa;

    @Column(name = "data_prevista_fechamento")
    private LocalDate dataPrevistaFechamento;

    @Enumerated(EnumType.STRING)
    @Column(name = "motivo_perda", length = 15)
    private MotivoPerda motivoPerda;

    @Column(name = "fechada_em")
    private OffsetDateTime fechadaEm;

    @Column(name = "criada_em", nullable = false, updatable = false)
    private OffsetDateTime criadaEm;

    @Column(name = "atualizada_em", nullable = false)
    private OffsetDateTime atualizadaEm;
}
