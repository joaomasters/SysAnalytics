package com.sysanalytics.crm.web.dto;

import com.sysanalytics.crm.domain.Perfil;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

public final class UsuarioDtos {

    private UsuarioDtos() {
    }

    public record UsuarioItem(Long id, String nome, String email, Perfil perfil, Long vendedorId, String vendedorNome,
                              boolean ativo, boolean senhaTemporaria, boolean bloqueado,
                              OffsetDateTime criadoEm, OffsetDateTime ultimoLoginEm) {
    }

    public record UsuarioRequest(
            @NotBlank(message = "Informe o nome") @Size(max = 120, message = "Nome com no máximo 120 caracteres") String nome,
            @NotBlank(message = "Informe o e-mail") @Email(message = "E-mail inválido") @Size(max = 160, message = "E-mail com no máximo 160 caracteres") String email,
            @NotNull(message = "Informe o perfil") Perfil perfil,
            Long vendedorId) {
    }

    public record AtivoRequest(@NotNull(message = "Informe se o usuário fica ativo") Boolean ativo) {
    }

    /** A senha temporária só aparece nesta resposta; depois disso não há como consultá-la. */
    public record SenhaTemporariaResponse(UsuarioItem usuario, String senhaTemporaria) {
    }

    public record VendedorOpcao(Long id, String nome, boolean vinculado) {
    }

    public record EventoSeguranca(Long id, String tipo, String usuarioNome, String alvoNome, String detalhe, String ip,
                                  OffsetDateTime criadoEm) {
    }
}
