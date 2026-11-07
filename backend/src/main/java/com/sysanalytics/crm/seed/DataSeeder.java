package com.sysanalytics.crm.seed;

import com.sysanalytics.crm.domain.*;
import com.sysanalytics.crm.repository.ClienteRepository;
import com.sysanalytics.crm.repository.CustoRepository;
import com.sysanalytics.crm.repository.FaturamentoRepository;
import com.sysanalytics.crm.repository.VendedorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

/**
 * Gera massa de dados mock realista enquanto não há acesso ao ERP de produção.
 * Executa apenas se a base estiver vazia (sem vendedores).
 *
 * <p>Distribuição dos 20 clientes pela régua de inatividade:</p>
 * <ul>
 *     <li>60% (12) compras frequentes - última compra há 5 a 25 dias</li>
 *     <li>20% (4) Alerta  - última compra há 35 a 50 dias</li>
 *     <li>10% (2) Atenção - última compra há 65 a 80 dias</li>
 *     <li>10% (2) Crítico - última compra há mais de 95 dias</li>
 * </ul>
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
@ConditionalOnProperty(name = "crm.seed.enabled", havingValue = "true", matchIfMissing = true)
public class DataSeeder implements CommandLineRunner {

    /** Semente fixa: os valores são reproduzíveis entre execuções (as datas são relativas a hoje). */
    private static final long SEED = 20261107L;

    private final VendedorRepository vendedorRepository;
    private final ClienteRepository clienteRepository;
    private final FaturamentoRepository faturamentoRepository;
    private final CustoRepository custoRepository;

    private final Random rnd = new Random(SEED);

    private enum Perfil {
        FREQUENTE(5, 25), ALERTA(35, 50), ATENCAO(65, 80), CRITICO(96, 140);

        final int minDias;
        final int maxDias;

        Perfil(int minDias, int maxDias) {
            this.minDias = minDias;
            this.maxDias = maxDias;
        }
    }

    private enum Porte {
        PEQUENO(2_500, 6_500), MEDIO(6_500, 16_000), GRANDE(16_000, 34_000);

        final int ticketMin;
        final int ticketMax;

        Porte(int ticketMin, int ticketMax) {
            this.ticketMin = ticketMin;
            this.ticketMax = ticketMax;
        }
    }

    private record ClienteMock(String fantasia, String razao, String segmento, String cidade, String uf,
                               String contato, Porte porte, Perfil perfil) {
    }

    private static final List<ClienteMock> CLIENTES = List.of(
            // 12 clientes com compras frequentes (60%)
            new ClienteMock("Mercado Bom Preço", "Bom Preço Supermercados Ltda", "Varejo Alimentar", "São Paulo", "SP", "Ricardo Almeida", Porte.GRANDE, Perfil.FREQUENTE),
            new ClienteMock("Construsul Materiais", "Construsul Comércio de Materiais de Construção S.A.", "Construção Civil", "Porto Alegre", "RS", "Fernanda Souza", Porte.GRANDE, Perfil.FREQUENTE),
            new ClienteMock("Farmavida", "Farmavida Drogarias Ltda", "Farmacêutico", "Belo Horizonte", "MG", "Juliana Costa", Porte.MEDIO, Perfil.FREQUENTE),
            new ClienteMock("TecnoPeças Industrial", "TecnoPeças Indústria e Comércio Ltda", "Metalurgia", "Joinville", "SC", "Marcos Pereira", Porte.GRANDE, Perfil.FREQUENTE),
            new ClienteMock("Distribuidora Nordeste", "Distribuidora de Bebidas Nordeste Ltda", "Distribuição", "Recife", "PE", "Ana Beatriz Lima", Porte.MEDIO, Perfil.FREQUENTE),
            new ClienteMock("AgroCampo", "AgroCampo Insumos Agrícolas Ltda", "Agronegócio", "Goiânia", "GO", "José Carlos Rocha", Porte.GRANDE, Perfil.FREQUENTE),
            new ClienteMock("Padaria Pão Dourado", "Pão Dourado Panificadora Eireli", "Food Service", "Campinas", "SP", "Luciana Martins", Porte.PEQUENO, Perfil.FREQUENTE),
            new ClienteMock("Hotel Mar Azul", "Mar Azul Hotelaria e Turismo Ltda", "Hotelaria", "Salvador", "BA", "Paulo Henrique Dias", Porte.MEDIO, Perfil.FREQUENTE),
            new ClienteMock("Clínica Saúde Total", "Saúde Total Serviços Médicos Ltda", "Saúde", "Curitiba", "PR", "Dra. Camila Ribeiro", Porte.PEQUENO, Perfil.FREQUENTE),
            new ClienteMock("Atacadão Central", "Central Atacadista de Alimentos S.A.", "Atacado", "Fortaleza", "CE", "Roberto Nunes", Porte.GRANDE, Perfil.FREQUENTE),
            new ClienteMock("LogExpress Transportes", "LogExpress Transportes e Logística Ltda", "Logística", "Campinas", "SP", "Thiago Barbosa", Porte.MEDIO, Perfil.FREQUENTE),
            new ClienteMock("Restaurante Sabor da Terra", "Sabor da Terra Restaurantes Ltda", "Food Service", "Florianópolis", "SC", "Mariana Teixeira", Porte.PEQUENO, Perfil.FREQUENTE),
            // 4 clientes na faixa de Alerta (20%)
            new ClienteMock("Escola Futuro Brilhante", "Instituto Educacional Futuro Brilhante Ltda", "Educação", "Brasília", "DF", "Patrícia Gomes", Porte.PEQUENO, Perfil.ALERTA),
            new ClienteMock("Auto Center Veloz", "Veloz Auto Peças e Serviços Ltda", "Automotivo", "Ribeirão Preto", "SP", "Eduardo Lopes", Porte.MEDIO, Perfil.ALERTA),
            new ClienteMock("Têxtil Fio de Ouro", "Fio de Ouro Indústria Têxtil S.A.", "Têxtil", "Blumenau", "SC", "Cláudia Hoffmann", Porte.GRANDE, Perfil.ALERTA),
            new ClienteMock("Gráfica Impacto", "Impacto Gráfica e Editora Ltda", "Gráfico", "Belo Horizonte", "MG", "Sérgio Moreira", Porte.PEQUENO, Perfil.ALERTA),
            // 2 clientes na faixa de Atenção (10%)
            new ClienteMock("Móveis Lar & Cia", "Lar e Cia Indústria de Móveis Ltda", "Moveleiro", "Bento Gonçalves", "RS", "Rafael Zanella", Porte.MEDIO, Perfil.ATENCAO),
            new ClienteMock("Beta Cosméticos", "Beta Cosméticos e Perfumaria Ltda", "Cosméticos", "Rio de Janeiro", "RJ", "Vanessa Cardoso", Porte.MEDIO, Perfil.ATENCAO),
            // 2 clientes na faixa Crítica (10%)
            new ClienteMock("Alfa Alimentos", "Alfa Alimentos Indústria e Comércio S.A.", "Indústria Alimentícia", "Londrina", "PR", "Gustavo Ferreira", Porte.GRANDE, Perfil.CRITICO),
            new ClienteMock("Delta Embalagens", "Delta Embalagens Plásticas Ltda", "Embalagens", "Manaus", "AM", "Renata Araújo", Porte.MEDIO, Perfil.CRITICO)
    );

    @Override
    @Transactional
    public void run(String... args) {
        if (vendedorRepository.count() > 0) {
            log.info("DataSeeder: base já populada, nada a fazer.");
            return;
        }
        LocalDate hoje = LocalDate.now();
        log.info("DataSeeder: gerando massa de dados mock (referência {})...", hoje);

        List<Vendedor> vendedores = criarVendedores();
        List<Cliente> clientes = criarClientes(vendedores, hoje);
        int notas = gerarFaturamentos(clientes, hoje);
        int custos = gerarCustos(hoje);

        log.info("DataSeeder concluído: {} vendedores, {} clientes, {} notas fiscais, {} lançamentos de custo.",
                vendedores.size(), clientes.size(), notas, custos);
    }

    // ------------------------------------------------------------------ vendedores

    private List<Vendedor> criarVendedores() {
        return vendedorRepository.saveAll(List.of(
                Vendedor.builder().nome("Carla Mendes").email("carla.mendes@sysanalytics.com.br")
                        .telefone("(11) 98877-1020").carteira("Sudeste - Varejo e Serviços").build(),
                Vendedor.builder().nome("Bruno Oliveira").email("bruno.oliveira@sysanalytics.com.br")
                        .telefone("(41) 99712-3344").carteira("Sul - Indústria").build(),
                Vendedor.builder().nome("Larissa Santos").email("larissa.santos@sysanalytics.com.br")
                        .telefone("(81) 99654-7788").carteira("Norte/Nordeste/Centro-Oeste - Distribuição").build()
        ));
    }

    // ------------------------------------------------------------------ clientes

    private List<Cliente> criarClientes(List<Vendedor> vendedores, LocalDate hoje) {
        Map<String, Vendedor> porCarteira = Map.of(
                "SUDESTE", vendedores.get(0), "SUL", vendedores.get(1), "OUTRAS", vendedores.get(2));

        List<Cliente> clientes = new ArrayList<>();
        for (ClienteMock m : CLIENTES) {
            Vendedor vendedor = switch (m.uf()) {
                case "SP", "RJ", "MG", "ES" -> porCarteira.get("SUDESTE");
                case "PR", "SC", "RS" -> porCarteira.get("SUL");
                default -> porCarteira.get("OUTRAS");
            };
            String slug = m.fantasia().toLowerCase(Locale.ROOT)
                    .replaceAll("[áàâã]", "a").replaceAll("[éê]", "e").replaceAll("[í]", "i")
                    .replaceAll("[óôõ]", "o").replaceAll("[ú]", "u").replaceAll("[ç]", "c")
                    .replaceAll("[^a-z0-9]", "");
            clientes.add(Cliente.builder()
                    .cnpj(gerarCnpj())
                    .nomeFantasia(m.fantasia())
                    .razaoSocial(m.razao())
                    .segmento(m.segmento())
                    .cidade(m.cidade())
                    .uf(m.uf())
                    .contato(m.contato())
                    .email("compras@" + slug + ".com.br")
                    .telefone(gerarTelefone(m.uf()))
                    .dataCadastro(hoje.minusMonths(14 + rnd.nextInt(30)))
                    .vendedor(vendedor)
                    .build());
        }
        return clienteRepository.saveAll(clientes);
    }

    // ------------------------------------------------------------------ faturamento

    private int gerarFaturamentos(List<Cliente> clientes, LocalDate hoje) {
        List<Faturamento> notas = new ArrayList<>();

        for (int i = 0; i < clientes.size(); i++) {
            Cliente cliente = clientes.get(i);
            ClienteMock mock = CLIENTES.get(i);

            LocalDate ultimaCompra = hoje.minusDays(entre(mock.perfil().minDias, mock.perfil().maxDias));
            // Todos os clientes já compravam há 12 meses: evita uma "rampa" artificial no início dos gráficos.
            // Os inativos param de comprar a partir da última compra, portanto o histórico efetivo varia de ~6 a 12 meses.
            LocalDate inicioHistorico = hoje.minusMonths(12).withDayOfMonth(1);
            // Clientes inativos tinham um ritmo mais espaçado antes de pararem de comprar
            int intervaloMin = mock.perfil() == Perfil.FREQUENTE ? 6 : 10;
            int intervaloMax = mock.perfil() == Perfil.FREQUENTE ? 16 : 24;

            LocalDate data = ultimaCompra;
            boolean primeira = true;
            while (!data.isBefore(inicioHistorico)) {
                // A última compra mantém a data exata; as demais caem sempre em dia útil
                LocalDate dataNota = primeira ? data : diaUtil(data);
                notas.add(Faturamento.builder()
                        .dataFaturamento(dataNota)
                        .valorTotal(valorNota(mock.porte(), dataNota))
                        .cliente(cliente)
                        .vendedor(cliente.getVendedor())
                        .build());
                primeira = false;
                data = data.minusDays(entre(intervaloMin, intervaloMax));
            }
        }

        // Numeração sequencial das notas por ordem cronológica
        notas.sort(Comparator.comparing(Faturamento::getDataFaturamento));
        int numero = 100_001;
        for (Faturamento f : notas) {
            f.setNumeroNota("NF-" + numero++);
        }
        faturamentoRepository.saveAll(notas);
        return notas.size();
    }

    private BigDecimal valorNota(Porte porte, LocalDate data) {
        double base = entre(porte.ticketMin, porte.ticketMax);
        double sazonalidade = switch (data.getMonth()) {
            case NOVEMBER, DECEMBER -> 1.20;   // Black Friday / fim de ano
            case JANUARY, FEBRUARY -> 0.85;    // férias / início de ano mais fraco
            default -> 1.0;
        };
        double ruido = 0.85 + rnd.nextDouble() * 0.30;
        return dinheiro(base * sazonalidade * ruido);
    }

    // ------------------------------------------------------------------ custos

    private int gerarCustos(LocalDate hoje) {
        List<Custo> custos = new ArrayList<>();
        LocalDate inicio = hoje.minusMonths(12).withDayOfMonth(1);

        // Mensais (fixos e um variável), lançados no dia 5
        for (LocalDate mes = inicio; !mes.isAfter(hoje); mes = mes.plusMonths(1)) {
            LocalDate dia = mes.withDayOfMonth(5);
            if (dia.isAfter(hoje)) break;
            custos.add(custo("Folha de pagamento", "Pessoal", TipoCusto.FIXO, Periodicidade.MENSAL, dia, 168_000 + rnd.nextInt(6_000)));
            custos.add(custo("Aluguel do centro de distribuição", "Infraestrutura", TipoCusto.FIXO, Periodicidade.MENSAL, dia, 38_000));
            custos.add(custo("Licenças ERP/CRM e cloud", "Tecnologia", TipoCusto.FIXO, Periodicidade.MENSAL, dia, 6_800));
            custos.add(custo("Honorários contábeis", "Administrativo", TipoCusto.FIXO, Periodicidade.MENSAL, dia, 4_900));
            custos.add(custo("Seguros patrimoniais e de frota", "Administrativo", TipoCusto.FIXO, Periodicidade.MENSAL, dia, 3_400));
            custos.add(custo("Energia elétrica", "Utilidades", TipoCusto.VARIAVEL, Periodicidade.MENSAL, dia, entre(9_000, 14_500)));
        }

        // Semanais (segunda-feira)
        for (LocalDate seg = inicio.with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
             !seg.isAfter(hoje); seg = seg.plusWeeks(1)) {
            custos.add(custo("Frete e transportadoras", "Logística", TipoCusto.VARIAVEL, Periodicidade.SEMANAL, seg, entre(9_000, 15_000)));
            custos.add(custo("Manutenção de frota", "Logística", TipoCusto.VARIAVEL, Periodicidade.SEMANAL, seg, entre(3_500, 7_000)));
            custos.add(custo("Marketing digital", "Comercial", TipoCusto.VARIAVEL, Periodicidade.SEMANAL, seg, entre(2_500, 4_200)));
        }

        // Diários (dias úteis)
        for (LocalDate dia = inicio; !dia.isAfter(hoje); dia = dia.plusDays(1)) {
            if (dia.getDayOfWeek() == DayOfWeek.SATURDAY || dia.getDayOfWeek() == DayOfWeek.SUNDAY) continue;
            custos.add(custo("Combustível", "Logística", TipoCusto.VARIAVEL, Periodicidade.DIARIO, dia, entre(650, 1_150)));
            custos.add(custo("Embalagens e material de consumo", "Operacional", TipoCusto.VARIAVEL, Periodicidade.DIARIO, dia, entre(380, 900)));
        }

        custoRepository.saveAll(custos);
        return custos.size();
    }

    private Custo custo(String descricao, String categoria, TipoCusto tipo, Periodicidade periodicidade,
                        LocalDate data, double valor) {
        return Custo.builder()
                .descricao(descricao)
                .categoria(categoria)
                .tipo(tipo)
                .periodicidade(periodicidade)
                .dataLancamento(data)
                .valor(dinheiro(valor))
                .build();
    }

    // ------------------------------------------------------------------ utilitários

    private int entre(int min, int max) {
        return min + rnd.nextInt(max - min + 1);
    }

    private static BigDecimal dinheiro(double valor) {
        return BigDecimal.valueOf(valor).setScale(2, RoundingMode.HALF_UP);
    }

    /** Recua para sexta-feira se a data cair no fim de semana. */
    private static LocalDate diaUtil(LocalDate data) {
        return switch (data.getDayOfWeek()) {
            case SATURDAY -> data.minusDays(1);
            case SUNDAY -> data.minusDays(2);
            default -> data;
        };
    }

    /** Gera um CNPJ (matriz 0001) com dígitos verificadores válidos, formatado. */
    private String gerarCnpj() {
        int[] n = new int[14];
        for (int i = 0; i < 8; i++) n[i] = rnd.nextInt(10);
        n[8] = 0;
        n[9] = 0;
        n[10] = 0;
        n[11] = 1;
        n[12] = digitoCnpj(n, 12);
        n[13] = digitoCnpj(n, 13);
        return String.format("%d%d.%d%d%d.%d%d%d/%d%d%d%d-%d%d",
                n[0], n[1], n[2], n[3], n[4], n[5], n[6], n[7], n[8], n[9], n[10], n[11], n[12], n[13]);
    }

    private static int digitoCnpj(int[] n, int tamanho) {
        int[] pesos = tamanho == 12
                ? new int[]{5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
                : new int[]{6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int soma = 0;
        for (int i = 0; i < tamanho; i++) soma += n[i] * pesos[i];
        int resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }

    private String gerarTelefone(String uf) {
        String ddd = switch (uf) {
            case "SP" -> "11";
            case "RJ" -> "21";
            case "MG" -> "31";
            case "PR" -> "41";
            case "SC" -> "47";
            case "RS" -> "51";
            case "DF" -> "61";
            case "GO" -> "62";
            case "BA" -> "71";
            case "PE" -> "81";
            case "CE" -> "85";
            case "AM" -> "92";
            default -> "11";
        };
        return "(%s) 3%03d-%04d".formatted(ddd, rnd.nextInt(1000), rnd.nextInt(10000));
    }
}
