package com.sysanalytics.crm.repository;

import com.sysanalytics.crm.domain.Vendedor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VendedorRepository extends JpaRepository<Vendedor, Long> {

    List<Vendedor> findByEmpresaIdOrderByNomeAsc(Long empresaId);
}
