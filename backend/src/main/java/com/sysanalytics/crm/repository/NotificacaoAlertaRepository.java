package com.sysanalytics.crm.repository;

import com.sysanalytics.crm.domain.NivelRisco;
import com.sysanalytics.crm.domain.NotificacaoAlerta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;

public interface NotificacaoAlertaRepository extends JpaRepository<NotificacaoAlerta, Long> {

    Page<NotificacaoAlerta> findAllByOrderByCriadaEmDesc(Pageable pageable);

    Page<NotificacaoAlerta> findByLidaFalseOrderByCriadaEmDesc(Pageable pageable);

    long countByLidaFalse();

    boolean existsByClienteIdAndNivelAndDataReferencia(Long clienteId, NivelRisco nivel, LocalDate dataReferencia);

    @Modifying
    @Query("update NotificacaoAlerta n set n.lida = true where n.lida = false")
    int marcarTodasComoLidas();
}
