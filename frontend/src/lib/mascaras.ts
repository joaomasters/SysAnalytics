/**
 * Máscaras de entrada. Cada máscara trabalha com dois formatos:
 *  - "bruto": o valor que o formulário guarda e envia (ex.: moeda "1234.56", telefone "(11) 91234-5678");
 *  - "exibido": o texto que aparece no campo (ex.: "1.234,56").
 */

export const somenteDigitos = (v: string) => v.replace(/\D/g, '')

/** Digitação "de caixa registradora": cada dígito entra pela direita (1 → 0,01; 12 → 0,12; 123 → 1,23). */
export function digitosParaDecimal(texto: string, casas: number, max?: number, permitirZero = false): string {
  let digitos = somenteDigitos(texto)
  if (digitos === '' || (/^0*$/.test(digitos) && !permitirZero)) return ''
  digitos = digitos.slice(0, 13 + casas) // cabe em NUMERIC(15,2)
  digitos = digitos.padStart(casas + 1, '0')
  const inteiro = digitos.slice(0, digitos.length - casas).replace(/^0+(?=\d)/, '')
  const fracao = digitos.slice(digitos.length - casas)
  const bruto = casas > 0 ? `${inteiro}.${fracao}` : inteiro
  return max !== undefined && Number(bruto) > max ? max.toFixed(casas) : bruto
}

export function formatarDecimal(bruto: string, casas: number): string {
  if (bruto === '' || Number.isNaN(Number(bruto))) return ''
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(Number(bruto))
}

/** Inteiro sem sinal, com limite opcional. */
export function digitosParaInteiro(texto: string, max?: number): string {
  const digitos = somenteDigitos(texto).slice(0, 9).replace(/^0+(?=\d)/, '')
  if (digitos === '') return ''
  return max !== undefined && Number(digitos) > max ? String(max) : digitos
}

/** Telefone brasileiro: (11) 3333-4444 (fixo) ou (11) 93333-4444 (celular). */
export function mascaraTelefone(texto: string): string {
  const d = somenteDigitos(texto).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** CPF (11 dígitos) ou CNPJ (14 dígitos), conforme o tamanho digitado. */
export function mascaraCpfCnpj(texto: string): string {
  const d = somenteDigitos(texto).slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function mascaraCep(texto: string): string {
  const d = somenteDigitos(texto).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/** Siglas e códigos: letras e números em caixa alta, sem espaços. */
export function mascaraCodigo(texto: string, tamanho: number): string {
  return texto
    .toUpperCase()
    .replace(/[^A-Z0-9._-]/g, '')
    .slice(0, tamanho)
}

/** Texto livre: sem espaços no início nem espaços duplos (o espaço final é aceito para poder digitar a próxima palavra). */
export function mascaraTexto(texto: string, tamanho: number): string {
  return texto.replace(/^\s+/, '').replace(/\s{2,}/g, ' ').slice(0, tamanho)
}

/** E-mail: minúsculas e sem espaços. */
export function mascaraEmail(texto: string, tamanho: number): string {
  return texto.toLowerCase().replace(/\s/g, '').slice(0, tamanho)
}

/** Exibe um telefone já salvo (mesmo sem máscara) no padrão brasileiro. */
export const formatarTelefone = (v: string | null | undefined) => (v ? mascaraTelefone(v) || v : '')

export type TipoMascara =
  | 'moeda'
  | 'decimal'
  | 'percentual'
  | 'inteiro'
  | 'telefone'
  | 'codigo'
  | 'texto'
  | 'email'
  | 'documento'
  | 'cep'

export interface OpcoesMascara {
  /** Casas decimais de "decimal" (padrão 3); "moeda" e "percentual" usam 2. */
  casas?: number
  max?: number
  tamanho?: number
  /** Aceita 0 como valor (padrão: campo vazio = sem valor). */
  permitirZero?: boolean
}

export function exibir(tipo: TipoMascara, bruto: string, o: OpcoesMascara = {}): string {
  switch (tipo) {
    case 'moeda':
    case 'percentual':
      return formatarDecimal(bruto, 2)
    case 'decimal':
      return formatarDecimal(bruto, o.casas ?? 3)
    default:
      return bruto
  }
}

export function extrair(tipo: TipoMascara, texto: string, o: OpcoesMascara = {}): string {
  switch (tipo) {
    case 'moeda':
      return digitosParaDecimal(texto, 2, undefined, o.permitirZero)
    case 'percentual':
      return digitosParaDecimal(texto, 2, o.max ?? 100, o.permitirZero)
    case 'decimal':
      return digitosParaDecimal(texto, o.casas ?? 3, o.max, o.permitirZero)
    case 'inteiro':
      return digitosParaInteiro(texto, o.max)
    case 'telefone':
      return mascaraTelefone(texto)
    case 'codigo':
      return mascaraCodigo(texto, o.tamanho ?? 40)
    case 'texto':
      return mascaraTexto(texto, o.tamanho ?? 160)
    case 'email':
      return mascaraEmail(texto, o.tamanho ?? 160)
    case 'documento':
      return mascaraCpfCnpj(texto)
    case 'cep':
      return mascaraCep(texto)
  }
}
