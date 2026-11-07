# SysAnalytics CRM — Piloto (PoC)

CRM analítico e operacional: KPIs financeiros por período, régua de inatividade (risco de churn) e
alertas assíncronos via RabbitMQ. Enquanto não há acesso ao ERP de produção, um **DataSeeder** popula o
PostgreSQL com dados mock coerentes na primeira subida.

```
┌──────────────┐  /api (proxy)  ┌────────────────────────────┐     ┌────────────┐
│ React + Vite │ ─────────────► │ Spring Boot 3 (Java 17+)   │ ──► │ PostgreSQL │
│ TanStack Q.  │                │  • REST + Swagger          │     └────────────┘
│ Recharts     │                │  • Spring Batch (job)      │
└──────────────┘                │  • Spring AMQP             │ ◄─► RabbitMQ
                                └────────────────────────────┘
```

## Como executar

Pré-requisitos: Docker, JDK 17+ e Node 18+.

```bash
# 1. Infraestrutura (PostgreSQL :5432, RabbitMQ :5672 / gestão :15672)
docker compose up -d

# 2. Backend (porta 8080) - o DataSeeder popula a base se estiver vazia
cd backend
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run

# 3. Frontend (porta 5173)
cd frontend
npm install
npm run dev
```

| Serviço            | URL                                         | Credenciais |
|--------------------|---------------------------------------------|-------------|
| Aplicação          | http://localhost:5173                       |             |
| Swagger UI         | http://localhost:8080/swagger-ui.html       |             |
| RabbitMQ (gestão)  | http://localhost:15672                      | crm / crm   |
| PostgreSQL         | localhost:5432 / base `sysanalytics`        | crm / crm   |

Para regenerar os dados mock do zero: `docker compose down -v && docker compose up -d` e reinicie o backend.

## Roteiro de demonstração

1. **Dashboard executivo:** alterne entre Diário, Semanal, Mensal e Semestral. Os cards e o gráfico de Faturamento × Custos × Saldo são recalculados (com "Tabela" para ver os valores exatos).
2. **Clientes & Churn:** 20 clientes com badge de risco. Filtre por nível ou procure por nome/CNPJ.
3. Clique em **Executar Análise de Inatividade**. O job do Spring Batch publica 8 eventos (4 Alerta, 2 Atenção, 2 Crítico) e o sino do cabeçalho passa a mostrar os não lidos.
4. **Central de Alertas:** feed com as mensagens (ex.: *"Cliente Alfa Alimentos está há 113 dias sem faturar. Nível: Crítico"*).
5. No log do backend aparece o **aviso prioritário simulado** (e-mail/WhatsApp) dos clientes críticos.
6. **Dead Letter:** `POST /api/v1/jobs/simular-falha-mensageria` publica um evento inválido, que vai parar em `q.dead-letter.alertas` (visível no painel do RabbitMQ).

## Regras de negócio

| Faixa         | Dias sem faturar (`CURRENT_DATE - MAX(data_faturamento)`) | Routing key                    |
|---------------|-----------------------------------------------------------|--------------------------------|
| Alerta Leve   | 30 – 59                                                   | `cliente.inatividade.alerta`   |
| Atenção Média | 60 – 89                                                   | `cliente.inatividade.atencao`  |
| Crítico       | 90+ (ou cliente sem nenhuma compra)                       | `cliente.inatividade.critico`  |

**KPIs** (`GET /api/v1/kpis?granularidade=DIARIO|SEMANAL|MENSAL|SEMESTRAL`): faturamento, custo (fixo/variável),
saldo operacional (faturamento − custos), margem %, saldo acumulado, ticket médio geral e por vendedor/carteira.
Janela padrão: 30 dias, 12 semanas, 12 meses ou semestres dos últimos 12 meses (`inicio`/`fim` são opcionais).
Períodos sem movimento aparecem com zero. O mês corrente é parcial: os custos fixos entram no dia 5, por isso pode aparecer com saldo negativo.

## Mensageria

```
crm.cliente.events (topic)
 ├─ cliente.inatividade.*        → q.notificacao.dashboard      → grava NotificacaoAlerta (feed)
 └─ cliente.inatividade.critico  → q.notificacao.email-vendedor → simula e-mail/WhatsApp ao vendedor

crm.dead-letter.exchange (direct)
 └─ dead-letter.crm              → q.dead-letter.alertas        (retenção de falhas)
```

- As duas filas de consumo declaram `x-dead-letter-exchange` / `x-dead-letter-routing-key`.
- Os listeners fazem 3 tentativas com backoff e depois rejeitam sem requeue, e a mensagem segue para a DLX.
- Mensagens inválidas lançam `AmqpRejectAndDontRequeueException`.
- **Idempotência:** o consumidor do dashboard grava no máximo um alerta por cliente/nível/dia (unique constraint). Reexecutar a análise no mesmo dia não duplica o feed.
- Conversão JSON via `Jackson2JsonMessageConverter` (pacotes confiáveis restritos).

## Endpoints

| Método | Rota                                              | Descrição                                   |
|--------|---------------------------------------------------|---------------------------------------------|
| GET    | `/api/v1/kpis`                                    | KPIs + série temporal + ticket por vendedor |
| GET    | `/api/v1/clientes?nivel=&busca=`                  | Todos os clientes com régua de risco        |
| GET    | `/api/v1/clientes-inativos?nivel=&busca=`         | Apenas clientes com 30+ dias                |
| GET    | `/api/v1/notificacoes?apenasNaoLidas=&pagina=`    | Feed de alertas                             |
| GET    | `/api/v1/notificacoes/nao-lidas/contagem`         | Contador do sino                            |
| PATCH  | `/api/v1/notificacoes/{id}/lida`                  | Marca como lido                             |
| PATCH  | `/api/v1/notificacoes/marcar-todas-lidas`         | Marca todos como lidos                      |
| POST   | `/api/v1/jobs/executar-analise-inatividade`       | Dispara o job (síncrono, devolve resumo)    |
| POST   | `/api/v1/jobs/simular-falha-mensageria`           | Demo da Dead Letter Queue                   |

O job também roda automaticamente todos os dias às 06:00 (`crm.inatividade.cron`).

## Dados mock (DataSeeder)

- 3 vendedores, um por carteira (Sudeste, Sul, Norte/Nordeste/Centro-Oeste), atribuídos pela UF do cliente.
- 20 clientes corporativos com CNPJ válido (dígitos verificadores), contato, segmento e cidade.
- Distribuição pela régua: 12 frequentes (5–25 dias), 4 Alerta (35–50), 2 Atenção (65–80) e 2 Crítico (96–140).
- Cerca de 500 notas fiscais em 12 meses, com ticket por porte do cliente e sazonalidade (Nov/Dez em alta, Jan/Fev em baixa).
- Custos fixos mensais (folha, aluguel, licenças...), variáveis semanais (frete, frota, marketing) e diários (combustível, embalagens).
- Semente aleatória fixa: os valores são reproduzíveis e as datas são relativas ao dia da subida.

## Estrutura

```
backend/src/main/java/com/sysanalytics/crm
├── domain/       Cliente, Vendedor, Faturamento, Custo, NotificacaoAlerta, NivelRisco
├── repository/   Repositórios JPA + ConsultasAnaliticas (SQL nativo) + ClienteSituacao
├── seed/         DataSeeder (CommandLineRunner)
├── batch/        AnaliseInatividadeJobConfig (reader → processor → writer) e serviço de execução
├── messaging/    Evento, publisher e consumidores (dashboard / e-mail vendedor)
├── service/      KpiService, Granularidade, ClienteAnaliticoService, NotificacaoService
├── config/       RabbitMqConfig, OpenApiConfig, WebConfig (CORS)
└── web/          Controllers REST + DTOs

frontend/src
├── api/          Cliente Axios + tipos
├── hooks/        Hooks TanStack Query (queries e mutations)
├── components/   ui/ (estilo shadcn), layout/, dashboard/, RiscoBadge
└── pages/        Dashboard, Clientes, Alertas
```

## Próximos passos para produção

- Trocar o DataSeeder por um *reader* do ERP (JDBC/CDC), com Flyway no lugar de `ddl-auto=update`.
- Autenticação (Spring Security + OIDC) e feed filtrado pelo vendedor autenticado.
- Integração real de e-mail/WhatsApp no `EmailVendedorConsumer`.
- Push em tempo real (SSE/WebSocket) no lugar do polling do contador.
- Testes de integração com Testcontainers (PostgreSQL + RabbitMQ).
