package com.sysanalytics.crm.service;

import com.sysanalytics.crm.domain.Produto;
import com.sysanalytics.crm.repository.ProdutoRepository;
import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.web.dto.ProdutoDtos.ProdutoRequest;
import com.sysanalytics.crm.web.dto.ProdutoDtos.ProdutoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;

/** Catálogo da empresa. Todos leem; só gestor/admin escrevem (regra no controller). */
@Service
@RequiredArgsConstructor
public class ProdutoService {

    private final ProdutoRepository repository;

    @Transactional(readOnly = true)
    public List<ProdutoResponse> listar(String busca, boolean incluirInativos) {
        UsuarioLogado u = UsuarioLogado.atual();
        String termo = "%" + (busca == null ? "" : busca.trim().toLowerCase(Locale.ROOT)) + "%";
        return repository.buscar(u.empresaId(), incluirInativos, termo).stream().map(ProdutoResponse::from).toList();
    }

    @Transactional
    public ProdutoResponse criar(ProdutoRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        String codigo = req.codigo().trim();
        if (repository.existsByEmpresaIdAndCodigoIgnoreCase(u.empresaId(), codigo)) {
            throw new IllegalArgumentException("Já existe um produto com o código " + codigo);
        }
        Produto p = repository.save(Produto.builder()
                .empresaId(u.empresaId())
                .codigo(codigo)
                .nome(req.nome().trim())
                .descricao(limpar(req.descricao()))
                .unidade(req.unidade().trim().toUpperCase(Locale.ROOT))
                .precoUnitario(req.precoUnitario())
                .ativo(true)
                .criadoEm(OffsetDateTime.now())
                .build());
        return ProdutoResponse.from(p);
    }

    @Transactional
    public ProdutoResponse atualizar(Long id, ProdutoRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        Produto p = repository.findByIdAndEmpresaId(id, u.empresaId())
                .orElseThrow(() -> new NoSuchElementException("Produto não encontrado: " + id));
        String codigo = req.codigo().trim();
        if (repository.existsByEmpresaIdAndCodigoIgnoreCaseAndIdNot(u.empresaId(), codigo, id)) {
            throw new IllegalArgumentException("Já existe um produto com o código " + codigo);
        }
        p.setCodigo(codigo);
        p.setNome(req.nome().trim());
        p.setDescricao(limpar(req.descricao()));
        p.setUnidade(req.unidade().trim().toUpperCase(Locale.ROOT));
        p.setPrecoUnitario(req.precoUnitario());
        if (req.ativo() != null) {
            p.setAtivo(req.ativo());
        }
        return ProdutoResponse.from(p);
    }

    private static String limpar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
