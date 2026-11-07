package com.sysanalytics.crm.batch;

import com.sysanalytics.crm.domain.NivelRisco;
import com.sysanalytics.crm.web.dto.ExecucaoJobResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.*;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnaliseInatividadeService {

    private final JobLauncher jobLauncher;
    private final Job analiseInatividadeJob;

    /** Execução agendada (cron configurável em crm.inatividade.cron). */
    @Scheduled(cron = "${crm.inatividade.cron}")
    public void execucaoAgendada() {
        log.info("Execução agendada da análise de inatividade");
        executar("AGENDADA");
    }

    /**
     * Executa o job de forma síncrona e devolve o resumo.
     * Sincronizado para evitar duas análises em paralelo no piloto.
     */
    public synchronized ExecucaoJobResponse executar(String origem) {
        JobParameters params = new JobParametersBuilder()
                .addLocalDate("dataReferencia", LocalDate.now())
                .addString("origem", origem, false)
                .addLong("timestamp", System.currentTimeMillis())
                .toJobParameters();
        try {
            JobExecution execution = jobLauncher.run(analiseInatividadeJob, params);
            return toResponse(execution);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao executar a análise de inatividade: " + e.getMessage(), e);
        }
    }

    private ExecucaoJobResponse toResponse(JobExecution execution) {
        long lidos = 0;
        long publicados = 0;
        Map<NivelRisco, Integer> porNivel = new LinkedHashMap<>();
        for (NivelRisco nivel : NivelRisco.values()) {
            if (nivel != NivelRisco.SEM_RISCO) porNivel.put(nivel, 0);
        }
        for (StepExecution step : execution.getStepExecutions()) {
            lidos += step.getReadCount();
            publicados += step.getWriteCount();
            porNivel.replaceAll((nivel, total) -> total + step.getExecutionContext()
                    .getInt(AnaliseInatividadeJobConfig.CTX_EVENTOS_PREFIX + nivel.name(), 0));
        }
        long duracaoMs = execution.getStartTime() != null && execution.getEndTime() != null
                ? Duration.between(execution.getStartTime(), execution.getEndTime()).toMillis()
                : 0;
        String erro = execution.getAllFailureExceptions().stream()
                .findFirst().map(Throwable::getMessage).orElse(null);

        log.info("Análise de inatividade {}: {} clientes em risco, {} eventos publicados {}",
                execution.getStatus(), lidos, publicados, porNivel);

        return new ExecucaoJobResponse(
                execution.getId(),
                execution.getStatus().name(),
                execution.getStartTime(),
                execution.getEndTime(),
                duracaoMs,
                lidos,
                publicados,
                porNivel,
                erro);
    }
}
