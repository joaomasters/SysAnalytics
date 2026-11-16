package com.sysanalytics.crm.security;

import com.sysanalytics.crm.domain.Usuario;
import com.sysanalytics.crm.repository.EmpresaRepository;
import com.sysanalytics.crm.repository.UsuarioRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    static final int MAX_TENTATIVAS = 5;
    static final long BLOQUEIO_MINUTOS = 15;

    private final UsuarioRepository usuarioRepository;
    private final EmpresaRepository empresaRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final SessaoValidator sessaoValidator;
    private final SegurancaAuditoria auditoria;

    @Value("${crm.security.jwt-ttl-minutos:480}")
    private long ttlMinutos;

    /** Hash usado para gastar o mesmo tempo quando o e-mail não existe (evita descobrir e-mails pelo tempo de resposta). */
    private String hashFalso;

    @PostConstruct
    void init() {
        hashFalso = passwordEncoder.encode("senha-que-nunca-sera-usada");
    }

    /** As falhas precisam ser gravadas (contador e trilha), por isso a exceção de credencial não desfaz a transação. */
    @Transactional(noRollbackFor = {CredenciaisInvalidasException.class, ContaBloqueadaException.class})
    public AuthDtos.TokenResponse login(String email, String senha) {
        String emailNormalizado = email == null ? "" : email.trim();
        String senhaInformada = senha == null ? "" : senha;
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(emailNormalizado).orElse(null);

        if (usuario == null) {
            passwordEncoder.matches(senhaInformada, hashFalso);
            log.warn("Login recusado: e-mail desconhecido");
            throw new CredenciaisInvalidasException();
        }

        OffsetDateTime agora = OffsetDateTime.now();
        if (usuario.getBloqueadoAte() != null && usuario.getBloqueadoAte().isAfter(agora)) {
            long minutos = Math.max(1, Duration.between(agora, usuario.getBloqueadoAte()).toMinutes() + 1);
            throw new ContaBloqueadaException(minutos);
        }

        boolean senhaConfere = passwordEncoder.matches(senhaInformada, usuario.getSenhaHash());
        var empresa = empresaRepository.findById(usuario.getEmpresaId()).filter(e -> e.isAtiva()).orElse(null);
        if (!senhaConfere || !usuario.isAtivo() || empresa == null) {
            if (!senhaConfere && usuario.isAtivo()) registrarFalha(usuario, agora);
            throw new CredenciaisInvalidasException();
        }

        usuario.setTentativasFalhas(0);
        usuario.setBloqueadoAte(null);
        usuario.setUltimoLoginEm(agora);
        auditoria.registrar(usuario.getEmpresaId(), usuario.getId(), usuario.getId(), SegurancaAuditoria.LOGIN_OK, null);
        return emitir(usuario, empresa.getNome());
    }

    private void registrarFalha(Usuario usuario, OffsetDateTime agora) {
        int falhas = usuario.getTentativasFalhas() + 1;
        if (falhas >= MAX_TENTATIVAS) {
            usuario.setTentativasFalhas(0);
            usuario.setBloqueadoAte(agora.plusMinutes(BLOQUEIO_MINUTOS));
            auditoria.registrar(usuario.getEmpresaId(), usuario.getId(), usuario.getId(), SegurancaAuditoria.LOGIN_BLOQUEADO,
                    MAX_TENTATIVAS + " senhas incorretas seguidas; bloqueio de " + BLOQUEIO_MINUTOS + " min");
        } else {
            usuario.setTentativasFalhas(falhas);
            auditoria.registrar(usuario.getEmpresaId(), usuario.getId(), usuario.getId(), SegurancaAuditoria.LOGIN_FALHA,
                    "Senha incorreta (" + falhas + "/" + MAX_TENTATIVAS + ")");
        }
    }

    /** O usuário troca a própria senha; as demais sessões abertas caem e a atual recebe um token novo. */
    @Transactional
    public AuthDtos.TokenResponse trocarSenha(Long usuarioId, String senhaAtual, String novaSenha) {
        Usuario usuario = usuarioRepository.findById(usuarioId).filter(Usuario::isAtivo)
                .orElseThrow(CredenciaisInvalidasException::new);
        // 400 (e não 401): senha atual errada não pode derrubar a sessão no frontend
        if (!passwordEncoder.matches(senhaAtual, usuario.getSenhaHash())) {
            throw new IllegalArgumentException("A senha atual está incorreta.");
        }
        PoliticaSenha.validar(novaSenha, usuario.getEmail(), usuario.getNome());
        if (passwordEncoder.matches(novaSenha, usuario.getSenhaHash())) {
            throw new IllegalArgumentException("A nova senha precisa ser diferente da atual.");
        }
        usuario.setSenhaHash(passwordEncoder.encode(novaSenha));
        usuario.setSenhaTemporaria(false);
        usuario.setSenhaAlteradaEm(OffsetDateTime.now());
        usuario.setTokenVersao(usuario.getTokenVersao() + 1);
        sessaoValidator.invalidar(usuario.getId());
        auditoria.registrar(usuario.getEmpresaId(), usuario.getId(), usuario.getId(), SegurancaAuditoria.SENHA_ALTERADA, null);
        String empresa = empresaRepository.findById(usuario.getEmpresaId()).map(e -> e.getNome()).orElse("");
        return emitir(usuario, empresa);
    }

    private AuthDtos.TokenResponse emitir(Usuario usuario, String empresaNome) {
        Instant agora = Instant.now();
        Instant expira = agora.plus(ttlMinutos, ChronoUnit.MINUTES);
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .subject(String.valueOf(usuario.getId()))
                .issuedAt(agora)
                .expiresAt(expira)
                .claim("empresaId", usuario.getEmpresaId())
                .claim("perfil", usuario.getPerfil().name())
                .claim("tv", usuario.getTokenVersao());
        if (usuario.getVendedorId() != null) {
            claims.claim("vendedorId", usuario.getVendedorId());
        }
        String token = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims.build())).getTokenValue();
        return new AuthDtos.TokenResponse(token, "Bearer", expira, AuthDtos.UsuarioResponse.from(usuario, empresaNome));
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
