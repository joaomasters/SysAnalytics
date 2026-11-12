package com.sysanalytics.crm.web.dto;

import com.sysanalytics.crm.domain.Contato;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class ContatoDtos {

    private ContatoDtos() {
    }

    public record ContatoRequest(
            @NotBlank(message = "Nome é obrigatório") @Size(max = 120, message = "Nome: no máximo 120 caracteres") String nome,
            @Size(max = 80, message = "Cargo: no máximo 80 caracteres") String cargo,
            @Email(message = "E-mail inválido") @Size(max = 160, message = "E-mail: no máximo 160 caracteres") String email,
            @Size(max = 20, message = "Telefone: no máximo 20 caracteres") String telefone,
            boolean principal
    ) {
    }

    public record ContatoResponse(Long id, String nome, String cargo, String email, String telefone, boolean principal) {

        public static ContatoResponse from(Contato c) {
            return new ContatoResponse(c.getId(), c.getNome(), c.getCargo(), c.getEmail(), c.getTelefone(), c.isPrincipal());
        }
    }
}
