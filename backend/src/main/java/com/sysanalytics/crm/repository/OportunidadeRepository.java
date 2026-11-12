package com.sysanalytics.crm.repository;

import com.sysanalytics.crm.domain.Oportunidade;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OportunidadeRepository extends JpaRepository<Oportunidade, Long> {

    Optional<Oportunidade> findByIdAndEmpresaId(Long id, Long empresaId);
}
