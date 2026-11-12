package com.sysanalytics.crm.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/** Próximo passo do vendedor com um cliente. Pode nascer de um alerta de churn. */
@Entity
@Table(name = "tarefa")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tarefa {

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

    @Column(nullable = false)
    private LocalDate prazo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private StatusTarefa status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, updatable = false)
    private OrigemTarefa origem;

    /** Alerta que originou a tarefa (quando origem = ALERTA). */
    @Column(name = "notificacao_id", updatable = false)
    private Long notificacaoId;

    @Enumerated(EnumType.STRING)
    @Column(length = 15)
    private ResultadoTarefa resultado;

    @Column(name = "concluida_em")
    private OffsetDateTime concluidaEm;

    @Column(name = "criada_em", nullable = false)
    private OffsetDateTime criadaEm;
}
