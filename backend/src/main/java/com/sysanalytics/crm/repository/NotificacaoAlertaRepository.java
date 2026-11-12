package com.sysanalytics.crm.repository;

import com.sysanalytics.crm.domain.NivelRisco;
import com.sysanalytics.crm.domain.NotificacaoAlerta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Todas as consultas filtram por {@code empresaId}. O escopo de carteira usa o par
 * {@code (todos, vendedorId)}: com {@code todos = true} o vendedorId é ignorado
 * (evita parâmetro nulo em JPQL).
 */
public interface NotificacaoAlertaRepository extends JpaRepository<NotificacaoAlerta, Long> {

    @Query("""
            select n from NotificacaoAlerta n
             where n.empresaId = :empresaId
               and (:todos = true or n.vendedorId = :vendedorId)
               and (:apenasNaoLidas = false or n.lida = false)
             order by n.criadaEm desc
            """)
    Page<NotificacaoAlerta> buscar(@Param("empresaId") Long empresaId,
                                   @Param("todos") boolean todos,
                                   @Param("vendedorId") Long vendedorId,
                                   @Param("apenasNaoLidas") boolean apenasNaoLidas,
                                   Pageable pageable);

    @Query("""
            select count(n) from NotificacaoAlerta n
             where n.empresaId = :empresaId
               and (:todos = true or n.vendedorId = :vendedorId)
               and n.lida = false
            """)
    long contarNaoLidas(@Param("empresaId") Long empresaId,
                        @Param("todos") boolean todos,
                        @Param("vendedorId") Long vendedorId);

    Optional<NotificacaoAlerta> findByIdAndEmpresaId(Long id, Long empresaId);

    boolean existsByEmpresaIdAndClienteIdAndNivelAndDataReferencia(
            Long empresaId, Long clienteId, NivelRisco nivel, LocalDate dataReferencia);

    @Modifying
    @Query("""
            update NotificacaoAlerta n set n.lida = true
             where n.empresaId = :empresaId
               and (:todos = true or n.vendedorId = :vendedorId)
               and n.lida = false
            """)
    int marcarTodasComoLidas(@Param("empresaId") Long empresaId,
                             @Param("todos") boolean todos,
                             @Param("vendedorId") Long vendedorId);
}
