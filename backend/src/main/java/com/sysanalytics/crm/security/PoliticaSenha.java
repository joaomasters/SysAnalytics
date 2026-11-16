package com.sysanalytics.crm.security;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;

/** Regras de senha e geração de senhas temporárias. */
public final class PoliticaSenha {

    public static final int MINIMO = 8;
    /** O BCrypt ignora tudo além de 72 bytes; melhor recusar do que aceitar em silêncio. */
    public static final int MAXIMO = 72;
    public static final String RESUMO = "Use de 8 a 72 caracteres, com letra maiúscula, minúscula e número.";

    private static final Set<String> COMUNS = Set.of("12345678", "123456789", "1234567890", "senha123", "password", "password1",
            "qwerty123", "trocar@123", "mudar@123", "admin123", "abc12345", "senha@123");
    private static final SecureRandom ALEATORIO = new SecureRandom();
    private static final String MAIUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String MINUSCULAS = "abcdefghijkmnopqrstuvwxyz";
    private static final String NUMEROS = "23456789";
    private static final String SIMBOLOS = "@#$%&*";

    private PoliticaSenha() {
    }

    /** Lança {@link IllegalArgumentException} (HTTP 400) com todos os problemas encontrados. */
    public static void validar(String senha, String email, String nome) {
        List<String> problemas = new ArrayList<>();
        if (senha == null || senha.length() < MINIMO) {
            problemas.add("ter pelo menos " + MINIMO + " caracteres");
        } else {
            if (senha.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > MAXIMO) problemas.add("ter no máximo " + MAXIMO + " caracteres");
            if (senha.chars().noneMatch(Character::isUpperCase)) problemas.add("ter uma letra maiúscula");
            if (senha.chars().noneMatch(Character::isLowerCase)) problemas.add("ter uma letra minúscula");
            if (senha.chars().noneMatch(Character::isDigit)) problemas.add("ter um número");
            if (COMUNS.contains(senha.toLowerCase())) problemas.add("não ser uma senha comum");
            String baixa = normalizar(senha);
            if (email != null && email.contains("@")) {
                String local = normalizar(email.substring(0, email.indexOf('@')));
                if (local.length() >= 4 && baixa.contains(local)) problemas.add("não conter o seu e-mail");
            }
            if (nome != null) {
                for (String parte : normalizar(nome).split("\\s+")) {
                    if (parte.length() >= 4 && baixa.contains(parte)) {
                        problemas.add("não conter o seu nome");
                        break;
                    }
                }
            }
        }
        if (!problemas.isEmpty()) {
            throw new IllegalArgumentException("A senha precisa " + String.join(", ", problemas) + ".");
        }
    }

    /** Senha temporária de 12 caracteres, sem caracteres ambíguos (0/O, 1/l/I). */
    public static String gerarTemporaria() {
        List<Character> chars = new ArrayList<>();
        chars.add(sorteio(MAIUSCULAS));
        chars.add(sorteio(MINUSCULAS));
        chars.add(sorteio(NUMEROS));
        chars.add(sorteio(SIMBOLOS));
        String todos = MAIUSCULAS + MINUSCULAS + NUMEROS;
        while (chars.size() < 12) chars.add(sorteio(todos));
        Collections.shuffle(chars, ALEATORIO);
        StringBuilder sb = new StringBuilder();
        chars.forEach(sb::append);
        return sb.toString();
    }

    private static char sorteio(String universo) {
        return universo.charAt(ALEATORIO.nextInt(universo.length()));
    }

    private static String normalizar(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase();
    }
}
