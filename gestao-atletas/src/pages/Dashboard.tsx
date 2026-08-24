import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { SessaoComRelacoes } from '../lib/types'
import { formatCurrency, formatTime, STATUS_SESSAO_LABEL, todayISO } from '../lib/format'
import { Badge, Card, EmptyState, PageHeader, Spinner, StatCard } from '../components/ui'

export function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [sessoesHoje, setSessoesHoje] = useState<SessaoComRelacoes[]>([])
  const [ativos, setAtivos] = useState(0)
  const [inativos, setInativos] = useState(0)
  const [pendencias, setPendencias] = useState(0)
  const [qtdPendencias, setQtdPendencias] = useState(0)
  const [faturamentoMes, setFaturamentoMes] = useState(0)

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const hoje = todayISO()
      const prefixoMes = hoje.slice(0, 7)

      const [{ data: sessoesData }, { data: atletasData }, { data: pacotesData }] = await Promise.all([
        supabase
          .from('sessoes')
          .select('*, atleta:atletas(id, nome, status), pacote:pacotes_vendidos(produto_nome_snapshot)')
          .eq('data', hoje)
          .order('horario'),
        supabase.from('atletas').select('status'),
        supabase.from('pacotes_vendidos').select('valor, data_venda, status_pagamento'),
      ])

      setSessoesHoje((sessoesData as unknown as SessaoComRelacoes[]) ?? [])

      const listaAtletas = atletasData ?? []
      setAtivos(listaAtletas.filter((a) => a.status === 'ativo').length)
      setInativos(listaAtletas.filter((a) => a.status === 'inativo').length)

      const listaPacotes = pacotesData ?? []
      const pendentes = listaPacotes.filter((p) => p.status_pagamento === 'pendente')
      setPendencias(pendentes.reduce((sum, p) => sum + p.valor, 0))
      setQtdPendencias(pendentes.length)
      setFaturamentoMes(
        listaPacotes.filter((p) => p.data_venda.startsWith(prefixoMes)).reduce((sum, p) => sum + p.valor, 0),
      )

      setLoading(false)
    }
    carregar()
  }, [])

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão geral do dia a dia." />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sessões hoje" value={String(sessoesHoje.length)} />
        <StatCard label="Atletas ativos" value={String(ativos)} sub={`${inativos} inativos`} />
        <StatCard
          label="Pendências"
          value={formatCurrency(pendencias)}
          sub={`${qtdPendencias} cobrança(s)`}
          tone={pendencias > 0 ? 'red' : 'default'}
        />
        <StatCard label="Faturamento do mês" value={formatCurrency(faturamentoMes)} tone="green" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Sessões de hoje</h2>
          <Link to="/agenda" className="text-xs font-medium text-brand-700 hover:underline">
            Ver agenda completa
          </Link>
        </div>
        {sessoesHoje.length === 0 ? (
          <EmptyState title="Nenhuma sessão agendada para hoje" />
        ) : (
          <ul className="divide-y divide-gray-100">
            {sessoesHoje.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatTime(s.horario)} · {s.atleta?.nome}
                  </p>
                  <p className="text-xs text-gray-400">{s.pacote?.produto_nome_snapshot}</p>
                </div>
                <Badge tone={s.status === 'realizada' ? 'green' : s.status === 'cancelada' ? 'red' : 'blue'}>
                  {STATUS_SESSAO_LABEL[s.status]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
