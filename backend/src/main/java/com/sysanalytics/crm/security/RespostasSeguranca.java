package com.sysanalytics.crm.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/** 401 e 403 gerados pelos filtros de segurança, no mesmo formato (ProblemDetail) do restante da API. */
@Component
@RequiredArgsConstructor
public class RespostasSeguranca implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper mapper;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException e) throws IOException {
        boolean comToken = request.getHeader(HttpHeaders.AUTHORIZATION) != null;
        escrever(response, HttpStatus.UNAUTHORIZED, "Não autenticado",
                comToken ? "Sua sessão expirou ou foi encerrada. Entre novamente." : "Autenticação necessária.");
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException e) throws IOException {
        escrever(response, HttpStatus.FORBIDDEN, "Acesso negado", "Você não tem permissão para realizar esta ação.");
    }

    private void escrever(HttpServletResponse response, HttpStatus status, String titulo, String detalhe) throws IOException {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detalhe);
        pd.setTitle(titulo);
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        mapper.writeValue(response.getWriter(), pd);
    }
}
