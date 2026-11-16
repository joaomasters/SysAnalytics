package com.sysanalytics.crm.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "usuario")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false, updatable = false)
    private Long empresaId;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(nullable = false, length = 160, unique = true)
    private String email;

    @Column(name = "senha_hash", nullable = false, length = 100)
    private String senhaHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Perfil perfil;

    /** Obrigatório para o perfil VENDEDOR: liga o login à carteira de clientes. */
    @Column(name = "vendedor_id")
    private Long vendedorId;

    @Column(nullable = false)
    private boolean ativo;

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime criadoEm;

    @Column(name = "ultimo_login_em")
    private OffsetDateTime ultimoLoginEm;

    /** Incrementado para invalidar todos os tokens já emitidos (troca/redefinição de senha, mudança de perfil, desativação). */
    @Column(name = "token_versao", nullable = false)
    private int tokenVersao;

    @Column(name = "tentativas_falhas", nullable = false)
    private int tentativasFalhas;

    @Column(name = "bloqueado_ate")
    private OffsetDateTime bloqueadoAte;

    /** Senha definida por outra pessoa (cadastro ou redefinição): precisa ser trocada no próximo acesso. */
    @Column(name = "senha_temporaria", nullable = false)
    private boolean senhaTemporaria;

    @Column(name = "senha_alterada_em")
    private OffsetDateTime senhaAlteradaEm;

    @Column(name = "atualizado_em")
    private OffsetDateTime atualizadoEm;
}
