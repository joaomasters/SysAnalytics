import { ArrowLeft, ArrowRight, Pencil, ThumbsDown, Trophy, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import type { MotivoPerda, Oportunidade } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputMascarado } from '@/components/ui/input-mascarado'
import { useAtualizarOportunidade, useMoverOportunidade } from '@/hooks/queries'
import { formatBRL, formatData } from '@/lib/format'
import { CLASSE_CAMPO, ETAPAS_ABERTAS, MOTIVOS_PERDA } from '@/lib/rotulos'

/** Cartão de uma oportunidade em andamento no kanban: avançar/voltar etapa, ganhar, perder e editar. */
export function OportunidadeCard({ oportunidade: o }: { oportunidade: Oportunidade }) {
  const mover = useMoverOportunidade()
  const atualizar = useAtualizarOportunidade()
  const [modo, setModo] = useState<'ver' | 'editar' | 'perder'>('ver')
  const [motivo, setMotivo] = useState<MotivoPerda>('PRECO')
  const [titulo, setTitulo] = useState(o.titulo)
  const [valor, setValor] = useState(String(o.valorEstimado))
  const [previsao, setPrevisao] = useState(o.dataPrevistaFechamento ?? '')
  const [prob, setProb] = useState(String(o.probabilidade))

  const indice = ETAPAS_ABERTAS.findIndex((e) => e.valor === o.etapa)
  const anterior = ETAPAS_ABERTAS[indice - 1]
  const proxima = ETAPAS_ABERTAS[indice + 1]
  const ocupado = mover.isPending || atualizar.isPending
  const erro = mover.error ?? atualizar.error

  function salvarEdicao(e: FormEvent) {
    e.preventDefault()
    atualizar.mutate(
      {
        id: o.id,
        dados: {
          titulo: titulo.trim(),
          descricao: o.descricao ?? undefined,
          valorEstimado: Number(valor),
          dataPrevistaFechamento: previsao || undefined,
          probabilidade: Number(prob),
        },
      },
      { onSuccess: () => setModo('ver') },
    )
  }

  return (
    <li className="space-y-2 rounded-md border bg-card p-3 shadow-sm">
      {modo === 'editar' ? (
        <form onSubmit={salvarEdicao} className="space-y-2">
          <InputMascarado aria-label="Título" mascara="texto" tamanho={160} required value={titulo} onValueChange={setTitulo} />
          <div className="grid grid-cols-2 gap-2">
            <InputMascarado
              aria-label="Valor estimado"
              mascara="moeda"
              permitirZero
              required
              value={valor}
              onValueChange={setValor}
            />
            <InputMascarado
              aria-label="Probabilidade (%)"
              mascara="inteiro"
              max={100}
              required
              placeholder="% prob."
              value={prob}
              onValueChange={setProb}
            />
          </div>
          <Input aria-label="Previsão de fechamento" type="date" value={previsao} onChange={(e) => setPrevisao(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setModo('ver')}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={ocupado}>
              Salvar
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <Link to={`/oportunidades/${o.id}`} className="text-sm font-semibold leading-snug hover:underline">
              {o.titulo}
            </Link>
            <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-7 w-7" aria-label={`Editar ${o.titulo}`} onClick={() => setModo('editar')}>
              <Pencil />
            </Button>
          </div>
          <Link to={`/clientes/${o.clienteId}`} className="block text-xs text-muted-foreground hover:underline">
            {o.clienteNome}
          </Link>
          <div className="flex items-center justify-between">
            <span className="font-bold tabular-nums">{formatBRL(o.valorEstimado)}</span>
            <Badge variant="neutro">{o.probabilidade}%</Badge>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
            <span>{o.responsavelNome}</span>
            {o.dataPrevistaFechamento && (
              <Badge variant={o.atrasada ? 'critico' : 'neutro'}>
                {o.atrasada ? 'Atrasada · ' : 'Previsão · '}
                {formatData(o.dataPrevistaFechamento)}
              </Badge>
            )}
          </div>
        </>
      )}

      {modo === 'perder' && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-2">
          <label htmlFor={`mot-${o.id}`} className="text-xs font-medium">
            Motivo da perda *
          </label>
          <select
            id={`mot-${o.id}`}
            className={`${CLASSE_CAMPO} h-9`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as MotivoPerda)}
          >
            {MOTIVOS_PERDA.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.rotulo}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setModo('ver')}>
              <X /> Voltar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={ocupado}
              onClick={() => mover.mutate({ id: o.id, dados: { etapa: 'PERDIDA', motivoPerda: motivo } })}
            >
              Confirmar perda
            </Button>
          </div>
        </div>
      )}

      {modo === 'ver' && (
        <div className="flex items-center justify-between gap-1 border-t pt-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!anterior || ocupado}
            aria-label={anterior ? `Voltar para ${anterior.rotulo}` : 'Já está na primeira etapa'}
            title={anterior ? `Voltar para ${anterior.rotulo}` : undefined}
            onClick={() => anterior && mover.mutate({ id: o.id, dados: { etapa: anterior.valor } })}
          >
            <ArrowLeft />
          </Button>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Marcar como perdida" title="Perdida" disabled={ocupado} onClick={() => setModo('perder')}>
              <ThumbsDown />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-700"
              aria-label="Marcar como ganha"
              title="Ganha"
              disabled={ocupado}
              onClick={() => {
                if (window.confirm(`Marcar "${o.titulo}" como ganha?`)) mover.mutate({ id: o.id, dados: { etapa: 'GANHA' } })
              }}
            >
              <Trophy />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!proxima || ocupado}
            aria-label={proxima ? `Avançar para ${proxima.rotulo}` : 'Já está na última etapa'}
            title={proxima ? `Avançar para ${proxima.rotulo}` : undefined}
            onClick={() => proxima && mover.mutate({ id: o.id, dados: { etapa: proxima.valor } })}
          >
            <ArrowRight />
          </Button>
        </div>
      )}
      {erro && (
        <p role="alert" className="text-xs text-destructive">
          {mensagemDeErro(erro)}
        </p>
      )}
    </li>
  )
}
