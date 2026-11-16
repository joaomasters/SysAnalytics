package com.sysanalytics.crm.service;

import com.sysanalytics.crm.domain.Perfil;
import com.sysanalytics.crm.domain.Usuario;
import com.sysanalytics.crm.repository.UsuarioRepository;
import com.sysanalytics.crm.security.PoliticaSenha;
import com.sysanalytics.crm.security.SegurancaAuditoria;
import com.sysanalytics.crm.security.SessaoValidator;
import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.web.dto.UsuarioDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Cadastro e manutenção de usuários da própria empresa. Regras principais:
 * gestor não mexe em administrador; ninguém altera o próprio perfil nem se desativa; a empresa nunca fica sem
 * administrador ativo; senha temporária vale só até o primeiro acesso.
 */
@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository repository;
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final SessaoValidator sessaoValidator;
    private final SegurancaAuditoria auditoria;

    // ------------------------------------------------------------------ consultas

    @Transactional(readOnly = true)
    public List<UsuarioItem> listar(String busca, boolean incluirInativos) {
        UsuarioLogado eu = UsuarioLogado.atual();
        String termo = busca == null || busca.isBlank() ? null : "%" + busca.trim().toLowerCase() + "%";
        return jdbc.query("""
                SELECT u.id, u.nome, u.email, u.perfil, u.vendedor_id, v.nome AS vendedor_nome, u.ativo, u.senha_temporaria,
                       (u.bloqueado_ate IS NOT NULL AND u.bloqueado_ate > now()) AS bloqueado, u.criado_em, u.ultimo_login_em
                  FROM usuario u LEFT JOIN vendedor v ON v.id = u.vendedor_id
                 WHERE u.empresa_id = ? AND (? OR u.ativo)
                   AND (?::text IS NULL OR lower(u.nome) LIKE ? OR lower(u.email) LIKE ?)
                 ORDER BY u.ativo DESC, lower(u.nome)
                """, (rs, i) -> new UsuarioItem(rs.getLong("id"), rs.getString("nome"), rs.getString("email"),
                Perfil.valueOf(rs.getString("perfil")), (Long) rs.getObject("vendedor_id"), rs.getString("vendedor_nome"),
                rs.getBoolean("ativo"), rs.getBoolean("senha_temporaria"), rs.getBoolean("bloqueado"),
                rs.getObject("criado_em", OffsetDateTime.class), rs.getObject("ultimo_login_em", OffsetDateTime.class)),
                eu.empresaId(), incluirInativos, termo, termo, termo);
    }

    @Transactional(readOnly = true)
    public List<VendedorOpcao> vendedores() {
        return jdbc.query("""
                SELECT v.id, v.nome, EXISTS (SELECT 1 FROM usuario u WHERE u.vendedor_id = v.id AND u.ativo) AS vinculado
                  FROM vendedor v WHERE v.empresa_id = ? ORDER BY v.nome
                """, (rs, i) -> new VendedorOpcao(rs.getLong("id"), rs.getString("nome"), rs.getBoolean("vinculado")),
                UsuarioLogado.atual().empresaId());
    }

    @Transactional(readOnly = true)
    public List<EventoSeguranca> eventos() {
        return jdbc.query("""
                SELECT e.id, e.tipo, e.detalhe, e.ip, e.criado_em, u.nome AS usuario_nome, a.nome AS alvo_nome
                  FROM evento_seguranca e
                  LEFT JOIN usuario u ON u.id = e.usuario_id
                  LEFT JOIN usuario a ON a.id = e.alvo_id
                 WHERE e.empresa_id = ? ORDER BY e.criado_em DESC, e.id DESC LIMIT 100
                """, (rs, i) -> new EventoSeguranca(rs.getLong("id"), rs.getString("tipo"), rs.getString("usuario_nome"),
                rs.getString("alvo_nome"), rs.getString("detalhe"), rs.getString("ip"), rs.getObject("criado_em", OffsetDateTime.class)),
                UsuarioLogado.atual().empresaId());
    }

    // ------------------------------------------------------------------ alterações

    @Transactional
    public SenhaTemporariaResponse criar(UsuarioRequest req) {
        UsuarioLogado eu = UsuarioLogado.atual();
        exigirPodeAtribuir(eu, req.perfil());
        String email = req.email().trim().toLowerCase();
        if (repository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Já existe um usuário com este e-mail.");
        }
        Long vendedorId = validarVendedor(eu.empresaId(), req.perfil(), req.vendedorId(), null);
        String senha = PoliticaSenha.gerarTemporaria();
        Usuario u = repository.save(Usuario.builder().empresaId(eu.empresaId()).nome(req.nome().trim()).email(email)
                .senhaHash(passwordEncoder.encode(senha)).perfil(req.perfil()).vendedorId(vendedorId).ativo(true)
                .senhaTemporaria(true).criadoEm(OffsetDateTime.now()).build());
        auditoria.registrar(eu.empresaId(), eu.usuarioId(), u.getId(), SegurancaAuditoria.USUARIO_CRIADO, "Perfil " + u.getPerfil());
        return new SenhaTemporariaResponse(item(u.getId()), senha);
    }

    @Transactional
    public UsuarioItem atualizar(Long id, UsuarioRequest req) {
        UsuarioLogado eu = UsuarioLogado.atual();
        Usuario u = alvo(eu, id);
        exigirPodeAtribuir(eu, req.perfil());
        String email = req.email().trim().toLowerCase();
        if (repository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new IllegalArgumentException("Já existe um usuário com este e-mail.");
        }
        boolean mudouPerfil = u.getPerfil() != req.perfil();
        if (mudouPerfil) {
            if (u.getId().equals(eu.usuarioId())) {
                throw new IllegalArgumentException("Você não pode alterar o seu próprio perfil.");
            }
            if (u.getPerfil() == Perfil.ADMIN && u.isAtivo()) garantirOutroAdmin(eu.empresaId(), id);
        }
        Long vendedorId = validarVendedor(eu.empresaId(), req.perfil(), req.vendedorId(), id);
        boolean mudouAcesso = mudouPerfil || !email.equalsIgnoreCase(u.getEmail()) || !java.util.Objects.equals(vendedorId, u.getVendedorId());
        u.setNome(req.nome().trim());
        u.setEmail(email);
        u.setPerfil(req.perfil());
        u.setVendedorId(vendedorId);
        u.setAtualizadoEm(OffsetDateTime.now());
        if (mudouAcesso) encerrarSessoes(u); // o novo perfil/escopo vale imediatamente
        auditoria.registrar(eu.empresaId(), eu.usuarioId(), id, SegurancaAuditoria.USUARIO_ALTERADO,
                mudouPerfil ? "Perfil alterado para " + req.perfil() : "Dados alterados");
        repository.flush();
        return item(id);
    }

    @Transactional
    public UsuarioItem definirAtivo(Long id, boolean ativo) {
        UsuarioLogado eu = UsuarioLogado.atual();
        Usuario u = alvo(eu, id);
        if (u.isAtivo() == ativo) return item(id);
        if (!ativo) {
            if (u.getId().equals(eu.usuarioId())) throw new IllegalArgumentException("Você não pode desativar o seu próprio usuário.");
            if (u.getPerfil() == Perfil.ADMIN) garantirOutroAdmin(eu.empresaId(), id);
        } else if (u.getPerfil() == Perfil.VENDEDOR) {
            validarVendedor(eu.empresaId(), Perfil.VENDEDOR, u.getVendedorId(), id); // outro login pode ter assumido a carteira
        }
        u.setAtivo(ativo);
        u.setAtualizadoEm(OffsetDateTime.now());
        encerrarSessoes(u);
        auditoria.registrar(eu.empresaId(), eu.usuarioId(), id,
                ativo ? SegurancaAuditoria.USUARIO_ATIVADO : SegurancaAuditoria.USUARIO_DESATIVADO, null);
        repository.flush();
        return item(id);
    }

    @Transactional
    public SenhaTemporariaResponse redefinirSenha(Long id) {
        UsuarioLogado eu = UsuarioLogado.atual();
        Usuario u = alvo(eu, id);
        if (u.getId().equals(eu.usuarioId())) {
            throw new IllegalArgumentException("Para mudar a sua própria senha use a opção \"Minha conta\".");
        }
        String senha = PoliticaSenha.gerarTemporaria();
        u.setSenhaHash(passwordEncoder.encode(senha));
        u.setSenhaTemporaria(true);
        u.setTentativasFalhas(0);
        u.setBloqueadoAte(null);
        u.setAtualizadoEm(OffsetDateTime.now());
        encerrarSessoes(u);
        auditoria.registrar(eu.empresaId(), eu.usuarioId(), id, SegurancaAuditoria.SENHA_REDEFINIDA, null);
        repository.flush();
        return new SenhaTemporariaResponse(item(id), senha);
    }

    @Transactional
    public UsuarioItem desbloquear(Long id) {
        UsuarioLogado eu = UsuarioLogado.atual();
        Usuario u = alvo(eu, id);
        u.setTentativasFalhas(0);
        u.setBloqueadoAte(null);
        u.setAtualizadoEm(OffsetDateTime.now());
        auditoria.registrar(eu.empresaId(), eu.usuarioId(), id, SegurancaAuditoria.USUARIO_DESBLOQUEADO, null);
        repository.flush();
        return item(id);
    }

    // ------------------------------------------------------------------ regras

    /** Usuário da mesma empresa; gestor não administra administradores. */
    private Usuario alvo(UsuarioLogado eu, Long id) {
        Usuario u = repository.findByIdAndEmpresaId(id, eu.empresaId())
                .orElseThrow(() -> new NoSuchElementException("Usuário não encontrado."));
        if (eu.perfil() == Perfil.GESTOR && u.getPerfil() == Perfil.ADMIN) {
            throw new AccessDeniedException("Somente administradores podem gerenciar administradores.");
        }
        return u;
    }

    private static void exigirPodeAtribuir(UsuarioLogado eu, Perfil perfil) {
        if (perfil == Perfil.ADMIN && eu.perfil() != Perfil.ADMIN) {
            throw new AccessDeniedException("Somente administradores podem criar ou promover administradores.");
        }
    }

    private void garantirOutroAdmin(Long empresaId, Long idAtual) {
        Long outros = jdbc.queryForObject(
                "SELECT COUNT(*) FROM usuario WHERE empresa_id = ? AND perfil = 'ADMIN' AND ativo AND id <> ?", Long.class, empresaId, idAtual);
        if (outros == null || outros == 0) {
            throw new IllegalArgumentException("A empresa precisa ter pelo menos um administrador ativo.");
        }
    }

    /** VENDEDOR exige um vendedor da empresa ainda sem login ativo; os demais perfis não têm carteira. */
    private Long validarVendedor(Long empresaId, Perfil perfil, Long vendedorId, Long usuarioId) {
        if (perfil != Perfil.VENDEDOR) return null;
        if (vendedorId == null) throw new IllegalArgumentException("Selecione o vendedor (carteira) deste usuário.");
        Long existe = jdbc.queryForObject("SELECT COUNT(*) FROM vendedor WHERE id = ? AND empresa_id = ?", Long.class, vendedorId, empresaId);
        if (existe == null || existe == 0) throw new IllegalArgumentException("Vendedor não encontrado.");
        Long emUso = jdbc.queryForObject(
                "SELECT COUNT(*) FROM usuario WHERE vendedor_id = ? AND ativo AND (?::bigint IS NULL OR id <> ?)", Long.class, vendedorId, usuarioId, usuarioId);
        if (emUso != null && emUso > 0) throw new IllegalArgumentException("Este vendedor já está vinculado a outro usuário ativo.");
        return vendedorId;
    }

    private void encerrarSessoes(Usuario u) {
        u.setTokenVersao(u.getTokenVersao() + 1);
        sessaoValidator.invalidar(u.getId());
    }

    private UsuarioItem item(Long id) {
        return jdbc.queryForObject("""
                SELECT u.id, u.nome, u.email, u.perfil, u.vendedor_id, v.nome AS vendedor_nome, u.ativo, u.senha_temporaria,
                       (u.bloqueado_ate IS NOT NULL AND u.bloqueado_ate > now()) AS bloqueado, u.criado_em, u.ultimo_login_em
                  FROM usuario u LEFT JOIN vendedor v ON v.id = u.vendedor_id WHERE u.id = ?
                """, (rs, i) -> new UsuarioItem(rs.getLong("id"), rs.getString("nome"), rs.getString("email"),
                Perfil.valueOf(rs.getString("perfil")), (Long) rs.getObject("vendedor_id"), rs.getString("vendedor_nome"),
                rs.getBoolean("ativo"), rs.getBoolean("senha_temporaria"), rs.getBoolean("bloqueado"),
                rs.getObject("criado_em", OffsetDateTime.class), rs.getObject("ultimo_login_em", OffsetDateTime.class)), id);
    }
}
