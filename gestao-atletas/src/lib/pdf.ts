import jsPDF from 'jspdf'
import { formatCurrency, formatDate, formatTime, STATUS_PAGAMENTO_LABEL, STATUS_SESSAO_LABEL } from './format'
import type { Atleta, PacoteComRelacoes, Sessao, SessaoComRelacoes } from './types'

const MARGIN = 15
const LINE_HEIGHT = 6

class PdfWriter {
  doc: jsPDF
  y: number

  constructor(title: string) {
    this.doc = new jsPDF()
    this.y = MARGIN
    this.doc.setFontSize(16)
    this.doc.text(title, MARGIN, this.y)
    this.y += 10
    this.doc.setFontSize(10)
    this.doc.setTextColor(120)
    this.doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, MARGIN, this.y)
    this.doc.setTextColor(0)
    this.y += 10
  }

  heading(text: string) {
    this.checkPageBreak()
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(text, MARGIN, this.y)
    this.y += LINE_HEIGHT + 2
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(10)
  }

  line(label: string, value: string) {
    this.checkPageBreak()
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(`${label}:`, MARGIN, this.y)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(value, MARGIN + 45, this.y)
    this.y += LINE_HEIGHT
  }

  text(value: string) {
    this.checkPageBreak()
    const wrapped = this.doc.splitTextToSize(value, 180)
    this.doc.text(wrapped, MARGIN, this.y)
    this.y += LINE_HEIGHT * wrapped.length
  }

  spacer() {
    this.y += 4
  }

  checkPageBreak() {
    if (this.y > 275) {
      this.doc.addPage()
      this.y = MARGIN
    }
  }

  save(filename: string) {
    this.doc.save(filename)
  }
}

export function gerarPdfResumoAtleta(
  atleta: Atleta,
  pacotes: PacoteComRelacoes[],
  sessoes: SessaoComRelacoes[],
) {
  const pdf = new PdfWriter(`Resumo do Atleta — ${atleta.nome}`)

  pdf.heading('Dados cadastrais')
  pdf.line('Nome', atleta.nome)
  pdf.line('Contato', [atleta.telefone, atleta.email].filter(Boolean).join(' · ') || '-')
  pdf.line('Modalidade', atleta.modalidade || '-')
  pdf.line('Início', formatDate(atleta.data_inicio))
  pdf.line('Status', atleta.status === 'ativo' ? 'Ativo' : 'Inativo')
  if (atleta.observacoes) {
    pdf.spacer()
    pdf.text(`Observações: ${atleta.observacoes}`)
  }
  pdf.spacer()

  const realizadas = sessoes.filter((s) => s.status === 'realizada').length
  const agendadas = sessoes.filter((s) => s.status === 'agendada').length
  const totalPago = pacotes.filter((p) => p.status_pagamento === 'pago').reduce((sum, p) => sum + p.valor, 0)
  const totalPendente = pacotes
    .filter((p) => p.status_pagamento === 'pendente')
    .reduce((sum, p) => sum + p.valor, 0)

  pdf.heading('Resumo de sessões')
  pdf.line('Sessões realizadas', String(realizadas))
  pdf.line('Sessões agendadas', String(agendadas))
  pdf.spacer()

  pdf.heading('Situação de pagamento')
  pdf.line('Total pago', formatCurrency(totalPago))
  pdf.line('Total pendente', formatCurrency(totalPendente))
  pdf.line('Total geral', formatCurrency(totalPago + totalPendente))
  pdf.spacer()

  pdf.heading('Pacotes')
  if (pacotes.length === 0) {
    pdf.text('Nenhum pacote registrado.')
  }
  pacotes.forEach((p) => {
    pdf.text(
      `${formatDate(p.data_venda)} — ${p.produto_nome_snapshot} — ${formatCurrency(p.valor)} — ${STATUS_PAGAMENTO_LABEL[p.status_pagamento]}`,
    )
  })
  pdf.spacer()

  pdf.heading('Sessões')
  if (sessoes.length === 0) {
    pdf.text('Nenhuma sessão registrada.')
  }
  sessoes
    .slice()
    .sort((a, b) => (a.data + a.horario < b.data + b.horario ? 1 : -1))
    .forEach((s) => {
      pdf.text(`${formatDate(s.data)} ${formatTime(s.horario)} — ${STATUS_SESSAO_LABEL[s.status]}`)
    })

  pdf.save(`resumo-${atleta.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}

export function gerarPdfResumoSessao(
  sessao: Sessao,
  atleta: Atleta,
  pacote: PacoteComRelacoes,
) {
  const pdf = new PdfWriter('Resumo da Sessão')

  pdf.heading('Sessão')
  pdf.line('Atleta', atleta.nome)
  pdf.line('Produto', pacote.produto_nome_snapshot)
  pdf.line('Data', formatDate(sessao.data))
  pdf.line('Horário', formatTime(sessao.horario))
  pdf.line('Status', STATUS_SESSAO_LABEL[sessao.status])
  if (sessao.observacoes) {
    pdf.spacer()
    pdf.text(`Observações: ${sessao.observacoes}`)
  }
  pdf.spacer()

  pdf.heading('Pagamento vinculado (pacote)')
  pdf.line('Valor do pacote', formatCurrency(pacote.valor))
  pdf.line('Situação', STATUS_PAGAMENTO_LABEL[pacote.status_pagamento])
  pdf.line('Data de pagamento', pacote.data_pagamento ? formatDate(pacote.data_pagamento) : '-')

  pdf.save(`sessao-${atleta.nome.replace(/\s+/g, '-').toLowerCase()}-${sessao.data}.pdf`)
}
