package com.sysanalytics.crm.web;

import com.sysanalytics.crm.security.ContaBloqueadaException;
import com.sysanalytics.crm.security.CredenciaisInvalidasException;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.TypeMismatchException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Traduz qualquer erro para um ProblemDetail com mensagem em português que o frontend pode exibir direto.
 * Erros inesperados nunca vazam detalhes técnicos: o usuário recebe um protocolo que localiza o erro no log.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Pattern RESTRICAO = Pattern.compile("(?:constraint|restrição) \"([^\"]+)\"");

    /** Mensagens amigáveis para as restrições de unicidade do banco (nome da constraint → texto). */
    private static final Map<String, String> RESTRICOES = Map.ofEntries(
            Map.entry("uk_usuario_email", "Já existe um usuário com este e-mail."),
            Map.entry("uk_vendedor_empresa_email", "Já existe um vendedor com este e-mail."),
            Map.entry("uk_cliente_empresa_cnpj", "Já existe um cliente com este CNPJ."),
            Map.entry("uk_faturamento_empresa_nota", "Já existe uma nota fiscal com este número."),
            Map.entry("uk_produto_empresa_codigo", "Já existe um produto com este código."),
            Map.entry("uk_carga_codigo", "Já existe uma carga com este código."),
            Map.entry("uk_meta_vendedor_mes", "Já existe uma meta para este vendedor neste mês."),
            Map.entry("uk_titulo_receber_doc", "Já existe um título com este documento."),
            Map.entry("uk_conta_pagar_doc", "Já existe uma conta a pagar com este documento."),
            Map.entry("uk_transportadora_documento", "Já existe uma transportadora com este documento."),
            Map.entry("uk_fornecedor_documento", "Já existe um fornecedor com este documento."),
            Map.entry("uk_contato_principal", "Este cliente já tem um contato principal."));

    private static ProblemDetail problema(HttpStatus status, String titulo, String detalhe) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detalhe);
        pd.setTitle(titulo);
        return pd;
    }

    // ------------------------------------------------------------------ erros de negócio e de entrada

    @ExceptionHandler(NoSuchElementException.class)
    public ProblemDetail naoEncontrado(NoSuchElementException e) {
        return problema(HttpStatus.NOT_FOUND, "Não encontrado", e.getMessage() == null ? "Registro não encontrado." : e.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail requisicaoInvalida(IllegalArgumentException e) {
        String msg = e.getMessage();
        // "No enum constant ..." e similares são técnicos demais para o usuário
        boolean tecnica = msg == null || msg.startsWith("No enum constant") || msg.contains("java.lang") || msg.contains("Invalid ");
        return problema(HttpStatus.BAD_REQUEST, "Requisição inválida", tecnica ? "Algum dos valores informados é inválido." : msg);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail violacao(ConstraintViolationException e) {
        String detalhe = e.getConstraintViolations().stream().map(v -> v.getMessage()).distinct().collect(Collectors.joining("; "));
        return problema(HttpStatus.BAD_REQUEST, "Dados inválidos", detalhe.isBlank() ? "Dados inválidos na requisição." : detalhe);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail integridade(DataIntegrityViolationException e) {
        String causa = e.getMostSpecificCause().getMessage();
        if (causa != null) {
            Matcher m = RESTRICAO.matcher(causa);
            if (m.find() && RESTRICOES.containsKey(m.group(1))) {
                return problema(HttpStatus.CONFLICT, "Registro duplicado", RESTRICOES.get(m.group(1)));
            }
            if (causa.contains("foreign key") || causa.contains("chave estrangeira")) {
                return problema(HttpStatus.CONFLICT, "Registro em uso",
                        "Não é possível concluir: o registro está relacionado a outros dados.");
            }
        }
        log.warn("Violação de integridade não mapeada: {}", causa);
        return problema(HttpStatus.CONFLICT, "Conflito de dados", "Os dados informados conflitam com um registro existente.");
    }

    // ------------------------------------------------------------------ autenticação e permissão

    @ExceptionHandler(CredenciaisInvalidasException.class)
    public ProblemDetail credenciais(CredenciaisInvalidasException e) {
        return problema(HttpStatus.UNAUTHORIZED, "Não autenticado", e.getMessage());
    }

    @ExceptionHandler(ContaBloqueadaException.class)
    public ProblemDetail bloqueada(ContaBloqueadaException e) {
        return problema(HttpStatus.LOCKED, "Conta bloqueada", e.getMessage());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ProblemDetail naoAutenticado(AuthenticationException e) {
        return problema(HttpStatus.UNAUTHORIZED, "Não autenticado", "Sua sessão expirou ou foi encerrada. Entre novamente.");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail acessoNegado(AccessDeniedException e) {
        String msg = e.getMessage();
        // mensagens do nosso código (em português) são mostradas; o texto padrão do Spring ("Access Denied") não
        boolean nossa = msg != null && !msg.equalsIgnoreCase("Access Denied") && !msg.equalsIgnoreCase("Access is denied");
        return problema(HttpStatus.FORBIDDEN, "Acesso negado", nossa ? msg : "Você não tem permissão para realizar esta ação.");
    }

    // ------------------------------------------------------------------ erros do Spring MVC (já tratados pela classe base)

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException e, HttpHeaders headers,
                                                                  HttpStatusCode status, WebRequest request) {
        String detalhe = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getDefaultMessage()).distinct().collect(Collectors.joining("; "));
        return handleExceptionInternal(e, problema(HttpStatus.BAD_REQUEST, "Dados inválidos",
                detalhe.isBlank() ? "Dados inválidos na requisição." : detalhe), headers, HttpStatus.BAD_REQUEST, request);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException e, HttpHeaders headers,
                                                                  HttpStatusCode status, WebRequest request) {
        return handleExceptionInternal(e, problema(HttpStatus.BAD_REQUEST, "Requisição inválida",
                "Os dados enviados estão incompletos ou em formato inválido."), headers, HttpStatus.BAD_REQUEST, request);
    }

    @Override
    protected ResponseEntity<Object> handleMissingServletRequestParameter(MissingServletRequestParameterException e, HttpHeaders headers,
                                                                          HttpStatusCode status, WebRequest request) {
        return handleExceptionInternal(e, problema(HttpStatus.BAD_REQUEST, "Requisição inválida",
                "Parâmetro obrigatório ausente: " + e.getParameterName() + "."), headers, HttpStatus.BAD_REQUEST, request);
    }

    @Override
    protected ResponseEntity<Object> handleTypeMismatch(TypeMismatchException e, HttpHeaders headers,
                                                        HttpStatusCode status, WebRequest request) {
        String campo = e.getPropertyName() == null ? "informado" : "'" + e.getPropertyName() + "'";
        return handleExceptionInternal(e, problema(HttpStatus.BAD_REQUEST, "Requisição inválida",
                "Valor inválido para o parâmetro " + campo + "."), headers, HttpStatus.BAD_REQUEST, request);
    }

    // ------------------------------------------------------------------ qualquer outro erro

    @ExceptionHandler(Exception.class)
    public ProblemDetail inesperado(Exception e) {
        String protocolo = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.error("Erro inesperado [protocolo {}]", protocolo, e);
        ProblemDetail pd = problema(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno",
                "Ocorreu um erro inesperado. Tente novamente; se persistir, informe o protocolo " + protocolo + " ao suporte.");
        pd.setProperty("protocolo", protocolo);
        return pd;
    }
}
