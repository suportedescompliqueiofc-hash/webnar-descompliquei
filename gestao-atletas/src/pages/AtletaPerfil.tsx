import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Atleta, PacoteComRelacoes, Sessao } from '../lib/types'
import {
  formatCurrency,
  formatDate,
  formatTime,
  STATUS_ATLETA_LABEL,
  STATUS_PAGAMENTO_LABEL,
  STATUS_SESSAO_LABEL,
} from '../lib/format'
import { Badge, Button, Card, Spinner, StatCard } from '../components/ui'
import { gerarPdfResumoAtleta } from '../lib/pdf'

export function AtletaPerfil() {
  const { id } = useParams<{ id: string }>()
  const [atleta, setAtleta] = useState<Atleta | null>(null)
  const [pacotes, setPacotes] = useState<PacoteComRelacoes[]>([])
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function carregar() {
      setLoading(true)
      const [{ data: atletaData }, { data: pacotesData }, { data: sessoesData }] = await Promise.all([
        supabase.from('atletas').select('*').eq('id', id).single(),
        supabase.from('pacotes_vendidos').select('*').eq('atleta_id', id).order('data_venda', { ascending: false }),
        supabase.from('sessoes').select('*').eq('atleta_id', id).order('data', { ascending: false }),
      ])
      setAtleta(atletaData)
      setPacotes(pacotesData ?? [])
      setSessoes(sessoesData ?? [])
      setLoading(false)
    }
    carregar()
  }, [id])

  if (loading) return <Spinner />
  if (!atleta) return <p className="text-sm text-gray-500">Atleta não encontrado.</p>

  const realizadas = sessoes.filter((s) => s.status === 'realizada').length
  const agendadas = sessoes.filter((s) => s.status === 'agendada').length
  const totalPago = pacotes.filter((p) => p.status_pagamento === 'pago').reduce((sum, p) => sum + p.valor, 0)
  const totalPendente = pacotes
    .filter((p) => p.status_pagamento === 'pendente')
    .reduce((sum, p) => sum + p.valor, 0)

  return (
    <div>
      <Link to="/atletas" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Voltar para atletas
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">{atleta.nome}</h1>
            <Badge tone={atleta.status === 'ativo' ? 'green' : 'gray'}>{STATUS_ATLETA_LABEL[atleta.status]}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            {atleta.modalidade || 'Modalidade não informada'} · Desde {formatDate(atleta.data_inicio)}
          </p>
        </div>
        <Button variant="secondary" onClick={() => gerarPdfResumoAtleta(atleta, pacotes, sessoes)}>
          <FileDown size={16} /> Exportar PDF
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sessões realizadas" value={String(realizadas)} />
        <StatCard label="Sessões agendadas" value={String(agendadas)} />
        <StatCard label="Total pago" value={formatCurrency(totalPago)} tone="green" />
        <StatCard label="Saldo devedor" value={formatCurrency(totalPendente)} tone={totalPendente > 0 ? 'red' : 'default'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Dados cadastrais</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Telefone" value={atleta.telefone || '-'} />
            <Row label="E-mail" value={atleta.email || '-'} />
            <Row label="Modalidade" value={atleta.modalidade || '-'} />
            <Row label="Observações" value={atleta.observacoes || '-'} />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Pacotes vendidos</h2>
          {pacotes.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum pacote registrado.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pacotes.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{p.produto_nome_snapshot}</p>
                    <p className="text-xs text-gray-400">{formatDate(p.data_venda)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(p.valor)}</p>
                    <Badge tone={p.status_pagamento === 'pago' ? 'green' : 'yellow'}>
                      {STATUS_PAGAMENTO_LABEL[p.status_pagamento]}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Histórico de sessões</h2>
        </div>
        {sessoes.length === 0 ? (
          <p className="p-5 text-sm text-gray-400">Nenhuma sessão registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Data</th>
                  <th className="px-4 py-2 font-medium">Horário</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessoes.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2">{formatDate(s.data)}</td>
                    <td className="px-4 py-2">{formatTime(s.horario)}</td>
                    <td className="px-4 py-2">
                      <Badge
                        tone={s.status === 'realizada' ? 'green' : s.status === 'cancelada' ? 'red' : 'blue'}
                      >
                        {STATUS_SESSAO_LABEL[s.status]}
                      </Badge>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-right text-gray-700">{value}</dd>
    </div>
  )
}
