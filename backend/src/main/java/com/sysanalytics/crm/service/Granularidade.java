package com.sysanalytics.crm.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.Locale;

/**
 * Granularidades temporais dos KPIs. Cada uma sabe:
 * <ul>
 *     <li>gerar a expressão SQL (PostgreSQL) que agrupa uma coluna de data no início do período;</li>
 *     <li>normalizar uma data Java para o mesmo início de período (para preencher períodos vazios);</li>
 *     <li>definir a janela padrão exibida no dashboard.</li>
 * </ul>
 */
public enum Granularidade {

    DIARIO {
        @Override
        public String expressaoSql(String coluna) {
            return coluna;
        }

        @Override
        public LocalDate inicioDoPeriodo(LocalDate data) {
            return data;
        }

        @Override
        public LocalDate proximoPeriodo(LocalDate inicio) {
            return inicio.plusDays(1);
        }

        @Override
        public LocalDate inicioPadrao(LocalDate fim) {
            return fim.minusDays(29);
        }

        @Override
        public String rotulo(LocalDate inicio) {
            return inicio.format(DIA_MES);
        }
    },

    SEMANAL {
        @Override
        public String expressaoSql(String coluna) {
            return "CAST(date_trunc('week', " + coluna + ") AS date)"; // segunda-feira (ISO)
        }

        @Override
        public LocalDate inicioDoPeriodo(LocalDate data) {
            return data.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        }

        @Override
        public LocalDate proximoPeriodo(LocalDate inicio) {
            return inicio.plusWeeks(1);
        }

        @Override
        public LocalDate inicioPadrao(LocalDate fim) {
            return fim.minusWeeks(11);
        }

        @Override
        public String rotulo(LocalDate inicio) {
            return "Sem " + inicio.format(DIA_MES);
        }
    },

    MENSAL {
        @Override
        public String expressaoSql(String coluna) {
            return "CAST(date_trunc('month', " + coluna + ") AS date)";
        }

        @Override
        public LocalDate inicioDoPeriodo(LocalDate data) {
            return data.withDayOfMonth(1);
        }

        @Override
        public LocalDate proximoPeriodo(LocalDate inicio) {
            return inicio.plusMonths(1);
        }

        @Override
        public LocalDate inicioPadrao(LocalDate fim) {
            return fim.minusMonths(11);
        }

        @Override
        public String rotulo(LocalDate inicio) {
            return inicio.format(MES_ANO);
        }
    },

    SEMESTRAL {
        @Override
        public String expressaoSql(String coluna) {
            return "make_date(CAST(EXTRACT(YEAR FROM " + coluna + ") AS int), "
                    + "CASE WHEN EXTRACT(MONTH FROM " + coluna + ") <= 6 THEN 1 ELSE 7 END, 1)";
        }

        @Override
        public LocalDate inicioDoPeriodo(LocalDate data) {
            return LocalDate.of(data.getYear(), data.getMonthValue() <= 6 ? 1 : 7, 1);
        }

        @Override
        public LocalDate proximoPeriodo(LocalDate inicio) {
            return inicio.plusMonths(6);
        }

        @Override
        public LocalDate inicioPadrao(LocalDate fim) {
            return fim.minusMonths(12);
        }

        @Override
        public String rotulo(LocalDate inicio) {
            return (inicio.getMonthValue() == 1 ? "1º" : "2º") + " sem/" + inicio.format(ANO_CURTO);
        }
    };

    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");
    private static final DateTimeFormatter DIA_MES = DateTimeFormatter.ofPattern("dd/MM", PT_BR);
    private static final DateTimeFormatter MES_ANO = DateTimeFormatter.ofPattern("MMM/yy", PT_BR);
    private static final DateTimeFormatter ANO_CURTO = DateTimeFormatter.ofPattern("yy", PT_BR);

    /** Expressão SQL que converte a coluna de data no início do respetivo período. */
    public abstract String expressaoSql(String coluna);

    public abstract LocalDate inicioDoPeriodo(LocalDate data);

    public abstract LocalDate proximoPeriodo(LocalDate inicio);

    /** Início da janela padrão do dashboard quando o utilizador não informa datas. */
    public abstract LocalDate inicioPadrao(LocalDate fim);

    public abstract String rotulo(LocalDate inicio);
}
