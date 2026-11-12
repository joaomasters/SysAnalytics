package com.sysanalytics.crm.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

/** Registro de um contato feito com o cliente (ligação, visita, e-mail...). */
@Entity
@Table(name = "interacao")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Interacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false, updatable = false)
    private Long empresaId;

    @Column(name = "cliente_id", nullable = false, updatable = false)
    private Long clienteId;

    @Column(name = "contato_id")
    private Long contatoId;

    /** Quem registrou. */
    @Column(name = "usuario_id", nullable = false, updatable = false)
    private Long usuarioId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TipoInteracao tipo;

    @Column(name = "data_hora", nullable = false)
    private OffsetDateTime dataHora;

    @Column(nullable = false, length = 1000)
    private String resumo;

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime criadoEm;
}
