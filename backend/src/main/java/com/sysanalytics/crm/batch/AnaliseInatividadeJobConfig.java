package com.sysanalytics.crm.batch;

import com.sysanalytics.crm.domain.NivelRisco;
import com.sysanalytics.crm.messaging.ClienteInatividadeEvent;
import com.sysanalytics.crm.messaging.InatividadeEventPublisher;
import com.sysanalytics.crm.repository.ClienteSituacao;
import com.sysanalytics.crm.repository.ConsultasAnaliticas;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.StepExecution;
import org.springframework.batch.core.configuration.annotation.StepScope;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.launch.support.RunIdIncrementer;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.database.JdbcCursorItemReader;
import org.springframework.batch.item.database.builder.JdbcCursorItemReaderBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Job de análise de inatividade comercial.
 * <pre>
 *  Reader    : SQL nativo com CURRENT_DATE - MAX(data_faturamento) (clientes com 30+ dias)
 *  Processor : classifica na régua (Alerta / Atenção / Crítico) e monta o evento
 *  Writer    : publica em crm.cliente.events com routing key cliente.inatividade.{nivel}
 * </pre>
 */
@Slf4j
@Configuration
public class AnaliseInatividadeJobConfig {

    public static final String JOB_NAME = "analiseInatividadeJob";
    public static final String CTX_EVENTOS_PREFIX = "eventos.";

    @Bean
    public Job analiseInatividadeJob(JobRepository jobRepository, Step identificarInativosStep) {
        return new JobBuilder(JOB_NAME, jobRepository)
                .incrementer(new RunIdIncrementer())
                .start(identificarInativosStep)
                .build();
    }

    @Bean
    public Step identificarInativosStep(JobRepository jobRepository,
                                        PlatformTransactionManager transactionManager,
                                        JdbcCursorItemReader<ClienteSituacao> clientesInativosReader,
                                        ItemProcessor<ClienteSituacao, ClienteInatividadeEvent> classificarRiscoProcessor,
                                        ItemWriter<ClienteInatividadeEvent> publicarEventoWriter) {
        return new StepBuilder("identificarInativosStep", jobRepository)
                .<ClienteSituacao, ClienteInatividadeEvent>chunk(50, transactionManager)
                .reader(clientesInativosReader)
                .processor(classificarRiscoProcessor)
                .writer(publicarEventoWriter)
                .build();
    }

    @Bean
    @StepScope
    public JdbcCursorItemReader<ClienteSituacao> clientesInativosReader(DataSource dataSource) {
        return new JdbcCursorItemReaderBuilder<ClienteSituacao>()
                .name("clientesInativosReader")
                .dataSource(dataSource)
                .sql(ConsultasAnaliticas.CLIENTES_INATIVOS)
                .rowMapper(ClienteSituacao.ROW_MAPPER)
                .build();
    }

    @Bean
    @StepScope
    public ItemProcessor<ClienteSituacao, ClienteInatividadeEvent> classificarRiscoProcessor(
            @Value("#{jobParameters['dataReferencia']}") LocalDate dataReferencia) {
        LocalDate referencia = dataReferencia != null ? dataReferencia : LocalDate.now();
        return situacao -> {
            if (situacao.nivel() == NivelRisco.SEM_RISCO) {
                return null; // filtrado: não gera evento
            }
            return new ClienteInatividadeEvent(
                    UUID.randomUUID(),
                    situacao.clienteId(),
                    situacao.nomeFantasia(),
                    situacao.cnpj(),
                    situacao.vendedorId(),
                    situacao.vendedorNome(),
                    situacao.vendedorEmail(),
                    situacao.vendedorTelefone(),
                    situacao.ultimaCompra(),
                    situacao.diasInatividade(),
                    situacao.nivel(),
                    referencia,
                    OffsetDateTime.now());
        };
    }

    @Bean
    @StepScope
    public ItemWriter<ClienteInatividadeEvent> publicarEventoWriter(
            InatividadeEventPublisher publisher,
            @Value("#{stepExecution}") StepExecution stepExecution) {
        return chunk -> {
            var ctx = stepExecution.getExecutionContext();
            for (ClienteInatividadeEvent event : chunk) {
                publisher.publicar(event);
                String key = CTX_EVENTOS_PREFIX + event.nivel().name();
                ctx.putInt(key, ctx.getInt(key, 0) + 1);
            }
            log.info("Chunk publicado: {} eventos de inatividade", chunk.size());
        };
    }
}
