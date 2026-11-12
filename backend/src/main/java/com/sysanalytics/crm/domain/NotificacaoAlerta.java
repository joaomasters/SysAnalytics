package com.sysanalytics.crm.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/** Alerta gravado no feed do utilizador a partir da fila q.notificacao.dashboard. */
@Entity
@Table(name = "notificacao_alerta",
        indexes = @Index(name = "idx_notificacao_lida", columnList = "lida, criada_em"),
        uniqueConstraints = @UniqueConstraint(name = "uk_notificacao_cliente_nivel_dia",
                columnNames = {"cliente_id", "nivel", "data_referencia"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificacaoAlerta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Empresa (tenant) dona do registro. Toda consulta deve filtrar por ela. */
    @Column(name = "empresa_id", nullable = false, updatable = false)
    private Long empresaId;

    @Column(name = "cliente_id", nullable = false)
    private Long clienteId;

    @Column(name = "cliente_nome", nullable = false, length = 120)
    private String clienteNome;

    @Column(name = "vendedor_id")
    private Long vendedorId;

    @Column(name = "vendedor_nome", length = 120)
    private String vendedorNome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private NivelRisco nivel;

    @Column(name = "dias_inatividade")
    private Integer diasInatividade;

    @Column(nullable = false, length = 400)
    private String mensagem;

    @Column(nullable = false)
    private boolean lida;

    /** Data da análise que gerou o alerta: evita duplicar o mesmo alerta no mesmo dia. */
    @Column(name = "data_referencia", nullable = false)
    private LocalDate dataReferencia;

    @Column(name = "criada_em", nullable = false)
    private OffsetDateTime criadaEm;
}
