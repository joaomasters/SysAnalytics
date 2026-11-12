import { Check, Link2, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import type { ResultadoTarefa, Tarefa, TipoInteracao } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCancelarTarefa, useConcluirTarefa } from '@/hooks/queries'
import { formatData } from '@/lib/format'
import { CLASSE_CAMPO, RESULTADOS_TAREFA, rotuloResultado, TIPOS_INTERACAO } from '@/lib/rotulos'

/** Uma tarefa na lista: mostra prazo/status e permite concluir (com resultado) ou cancelar. */
export function TarefaItem({ tarefa: t, mostrarCliente = true }: { tarefa: Tarefa; mostrarCliente?: boolean }) {
  const concluir = useConcluirTarefa()
  const cancelar = useCancelarTarefa()
  const [concluindo, setConcluindo] = useState(false)
  const [resultado, setResultado] = useState<ResultadoTarefa>('EM_NEGOCIACAO')
  const [tipo, setTipo] = useState<TipoInteracao>('LIGACAO')
  const [resumo, setResumo] = useState('')

  const aberta = t.status === 'ABERTA'

  function enviar(e: FormEvent) {
    e.preventDefault()
    concluir.mutate(
      { id: t.id, dados: { resultado, resumo: resumo.trim() || undefined, tipoInteracao: resumo.trim() ? tipo : undefined } },
      { onSuccess: () => setConcluindo(false) },
    )
  }

  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">{t.titulo}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {mostrarCliente && (
              <Link to={`/clientes/${t.clienteId}`} className="font-medium text-foreground hover:underline">
                {t.clienteNome}
              </Link>
            )}
            <span>Responsável: {t.responsavelNome}</span>
            {t.origem === 'ALERTA' && (
              <Badge variant="neutro">
                <Link2 aria-hidden /> Veio de alerta
              </Badge>
            )}
          </div>
          {t.descricao && <p className="text-sm text-muted-foreground">{t.descricao}</p>}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {aberta ? (
            <Badge variant={t.atrasada ? 'critico' : 'neutro'}>
              {t.atrasada ? 'Atrasada · ' : 'Prazo · '}
              {formatData(t.prazo)}
            </Badge>
          ) : (
            <Badge variant={t.status === 'CONCLUIDA' ? 'ok' : 'neutro'}>
              {t.status === 'CONCLUIDA' ? 'Concluída' : 'Cancelada'}
              {t.resultado ? ` · ${rotuloResultado(t.resultado)}` : ''}
            </Badge>
          )}
          {aberta && !concluindo && (
            <div className="flex gap-1">
              <Button size="sm" onClick={() => setConcluindo(true)}>
                <Check /> Concluir
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Cancelar tarefa ${t.titulo}`}
                disabled={cancelar.isPending}
                onClick={() => {
                  if (window.confirm('Cancelar esta tarefa?')) cancelar.mutate(t.id)
                }}
              >
                <Trash2 />
              </Button>
            </div>
          )}
        </div>
      </div>

      {concluindo && (
        <form onSubmit={enviar} className="space-y-3 rounded-md border bg-muted/30 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={`res-${t.id}`} className="text-sm font-medium">
                Resultado *
              </label>
              <select
                id={`res-${t.id}`}
                className={`${CLASSE_CAMPO} h-9`}
                value={resultado}
                onChange={(e) => setResultado(e.target.value as ResultadoTarefa)}
              >
                {RESULTADOS_TAREFA.map((r) => (
                  <option key={r.valor} value={r.valor}>
                    {r.rotulo}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`tipo-${t.id}`} className="text-sm font-medium">
                Como foi o contato
              </label>
              <select
                id={`tipo-${t.id}`}
                className={`${CLASSE_CAMPO} h-9`}
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoInteracao)}
                disabled={!resumo.trim()}
              >
                {TIPOS_INTERACAO.map((x) => (
                  <option key={x.valor} value={x.valor}>
                    {x.rotulo}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`resumo-${t.id}`} className="text-sm font-medium">
              O que foi conversado (registra no histórico do cliente)
            </label>
            <textarea
              id={`resumo-${t.id}`}
              rows={3}
              maxLength={1000}
              className={CLASSE_CAMPO}
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
            />
          </div>
          {concluir.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mensagemDeErro(concluir.error)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConcluindo(false)}>
              <X /> Voltar
            </Button>
            <Button type="submit" disabled={concluir.isPending}>
              {concluir.isPending ? 'Salvando…' : 'Concluir tarefa'}
            </Button>
          </div>
        </form>
      )}
      {cancelar.isError && (
        <p role="alert" className="text-sm text-destructive">
          {mensagemDeErro(cancelar.error)}
        </p>
      )}
    </li>
  )
}
