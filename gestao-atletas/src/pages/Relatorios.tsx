import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import type { PacoteVendido, Sessao } from '../lib/types'
import { formatCurrency, monthLabel } from '../lib/format'
import { Card, PageHeader, Select, Spinner, StatCard } from '../components/ui'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function Relatorios() {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [pacotes, setPacotes] = useState<PacoteVendido[]>([])
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const [{ data: pacotesData }, { data: sessoesData }] = await Promise.all([
        supabase.from('pacotes_vendidos').select('*'),
        supabase.from('sessoes').select('*').eq('status', 'realizada'),
      ])
      setPacotes(pacotesData ?? [])
      setSessoes(sessoesData ?? [])
      setLoading(false)
    }
    carregar()
  }, [])

  const anoAtual = hoje.getFullYear()
  const anos = [anoAtual - 1, anoAtual, anoAtual + 1]

  const dadosMes = useMemo(() => {
    const mesStr = String(mes).padStart(2, '0')
    const prefixo = `${ano}-${mesStr}`

    const pacotesDoMes = pacotes.filter((p) => p.data_venda.startsWith(prefixo))
    const faturado = pacotesDoMes.reduce((sum, p) => sum + p.valor, 0)

    const pagosNoMes = pacotes.filter((p) => p.data_pagamento && p.data_pagamento.startsWith(prefixo))
    const recebido = pagosNoMes.reduce((sum, p) => sum + p.valor, 0)

    const pendente = pacotesDoMes
      .filter((p) => p.status_pagamento === 'pendente')
      .reduce((sum, p) => sum + p.valor, 0)

    const sessoesDoMes = sessoes.filter((s) => s.data.startsWith(prefixo))
    const atletasAtendidos = new Set(sessoesDoMes.map((s) => s.atleta_id)).size

    return { faturado, recebido, pendente, atletasAtendidos }
  }, [pacotes, sessoes, mes, ano])

  const historico = useMemo(() => {
    const meses: { mes: string; faturado: number; recebido: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ano, mes - 1 - i, 1)
      const prefixo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const faturado = pacotes.filter((p) => p.data_venda.startsWith(prefixo)).reduce((sum, p) => sum + p.valor, 0)
      const recebido = pacotes
        .filter((p) => p.data_pagamento && p.data_pagamento.startsWith(prefixo))
        .reduce((sum, p) => sum + p.valor, 0)
      meses.push({
        mes: d.toLocaleDateString('pt-BR', { month: 'short' }),
        faturado,
        recebido,
      })
    }
    return meses
  }, [pacotes, mes, ano])

  return (
    <div>
      <PageHeader title="Relatórios mensais" description="Faturamento e recebimentos por mês." />

      <div className="mb-6 flex gap-3">
        <Select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="w-44">
          {MESES.map((nome, i) => (
            <option key={nome} value={i + 1}>
              {nome}
            </option>
          ))}
        </Select>
        <Select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="w-28">
          {anos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <p className="mb-3 text-sm capitalize text-gray-500">{monthLabel(mes, ano)}</p>
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Atletas atendidos" value={String(dadosMes.atletasAtendidos)} />
            <StatCard label="Total faturado" value={formatCurrency(dadosMes.faturado)} />
            <StatCard label="Total recebido" value={formatCurrency(dadosMes.recebido)} tone="green" />
            <StatCard
              label="Total pendente"
              value={formatCurrency(dadosMes.pendente)}
              tone={dadosMes.pendente > 0 ? 'red' : 'default'}
            />
          </div>

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Faturado x Recebido — últimos 6 meses</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historico}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f2" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#667085' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#667085' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend />
                  <Bar dataKey="faturado" name="Faturado" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recebido" name="Recebido" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
