package com.sysanalytics.crm.security;

import com.sysanalytics.crm.domain.Perfil;
import com.sysanalytics.crm.domain.Usuario;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(@NotBlank(message = "Informe o e-mail") String email,
                               @NotBlank(message = "Informe a senha") String senha) {
    }

    public record TrocarSenhaRequest(@NotBlank(message = "Informe a senha atual") String senhaAtual,
                                     @NotBlank(message = "Informe a nova senha") @Size(max = 200) String novaSenha) {
    }

    public record UsuarioResponse(Long id, String nome, String email, Perfil perfil,
                                  Long empresaId, String empresaNome, Long vendedorId, boolean senhaTemporaria) {

        public static UsuarioResponse from(Usuario u, String empresaNome) {
            return new UsuarioResponse(u.getId(), u.getNome(), u.getEmail(), u.getPerfil(),
                    u.getEmpresaId(), empresaNome, u.getVendedorId(), u.isSenhaTemporaria());
        }
    }

    public record TokenResponse(String token, String tipo, Instant expiraEm, UsuarioResponse usuario) {
    }
}
