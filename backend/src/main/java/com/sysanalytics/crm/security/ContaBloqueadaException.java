package com.sysanalytics.crm.security;

/** Conta bloqueada temporariamente por excesso de tentativas de login (HTTP 423). */
public class ContaBloqueadaException extends RuntimeException {

    public ContaBloqueadaException(long minutos) {
        super("Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em "
                + minutos + (minutos == 1 ? " minuto" : " minutos") + " ou peça a um gestor para desbloquear.");
    }
}
