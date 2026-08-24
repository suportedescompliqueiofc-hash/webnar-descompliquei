import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, FileDown, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { SessaoComRelacoes, StatusSessao } from '../lib/types'
import { addDaysISO, formatDate, formatTime, startOfWeekISO, STATUS_SESSAO_LABEL, todayISO, weekdayLabel } from '../lib/format'
import { Badge, Button, Card, EmptyState, PageHeader, Select, Spinner } from '../components/ui'
import { NovoAgendamentoModal } from '../components/NovoAgendamentoModal'
import { gerarPdfResumoSessao } from '../lib/pdf'
import type { PacoteComRelacoes } from '../lib/types'

const SELECT_SESSAO = '*, atleta:atletas(id, nome, status), pacote:pacotes_vendidos(id, produto_nome_snapshot, valor, status_pagamento, data_pagamento, atleta_id, produto_id, data_venda, qtd_sessoes_snapshot, created_at, updated_at)'

export function Agenda() {
  const [modo, setModo] = useState<'dia' | 'semana'>('dia')
  const [referencia, setReferencia] = useState(todayISO())
  const [sessoes, setSessoes] = useState<SessaoComRelacoes[]>([])
  const [loading, setLoading] = useState(true)
  const [ativos, setAtivos] = useState(0)
  const [inativos, setInativos] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)

  async function carregarContagens() {
    const { data } = await supabase.from('atletas').select('status')
    const lista = data ?? []
    setAtivos(lista.filter((a) => a.status === 'ativo').length)
    setInativos(lista.filter((a) => a.status === 'inativo').length)
  }

  async function carregarSessoes() {
    setLoading(true)
    let query = supabase.from('sessoes').select(SELECT_SESSAO)
    if (modo === 'dia') {
      query = query.eq('data', referencia)
    } else {
      const inicio = startOfWeekISO(referencia)
      const fim = addDaysISO(inicio, 6)
      query = query.gte('data', inicio).lte('data', fim)
    }
    const { data } = await query.order('data').order('horario')
    setSessoes((data as unknown as SessaoComRelacoes[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    carregarContagens()
  }, [])

  useEffect(() => {
    carregarSessoes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, referencia])

  async function alterarStatus(id: string, status: StatusSessao) {
    await supabase.from('sessoes').update({ status }).eq('id', id)
    carregarSessoes()
  }

  function navegar(direcao: -1 | 1) {
    const passo = modo === 'dia' ? 1 : 7
    setReferencia((prev) => addDaysISO(prev, direcao * passo))
  }

  const inicioSemana = startOfWeekISO(referencia)
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDaysISO(inicioSemana, i))

  return (
    <div>
      <PageHeader
        title="Agenda"
        description={`${ativos} atletas ativos · ${inativos} inativos`}
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Novo agendamento
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setModo('dia')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${modo === 'dia' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}
          >
            Diária
          </button>
          <button
            onClick={() => setModo('semana')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${modo === 'semana' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}
          >
            Semanal
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => navegar(-1)}>
            <ChevronLeft size={16} />
          </Button>
          {modo === 'dia' ? (
            <span className="min-w-40 text-center text-sm font-medium text-gray-700">
              {weekdayLabel(referencia)}, {formatDate(referencia)}
            </span>
          ) : (
            <span className="min-w-52 text-center text-sm font-medium text-gray-700">
              {formatDate(inicioSemana)} — {formatDate(addDaysISO(inicioSemana, 6))}
            </span>
          )}
          <Button size="sm" variant="secondary" onClick={() => navegar(1)}>
            <ChevronRight size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setReferencia(todayISO())}>
            Hoje
          </Button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : modo === 'dia' ? (
        <ListaSessoesDia sessoes={sessoes} onAlterarStatus={alterarStatus} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {diasSemana.map((dia) => (
            <Card key={dia} className="p-4">
              <p className="mb-2 text-sm font-semibold capitalize text-gray-900">
                {weekdayLabel(dia)} <span className="font-normal text-gray-400">· {formatDate(dia)}</span>
              </p>
              <ListaSessoesDia
                sessoes={sessoes.filter((s) => s.data === dia)}
                onAlterarStatus={alterarStatus}
                compacto
              />
            </Card>
          ))}
        </div>
      )}

      <NovoAgendamentoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCriado={() => {
          carregarSessoes()
          carregarContagens()
        }}
      />
    </div>
  )
}

function ListaSessoesDia({
  sessoes,
  onAlterarStatus,
  compacto = false,
}: {
  sessoes: SessaoComRelacoes[]
  onAlterarStatus: (id: string, status: StatusSessao) => void
  compacto?: boolean
}) {
  if (sessoes.length === 0) {
    return compacto ? (
      <p className="text-xs text-gray-400">Sem sessões.</p>
    ) : (
      <Card>
        <EmptyState title="Nenhuma sessão neste período" />
      </Card>
    )
  }

  const conteudo = (
    <ul className={compacto ? 'space-y-2' : 'divide-y divide-gray-100'}>
      {sessoes.map((s) => (
        <li key={s.id} className={compacto ? 'rounded-lg border border-gray-100 p-2' : 'flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between'}>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {formatTime(s.horario)} · {s.atleta?.nome}
            </p>
            <p className="text-xs text-gray-400">{s.pacote?.produto_nome_snapshot}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={s.status === 'realizada' ? 'green' : s.status === 'cancelada' ? 'red' : 'blue'}>
              {STATUS_SESSAO_LABEL[s.status]}
            </Badge>
            {!compacto && (
              <>
                <Select
                  value={s.status}
                  onChange={(e) => onAlterarStatus(s.id, e.target.value as StatusSessao)}
                  className="w-36"
                >
                  <option value="agendada">Agendada</option>
                  <option value="realizada">Realizada</option>
                  <option value="cancelada">Cancelada</option>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (s.atleta && s.pacote) {
                      gerarPdfResumoSessao(s, s.atleta, s.pacote as PacoteComRelacoes)
                    }
                  }}
                >
                  <FileDown size={14} />
                </Button>
              </>
            )}
            {compacto && (
              <Select
                value={s.status}
                onChange={(e) => onAlterarStatus(s.id, e.target.value as StatusSessao)}
                className="w-32 text-xs"
              >
                <option value="agendada">Agendada</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada</option>
              </Select>
            )}
          </div>
        </li>
      ))}
    </ul>
  )

  return compacto ? conteudo : <Card>{conteudo}</Card>
}
