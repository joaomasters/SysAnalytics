package com.sysanalytics.crm.security;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Autenticação")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService service;

    @Operation(summary = "Login: devolve um JWT com empresa e perfil do usuário")
    @PostMapping("/login")
    public AuthDtos.TokenResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return service.login(request.email(), request.senha());
    }

    @Operation(summary = "Dados do usuário autenticado")
    @GetMapping("/me")
    public AuthDtos.UsuarioResponse me() {
        return service.me(UsuarioLogado.atual().usuarioId());
    }
}
