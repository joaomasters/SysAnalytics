package com.sysanalytics.crm.service;

import com.sysanalytics.crm.domain.Cliente;
import com.sysanalytics.crm.repository.ClienteRepository;
import com.sysanalytics.crm.security.UsuarioLogado;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

/** Regra única de acesso a um cliente: mesma empresa e, para vendedor, mesma carteira (senão 404). */
@Component
@RequiredArgsConstructor
public class ClienteAcesso {

    private final ClienteRepository clienteRepository;

    @Transactional(readOnly = true)
    public Cliente exigir(UsuarioLogado u, Long clienteId) {
        return clienteRepository.findByIdAndEmpresaId(clienteId, u.empresaId())
                .filter(c -> !u.restritoAoVendedor() || u.vendedorIdEscopo().equals(c.getVendedor().getId()))
                .orElseThrow(() -> new NoSuchElementException("Cliente não encontrado: " + clienteId));
    }
}
