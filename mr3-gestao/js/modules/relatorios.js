/* =========================================================================
   Módulo: Relatórios e indicadores — churn (via historicoStatus),
   motivos de saída, novos x saídas, retenção, LTV, MRR, presença,
   ocupação (mapa de calor) e inadimplência.
   Rota: #/relatorios?p=6|12|24|ano
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const { U, UI, Store, D } = MR3;
  const esc = U.esc;
  MR3.modules = MR3.modules || {};

  function render(el, params, query) {
    const hoje = U.today();
    const mesAtual = U.monthKey(hoje);
    const p = ['6', '12', '24', 'ano'].includes(query.p) ? query.p : '12';
    const n = p === 'ano' ? Number(mesAtual.slice(5)) : Number(p);
    const meses = U.lastMonths(n, mesAtual);
    const ini = meses[0] + '-01';
    const fim = hoje;
    const atletas = Store.getAll('atletas');

    el.innerHTML = `
      <div class="page-head">
        <div class="titles"><div class="eyebrow">Inteligência</div><h1>Relatórios e indicadores</h1><p class="subtitle">${U.fmtDate(ini)} a ${U.fmtDate(fim)}</p></div>
        <div class="actions"><div class="segmented" role="group" aria-label="Período">${[['6', '6 meses'], ['12', '12 meses'], ['24', '24 meses'], ['ano', 'Este ano']].map(([k, l]) => `<button type="button" data-p="${k}" class="${k === p ? 'active' : ''}" aria-pressed="${k === p}">${l}</button>`).join('')}</div></div>
      </div>
      <div id="rel-body"></div>`;
    el.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { location.hash = `#/relatorios?p=${b.dataset.p}`; }));
    const body = el.querySelector('#rel-body');

    if (!atletas.length) {
      body.innerHTML = `<div class="card">${UI.empty({ icon: 'bar-chart-3', title: 'Sem dados para analisar', text: 'Cadastre atletas e registre sessões e pagamentos — ou carregue a demonstração em Configurações.', action: `<button class="btn btn-gold" id="rel-demo">${UI.icon('wand-2')}Carregar demonstração</button>` })}</div>`;
      body.querySelector('#rel-demo').onclick = () => MR3.Demo.carregarComConfirmacao();
      return;
    }

    /* ---------- Cálculos ---------- */
    const churns = meses.map(D.churnMes);
    const totSaidas = U.sum(churns, (c) => c.saidas);
    const churnMedio = U.sum(churns, (c) => c.taxa) / churns.length;
    const motivos = D.motivosSaida(ini, fim);
    const ativosIni = D.ativosEm(U.addDays(ini, -1));
    const retidos = ativosIni.filter((a) => D.statusEm(a, fim) === 'ativo').length;
    const retencao = ativosIni.length ? retidos / ativosIni.length : null;
    const jaAtivos = atletas.filter((a) => (a.historicoStatus || []).length);
    const permanencia = jaAtivos.length ? U.sum(jaAtivos, (a) => D.diasAtivo(a)) / jaAtivos.length : 0;
    const saiu = jaAtivos.filter((a) => a.status !== 'ativo');
    const permSaiu = saiu.length ? U.sum(saiu, (a) => D.diasAtivo(a)) / saiu.length : null;
    const ltvs = jaAtivos.map((a) => D.ltv(a.id));
    const ltvMedio = ltvs.length ? U.sum(ltvs) / ltvs.length : 0;
    const mrrs = meses.map((m) => D.mrrEm(m === mesAtual ? hoje : U.endOfMonth(m + '-01')));
    const inads = meses.map((m) => D.inadimplenciaEm(m === mesAtual ? hoje : U.endOfMonth(m + '-01')));
    const resumos = meses.map(D.resumoMes);
    const sessPer = Store.query('sessoes', (s) => s.data >= ini && s.data <= fim);
    const presGeral = D.presenca(sessPer);
    const ocup = D.ocupacao(ini, fim);

    body.innerHTML = `
      <div class="grid grid-kpi mb-3">
        ${UI.kpi({ label: 'Churn médio mensal', value: U.fmtPct(churnMedio), icon: 'trending-down', sub: `${U.plural(totSaidas, 'saída', 'saídas')} no período` })}
        ${UI.kpi({ label: 'Retenção no período', value: U.fmtPct(retencao), icon: 'shield-check', sub: `${retidos} de ${ativosIni.length} ativos no início seguem ativos` })}
        ${UI.kpi({ label: 'Permanência média', value: U.fmtDuration(Math.round(permanencia)), icon: 'hourglass', sub: permSaiu != null ? `quem saiu ficou ${U.fmtDuration(Math.round(permSaiu))}` : 'todos os atletas' })}
        ${UI.kpi({ label: 'LTV médio', value: U.fmtMoney(ltvMedio), icon: 'gem', sub: 'total pago por atleta' })}
        ${UI.kpi({ label: 'MRR atual', value: U.fmtMoney(mrrs[mrrs.length - 1]), icon: 'repeat', sub: 'receita recorrente dos ativos (mensal)' })}
        ${UI.kpi({ label: 'Presença geral', value: U.fmtPct(presGeral.taxa), icon: 'user-check', sub: `${presGeral.realizadas} realizadas · ${presGeral.faltas} faltas` })}
        ${UI.kpi({ label: 'Ocupação da agenda', value: U.fmtPct(ocup.taxa), icon: 'calendar-range', sub: `${U.fmtNum(ocup.usado / 60, 0)}h de ${U.fmtNum(ocup.disponivel / 60, 0)}h disponíveis` })}
        ${UI.kpi({ label: 'Inadimplência atual', value: U.fmtMoney(inads[inads.length - 1]), icon: 'alert-triangle', sub: 'saldo vencido em aberto' })}
      </div>

      <div class="grid grid-2 mb-3">
        <div class="card"><div class="card-head"><h2>${UI.icon('trending-down')}Churn mensal</h2></div><div class="card-body"><div class="chart-box" id="ch-churn"></div>
          <p class="muted tiny mt-2">Churn = saídas no mês ÷ atletas ativos no início do mês. Calculado pelo histórico de status: reativações posteriores não alteram meses passados.</p></div></div>
        <div class="card"><div class="card-head"><h2>${UI.icon('pie-chart')}Motivos de saída</h2></div><div class="card-body">${totSaidas || Object.keys(motivos).length ? '<div class="chart-box" id="ch-motivos"></div>' : UI.empty({ icon: 'smile', title: 'Nenhuma saída no período', compact: true })}</div></div>
      </div>

      <div class="grid grid-2 mb-3">
        <div class="card"><div class="card-head"><h2>${UI.icon('users')}Novos atletas × saídas</h2></div><div class="card-body"><div class="chart-box" id="ch-fluxo"></div></div></div>
        <div class="card"><div class="card-head"><h2>${UI.icon('repeat')}MRR — receita recorrente mensal</h2></div><div class="card-body"><div class="chart-box" id="ch-mrr"></div>
          <p class="muted tiny mt-2">Soma do valor mensal (plano ou personalizado) dos atletas ativos com plano mensal no fim de cada mês.</p></div></div>
      </div>

      <div class="grid grid-2 mb-3">
        <div class="card"><div class="card-head"><h2>${UI.icon('wallet')}Recebido × despesas</h2></div><div class="card-body"><div class="chart-box" id="ch-fin"></div></div></div>
        <div class="card"><div class="card-head"><h2>${UI.icon('alert-triangle')}Inadimplência ao longo do tempo</h2></div><div class="card-body"><div class="chart-box" id="ch-inad"></div>
          <p class="muted tiny mt-2">Saldo de cobranças vencidas e não pagas no último dia de cada mês.</p></div></div>
      </div>

      <div class="card mb-3"><div class="card-head"><h2>${UI.icon('grid-3x3')}Ocupação da agenda por dia e horário</h2>
        <div class="heat-legend" aria-hidden="true">0% ${[0.1, 0.3, 0.5, 0.75, 1].map((v) => `<span class="sw" style="background:${heatColor(v)}"></span>`).join('')} 100%</div></div>
        <div class="card-body"><div class="table-wrap" id="heat"></div></div></div>

      <div class="grid grid-2">
        <div class="card"><div class="card-head"><h2>${UI.icon('user-check')}Presença por atleta</h2></div><div class="card-body flush" id="tb-pres"></div></div>
        <div class="card"><div class="card-head"><h2>${UI.icon('user-x')}Ranking de faltas</h2></div><div class="card-body flush" id="tb-faltas"></div></div>
      </div>

      <div class="card mt-3"><div class="card-head"><h2>${UI.icon('table')}Indicadores mês a mês</h2></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Mês</th><th class="right">Ativos no início</th><th class="right">Novos</th><th class="right">Reativ.</th><th class="right">Saídas</th><th class="right">Churn</th><th class="right">MRR</th><th class="right">Recebido</th><th class="right">Despesas</th><th class="right">Inadimpl.</th></tr></thead><tbody>
        ${meses.map((m, i) => `<tr><td class="nowrap">${U.monthShort(m)}</td><td class="right num">${churns[i].ativosInicio}</td><td class="right num">${churns[i].novos}</td><td class="right num">${churns[i].reativacoes}</td><td class="right num">${churns[i].saidas}</td>
          <td class="right num ${churns[i].taxa > 0.05 ? 'text-danger' : ''}">${U.fmtPct(churns[i].taxa)}</td><td class="right num">${U.fmtMoney(mrrs[i])}</td><td class="right num">${U.fmtMoney(resumos[i].recebido)}</td><td class="right num">${U.fmtMoney(resumos[i].despesas)}</td><td class="right num">${U.fmtMoney(inads[i])}</td></tr>`).reverse().join('')}
        </tbody></table></div></div>`;

    /* ---------- Gráficos ---------- */
    const c = UI.chartColors();
    const labels = meses.map(U.monthShort);
    const pctTick = (v) => U.fmtPct(v, 0);

    UI.chart(body.querySelector('#ch-churn'), {
      type: 'bar',
      data: { labels, datasets: [
        { type: 'line', label: 'Churn (%)', data: churns.map((x) => x.taxa), borderColor: c.danger, backgroundColor: c.danger, tension: .3, yAxisID: 'y', pointRadius: 3 },
        { type: 'bar', label: 'Saídas', data: churns.map((x) => x.saidas), backgroundColor: c.grid, borderRadius: 4, yAxisID: 'y1', maxBarThickness: 26 },
      ] },
      options: { scales: { y: { ticks: { callback: pctTick } }, y1: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { precision: 0 } } },
        plugins: { tooltip: { callbacks: { label: (x) => x.dataset.yAxisID === 'y' ? ` Churn: ${U.fmtPct(x.raw)}` : ` Saídas: ${x.raw}` } } } },
    });

    if (body.querySelector('#ch-motivos')) {
      const keys = Object.keys(motivos).sort((a, b) => motivos[b] - motivos[a]);
      UI.chart(body.querySelector('#ch-motivos'), {
        type: 'doughnut',
        data: { labels: keys.map((k) => D.MOTIVOS_SAIDA[k] || k), datasets: [{ data: keys.map((k) => motivos[k]), backgroundColor: c.series, borderColor: c.surface, borderWidth: 2 }] },
        options: { cutout: '58%', plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: (x) => ` ${x.label}: ${x.raw} (${U.fmtPct(x.raw / U.sum(x.dataset.data))})` } } } },
      });
    }

    UI.chart(body.querySelector('#ch-fluxo'), {
      type: 'bar',
      data: { labels, datasets: [
        { label: 'Novos', data: churns.map((x) => x.novos), backgroundColor: c.success, stack: 'in', borderRadius: 4, maxBarThickness: 26 },
        { label: 'Reativações', data: churns.map((x) => x.reativacoes), backgroundColor: c.primary, stack: 'in', borderRadius: 4, maxBarThickness: 26 },
        { label: 'Saídas', data: churns.map((x) => -x.saidas), backgroundColor: c.danger, stack: 'in', borderRadius: 4, maxBarThickness: 26 },
        { type: 'line', label: 'Crescimento líquido', data: churns.map((x) => x.liquido), borderColor: c.gold, backgroundColor: c.gold, tension: .3, pointRadius: 3 },
      ] },
      options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { tooltip: { callbacks: { label: (x) => ` ${x.dataset.label}: ${Math.abs(x.raw)}` } } } },
    });

    UI.chart(body.querySelector('#ch-mrr'), {
      type: 'line',
      data: { labels, datasets: [{ label: 'MRR', data: mrrs, borderColor: c.gold, backgroundColor: c.gold + '22', fill: true, tension: .3, pointRadius: 3 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (x) => ' ' + U.fmtMoney(x.raw) } } }, scales: { y: { ticks: { callback: UI.moneyTick } } } },
    });

    UI.chart(body.querySelector('#ch-fin'), {
      type: 'bar',
      data: { labels, datasets: [
        { label: 'Recebido', data: resumos.map((x) => x.recebido), backgroundColor: c.gold, borderRadius: 4, maxBarThickness: 26 },
        { label: 'Despesas', data: resumos.map((x) => x.despesas), backgroundColor: c.danger + 'AA', borderRadius: 4, maxBarThickness: 26 },
        { type: 'line', label: 'Líquido', data: resumos.map((x) => x.liquido), borderColor: c.primary, backgroundColor: c.primary, tension: .3, pointRadius: 3 },
      ] },
      options: { scales: { y: { ticks: { callback: UI.moneyTick } } }, plugins: { tooltip: { callbacks: { label: (x) => ` ${x.dataset.label}: ${U.fmtMoney(x.raw)}` } } } },
    });

    UI.chart(body.querySelector('#ch-inad'), {
      type: 'line',
      data: { labels, datasets: [{ label: 'Inadimplência', data: inads, borderColor: c.danger, backgroundColor: c.danger + '22', fill: true, tension: .3, pointRadius: 3 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (x) => ' ' + U.fmtMoney(x.raw) } } }, scales: { y: { ticks: { callback: UI.moneyTick } } } },
    });

    renderHeatmap(body.querySelector('#heat'), ini, fim);
    renderPresenca(body, sessPer);
  }

  /** Cor do mapa de calor: transparente → azul → dourado. */
  function heatColor(v) {
    if (!v) return 'var(--surface-2)';
    if (v < 0.5) return `color-mix(in srgb, var(--primary-hover) ${Math.round(18 + v * 120)}%, var(--surface-2))`;
    return `color-mix(in srgb, var(--gold) ${Math.round(35 + (v - 0.5) * 130)}%, var(--primary-hover))`;
  }

  /** Ocupação por (dia da semana × hora) = minutos com sessão ÷ minutos disponíveis. */
  function renderHeatmap(box, ini, fim) {
    const cfg = Store.getConfig();
    const h = cfg.horarioAtendimento;
    const hIni = Math.floor(U.timeToMin(h.inicio) / 60), hFim = Math.ceil(U.timeToMin(h.fim) / 60);
    const horas = []; for (let x = hIni; x < hFim; x++) horas.push(x);
    const diasAbertos = h.dias.slice().sort();
    const nDias = Array(7).fill(0);
    for (let d = ini; d <= fim; d = U.addDays(d, 1)) nDias[U.weekday(d)]++;
    const occ = Array.from({ length: 7 }, () => ({}));
    Store.query('sessoes', (s) => s.data >= ini && s.data <= fim && D.ocupa(s)).forEach((s) => {
      const a = U.timeToMin(s.horaInicio), b = a + (+s.duracaoMin || 60);
      const wd = U.weekday(s.data);
      for (let hr = Math.floor(a / 60); hr * 60 < b; hr++) {
        const overlap = Math.min(b, (hr + 1) * 60) - Math.max(a, hr * 60);
        if (overlap > 0) occ[wd][hr] = (occ[wd][hr] || 0) + overlap;
      }
    });
    if (!diasAbertos.length) { box.innerHTML = '<p class="muted">Configure o horário de atendimento.</p>'; return; }
    box.innerHTML = `<table class="heatmap"><thead><tr><th></th>${horas.map((x) => `<th>${String(x).padStart(2, '0')}h</th>`).join('')}</tr></thead><tbody>
      ${diasAbertos.map((wd) => `<tr><th scope="row" style="text-align:left">${U.DIAS_CURTOS[wd]}</th>${horas.map((hr) => {
        const v = nDias[wd] ? Math.min(1, (occ[wd][hr] || 0) / (60 * nDias[wd])) : 0;
        return `<td style="background:${heatColor(v)};color:${v >= 0.5 ? 'var(--on-gold)' : 'var(--text-2)'}" title="${U.DIAS[wd]} ${hr}h: ${U.fmtPct(v, 0)}">${v ? Math.round(v * 100) : ''}</td>`;
      }).join('')}</tr>`).join('')}</tbody></table>
      <p class="muted tiny mt-2">Percentual do horário ocupado com sessões (realizadas, agendadas ou faltas) no período.</p>`;
  }

  function renderPresenca(body, sessPer) {
    const porAtleta = {};
    sessPer.forEach((s) => (s.atletaIds || []).forEach((id) => { (porAtleta[id] = porAtleta[id] || []).push(s); }));
    const rows = Object.entries(porAtleta).map(([id, ss]) => Object.assign({ a: Store.getById('atletas', id) }, D.presenca(ss))).filter((r) => r.a && r.realizadas + r.faltas > 0);
    const pres = U.sortBy(rows, (r) => r.taxa, -1);
    const faltas = U.sortBy(rows.filter((r) => r.faltas > 0), (r) => r.faltas, -1).slice(0, 10);
    body.querySelector('#tb-pres').innerHTML = pres.length ? `<div class="table-wrap" style="max-height:420px"><table class="table"><thead><tr><th>Atleta</th><th class="right">Realizadas</th><th class="right">Faltas</th><th style="min-width:130px">Presença</th></tr></thead><tbody>
      ${pres.map((r) => `<tr><td>${UI.personLink(r.a)}</td><td class="right num">${r.realizadas}</td><td class="right num">${r.faltas}</td>
        <td><div class="row"><span class="num" style="min-width:42px">${U.fmtPct(r.taxa, 0)}</span><div class="progress ${r.taxa >= 0.85 ? 'gold' : ''}" style="flex:1"><span style="width:${(r.taxa || 0) * 100}%;${r.taxa < 0.7 ? 'background:var(--danger)' : ''}"></span></div></div></td></tr>`).join('')}
      </tbody></table></div>` : UI.empty({ icon: 'user-check', title: 'Sem sessões no período', compact: true });
    body.querySelector('#tb-faltas').innerHTML = faltas.length ? `<ul class="list">${faltas.map((r, i) => `<li class="list-item"><b class="num" style="width:22px;color:var(--gold-text)">${i + 1}º</b>${UI.personLink(r.a, `${r.realizadas} realizadas · presença ${U.fmtPct(r.taxa, 0)}`)}<span class="spacer"></span>${UI.badge(U.plural(r.faltas, 'falta', 'faltas'), 'danger no-dot')}</li>`).join('')}</ul>`
      : UI.empty({ icon: 'party-popper', title: 'Nenhuma falta no período', compact: true });
    UI.refreshIcons(body);
  }

  MR3.modules.relatorios = { title: 'Relatórios', render };
})();
