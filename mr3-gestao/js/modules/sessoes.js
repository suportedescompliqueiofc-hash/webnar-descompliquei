/* =========================================================================
   Módulo: Planos e Sessões — CRUD de planos, saldo de pacotes por atleta
   e histórico geral de sessões (com filtros e CSV).
   Rota: #/sessoes[/planos|pacotes|historico]
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const { U, UI, Store, D } = MR3;
  const esc = U.esc;
  MR3.modules = MR3.modules || {};

  const filtros = { ini: '', fim: '', status: '', atleta: '', tipo: '' };

  function render(el, params) {
    const aba = ['planos', 'pacotes', 'historico'].includes(params[0]) ? params[0] : 'planos';
    el.innerHTML = `
      <div class="page-head">
        <div class="titles"><div class="eyebrow">Operação</div><h1>Planos e sessões</h1><p class="subtitle">Planos oferecidos, saldo de pacotes e histórico de atendimentos.</p></div>
        <div class="actions" id="ps-actions"></div>
      </div>
      <nav class="tabs" aria-label="Seções">${[['planos', 'Planos'], ['pacotes', 'Saldo de pacotes'], ['historico', 'Histórico de sessões']].map(([k, l]) => `<a href="#/sessoes/${k}" class="${k === aba ? 'active' : ''}" ${k === aba ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
      <div id="ps-body"></div>`;
    const body = el.querySelector('#ps-body');
    const actions = el.querySelector('#ps-actions');
    if (aba === 'planos') renderPlanos(body, actions);
    else if (aba === 'pacotes') renderPacotes(body, actions);
    else renderHistorico(body, actions);
  }

  /* ---------------- Planos ---------------- */
  function renderPlanos(body, actions) {
    actions.innerHTML = `<button class="btn btn-gold" id="pl-novo">${UI.icon('plus')}Novo plano</button>`;
    actions.querySelector('#pl-novo').onclick = () => openPlano();
    const planos = U.sortBy(Store.getAll('planos'), (p) => (p.ativo === false ? 1 : 0) * 1e6 + Number(p.valor));
    const uso = U.groupBy(Store.query('atletas', (a) => a.status === 'ativo' && a.planoId), (a) => a.planoId);
    if (!planos.length) {
      body.innerHTML = `<div class="card">${UI.empty({ icon: 'clipboard-list', title: 'Nenhum plano cadastrado', text: 'Crie planos mensais (X sessões/semana), pacotes de N sessões com validade ou sessão avulsa.', action: `<button class="btn btn-gold" id="pl-novo2">${UI.icon('plus')}Criar plano</button>` })}</div>`;
      body.querySelector('#pl-novo2').onclick = () => openPlano();
      return;
    }
    body.innerHTML = `<div class="grid grid-3">${planos.map((p) => `
      <div class="card card-pad" style="${p.ativo === false ? 'opacity:.6' : ''}">
        <div class="row mb-2">${UI.badge(D.TIPOS_PLANO[p.tipo], p.tipo === 'mensal' ? 'info' : p.tipo === 'pacote' ? 'gold' : '')}<span class="spacer"></span>${p.ativo === false ? UI.badge('Inativo') : ''}</div>
        <h3>${esc(p.nome)}</h3>
        <div class="kpi-value" style="font-size:24px">${U.fmtMoney(p.valor)}<span class="muted small" style="font-weight:500"> ${p.tipo === 'mensal' ? '/mês' : p.tipo === 'avulso' ? '/sessão' : ''}</span></div>
        <p class="muted small mt-2">${p.tipo === 'mensal' ? `${p.sessoesPorSemana || '—'}x por semana` : p.tipo === 'pacote' ? `${p.quantidadeSessoes} sessões · validade ${p.validadeDias ? p.validadeDias + ' dias' : 'indeterminada'} · ${U.fmtMoney(p.valor / (p.quantidadeSessoes || 1))}/sessão` : 'Cobrança gerada a cada sessão realizada'}</p>
        <p class="small mt-2">${UI.icon('users')} ${U.plural((uso[p.id] || []).length, 'atleta ativo', 'atletas ativos')}</p>
        <div class="row mt-3"><button class="btn btn-sm" data-edit="${esc(p.id)}">${UI.icon('pencil')}Editar</button>
          <button class="btn btn-sm btn-ghost" data-toggle="${esc(p.id)}">${p.ativo === false ? 'Ativar' : 'Desativar'}</button>
          <span class="spacer"></span><button class="icon-btn sm ghost" data-del="${esc(p.id)}" aria-label="Excluir plano">${UI.icon('trash-2')}</button></div>
      </div>`).join('')}</div>`;
    body.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => openPlano(b.dataset.edit)));
    body.querySelectorAll('[data-toggle]').forEach((b) => (b.onclick = () => { const p = Store.getById('planos', b.dataset.toggle); Store.update('planos', p.id, { ativo: p.ativo === false }); MR3.refresh(); }));
    body.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      const id = b.dataset.del;
      const usando = Store.query('atletas', { planoId: id }).length;
      if (usando) { UI.toast(`Este plano está vinculado a ${U.plural(usando, 'atleta', 'atletas')}. Desative-o em vez de excluir.`, 'warning', 5000); return; }
      if (await UI.confirm({ title: 'Excluir plano', message: 'Deseja excluir este plano?', danger: true, confirmText: 'Excluir' })) { Store.remove('planos', id); UI.toast('Plano excluído.'); MR3.refresh(); }
    }));
  }

  function openPlano(id) {
    const p = id ? Store.getById('planos', id) : { tipo: 'mensal', sessoesPorSemana: 2, quantidadeSessoes: 10, validadeDias: 60, ativo: true };
    UI.modal({
      title: id ? 'Editar plano' : 'Novo plano',
      body: `<form id="pl-form" novalidate><div class="form-grid">
        <div class="field full"><label for="pl-nome">Nome <span class="req">*</span></label><input id="pl-nome" class="input" name="nome" value="${esc(p.nome)}" placeholder="Ex.: Mensal 2x/semana"></div>
        <div class="field"><label for="pl-tipo">Tipo</label><select id="pl-tipo" class="input" name="tipo">${UI.options(D.TIPOS_PLANO, p.tipo)}</select></div>
        <div class="field"><label for="pl-valor">Valor <span class="req">*</span></label>${UI.moneyInput('valor', p.valor, 'id="pl-valor"')}</div>
        <div class="field" data-for="mensal"><label for="pl-spw">Sessões por semana</label><input id="pl-spw" type="number" min="1" max="14" class="input" name="sessoesPorSemana" value="${esc(p.sessoesPorSemana)}"></div>
        <div class="field" data-for="pacote"><label for="pl-qtd">Quantidade de sessões</label><input id="pl-qtd" type="number" min="1" class="input" name="quantidadeSessoes" value="${esc(p.quantidadeSessoes)}"></div>
        <div class="field" data-for="pacote"><label for="pl-val">Validade (dias)</label><input id="pl-val" type="number" min="0" class="input" name="validadeDias" value="${esc(p.validadeDias)}"><span class="hint">0 = sem validade</span></div>
      </div></form>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-gold" id="pl-save">${UI.icon('check')}Salvar</button>`,
      onOpen(el, close) {
        const form = el.querySelector('#pl-form');
        const toggle = () => el.querySelectorAll('[data-for]').forEach((x) => (x.hidden = x.dataset.for !== form.tipo.value));
        form.tipo.addEventListener('change', toggle); toggle();
        el.querySelector('#pl-save').onclick = () => {
          const f = UI.formData(form);
          const errs = {};
          if (!f.nome) errs.nome = 'Informe o nome.';
          if (!(f.valor > 0)) errs.valor = 'Informe um valor maior que zero.';
          if (f.tipo === 'pacote' && !(Number(f.quantidadeSessoes) > 0)) errs.quantidadeSessoes = 'Informe a quantidade.';
          if (!UI.showErrors(form, errs)) return;
          const rec = { nome: f.nome, tipo: f.tipo, valor: f.valor, sessoesPorSemana: f.tipo === 'mensal' ? Number(f.sessoesPorSemana) || null : null,
            quantidadeSessoes: f.tipo === 'pacote' ? Number(f.quantidadeSessoes) : null, validadeDias: f.tipo === 'pacote' ? Number(f.validadeDias) || 0 : null, ativo: p.ativo !== false };
          if (id) Store.update('planos', id, rec); else Store.create('planos', rec);
          UI.toast('Plano salvo.'); close(); MR3.refresh();
        };
      },
    });
  }

  /* ---------------- Saldo de pacotes ---------------- */
  function renderPacotes(body, actions) {
    const cfg = Store.getConfig();
    const ids = [...new Set(Store.query('cobrancas', (c) => c.pacote && c.status !== 'cancelado').map((c) => c.atletaId))];
    const rows = U.sortBy(ids.map((id) => ({ a: Store.getById('atletas', id), pac: D.saldoPacote(id) })).filter((r) => r.a), (r) => r.pac.saldo);
    actions.innerHTML = `<button class="btn btn-gold" id="pc-novo">${UI.icon('package-plus')}Lançar pacote</button>`;
    actions.querySelector('#pc-novo').onclick = () => MR3.Fin.openCobranca({ tipo: 'pacote' });
    body.innerHTML = `<div class="card">${rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Atleta</th><th>Usadas / total</th><th style="min-width:140px">Saldo</th><th class="hide-mobile">Validade</th><th></th></tr></thead><tbody>
      ${rows.map(({ a, pac }) => `<tr><td>${UI.personLink(a, a.status === 'ativo' ? '' : 'Inativo')}</td><td class="num">${pac.usadas} / ${pac.creditos}</td>
        <td><div class="row"><b class="num ${pac.saldo <= cfg.alertaSaldoPacote ? 'text-warning' : ''}">${pac.saldo}</b><div class="progress ${pac.saldo <= cfg.alertaSaldoPacote ? '' : 'gold'}" style="flex:1"><span style="width:${U.clamp(pac.creditos ? (pac.saldo / pac.creditos) * 100 : 0, 0, 100)}%"></span></div></div></td>
        <td class="hide-mobile">${pac.validade ? `${U.fmtDate(pac.validade)} ${pac.vencido ? UI.badge('Vencido', 'danger') : ''}` : '—'}</td>
        <td class="actions-cell">${pac.saldo <= cfg.alertaSaldoPacote ? `<button class="btn btn-sm" data-renovar="${esc(a.id)}">${UI.icon('refresh-cw')}Renovar</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="card-pad muted small">Sessões realizadas${cfg.faltaDescontaPacote ? ' e faltas (sem aviso)' : ''} descontam do saldo. Alerta quando restarem ${cfg.alertaSaldoPacote} ou menos. Regra ajustável em Configurações.</div>`
      : UI.empty({ icon: 'package', title: 'Nenhum pacote lançado', text: 'Ao lançar uma cobrança de pacote para um atleta, o saldo de sessões aparece aqui.' })}</div>`;
    body.querySelectorAll('[data-renovar]').forEach((b) => (b.onclick = () => MR3.Fin.openCobranca({ atletaId: b.dataset.renovar, tipo: 'pacote' })));
  }

  /* ---------------- Histórico de sessões ---------------- */
  function renderHistorico(body, actions) {
    if (!filtros.ini) { filtros.ini = U.addDays(U.today(), -30); filtros.fim = U.addDays(U.today(), 14); }
    actions.innerHTML = `<button class="btn" id="hs-csv">${UI.icon('file-spreadsheet')}Exportar CSV</button><button class="btn btn-gold" id="hs-nova">${UI.icon('calendar-plus')}Nova sessão</button>`;
    const atletas = U.sortBy(Store.getAll('atletas'), (a) => a.nome);
    const tipos = [...new Set(Store.getAll('sessoes').map((s) => s.tipo).filter(Boolean))].sort();
    body.innerHTML = `<div class="card">
      <div class="toolbar">
        <label class="sr-only" for="h-ini">De</label><input type="date" id="h-ini" class="input" value="${filtros.ini}">
        <label class="sr-only" for="h-fim">Até</label><input type="date" id="h-fim" class="input" value="${filtros.fim}">
        <label class="sr-only" for="h-st">Status</label><select id="h-st" class="input">${UI.options(Object.fromEntries(Object.entries(D.STATUS_SESSAO).map(([k, x]) => [k, x.label])), filtros.status, { empty: 'Todos os status' })}</select>
        <label class="sr-only" for="h-at">Atleta</label><select id="h-at" class="input">${UI.options(atletas.map((a) => ({ value: a.id, label: a.nome })), filtros.atleta, { empty: 'Todos os atletas' })}</select>
        <label class="sr-only" for="h-tp">Tipo</label><select id="h-tp" class="input">${UI.options(tipos, filtros.tipo, { empty: 'Todos os tipos' })}</select>
      </div><div id="h-table"></div></div>`;
    const lista = () => U.sortBy(Store.query('sessoes', (s) => (!filtros.ini || s.data >= filtros.ini) && (!filtros.fim || s.data <= filtros.fim) && (!filtros.status || s.status === filtros.status) && (!filtros.atleta || (s.atletaIds || []).includes(filtros.atleta)) && (!filtros.tipo || s.tipo === filtros.tipo)), (s) => s.data + s.horaInicio, -1);
    const draw = () => {
      const rows = lista();
      const pres = D.presenca(rows);
      const box = body.querySelector('#h-table');
      box.innerHTML = rows.length ? `<div class="agenda-stats"><span>Total <b>${rows.length}</b></span><span>Realizadas <b class="text-success">${pres.realizadas}</b></span><span>Faltas <b class="text-danger">${pres.faltas}</b></span><span>Presença <b class="gold">${U.fmtPct(pres.taxa)}</b></span></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Horário</th><th>Atleta(s)</th><th class="hide-mobile">Tipo</th><th class="hide-mobile">Local</th><th>Status</th><th class="hide-mobile">PSE</th></tr></thead><tbody>
        ${rows.slice(0, 500).map((s) => `<tr class="clickable" data-sid="${esc(s.id)}"><td class="num nowrap">${U.fmtDateDow(s.data)}</td><td class="num">${esc(s.horaInicio)}</td><td>${esc((s.atletaIds || []).map(D.nomeAtleta).join(', '))}</td>
          <td class="hide-mobile">${esc(s.tipo || '—')}</td><td class="hide-mobile">${esc(s.local || '—')}</td><td>${UI.badgeSessao(s.status)}</td><td class="hide-mobile num">${s.pse != null && s.pse !== '' ? esc(s.pse) : '—'}</td></tr>`).join('')}
        </tbody></table></div>${rows.length > 500 ? '<div class="card-pad muted small">Mostrando as 500 mais recentes. Refine o período ou exporte o CSV.</div>' : ''}`
        : UI.empty({ icon: 'calendar-search', title: 'Nenhuma sessão no filtro', compact: true });
      UI.refreshIcons(box);
    };
    draw();
    const bind = (id, k) => body.querySelector(id).addEventListener('change', (e) => { filtros[k] = e.target.value; draw(); });
    bind('#h-ini', 'ini'); bind('#h-fim', 'fim'); bind('#h-st', 'status'); bind('#h-at', 'atleta'); bind('#h-tp', 'tipo');
    body.querySelector('#h-table').addEventListener('click', (e) => { const tr = e.target.closest('[data-sid]'); if (tr) MR3.Agenda.openDetalhe(tr.dataset.sid); });
    actions.querySelector('#hs-nova').onclick = () => MR3.Agenda.openSessao({ atletaIds: filtros.atleta ? [filtros.atleta] : [] });
    actions.querySelector('#hs-csv').onclick = () => exportCSV(lista());
  }

  function exportCSV(rows = Store.getAll('sessoes')) {
    if (!rows.length) { UI.toast('Não há sessões para exportar.', 'warning'); return; }
    const csv = U.toCSV(U.sortBy(rows, (s) => s.data + s.horaInicio), [
      { label: 'Data', value: (s) => U.fmtDate(s.data) }, { label: 'Início', value: (s) => s.horaInicio }, { label: 'Duração (min)', value: (s) => s.duracaoMin },
      { label: 'Atleta(s)', value: (s) => (s.atletaIds || []).map(D.nomeAtleta).join(', ') }, { label: 'Tipo', value: (s) => s.tipo }, { label: 'Local', value: (s) => s.local },
      { label: 'Status', value: (s) => D.STATUS_SESSAO[s.status].label }, { label: 'PSE', value: (s) => s.pse ?? '' }, { label: 'Anotações', value: (s) => s.anotacoes }, { label: 'Evolução', value: (s) => s.evolucao },
      { label: 'Recorrente', value: (s) => (s.recorrenciaId ? 'sim' : 'não') },
    ]);
    U.download(`mr3-sessoes-${U.today()}.csv`, csv, 'text/csv;charset=utf-8');
    UI.toast('CSV de sessões exportado.');
  }

  MR3.modules.sessoes = { title: 'Planos e sessões', render };
  MR3.Sessoes = { exportCSV, openPlano };
})();
