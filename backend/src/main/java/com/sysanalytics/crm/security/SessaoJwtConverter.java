package com.sysanalytics.crm.security;

import lombok.RequiredArgsConstructor;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.stereotype.Component;

/** O claim "perfil" (ADMIN/GESTOR/VENDEDOR) vira a authority ROLE_{perfil}, depois de validar a sessão. */
@Component
@RequiredArgsConstructor
public class SessaoJwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final SessaoValidator validator;
    private final JwtAuthenticationConverter delegate = criarDelegate();

    private static JwtAuthenticationConverter criarDelegate() {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName("perfil");
        authorities.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        validator.validar(jwt); // lança InvalidBearerTokenException (401) se a sessão não vale mais
        return delegate.convert(jwt);
    }
}
