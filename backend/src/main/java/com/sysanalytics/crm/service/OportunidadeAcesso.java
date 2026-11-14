package com.sysanalytics.crm.service;

import com.sysanalytics.crm.domain.Oportunidade;
import com.sysanalytics.crm.repository.OportunidadeRepository;
import com.sysanalytics.crm.security.UsuarioLogado;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

/** Regra única de acesso a uma oportunidade: mesma empresa e, para vendedor, ser o responsável (senão 404). */
@Component
@RequiredArgsConstructor
public class OportunidadeAcesso {

    private final OportunidadeRepository repository;

    @Transactional(readOnly = true)
    public Oportunidade exigir(UsuarioLogado u, Long id) {
        return repository.findByIdAndEmpresaId(id, u.empresaId())
                .filter(o -> !u.restritoAoVendedor() || o.getResponsavelId().equals(u.usuarioId()))
                .orElseThrow(() -> new NoSuchElementException("Oportunidade não encontrada: " + id));
    }
}
