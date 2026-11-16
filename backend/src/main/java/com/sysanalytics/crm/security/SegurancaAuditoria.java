package com.sysanalytics.crm.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** Trilha de eventos de segurança (logins, bloqueios, trocas de senha, mudanças em usuários). */
@Slf4j
@Component
@RequiredArgsConstructor
public class SegurancaAuditoria {

    public static final String LOGIN_OK = "LOGIN_OK";
    public static final String LOGIN_FALHA = "LOGIN_FALHA";
    public static final String LOGIN_BLOQUEADO = "LOGIN_BLOQUEADO";
    public static final String SENHA_ALTERADA = "SENHA_ALTERADA";
    public static final String SENHA_REDEFINIDA = "SENHA_REDEFINIDA";
    public static final String USUARIO_CRIADO = "USUARIO_CRIADO";
    public static final String USUARIO_ALTERADO = "USUARIO_ALTERADO";
    public static final String USUARIO_ATIVADO = "USUARIO_ATIVADO";
    public static final String USUARIO_DESATIVADO = "USUARIO_DESATIVADO";
    public static final String USUARIO_DESBLOQUEADO = "USUARIO_DESBLOQUEADO";

    private final JdbcTemplate jdbc;

    /** Nunca derruba a operação principal: falha ao gravar o evento só vai para o log. */
    public void registrar(Long empresaId, Long usuarioId, Long alvoId, String tipo, String detalhe) {
        try {
            jdbc.update("INSERT INTO evento_seguranca (empresa_id, usuario_id, alvo_id, tipo, detalhe, ip) VALUES (?, ?, ?, ?, ?, ?)",
                    empresaId, usuarioId, alvoId, tipo, detalhe == null ? null : detalhe.substring(0, Math.min(detalhe.length(), 300)), ipAtual());
        } catch (RuntimeException e) {
            log.warn("Não foi possível registrar o evento de segurança {}: {}", tipo, e.getMessage());
        }
    }

    private static String ipAtual() {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes s) {
            String ip = s.getRequest().getRemoteAddr();
            return ip == null ? null : ip.substring(0, Math.min(ip.length(), 45));
        }
        return null;
    }
}
