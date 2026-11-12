package com.sysanalytics.crm.repository;

import com.sysanalytics.crm.domain.Contato;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ContatoRepository extends JpaRepository<Contato, Long> {

    List<Contato> findByEmpresaIdAndClienteIdAndAtivoTrueOrderByPrincipalDescNomeAsc(Long empresaId, Long clienteId);

    Optional<Contato> findByIdAndEmpresaIdAndClienteIdAndAtivoTrue(Long id, Long empresaId, Long clienteId);

    /**
     * Remove a marca de principal dos demais contatos do cliente. Precisa rodar (e ser gravada) antes de
     * marcar o novo principal, por causa do índice único parcial uk_contato_principal.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update Contato c set c.principal = false
             where c.empresaId = :empresaId and c.clienteId = :clienteId and c.principal = true
            """)
    int desmarcarPrincipal(@Param("empresaId") Long empresaId, @Param("clienteId") Long clienteId);
}
