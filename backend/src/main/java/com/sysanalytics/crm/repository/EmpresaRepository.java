package com.sysanalytics.crm.repository;

import com.sysanalytics.crm.domain.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmpresaRepository extends JpaRepository<Empresa, Long> {

    List<Empresa> findByAtivaTrue();
}
