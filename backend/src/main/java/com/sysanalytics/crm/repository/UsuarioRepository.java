package com.sysanalytics.crm.repository;

import com.sysanalytics.crm.domain.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmailIgnoreCase(String email);

    Optional<Usuario> findByIdAndEmpresaIdAndAtivoTrue(Long id, Long empresaId);

    /** Usuário (login) ligado a um vendedor, usado para atribuir tarefas geradas por alertas. */
    Optional<Usuario> findFirstByEmpresaIdAndVendedorIdAndAtivoTrue(Long empresaId, Long vendedorId);
}
