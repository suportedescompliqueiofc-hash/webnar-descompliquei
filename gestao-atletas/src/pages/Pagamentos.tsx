import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Atleta, PacoteComRelacoes, StatusPagamento } from '../lib/types'
import { formatCurrency, formatDate, STATUS_PAGAMENTO_LABEL, todayISO } from '../lib/format'
import { Badge, Button, Card, EmptyState, PageHeader, Select, Spinner, StatCard } from '../components/ui'

export function Pagamentos() {
  const [pacotes, setPacotes] = useState<PacoteComRelacoes[]>([])
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAtleta, setFiltroAtleta] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | StatusPagamento>('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  async function carregar() {
    setLoading(true)
    const [{ data: pacotesData }, { data: atletasData }] = await Promise.all([
      supabase
        .from('pacotes_vendidos')
        .select('*, atleta:atletas(id, nome)')
        .order('data_venda', { ascending: false }),
      supabase.from('atletas').select('*').order('nome'),
    ])
    setPacotes((pacotesData as unknown as PacoteComRelacoes[]) ?? [])
    setAtletas(atletasData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const filtrados = useMemo(() => {
    return pacotes.filter((p) => {
      if (filtroAtleta && p.atleta_id !== filtroAtleta) return false
      if (filtroStatus !== 'todos' && p.status_pagamento !== filtroStatus) return false
      if (dataInicio && p.data_venda < dataInicio) return false
      if (dataFim && p.data_venda > dataFim) return false
      return true
    })
  }, [pacotes, filtroAtleta, filtroStatus, dataInicio, dataFim])

  const totalPendente = filtrados
    .filter((p) => p.status_pagamento === 'pendente')
    .reduce((sum, p) => sum + p.valor, 0)
  const totalPago = filtrados.filter((p) => p.status_pagamento === 'pago').reduce((sum, p) => sum + p.valor, 0)
  const qtdPendentes = filtrados.filter((p) => p.status_pagamento === 'pendente').length

  async function marcarPago(p: PacoteComRelacoes) {
    await supabase
      .from('pacotes_vendidos')
      .update({ status_pagamento: 'pago', data_pagamento: todayISO() })
      .eq('id', p.id)
    carregar()
  }

  async function marcarPendente(p: PacoteComRelacoes) {
    await supabase
      .from('pacotes_vendidos')
      .update({ status_pagamento: 'pendente', data_pagamento: null })
      .eq('id', p.id)
    carregar()
  }

  return (
    <div>
      <PageHeader title="Pagamentos" description="Controle de cobranças vinculadas aos pacotes vendidos." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total recebido" value={formatCurrency(totalPago)} tone="green" />
        <StatCard label="Total pendente" value={formatCurrency(totalPendente)} tone={totalPendente > 0 ? 'red' : 'default'} />
        <StatCard label="Cobranças pendentes" value={String(qtdPendentes)} tone="amber" />
      </div>

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={filtroAtleta} onChange={(e) => setFiltroAtleta(e.target.value)}>
            <option value="">Todos os atletas</option>
            {atletas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </Select>
          <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as 'todos' | StatusPagamento)}>
            <option value="todos">Todos os status</option>
            <option value="pago">Pagos</option>
            <option value="pendente">Pendentes</option>
          </Select>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner />
        ) : filtrados.length === 0 ? (
          <EmptyState title="Nenhuma cobrança encontrada" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Atleta</th>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Data da venda</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Pagamento</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.atleta?.nome ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.produto_nome_snapshot}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(p.data_venda)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(p.valor)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={p.status_pagamento === 'pago' ? 'green' : 'yellow'}>
                        {STATUS_PAGAMENTO_LABEL[p.status_pagamento]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(p.data_pagamento)}</td>
                    <td className="px-4 py-3 text-right">
                      {p.status_pagamento === 'pendente' ? (
                        <Button size="sm" onClick={() => marcarPago(p)}>
                          Marcar pago
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => marcarPendente(p)}>
                          Marcar pendente
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
