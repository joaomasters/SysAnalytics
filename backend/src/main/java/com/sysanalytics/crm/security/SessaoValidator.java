package com.sysanalytics.crm.security;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Confere, a cada requisição, se o dono do token continua ativo (usuário e empresa) e se o token não foi invalidado
 * por troca de senha, mudança de perfil ou desativação. O estado fica em cache por poucos segundos para não
 * pesar no banco; mudanças feitas por este serviço chamam {@link #invalidar(Long)} e valem na hora.
 */
@Component
@RequiredArgsConstructor
public class SessaoValidator {

    private static final long TTL_MS = 15_000;

    private record Estado(boolean ativo, int tokenVersao, long carregadoEm) {
    }

    private final JdbcTemplate jdbc;
    private final ConcurrentMap<Long, Estado> cache = new ConcurrentHashMap<>();

    public void validar(Jwt jwt) {
        long id;
        try {
            id = Long.parseLong(jwt.getSubject());
        } catch (NumberFormatException e) {
            throw new InvalidBearerTokenException("Token inválido");
        }
        long agora = System.currentTimeMillis();
        Estado estado = cache.get(id);
        if (estado == null || agora - estado.carregadoEm() > TTL_MS) {
            estado = carregar(id, agora);
            if (estado == null) cache.remove(id);
            else cache.put(id, estado);
        }
        Object tv = jwt.getClaims().get("tv");
        int versaoDoToken = tv instanceof Number n ? n.intValue() : 0; // tokens antigos não tinham "tv"
        if (estado == null || !estado.ativo() || estado.tokenVersao() != versaoDoToken) {
            throw new InvalidBearerTokenException("Sessão encerrada");
        }
    }

    public void invalidar(Long usuarioId) {
        cache.remove(usuarioId);
    }

    private Estado carregar(long id, long agora) {
        List<Estado> r = jdbc.query("""
                SELECT u.ativo AND e.ativa AS ativo, u.token_versao
                  FROM usuario u JOIN empresa e ON e.id = u.empresa_id WHERE u.id = ?
                """, (rs, i) -> new Estado(rs.getBoolean("ativo"), rs.getInt("token_versao"), agora), id);
        return r.isEmpty() ? null : r.get(0);
    }
}
