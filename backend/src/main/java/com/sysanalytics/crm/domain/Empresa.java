package com.sysanalytics.crm.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

/** Empresa cliente do SysAnalytics (tenant). */
@Entity
@Table(name = "empresa")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Empresa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 160)
    private String nome;

    @Column(nullable = false, length = 18, unique = true)
    private String cnpj;

    @Column(nullable = false)
    private boolean ativa;

    @Column(name = "criada_em", nullable = false)
    private OffsetDateTime criadaEm;
}
