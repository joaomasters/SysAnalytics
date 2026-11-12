package com.sysanalytics.crm.security;

import com.sysanalytics.crm.domain.Perfil;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Identidade do usuário da requisição atual, extraída do JWT.
 * É daqui que sai o {@code empresaId} que isola os dados entre empresas (tenants):
 * nunca aceitar empresa vinda de parâmetro de requisição.
 */
public record UsuarioLogado(Long usuarioId, Long empresaId, Perfil perfil, Long vendedorId) {

    /** Valor que nunca casa com um vendedor real (vendedor sem vínculo não enxerga nada). */
    private static final Long SEM_VENDEDOR = -1L;

    public static UsuarioLogado atual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken token)) {
            throw new IllegalStateException("Requisição sem usuário autenticado");
        }
        Jwt jwt = token.getToken();
        Object vendedor = jwt.getClaims().get("vendedorId");
        return new UsuarioLogado(
                Long.valueOf(jwt.getSubject()),
                ((Number) jwt.getClaims().get("empresaId")).longValue(),
                Perfil.valueOf(jwt.getClaimAsString("perfil")),
                vendedor == null ? null : ((Number) vendedor).longValue());
    }

    /** O vendedor só enxerga a própria carteira; gestor e admin enxergam a empresa toda. */
    public boolean restritoAoVendedor() {
        return perfil == Perfil.VENDEDOR;
    }

    /** Filtro de carteira para consultas SQL: {@code null} = sem restrição. */
    public Long vendedorIdEscopo() {
        return restritoAoVendedor() ? (vendedorId != null ? vendedorId : SEM_VENDEDOR) : null;
    }
}
