package com.sysanalytics.crm.security;

import com.sysanalytics.crm.domain.Perfil;
import com.sysanalytics.crm.domain.Usuario;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(@NotBlank String email, @NotBlank String senha) {
    }

    public record UsuarioResponse(Long id, String nome, String email, Perfil perfil,
                                  Long empresaId, String empresaNome, Long vendedorId) {

        public static UsuarioResponse from(Usuario u, String empresaNome) {
            return new UsuarioResponse(u.getId(), u.getNome(), u.getEmail(), u.getPerfil(),
                    u.getEmpresaId(), empresaNome, u.getVendedorId());
        }
    }

    public record TokenResponse(String token, String tipo, Instant expiraEm, UsuarioResponse usuario) {
    }
}
