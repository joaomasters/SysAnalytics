package com.sysanalytics.crm.repository;

import com.sysanalytics.crm.domain.PropostaItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PropostaItemRepository extends JpaRepository<PropostaItem, Long> {

    List<PropostaItem> findByPropostaIdOrderByIdAsc(Long propostaId);

    /** Troca de itens na edição: apaga todos e regrava (a proposta em rascunho é pequena). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from PropostaItem i where i.propostaId = :propostaId")
    int apagarDaProposta(@Param("propostaId") Long propostaId);
}
