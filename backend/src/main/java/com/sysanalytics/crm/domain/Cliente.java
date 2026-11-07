package com.sysanalytics.crm.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "cliente", indexes = @Index(name = "idx_cliente_vendedor", columnList = "vendedor_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 18, unique = true)
    private String cnpj;

    @Column(name = "razao_social", nullable = false, length = 160)
    private String razaoSocial;

    @Column(name = "nome_fantasia", nullable = false, length = 120)
    private String nomeFantasia;

    @Column(length = 120)
    private String contato;

    @Column(length = 160)
    private String email;

    @Column(length = 20)
    private String telefone;

    @Column(length = 80)
    private String cidade;

    @Column(length = 2)
    private String uf;

    @Column(length = 60)
    private String segmento;

    @Column(name = "data_cadastro", nullable = false)
    private LocalDate dataCadastro;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendedor_id", nullable = false)
    private Vendedor vendedor;
}
