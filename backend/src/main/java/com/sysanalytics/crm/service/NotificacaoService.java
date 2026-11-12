package com.sysanalytics.crm.service;

import com.sysanalytics.crm.domain.NotificacaoAlerta;
import com.sysanalytics.crm.repository.NotificacaoAlertaRepository;
import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.web.dto.NotificacaoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

/** Alertas do usuário logado: sempre da sua empresa e, para vendedor, só da sua carteira. */
@Service
@RequiredArgsConstructor
public class NotificacaoService {

    private final NotificacaoAlertaRepository repository;

    @Transactional(readOnly = true)
    public Page<NotificacaoResponse> listar(boolean apenasNaoLidas, int pagina, int tamanho) {
        UsuarioLogado u = UsuarioLogado.atual();
        PageRequest page = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamanho, 1), 200));
        return repository.buscar(u.empresaId(), !u.restritoAoVendedor(), vendedorEscopo(u), apenasNaoLidas, page)
                .map(NotificacaoResponse::from);
    }

    @Transactional(readOnly = true)
    public long contarNaoLidas() {
        UsuarioLogado u = UsuarioLogado.atual();
        return repository.contarNaoLidas(u.empresaId(), !u.restritoAoVendedor(), vendedorEscopo(u));
    }

    @Transactional
    public NotificacaoResponse marcarComoLida(Long id) {
        UsuarioLogado u = UsuarioLogado.atual();
        NotificacaoAlerta n = repository.findByIdAndEmpresaId(id, u.empresaId())
                .filter(a -> !u.restritoAoVendedor() || u.vendedorIdEscopo().equals(a.getVendedorId()))
                // 404 (e não 403): não revela a existência de alertas de outras carteiras/empresas
                .orElseThrow(() -> new NoSuchElementException("Notificação não encontrada: " + id));
        n.setLida(true);
        return NotificacaoResponse.from(n);
    }

    @Transactional
    public int marcarTodasComoLidas() {
        UsuarioLogado u = UsuarioLogado.atual();
        return repository.marcarTodasComoLidas(u.empresaId(), !u.restritoAoVendedor(), vendedorEscopo(u));
    }

    /** Nunca nulo: quando não há restrição o valor é ignorado pela query. */
    private static Long vendedorEscopo(UsuarioLogado u) {
        Long escopo = u.vendedorIdEscopo();
        return escopo != null ? escopo : -1L;
    }
}
