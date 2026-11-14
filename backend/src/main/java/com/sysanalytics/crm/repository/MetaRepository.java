package com.sysanalytics.crm.repository;

import com.sysanalytics.crm.domain.Meta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface MetaRepository extends JpaRepository<Meta, Long> {

    List<Meta> findByEmpresaIdAndCompetencia(Long empresaId, LocalDate competencia);
}
