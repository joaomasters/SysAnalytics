import { X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '@/api/client'
import type { CargaResumo, SentidoCarga } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Campo } from '@/components/ui/campo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputMascarado } from '@/components/ui/input-mascarado'
import { useAtualizarCarga, useClientes, useCriarCarga, useFornecedores, useTransportadoras } from '@/hooks/queries'
import { CLASSE_CAMPO, dataISO } from '@/lib/rotulos'

const CD = 'Centro de distribuição'

interface Props {
  /** Presente = edição (parceiro e sentido ficam fixos). */
  carga?: CargaResumo
  sentidoInicial?: SentidoCarga
  onFechar: () => void
  onSalvo?: (id: number) => void
}

export function FormCarga({ carga, sentidoInicial = 'SAIDA', onFechar, onSalvo }: Props) {
  const edicao = !!carga
  const criar = useCriarCarga()
  const atualizar = useAtualizarCarga(carga?.id ?? 0)
  const { data: clientes } = useClientes([], '')
  const { data: fornecedores } = useFornecedores('')
  const { data: transportadoras } = useTransportadoras('')

  const [sentido, setSentido] = useState<SentidoCarga>(carga?.sentido ?? sentidoInicial)
  const [parceiro, setParceiro] = useState(carga ? String(carga.parceiroId) : '')
  const [transportadora, setTransportadora] = useState(carga?.transportadoraId ? String(carga.transportadoraId) : '')
  const [documento, setDocumento] = useState(carga?.numeroDocumento ?? '')
  const [origem, setOrigem] = useState(carga?.origem ?? (sentidoInicial === 'SAIDA' ? CD : ''))
  const [destino, setDestino] = useState(carga?.destino ?? (sentidoInicial === 'ENTRADA' ? CD : ''))
  const [rastreio, setRastreio] = useState(carga?.codigoRastreio ?? '')
  const [previsao, setPrevisao] = useState(carga?.previsaoEntrega ?? dataISO(5))
  const [peso, setPeso] = useState(carga?.pesoKg != null ? String(carga.pesoKg) : '')
  const [volumes, setVolumes] = useState(carga?.volumes != null ? String(carga.volumes) : '')
  const [valorMerc, setValorMerc] = useState(carga?.valorMercadoria != null ? String(carga.valorMercadoria) : '')
  const [frete, setFrete] = useState(carga?.valorFrete != null ? String(carga.valorFrete) : '')
  const [obs, setObs] = useState(carga?.observacao ?? '')

  function trocarSentido(s: SentidoCarga) {
    setSentido(s)
    setParceiro('')
    setOrigem(s === 'SAIDA' ? CD : '')
    setDestino(s === 'ENTRADA' ? CD : '')
  }

  const pendente = criar.isPending || atualizar.isPending
  const erro = criar.error ?? atualizar.error

  function enviar(e: FormEvent) {
    e.preventDefault()
    const dados = {
      sentido,
      clienteId: sentido === 'SAIDA' ? Number(parceiro) : undefined,
      fornecedorId: sentido === 'ENTRADA' ? Number(parceiro) : undefined,
      transportadoraId: transportadora ? Number(transportadora) : null,
      numeroDocumento: documento.trim() || undefined,
      origem: origem.trim() || undefined,
      destino: destino.trim() || undefined,
      codigoRastreio: rastreio.trim() || undefined,
      previsaoEntrega: previsao,
      pesoKg: peso ? Number(peso) : undefined,
      volumes: volumes ? Number(volumes) : undefined,
      valorMercadoria: valorMerc ? Number(valorMerc) : undefined,
      valorFrete: frete ? Number(frete) : undefined,
      observacao: obs.trim() || undefined,
    }
    if (carga) {
      atualizar.mutate(dados, { onSuccess: () => onFechar() })
    } else {
      criar.mutate(dados, { onSuccess: (d) => (onSalvo ? onSalvo(d.carga.id) : onFechar()) })
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>{edicao ? `Editar ${carga.codigo}` : 'Nova carga'}</CardTitle>
          <CardDescription>
            {edicao ? 'Cliente/fornecedor e sentido não mudam. Alterar a previsão fica registrado na linha do tempo.' : 'Nasce como "Aguardando coleta"; registre o embarque na tela da carga.'}
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onFechar} aria-label="Cancelar">
          <X />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            {!edicao && (
              <Campo id="g-sentido" rotulo="Sentido *">
                <select id="g-sentido" className={CLASSE_CAMPO} value={sentido} onChange={(e) => trocarSentido(e.target.value as SentidoCarga)}>
                  <option value="SAIDA">Saída (entrega ao cliente)</option>
                  <option value="ENTRADA">Entrada (compra / importação)</option>
                </select>
              </Campo>
            )}
            <Campo id="g-parceiro" rotulo={sentido === 'SAIDA' ? 'Cliente *' : 'Fornecedor *'} className="md:col-span-2">
              <select id="g-parceiro" required disabled={edicao} className={CLASSE_CAMPO} value={parceiro} onChange={(e) => setParceiro(e.target.value)}>
                <option value="">Selecione…</option>
                {sentido === 'SAIDA'
                  ? clientes?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nomeFantasia}
                      </option>
                    ))
                  : fornecedores?.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                {edicao && carga && <option value={carga.parceiroId}>{carga.parceiroNome}</option>}
              </select>
            </Campo>
            <Campo id="g-transp" rotulo="Transportadora">
              <select id="g-transp" className={CLASSE_CAMPO} value={transportadora} onChange={(e) => setTransportadora(e.target.value)}>
                <option value="">A definir</option>
                {transportadoras?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id="g-doc" rotulo={sentido === 'SAIDA' ? 'Nota fiscal' : 'Nota / pedido de compra'}>
              <InputMascarado id="g-doc" mascara="codigo" tamanho={40} value={documento} onValueChange={setDocumento} />
            </Campo>
            <Campo id="g-origem" rotulo="Origem" className="md:col-span-2">
              <InputMascarado id="g-origem" mascara="texto" tamanho={120} value={origem} onValueChange={setOrigem} />
            </Campo>
            <Campo id="g-destino" rotulo="Destino" className="md:col-span-2">
              <InputMascarado id="g-destino" mascara="texto" tamanho={120} value={destino} onValueChange={setDestino} />
            </Campo>
            <Campo id="g-rast" rotulo="Código de rastreio">
              <InputMascarado id="g-rast" mascara="codigo" tamanho={60} value={rastreio} onValueChange={setRastreio} />
            </Campo>
            <Campo id="g-prev" rotulo="Previsão de entrega *">
              <Input id="g-prev" type="date" required value={previsao} onChange={(e) => setPrevisao(e.target.value)} />
            </Campo>
            <Campo id="g-peso" rotulo="Peso (kg)">
              <InputMascarado id="g-peso" mascara="decimal" casas={3} placeholder="0,000" value={peso} onValueChange={setPeso} />
            </Campo>
            <Campo id="g-vol" rotulo="Volumes">
              <InputMascarado id="g-vol" mascara="inteiro" max={100000} value={volumes} onValueChange={setVolumes} />
            </Campo>
            <Campo id="g-vmerc" rotulo="Valor da mercadoria (R$)">
              <InputMascarado id="g-vmerc" mascara="moeda" placeholder="0,00" value={valorMerc} onValueChange={setValorMerc} />
            </Campo>
            <Campo id="g-frete" rotulo="Frete (R$)">
              <InputMascarado id="g-frete" mascara="moeda" placeholder="0,00" value={frete} onValueChange={setFrete} />
            </Campo>
            <Campo id="g-obs" rotulo="Observação" className="md:col-span-2">
              <InputMascarado id="g-obs" mascara="texto" tamanho={500} value={obs} onValueChange={setObs} />
            </Campo>
          </div>
          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {mensagemDeErro(erro)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendente || !parceiro || !previsao}>
              {pendente ? 'Salvando…' : edicao ? 'Salvar alterações' : 'Cadastrar carga'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
