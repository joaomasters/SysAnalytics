package com.sysanalytics.crm.service;

import com.sysanalytics.crm.domain.NotificacaoAlerta;
import com.sysanalytics.crm.repository.NotificacaoAlertaRepository;
import com.sysanalytics.crm.web.dto.NotificacaoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class NotificacaoService {

    private final NotificacaoAlertaRepository repository;

    @Transactional(readOnly = true)
    public Page<NotificacaoResponse> listar(boolean apenasNaoLidas, int pagina, int tamanho) {
        PageRequest page = PageRequest.of(pagina, Math.min(tamanho, 200));
        Page<NotificacaoAlerta> resultado = apenasNaoLidas
                ? repository.findByLidaFalseOrderByCriadaEmDesc(page)
                : repository.findAllByOrderByCriadaEmDesc(page);
        return resultado.map(NotificacaoResponse::from);
    }

    @Transactional(readOnly = true)
    public long contarNaoLidas() {
        return repository.countByLidaFalse();
    }

    @Transactional
    public NotificacaoResponse marcarComoLida(Long id) {
        NotificacaoAlerta n = repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Notificação não encontrada: " + id));
        n.setLida(true);
        return NotificacaoResponse.from(n);
    }

    @Transactional
    public int marcarTodasComoLidas() {
        return repository.marcarTodasComoLidas();
    }
}
