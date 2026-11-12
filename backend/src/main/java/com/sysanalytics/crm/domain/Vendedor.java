package com.sysanalytics.crm.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "vendedor")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vendedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Empresa (tenant) dona do registro. Toda consulta deve filtrar por ela. */
    @Column(name = "empresa_id", nullable = false, updatable = false)
    private Long empresaId;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(nullable = false, length = 160)
    private String email;

    @Column(length = 20)
    private String telefone;

    /** Carteira comercial (região/segmento) atendida pelo vendedor. */
    @Column(nullable = false, length = 80)
    private String carteira;
}
