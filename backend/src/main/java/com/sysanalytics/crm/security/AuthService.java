package com.sysanalytics.crm.security;

import com.sysanalytics.crm.domain.Usuario;
import com.sysanalytics.crm.repository.EmpresaRepository;
import com.sysanalytics.crm.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final EmpresaRepository empresaRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;

    @Value("${crm.security.jwt-ttl-minutos:480}")
    private long ttlMinutos;

    @Transactional
    public AuthDtos.TokenResponse login(String email, String senha) {
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email == null ? "" : email.trim())
                .filter(Usuario::isAtivo)
                .filter(u -> passwordEncoder.matches(senha == null ? "" : senha, u.getSenhaHash()))
                .orElseThrow(CredenciaisInvalidasException::new);

        var empresa = empresaRepository.findById(usuario.getEmpresaId())
                .filter(e -> e.isAtiva())
                .orElseThrow(CredenciaisInvalidasException::new);

        usuario.setUltimoLoginEm(OffsetDateTime.now());

        Instant agora = Instant.now();
        Instant expira = agora.plus(ttlMinutos, ChronoUnit.MINUTES);
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .subject(String.valueOf(usuario.getId()))
                .issuedAt(agora)
                .expiresAt(expira)
                .claim("empresaId", usuario.getEmpresaId())
                .claim("perfil", usuario.getPerfil().name());
        if (usuario.getVendedorId() != null) {
            claims.claim("vendedorId", usuario.getVendedorId());
        }
        String token = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims.build())).getTokenValue();

        return new AuthDtos.TokenResponse(token, "Bearer", expira, AuthDtos.UsuarioResponse.from(usuario, empresa.getNome()));
    }

    @Transactional(readOnly = true)
    public AuthDtos.UsuarioResponse me(Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .filter(Usuario::isAtivo)
                .orElseThrow(CredenciaisInvalidasException::new);
        String empresa = empresaRepository.findById(usuario.getEmpresaId()).map(e -> e.getNome()).orElse("");
        return AuthDtos.UsuarioResponse.from(usuario, empresa);
    }
}
