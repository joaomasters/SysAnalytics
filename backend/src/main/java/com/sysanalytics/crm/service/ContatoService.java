package com.sysanalytics.crm.service;

import com.sysanalytics.crm.domain.Cliente;
import com.sysanalytics.crm.domain.Contato;
import com.sysanalytics.crm.repository.ContatoRepository;
import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.web.dto.ContatoDtos.ContatoRequest;
import com.sysanalytics.crm.web.dto.ContatoDtos.ContatoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;

/** Contatos de um cliente. Vendedor só mexe em clientes da própria carteira; fora dela vale 404. */
@Service
@RequiredArgsConstructor
public class ContatoService {

    private final ContatoRepository contatoRepository;
    private final ClienteAcesso clienteAcesso;

    @Transactional(readOnly = true)
    public List<ContatoResponse> listar(Long clienteId) {
        UsuarioLogado u = UsuarioLogado.atual();
        clienteAcessivel(u, clienteId);
        return listarAtivos(u.empresaId(), clienteId);
    }

    /** Usado também pelo detalhe do cliente (que já validou o acesso). */
    @Transactional(readOnly = true)
    public List<ContatoResponse> listarAtivos(Long empresaId, Long clienteId) {
        return contatoRepository.findByEmpresaIdAndClienteIdAndAtivoTrueOrderByPrincipalDescNomeAsc(empresaId, clienteId)
                .stream().map(ContatoResponse::from).toList();
    }

    @Transactional
    public ContatoResponse criar(Long clienteId, ContatoRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        clienteAcessivel(u, clienteId);

        boolean primeiro = contatoRepository
                .findByEmpresaIdAndClienteIdAndAtivoTrueOrderByPrincipalDescNomeAsc(u.empresaId(), clienteId).isEmpty();
        // o primeiro contato do cliente é sempre o principal
        boolean principal = req.principal() || primeiro;
        if (principal) {
            contatoRepository.desmarcarPrincipal(u.empresaId(), clienteId);
        }
        Contato contato = contatoRepository.save(Contato.builder()
                .empresaId(u.empresaId())
                .clienteId(clienteId)
                .nome(req.nome().trim())
                .cargo(limpar(req.cargo()))
                .email(limpar(req.email()))
                .telefone(limpar(req.telefone()))
                .principal(principal)
                .ativo(true)
                .criadoEm(OffsetDateTime.now())
                .build());
        return ContatoResponse.from(contato);
    }

    @Transactional
    public ContatoResponse atualizar(Long clienteId, Long contatoId, ContatoRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        clienteAcessivel(u, clienteId);

        if (req.principal()) {
            contatoRepository.desmarcarPrincipal(u.empresaId(), clienteId); // limpa o contexto de persistência
        }
        Contato contato = buscar(u, clienteId, contatoId);
        contato.setNome(req.nome().trim());
        contato.setCargo(limpar(req.cargo()));
        contato.setEmail(limpar(req.email()));
        contato.setTelefone(limpar(req.telefone()));
        if (req.principal()) {
            contato.setPrincipal(true);
        }
        // deixar de ser principal só acontece ao promover outro contato (sempre há um principal)
        return ContatoResponse.from(contato);
    }

    @Transactional
    public void remover(Long clienteId, Long contatoId) {
        UsuarioLogado u = UsuarioLogado.atual();
        clienteAcessivel(u, clienteId);
        Contato contato = buscar(u, clienteId, contatoId);
        boolean eraPrincipal = contato.isPrincipal();
        contato.setAtivo(false);
        contato.setPrincipal(false);
        if (eraPrincipal) {
            contatoRepository.flush();
            // promove o próximo contato ativo, para o cliente nunca ficar sem principal
            contatoRepository.findByEmpresaIdAndClienteIdAndAtivoTrueOrderByPrincipalDescNomeAsc(u.empresaId(), clienteId)
                    .stream().findFirst().ifPresent(c -> c.setPrincipal(true));
        }
    }

    // ------------------------------------------------------------------

    private Contato buscar(UsuarioLogado u, Long clienteId, Long contatoId) {
        return contatoRepository.findByIdAndEmpresaIdAndClienteIdAndAtivoTrue(contatoId, u.empresaId(), clienteId)
                .orElseThrow(() -> new NoSuchElementException("Contato não encontrado: " + contatoId));
    }

    private Cliente clienteAcessivel(UsuarioLogado u, Long clienteId) {
        return clienteAcesso.exigir(u, clienteId);
    }

    private static String limpar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
