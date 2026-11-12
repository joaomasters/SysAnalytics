package com.sysanalytics.crm.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

/** Pessoa de contato de um cliente. Dado do CRM (não vem do ERP). */
@Entity
@Table(name = "contato", indexes = @Index(name = "idx_contato_cliente", columnList = "empresa_id, cliente_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false, updatable = false)
    private Long empresaId;

    @Column(name = "cliente_id", nullable = false, updatable = false)
    private Long clienteId;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(length = 80)
    private String cargo;

    @Column(length = 160)
    private String email;

    @Column(length = 20)
    private String telefone;

    @Column(nullable = false)
    private boolean principal;

    /** Exclusão lógica: preserva o histórico. */
    @Column(nullable = false)
    private boolean ativo;

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime criadoEm;
}
