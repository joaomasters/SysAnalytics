package com.sysanalytics.crm.service;

import com.sysanalytics.crm.domain.NivelRisco;
import com.sysanalytics.crm.repository.ClienteSituacao;
import com.sysanalytics.crm.repository.ConsultasAnaliticas;
import com.sysanalytics.crm.web.dto.ClienteRiscoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClienteAnaliticoService {

    private final JdbcTemplate jdbcTemplate;

    public List<ClienteSituacao> situacaoClientes() {
        return jdbcTemplate.query(ConsultasAnaliticas.SITUACAO_CLIENTES, ClienteSituacao.ROW_MAPPER);
    }

    /**
     * Lista clientes com a régua de churn aplicada.
     *
     * @param niveis        filtro por nível de risco (vazio = todos)
     * @param busca         busca textual em nome fantasia, razão social ou CNPJ
     * @param apenasEmRisco se true, devolve apenas Alerta/Atenção/Crítico
     */
    public List<ClienteRiscoResponse> listar(Collection<NivelRisco> niveis, String busca, boolean apenasEmRisco) {
        String termo = busca == null ? "" : normalizar(busca.trim());
        String termoDigitos = termo.replaceAll("\\D", "");

        return situacaoClientes().stream()
                .filter(s -> !apenasEmRisco || s.nivel() != NivelRisco.SEM_RISCO)
                .filter(s -> niveis == null || niveis.isEmpty() || niveis.contains(s.nivel()))
                .filter(s -> termo.isEmpty()
                        || normalizar(s.nomeFantasia()).contains(termo)
                        || normalizar(s.razaoSocial()).contains(termo)
                        || (!termoDigitos.isEmpty() && s.cnpj().replaceAll("\\D", "").contains(termoDigitos)))
                .sorted(Comparator
                        .comparing((ClienteSituacao s) -> s.diasInatividade() == null ? Integer.MAX_VALUE : s.diasInatividade())
                        .reversed())
                .map(ClienteRiscoResponse::from)
                .toList();
    }

    public Map<NivelRisco, Long> contagemPorNivel() {
        Map<NivelRisco, Long> contagem = new EnumMap<>(NivelRisco.class);
        Arrays.stream(NivelRisco.values()).forEach(n -> contagem.put(n, 0L));
        contagem.putAll(situacaoClientes().stream()
                .collect(Collectors.groupingBy(ClienteSituacao::nivel, Collectors.counting())));
        return contagem;
    }

    private static String normalizar(String texto) {
        if (texto == null) return "";
        return Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }
}
