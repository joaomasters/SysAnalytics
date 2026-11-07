const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlCompacto = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const pct = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

export const formatBRL = (valor: number) => brl.format(valor)
export const formatBRLCompacto = (valor: number) => brlCompacto.format(valor)
export const formatPercentual = (valor: number) => `${pct.format(valor)}%`

/** Datas ISO "yyyy-MM-dd" são tratadas como data local (sem deslocamento de fuso). */
export function formatData(iso: string | null | undefined) {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

export function formatDataHoraRelativa(iso: string) {
  const data = new Date(iso)
  const diffMin = Math.round((Date.now() - data.getTime()) / 60000)
  if (diffMin < 1) return 'agora mesmo'
  if (diffMin < 60) return `há ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `há ${diffH} h`
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
