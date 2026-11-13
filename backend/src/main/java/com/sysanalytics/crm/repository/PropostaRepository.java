package com.sysanalytics.crm.repository;

import com.sysanalytics.crm.domain.Proposta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PropostaRepository extends JpaRepository<Proposta, Long> {

    Optional<Proposta> findByIdAndEmpresaId(Long id, Long empresaId);
}
