package com.sysanalytics.crm.service;

import com.sysanalytics.crm.repository.ClienteRepository;
import com.sysanalytics.crm.repository.ClienteSituacao;
import com.sysanalytics.crm.repository.ConsultasAnaliticas;
import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.web.dto.ClienteDetalheResponse;
import com.sysanalytics.crm.web.dto.ClienteDetalheResponse.NotaResumo;
import com.sysanalytics.crm.web.dto.ClienteRiscoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class ClienteDetalheService {

    private final JdbcTemplate jdbcTemplate;
    private final ClienteRepository clienteRepository;
    private final ContatoService contatoService;

    @Transactional(readOnly = true)
    public ClienteDetalheResponse detalhar(Long clienteId) {
        UsuarioLogado u = UsuarioLogado.atual();
        Long empresaId = u.empresaId();
        Long vendedorId = u.vendedorIdEscopo();

        // A própria consulta aplica empresa e carteira: cliente de outra carteira/empresa = 404
        List<ClienteSituacao> situacao = jdbcTemplate.query(ConsultasAnaliticas.SITUACAO_CLIENTE,
                ClienteSituacao.ROW_MAPPER, empresaId, vendedorId, vendedorId, clienteId);
        if (situacao.isEmpty()) {
            throw new NoSuchElementException("Cliente não encontrado: " + clienteId);
        }

        var cliente = clienteRepository.findByIdAndEmpresaId(clienteId, empresaId)
                .orElseThrow(() -> new NoSuchElementException("Cliente não encontrado: " + clienteId));

        List<NotaResumo> notas = jdbcTemplate.query(ConsultasAnaliticas.ULTIMAS_NOTAS_CLIENTE,
                (rs, i) -> new NotaResumo(
                        rs.getString("numero_nota"),
                        rs.getDate("data_faturamento").toLocalDate(),
                        rs.getBigDecimal("valor_total").setScale(2, RoundingMode.HALF_UP)),
                empresaId, clienteId);

        return new ClienteDetalheResponse(
                ClienteRiscoResponse.from(situacao.get(0)),
                cliente.getEmail(),
                cliente.getTelefone(),
                cliente.getDataCadastro(),
                contatoService.listarAtivos(empresaId, clienteId),
                notas);
    }
}
