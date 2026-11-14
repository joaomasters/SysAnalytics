package com.sysanalytics.crm.repository;

import com.sysanalytics.crm.domain.Produto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProdutoRepository extends JpaRepository<Produto, Long> {

    /** {@code busca} nunca é nula: o serviço manda {@code %texto%} em minúsculas ({@code %%} = tudo). */
    @Query("""
            select p from Produto p
             where p.empresaId = :empresaId
               and (:todos = true or p.ativo = true)
               and (lower(p.nome) like :busca or lower(p.codigo) like :busca)
             order by p.nome
            """)
    List<Produto> buscar(@Param("empresaId") Long empresaId, @Param("todos") boolean todos,
                         @Param("busca") String busca);

    Optional<Produto> findByIdAndEmpresaId(Long id, Long empresaId);

    boolean existsByEmpresaIdAndCodigoIgnoreCase(Long empresaId, String codigo);

    boolean existsByEmpresaIdAndCodigoIgnoreCaseAndIdNot(Long empresaId, String codigo, Long id);
}
