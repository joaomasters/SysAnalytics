package com.sysanalytics.crm.repository;

import com.sysanalytics.crm.domain.Tarefa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TarefaRepository extends JpaRepository<Tarefa, Long> {

    Optional<Tarefa> findByIdAndEmpresaId(Long id, Long empresaId);

    Optional<Tarefa> findByEmpresaIdAndNotificacaoId(Long empresaId, Long notificacaoId);
}
