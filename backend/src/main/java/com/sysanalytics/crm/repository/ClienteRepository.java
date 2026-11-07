package com.sysanalytics.crm.repository;

import com.sysanalytics.crm.domain.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {
}
