package com.sysanalytics.crm.web;

import com.sysanalytics.crm.service.UsuarioService;
import com.sysanalytics.crm.web.dto.UsuarioDtos.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Usuários", description = "Cadastro e acesso dos usuários da empresa (gestor/admin)")
@RestController
@RequestMapping("/api/v1/usuarios")
@PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService service;

    @Operation(summary = "Lista os usuários da empresa")
    @GetMapping
    public List<UsuarioItem> listar(@RequestParam(required = false) String busca,
                                    @RequestParam(defaultValue = "true") boolean incluirInativos) {
        return service.listar(busca, incluirInativos);
    }

    @Operation(summary = "Vendedores da empresa, para vincular a um usuário com perfil VENDEDOR")
    @GetMapping("/vendedores")
    public List<VendedorOpcao> vendedores() {
        return service.vendedores();
    }

    @Operation(summary = "Últimos eventos de segurança da empresa (logins, bloqueios, trocas de senha, alterações)")
    @GetMapping("/eventos")
    public List<EventoSeguranca> eventos() {
        return service.eventos();
    }

    @Operation(summary = "Cria o usuário com senha temporária (exibida uma única vez)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SenhaTemporariaResponse criar(@Valid @RequestBody UsuarioRequest request) {
        return service.criar(request);
    }

    @Operation(summary = "Altera nome, e-mail, perfil e vendedor")
    @PutMapping("/{id}")
    public UsuarioItem atualizar(@PathVariable Long id, @Valid @RequestBody UsuarioRequest request) {
        return service.atualizar(id, request);
    }

    @Operation(summary = "Ativa ou desativa o usuário (encerra as sessões abertas)")
    @PatchMapping("/{id}/ativo")
    public UsuarioItem ativo(@PathVariable Long id, @Valid @RequestBody AtivoRequest request) {
        return service.definirAtivo(id, request.ativo());
    }

    @Operation(summary = "Gera nova senha temporária (exibida uma única vez) e encerra as sessões do usuário")
    @PostMapping("/{id}/redefinir-senha")
    public SenhaTemporariaResponse redefinirSenha(@PathVariable Long id) {
        return service.redefinirSenha(id);
    }

    @Operation(summary = "Remove o bloqueio por excesso de tentativas de login")
    @PostMapping("/{id}/desbloquear")
    public UsuarioItem desbloquear(@PathVariable Long id) {
        return service.desbloquear(id);
    }
}
