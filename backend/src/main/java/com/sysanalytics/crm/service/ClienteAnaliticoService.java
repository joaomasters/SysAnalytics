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

    /**
     * @param empresaId  tenant (obrigatório)
     * @param vendedorId restringe à carteira de um vendedor; {@code null} = empresa toda
     */
    public List<ClienteSituacao> situacaoClientes(Long empresaId, Long vendedorId) {
        return jdbcTemplate.query(ConsultasAnaliticas.SITUACAO_CLIENTES, ClienteSituacao.ROW_MAPPER,
                empresaId, vendedorId, vendedorId);
    }

    /**
     * Lista clientes com a régua de churn aplicada.
     *
     * @param empresaId     tenant (obrigatório)
     * @param vendedorId    restringe à carteira de um vendedor ({@code null} = sem restrição)
     * @param niveis        filtro por nível de risco (vazio = todos)
     * @param busca         busca textual em nome fantasia, razão social ou CNPJ
     * @param apenasEmRisco se true, devolve apenas Alerta/Atenção/Crítico
     */
    public List<ClienteRiscoResponse> listar(Long empresaId, Long vendedorId,
                                             Collection<NivelRisco> niveis, String busca, boolean apenasEmRisco) {
        String termo = busca == null ? "" : normalizar(busca.trim());
        String termoDigitos = termo.replaceAll("\\D", "");

        return situacaoClientes(empresaId, vendedorId).stream()
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

    public Map<NivelRisco, Long> contagemPorNivel(Long empresaId, Long vendedorId) {
        Map<NivelRisco, Long> contagem = new EnumMap<>(NivelRisco.class);
        Arrays.stream(NivelRisco.values()).forEach(n -> contagem.put(n, 0L));
        contagem.putAll(situacaoClientes(empresaId, vendedorId).stream()
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
