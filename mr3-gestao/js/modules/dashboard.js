/* =========================================================================
   Módulo: Dashboard — KPIs, agenda de hoje, vencimentos/atrasos,
   aniversariantes e faturamento dos últimos 6 meses.
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const { U, UI, Store, D } = MR3;
  const esc = U.esc;
  MR3.modules = MR3.modules || {};

  function render(el) {
    const cfg = Store.getConfig();
    const hoje = U.today();
    const mes = U.monthKey(hoje);
    const atletas = Store.getAll('atletas');
    const ativos = atletas.filter((a) => a.status === 'ativo');
    const r = D.resumoMes(mes);
    const inad = D.inadimplenciaAtual();
    const wIni = U.startOfWeek(hoje), wFim = U.addDays(wIni, 6);
    const sessSemana = Store.query('sessoes', (s) => s.data >= wIni && s.data <= wFim && D.ocupa(s));
    const realizadasSem = sessSemana.filter((s) => s.status === 'realizada').length;
    const churn = D.churnMes(mes);
    const hora = Number(U.nowTime().slice(0, 2));
    const saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

    if (!atletas.length && !Store.getAll('planos').length) {
      el.innerHTML = `
        <div class="page-head"><div class="titles"><div class="eyebrow">${U.capitalize(U.DIAS[U.weekday(hoje)])}, ${U.fmtDate(hoje)}</div><h1>${saud}, ${esc(U.firstName(cfg.nomeProfissional))}!</h1></div></div>
        <div class="card">${UI.empty({ icon: 'sparkles', title: 'Bem-vindo ao MR3 Gestão', text: 'Comece cadastrando seus planos e atletas, ou carregue os dados de demonstração para explorar todas as telas e gráficos.',
          action: `<div class="row-wrap" style="justify-content:center"><a class="btn" href="#/sessoes/planos">${UI.icon('clipboard-list')}Criar planos</a><button class="btn" id="db-novo">${UI.icon('user-plus')}Cadastrar atleta</button><button class="btn btn-gold" id="db-demo">${UI.icon('wand-2')}Carregar demonstração</button></div>` })}</div>`;
      el.querySelector('#db-novo').onclick = () => MR3.Atletas.openForm();
      el.querySelector('#db-demo').onclick = () => MR3.Demo.carregarComConfirmacao();
      return;
    }

    const sessHoje = U.sortBy(Store.query('sessoes', (s) => s.data === hoje), (s) => s.horaInicio);
    const abertas = D.cobrancasComStatus((c) => c.status !== 'cancelado').filter((c) => c._status === 'pendente' || c._status === 'atrasado');
    const vencendo = U.sortBy(abertas.filter((c) => c._status === 'pendente' && c.vencimento <= U.addDays(hoje, 7)), (c) => c.vencimento);
    const atrasadas = U.sortBy(abertas.filter((c) => c._status === 'atrasado'), (c) => c.vencimento);
    const mesNum = Number(hoje.slice(5, 7));
    const aniversariantes = U.sortBy(ativos.filter((a) => D.isAniversarioNoMes(a, mesNum)), (a) => a.dataNascimento.slice(8));

    el.innerHTML = `
      <div class="page-head">
        <div class="titles"><div class="eyebrow">${U.capitalize(U.DIAS[U.weekday(hoje)])}, ${U.fmtDate(hoje)}</div><h1>${saud}, ${esc(U.firstName(cfg.nomeProfissional))}!</h1>
          <p class="subtitle">${sessHoje.filter((s) => D.ocupa(s)).length ? `Você tem ${U.plural(sessHoje.filter((s) => D.ocupa(s)).length, 'sessão', 'sessões')} hoje.` : 'Nenhuma sessão agendada para hoje.'}</p></div>
        <div class="actions"><button class="btn" id="db-atleta">${UI.icon('user-plus')}Atleta</button><button class="btn btn-gold" id="db-sessao">${UI.icon('calendar-plus')}Nova sessão</button></div>
      </div>

      <div class="grid grid-kpi mb-3">
        ${UI.kpi({ label: 'Atletas ativos', value: ativos.length, icon: 'users', href: '#/atletas', sub: `${churn.novos + churn.reativacoes} entradas · ${churn.saidas} saídas no mês` })}
        ${UI.kpi({ label: 'Recebido no mês', value: U.fmtMoney(r.recebido), icon: 'banknote', href: '#/financeiro/resumo', sub: `de ${U.fmtMoney(r.previsto)} previstos` })}
        ${UI.kpi({ label: 'A receber no mês', value: U.fmtMoney(r.pendente), icon: 'clock', href: '#/financeiro', sub: 'pendente, ainda no prazo' })}
        ${UI.kpi({ label: 'Inadimplência', value: U.fmtMoney(inad.valor), icon: 'alert-triangle', href: '#/financeiro?m=' + mes, sub: U.plural(inad.atletas, 'atleta em atraso', 'atletas em atraso') })}
        ${UI.kpi({ label: 'Sessões da semana', value: `${realizadasSem}<span class="muted" style="font-size:16px;font-weight:600"> / ${sessSemana.length}</span>`, icon: 'calendar-check', href: '#/agenda', sub: 'realizadas / agendadas' })}
        ${UI.kpi({ label: 'Churn do mês', value: U.fmtPct(churn.taxa), icon: 'trending-down', href: '#/relatorios', sub: `${churn.saidas} de ${churn.ativosInicio} ativos no início` })}
      </div>

      <div class="grid grid-2 mb-3">
        <div class="card"><div class="card-head"><h2>${UI.icon('calendar-days')}Agenda de hoje</h2><a class="btn btn-sm btn-ghost" href="#/agenda?v=dia&d=${hoje}">Ver agenda</a></div>
          <div class="card-body flush">${sessHoje.length ? `<ul class="list">${sessHoje.map((s) => {
            const nomes = (s.atletaIds || []).map((id) => Store.getById('atletas', id)).filter(Boolean);
            return `<li class="list-item"><span class="time-pill">${esc(s.horaInicio)}</span>
              <div class="grow"><div class="title truncate"><a href="#" data-det="${esc(s.id)}">${esc(nomes.map((a) => a.nome).join(', ') || 'Sem atleta')}</a></div><div class="muted small truncate">${esc([s.tipo, s.local, s.duracaoMin + ' min'].filter(Boolean).join(' · '))}</div></div>
              ${s.status === 'agendada' ? `<button class="btn btn-sm btn-success" data-real="${esc(s.id)}" aria-label="Marcar realizada">${UI.icon('check')}<span class="hide-mobile">Realizada</span></button><button class="btn btn-sm btn-danger" data-falta="${esc(s.id)}" aria-label="Marcar falta">${UI.icon('x')}<span class="hide-mobile">Falta</span></button>` : UI.badgeSessao(s.status)}
            </li>`;
          }).join('')}</ul>` : UI.empty({ icon: 'coffee', title: 'Dia livre', text: 'Nenhuma sessão agendada para hoje.', compact: true })}</div></div>

        <div class="card"><div class="card-head"><h2>${UI.icon('bar-chart-3')}Faturamento — últimos 6 meses</h2></div>
          <div class="card-body"><div class="chart-box" id="db-chart"></div></div></div>
      </div>

      <div class="grid grid-2 mb-3">
        <div class="card"><div class="card-head"><h2>${UI.icon('alert-octagon')}Pagamentos atrasados</h2>${atrasadas.length ? UI.badge(U.fmtMoney(U.sum(atrasadas, (c) => c._saldo)), 'danger no-dot') : ''}</div>
          <div class="card-body flush">${listaCobrancas(atrasadas, 'Nenhum pagamento em atraso. 🎉')}</div></div>
        <div class="card"><div class="card-head"><h2>${UI.icon('calendar-clock')}Vencendo nos próximos 7 dias</h2>${vencendo.length ? UI.badge(U.fmtMoney(U.sum(vencendo, (c) => c._saldo)), 'info no-dot') : ''}</div>
          <div class="card-body flush">${listaCobrancas(vencendo, 'Nada vencendo nos próximos 7 dias.')}</div></div>
      </div>

      <div class="card"><div class="card-head"><h2>${UI.icon('cake')}Aniversariantes de ${U.MESES[mesNum - 1]}</h2></div>
        <div class="card-body flush">${aniversariantes.length ? `<ul class="list">${aniversariantes.map((a) => {
          const dia = a.dataNascimento.slice(8), hojeDia = hoje.slice(8);
          const ehHoje = dia === hojeDia;
          return `<li class="list-item">${UI.personLink(a, `${dia}/${String(mesNum).padStart(2, '0')} · faz ${U.parse(hoje).getFullYear() - Number(a.dataNascimento.slice(0, 4))} anos`)}<span class="spacer"></span>
            ${ehHoje ? UI.badge('Hoje!', 'gold') : dia < hojeDia ? UI.badge('Já passou', 'no-dot') : ''}
            ${a.telefone ? `<button class="icon-btn sm" data-parabens="${esc(a.id)}" aria-label="Mandar parabéns para ${esc(a.nome)}" title="Mandar parabéns">${UI.icon('message-circle')}</button>` : ''}</li>`;
        }).join('')}</ul>` : UI.empty({ icon: 'cake', title: 'Nenhum aniversariante este mês', compact: true })}</div></div>`;

    // Gráfico: recebido x previsto (6 meses)
    const meses = U.lastMonths(6);
    const resumos = meses.map(D.resumoMes);
    const c = UI.chartColors();
    UI.chart(el.querySelector('#db-chart'), {
      type: 'bar',
      data: { labels: meses.map(U.monthShort), datasets: [
        { label: 'Previsto', data: resumos.map((x) => x.previsto), backgroundColor: c.primary + '55', borderColor: c.primary, borderWidth: 1, borderRadius: 6, maxBarThickness: 34 },
        { label: 'Recebido', data: resumos.map((x) => x.recebido), backgroundColor: c.gold, borderRadius: 6, maxBarThickness: 34 },
      ] },
      options: { scales: { y: { ticks: { callback: UI.moneyTick } } }, plugins: { tooltip: { callbacks: { label: (x) => ` ${x.dataset.label}: ${U.fmtMoney(x.raw)}` } } } },
    });

    // Ações
    el.querySelector('#db-sessao').onclick = () => MR3.Agenda.openSessao({ data: hoje });
    el.querySelector('#db-atleta').onclick = () => MR3.Atletas.openForm();
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-real],[data-falta],[data-det],[data-pagar],[data-wa],[data-parabens]');
      if (!b) return;
      e.preventDefault();
      if (b.dataset.real) MR3.Agenda.marcar(b.dataset.real, 'realizada');
      else if (b.dataset.falta) MR3.Agenda.marcar(b.dataset.falta, 'falta');
      else if (b.dataset.det) MR3.Agenda.openDetalhe(b.dataset.det);
      else if (b.dataset.pagar) MR3.Fin.pagar(b.dataset.pagar);
      else if (b.dataset.wa) MR3.Fin.cobrarWhatsApp(b.dataset.wa);
      else if (b.dataset.parabens) {
        const a = Store.getById('atletas', b.dataset.parabens);
        UI.whatsapp({ telefone: a.telefone, nome: a.nome, titulo: 'Mensagem de aniversário', mensagem: `Parabéns, ${U.firstName(a.nome)}! 🎉🎂\nDesejo um ano cheio de saúde, evolução e conquistas dentro e fora de campo. Conte sempre comigo!\n${cfg.nomeProfissional} — ${cfg.empresa}` });
      }
    });
  }

  function listaCobrancas(list, vazio) {
    if (!list.length) return UI.empty({ icon: 'check-circle-2', title: vazio, compact: true });
    const max = 6;
    return `<ul class="list">${list.slice(0, max).map((c) => {
      const a = Store.getById('atletas', c.atletaId);
      const dias = U.diffDays(c.vencimento, U.today());
      return `<li class="list-item">${UI.avatar(a, 'sm')}
        <div class="grow"><div class="title truncate">${a ? `<a href="#/atletas/${esc(a.id)}/financeiro">${esc(a.nome)}</a>` : 'Atleta removido'}</div>
          <div class="muted small truncate">${esc(c.referencia)} · ${dias > 0 ? `<span class="text-danger">venceu há ${U.plural(dias, 'dia', 'dias')}</span>` : dias === 0 ? 'vence hoje' : `vence ${U.fmtDateDow(c.vencimento)}`}</div></div>
        <b class="num nowrap">${U.fmtMoney(c._saldo)}</b>
        ${a && (a.telefone || (a.responsavel && a.responsavel.telefone)) ? `<button class="icon-btn sm" data-wa="${esc(c.id)}" aria-label="Cobrar ${esc(a.nome)} no WhatsApp" title="Cobrar no WhatsApp">${UI.icon('message-circle')}</button>` : ''}
        <button class="btn btn-sm btn-gold" data-pagar="${esc(c.id)}" aria-label="Registrar pagamento">${UI.icon('banknote')}<span class="hide-mobile">Registrar</span></button></li>`;
    }).join('')}</ul>${list.length > max ? `<div class="card-pad small"><a href="#/financeiro?m=${U.monthKey(U.today())}">Ver todos (${list.length})</a></div>` : ''}`;
  }

  MR3.modules.dashboard = { title: 'Dashboard', render };
})();
