package com.sysanalytics.crm.repository;

import com.sysanalytics.crm.domain.Faturamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.Optional;

public interface FaturamentoRepository extends JpaRepository<Faturamento, Long> {

    /** Data da última compra do cliente (HQL). */
    @Query("select max(f.dataFaturamento) from Faturamento f where f.cliente.id = :clienteId")
    Optional<LocalDate> findUltimaCompra(Long clienteId);
}
