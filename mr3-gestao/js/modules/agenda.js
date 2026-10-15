/* =========================================================================
   Módulo: Agenda — visões semana/dia/mês, criação por clique no horário,
   recorrência, detecção de conflito, status em 1 clique, PSE/anotações
   e controle de saldo de pacote.
   Rota: #/agenda?v=semana|dia|mes&d=AAAA-MM-DD
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const { U, UI, Store, D } = MR3;
  const esc = U.esc;
  MR3.modules = MR3.modules || {};

  const HOUR_PX = 52;
  const DURACOES = [30, 45, 60, 75, 90, 120];

  /* =====================================================================
     RENDER PRINCIPAL
     ===================================================================== */
  function render(el, params, query) {
    const isMobile = window.matchMedia('(max-width: 860px)').matches;
    const view = ['semana', 'dia', 'mes'].includes(query.v) ? query.v : (isMobile ? 'dia' : 'semana');
    const ref = U.isISODate(query.d) ? query.d : U.today();
    let ini, fim, titulo;
    if (view === 'semana') { ini = U.startOfWeek(ref); fim = U.addDays(ini, 6); titulo = `${U.fmtDateShort(ini)} – ${U.fmtDate(fim)}`; }
    else if (view === 'dia') { ini = fim = ref; titulo = `${U.DIAS[U.weekday(ref)]}, ${U.fmtDate(ref)}`; }
    else { ini = U.startOfMonth(ref); fim = U.endOfMonth(ref); titulo = U.monthLong(U.monthKey(ref)); }

    const nav = (d, v = view) => `#/agenda?v=${v}&d=${d}`;
    const step = view === 'semana' ? 7 : view === 'dia' ? 1 : 0;
    const prev = view === 'mes' ? U.addMonths(U.startOfMonth(ref), -1) : U.addDays(ref, -step);
    const next = view === 'mes' ? U.addMonths(U.startOfMonth(ref), 1) : U.addDays(ref, step);

    // Estatísticas do período (semana da referência, em qualquer visão de semana/dia)
    const wIni = view === 'mes' ? ini : U.startOfWeek(ref), wFim = view === 'mes' ? fim : U.addDays(wIni, 6);
    const sessP = Store.query('sessoes', (s) => s.data >= wIni && s.data <= wFim);
    const oc = D.ocupacao(wIni, wFim);

    el.innerHTML = `
      <div class="page-head">
        <div class="titles"><div class="eyebrow">Agenda</div><h1>Agenda de sessões</h1></div>
        <div class="actions"><button class="btn btn-gold" id="ag-nova">${UI.icon('calendar-plus')}Nova sessão</button></div>
      </div>
      <div class="card">
        <div class="agenda-toolbar">
          <div class="row">
            <a class="icon-btn sm" href="${nav(prev)}" aria-label="Período anterior">${UI.icon('chevron-left')}</a>
            <a class="btn btn-sm" href="${nav(U.today())}">Hoje</a>
            <a class="icon-btn sm" href="${nav(next)}" aria-label="Próximo período">${UI.icon('chevron-right')}</a>
          </div>
          <div class="agenda-title">${esc(titulo)}</div>
          <div class="spacer"></div>
          <label class="sr-only" for="ag-goto">Ir para data</label>
          <input type="date" id="ag-goto" class="input input-sm" style="width:auto" value="${ref}">
          <div class="segmented" role="group" aria-label="Visão">
            ${[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']].map(([v, l]) => `<button type="button" data-view="${v}" class="${v === view ? 'active' : ''}" aria-pressed="${v === view}">${l}</button>`).join('')}
          </div>
        </div>
        <div class="agenda-stats" aria-label="Resumo do período">
          <span>${view === 'mes' ? 'No mês' : 'Na semana'}:</span>
          <span>Agendadas <b>${sessP.filter((s) => s.status === 'agendada').length}</b></span>
          <span>Realizadas <b class="text-success">${sessP.filter((s) => s.status === 'realizada').length}</b></span>
          <span>Faltas <b class="text-danger">${sessP.filter((s) => s.status === 'falta').length}</b></span>
          <span>Canceladas <b>${sessP.filter((s) => s.status === 'cancelada').length}</b></span>
          <span>Horas livres <b>${U.fmtNum(oc.livresHoras, 1)}h</b></span>
          <span>Ocupação <b class="gold">${U.fmtPct(oc.taxa)}</b></span>
          <span class="spacer"></span>
          <span class="legend"><span><i style="background:var(--primary-hover)"></i>Agendada</span><span><i style="background:var(--success)"></i>Realizada</span><span><i style="background:var(--danger)"></i>Falta</span><span><i style="background:var(--text-3)"></i>Cancelada</span><span><i style="background:var(--warning)"></i>Remarcada</span></span>
        </div>
        <div id="ag-body"></div>
      </div>`;

    const body = el.querySelector('#ag-body');
    if (view === 'mes') renderMes(body, ref);
    else renderGrade(body, view === 'semana' ? Array.from({ length: 7 }, (_, i) => U.addDays(ini, i)) : [ref]);

    el.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { location.hash = nav(ref, b.dataset.view); }));
    el.querySelector('#ag-goto').addEventListener('change', (e) => { if (U.isISODate(e.target.value)) location.hash = nav(e.target.value); });
    el.querySelector('#ag-nova').addEventListener('click', () => openSessao({ data: view === 'mes' ? U.today() : ref }));
  }

  /* ---------- Grade de horários (semana / dia) ---------- */
  function renderGrade(body, dias) {
    const cfg = Store.getConfig();
    const h = cfg.horarioAtendimento;
    const sess = Store.query('sessoes', (s) => s.data >= dias[0] && s.data <= dias[dias.length - 1]);
    // Intervalo exibido = horário de atendimento, ampliado se houver sessão fora dele
    let startMin = Math.floor(U.timeToMin(h.inicio) / 60) * 60;
    let endMin = Math.ceil(U.timeToMin(h.fim) / 60) * 60;
    sess.forEach((s) => { startMin = Math.min(startMin, Math.floor(U.timeToMin(s.horaInicio) / 60) * 60); endMin = Math.max(endMin, Math.ceil((U.timeToMin(s.horaInicio) + (+s.duracaoMin || 60)) / 60) * 60); });
    endMin = Math.min(endMin, 24 * 60);
    const hours = [];
    for (let m = startMin; m < endMin; m += 60) hours.push(m);
    const hoje = U.today();
    const colW = dias.length === 1 ? 'minmax(0,1fr)' : 'minmax(110px,1fr)';

    let html = `<div class="agenda-scroll"><div class="cal" style="grid-template-columns:56px repeat(${dias.length}, ${colW})">`;
    html += `<div class="cal-head"></div>` + dias.map((d) => `<div class="cal-head cal-head-cell ${d === hoje ? 'today' : ''}">${U.DIAS_CURTOS[U.weekday(d)]}<span class="dnum">${d.slice(8)}</span></div>`).join('');
    // Coluna de horários
    html += `<div>${hours.map((m) => `<div class="cal-time" style="height:${HOUR_PX}px">${U.minToTime(m)}</div>`).join('')}</div>`;
    dias.forEach((d) => {
      const aberto = h.dias.includes(U.weekday(d));
      const hIni = U.timeToMin(h.inicio), hFim = U.timeToMin(h.fim);
      html += `<div class="cal-col ${d === hoje ? 'is-today' : ''}" style="height:${hours.length * HOUR_PX}px" data-date="${d}">`;
      hours.forEach((m) => {
        [0, 30].forEach((off) => {
          const t = m + off;
          const closed = !aberto || t < hIni || t >= hFim;
          html += `<div class="cal-slot ${off ? 'half' : ''} ${closed ? 'closed' : ''}" style="height:${HOUR_PX / 2}px" data-date="${d}" data-time="${U.minToTime(t)}" role="button" tabindex="-1" aria-label="Agendar ${U.fmtDate(d)} ${U.minToTime(t)}"></div>`;
        });
      });
      // Eventos com distribuição em "faixas" quando há sobreposição
      layoutLanes(sess.filter((s) => s.data === d)).forEach(({ s, lane, lanes }) => {
        const top = ((U.timeToMin(s.horaInicio) - startMin) / 60) * HOUR_PX;
        const height = Math.max(22, ((+s.duracaoMin || 60) / 60) * HOUR_PX - 2);
        const w = 100 / lanes;
        const nomes = (s.atletaIds || []).map((id) => U.firstName(D.nomeAtleta(id)));
        html += `<button type="button" class="ev st-${s.status}" data-sid="${esc(s.id)}" style="top:${top}px;height:${height}px;left:calc(${lane * w}% + 3px);width:calc(${w}% - 6px);right:auto"
          aria-label="${esc(nomes.join(', '))} às ${esc(s.horaInicio)}, ${esc(D.STATUS_SESSAO[s.status].label)}">
          <span class="ev-time">${esc(s.horaInicio)}</span>${s.recorrenciaId ? ' ↻' : ''}
          <span class="ev-name">${esc(nomes.length > 2 ? `${nomes[0]} +${nomes.length - 1}` : nomes.join(', ') || 'Sem atleta')}</span>
          ${height > 40 ? `<span class="ev-meta">${esc([s.tipo, s.local].filter(Boolean).join(' · '))}</span>` : ''}</button>`;
      });
      if (d === hoje) {
        const now = U.timeToMin(U.nowTime());
        if (now >= startMin && now <= endMin) html += `<div class="now-line" style="top:${((now - startMin) / 60) * HOUR_PX}px"></div>`;
      }
      html += '</div>';
    });
    html += '</div></div>';
    body.innerHTML = html;

    body.addEventListener('click', (e) => {
      const ev = e.target.closest('.ev');
      if (ev) { openDetalhe(ev.dataset.sid); return; }
      const slot = e.target.closest('.cal-slot');
      if (slot) openSessao({ data: slot.dataset.date, horaInicio: slot.dataset.time });
    });
    // Rola até o horário atual (ou início do expediente)
    const sc = body.querySelector('.agenda-scroll');
    const alvo = dias.includes(hoje) ? Math.max(0, U.timeToMin(U.nowTime()) - 90) : U.timeToMin(h.inicio);
    sc.scrollTop = Math.max(0, ((alvo - startMin) / 60) * HOUR_PX);
  }

  /** Distribui eventos sobrepostos em colunas lado a lado. */
  function layoutLanes(list) {
    const items = U.sortBy(list, (s) => U.timeToMin(s.horaInicio)).map((s) => ({ s, a: U.timeToMin(s.horaInicio), b: U.timeToMin(s.horaInicio) + (+s.duracaoMin || 60) }));
    const out = [];
    let cluster = [], clusterEnd = -1, laneEnds = [];
    const flush = () => { const n = laneEnds.length || 1; cluster.forEach((c) => out.push({ s: c.s, lane: c.lane, lanes: n })); cluster = []; laneEnds = []; };
    items.forEach((it) => {
      if (it.a >= clusterEnd) flush();
      let lane = laneEnds.findIndex((end) => end <= it.a);
      if (lane < 0) { lane = laneEnds.length; laneEnds.push(it.b); } else laneEnds[lane] = it.b;
      cluster.push(Object.assign(it, { lane }));
      clusterEnd = Math.max(clusterEnd, it.b);
    });
    flush();
    return out;
  }

  /* ---------- Visão mês ---------- */
  function renderMes(body, ref) {
    const ini = U.startOfWeek(U.startOfMonth(ref));
    const fimMes = U.endOfMonth(ref);
    const fim = U.addDays(U.startOfWeek(fimMes), 6);
    const sess = U.groupBy(Store.query('sessoes', (s) => s.data >= ini && s.data <= fim), (s) => s.data);
    const hoje = U.today();
    const mk = U.monthKey(ref);
    let html = '<div class="month-grid">' + U.DIAS_CURTOS.map((d) => `<div class="month-dow">${d}</div>`).join('');
    for (let d = ini; d <= fim; d = U.addDays(d, 1)) {
      const list = U.sortBy(sess[d] || [], (s) => s.horaInicio);
      html += `<div class="month-cell ${U.monthKey(d) !== mk ? 'other' : ''} ${d === hoje ? 'today' : ''}" data-date="${d}" role="button" tabindex="0" aria-label="${U.fmtDate(d)}: ${list.length} sessões">
        <span class="mday">${+d.slice(8)}</span>
        ${list.slice(0, 3).map((s) => `<button type="button" class="month-ev st-${s.status}" data-sid="${esc(s.id)}">${esc(s.horaInicio)} ${esc((s.atletaIds || []).map((id) => U.firstName(D.nomeAtleta(id))).join(', '))}</button>`).join('')}
        ${list.length > 3 ? `<span class="month-more">+${list.length - 3} mais</span>` : ''}</div>`;
    }
    body.innerHTML = html + '</div>';
    body.addEventListener('click', (e) => {
      const ev = e.target.closest('.month-ev');
      if (ev) { e.stopPropagation(); openDetalhe(ev.dataset.sid); return; }
      const cell = e.target.closest('.month-cell');
      if (cell) location.hash = `#/agenda?v=dia&d=${cell.dataset.date}`;
    });
    body.addEventListener('keydown', (e) => { const cell = e.target.closest('.month-cell'); if (cell && (e.key === 'Enter' || e.key === ' ') && e.target === cell) { e.preventDefault(); location.hash = `#/agenda?v=dia&d=${cell.dataset.date}`; } });
  }

  /* =====================================================================
     FORMULÁRIO DE SESSÃO (nova / editar)
     ===================================================================== */
  function openSessao(preset = {}, editId) {
    const s = editId ? Store.getById('sessoes', editId) : null;
    const cfg = Store.getConfig();
    const ativos = U.sortBy(Store.query('atletas', (a) => a.status === 'ativo' || (s && (s.atletaIds || []).includes(a.id)) || (preset.atletaIds || []).includes(a.id)), (a) => a.nome);
    const v = Object.assign({ data: U.today(), horaInicio: '07:00', duracaoMin: cfg.valoresPadrao.duracaoSessao || 60, local: cfg.locais[0] || '', tipo: cfg.tiposSessao[0] || 'Treino', status: 'agendada', atletaIds: [] }, s || {}, preset);
    let selecionados = [...(v.atletaIds || [])];
    const wd = U.weekday(v.data);

    const body = `<form id="sess-form" novalidate>
      <div class="field mb-3"><label for="s-add">Atleta(s) <span class="req">*</span></label>
        <div class="chips mb-2" id="s-chips"></div>
        <select id="s-add" class="input">${UI.options(ativos.map((a) => ({ value: a.id, label: a.nome })), '', { empty: selecionados.length ? '+ Adicionar outro atleta (grupo)' : 'Selecione o atleta…' })}</select>
        ${!ativos.length ? '<span class="hint">Cadastre atletas ativos primeiro.</span>' : ''}
      </div>
      <div class="form-grid form-grid-3">
        <div class="field"><label for="s-data">Data <span class="req">*</span></label><input id="s-data" type="date" class="input" name="data" value="${esc(v.data)}"></div>
        <div class="field"><label for="s-hora">Início <span class="req">*</span></label><input id="s-hora" type="time" step="300" class="input" name="horaInicio" value="${esc(v.horaInicio)}"></div>
        <div class="field"><label for="s-dur">Duração</label><select id="s-dur" class="input" name="duracaoMin">${UI.options(DURACOES.concat(DURACOES.includes(+v.duracaoMin) ? [] : [+v.duracaoMin]).map((d) => ({ value: d, label: d + ' min' })), v.duracaoMin)}</select></div>
        <div class="field"><label for="s-local">Local</label><input id="s-local" class="input" name="local" list="dl-locais" value="${esc(v.local)}"><datalist id="dl-locais">${cfg.locais.map((l) => `<option value="${esc(l)}">`).join('')}</datalist></div>
        <div class="field"><label for="s-tipo">Tipo</label><input id="s-tipo" class="input" name="tipo" list="dl-tipos" value="${esc(v.tipo)}"><datalist id="dl-tipos">${cfg.tiposSessao.map((l) => `<option value="${esc(l)}">`).join('')}</datalist></div>
        ${s ? `<div class="field"><label for="s-st">Status</label><select id="s-st" class="input" name="status">${UI.options(Object.fromEntries(Object.entries(D.STATUS_SESSAO).map(([k, x]) => [k, x.label])), v.status)}</select></div>` : '<div></div>'}
        <div class="field full" style="grid-column:1/-1"><label for="s-an">Anotações / planejamento</label><textarea id="s-an" class="input" name="anotacoes" rows="2">${esc(v.anotacoes)}</textarea></div>
      </div>
      ${!s ? `<fieldset class="mt-3"><legend><label class="check"><input type="checkbox" name="repetir" id="s-rep"> Repetir toda semana</label></legend>
        <div id="rep-box" hidden>
          <div class="field-label mb-2">Dias da semana</div>
          <div class="chips mb-3">${U.DIAS_CURTOS.map((d, i) => `<label class="chip"><input type="checkbox" name="dias" value="${i}" ${i === wd ? 'checked' : ''}>${d}</label>`).join('')}</div>
          <div class="form-grid">
            <div class="field"><label for="s-fim-tipo">Termina</label><select id="s-fim-tipo" class="input" name="fimTipo">${UI.options({ semanas: 'Depois de N semanas', data: 'Em uma data' }, 'semanas')}</select></div>
            <div class="field" id="f-sem"><label for="s-nsem">Número de semanas</label><input id="s-nsem" type="number" min="1" max="52" class="input" name="semanas" value="8"></div>
            <div class="field" id="f-ate" hidden><label for="s-ate">Até</label><input id="s-ate" type="date" class="input" name="ate" value="${U.addMonths(v.data, 2)}"></div>
          </div>
          <p class="hint mt-2" id="rep-prev"></p>
        </div></fieldset>` : ''}
      ${s && s.recorrenciaId ? `<div class="alert info mt-3">${UI.icon('repeat')}<div>Esta sessão faz parte de uma recorrência. Ao salvar, você escolhe se a alteração vale só para ela ou também para as próximas.</div></div>` : ''}
    </form>`;

    UI.modal({
      title: s ? 'Editar sessão' : 'Nova sessão', size: 'lg', body,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-gold" id="s-save">${UI.icon('check')}Salvar</button>`,
      onOpen(el, close) {
        const form = el.querySelector('#sess-form');
        const chips = el.querySelector('#s-chips');
        const addSel = el.querySelector('#s-add');
        const drawChips = () => {
          chips.innerHTML = selecionados.map((id) => `<span class="chip active">${esc(D.nomeAtleta(id))}<button type="button" class="icon-btn sm ghost" style="width:20px;height:20px" data-rm="${esc(id)}" aria-label="Remover ${esc(D.nomeAtleta(id))}">${UI.icon('x')}</button></span>`).join('');
          addSel.options[0].textContent = selecionados.length ? '+ Adicionar outro atleta (grupo)' : 'Selecione o atleta…';
          [...addSel.options].forEach((o) => { if (o.value) o.hidden = selecionados.includes(o.value); });
          UI.refreshIcons(chips);
        };
        drawChips();
        addSel.addEventListener('change', () => { if (addSel.value && !selecionados.includes(addSel.value)) selecionados.push(addSel.value); addSel.value = ''; drawChips(); });
        chips.addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { selecionados = selecionados.filter((x) => x !== b.dataset.rm); drawChips(); } });

        const rep = el.querySelector('#s-rep');
        if (rep) {
          const upd = () => {
            el.querySelector('#rep-box').hidden = !rep.checked;
            const ft = form.fimTipo.value;
            el.querySelector('#f-sem').hidden = ft !== 'semanas';
            el.querySelector('#f-ate').hidden = ft !== 'data';
            const datas = rep.checked ? datasRecorrencia(UI.formData(form)) : [];
            el.querySelector('#rep-prev').textContent = rep.checked ? `Serão criadas ${datas.length} sessões${datas.length ? ` (de ${U.fmtDate(datas[0])} a ${U.fmtDate(datas[datas.length - 1])})` : ''}.` : '';
          };
          form.addEventListener('change', upd); form.addEventListener('input', upd);
        }

        el.querySelector('#s-save').addEventListener('click', async () => {
          const f = UI.formData(form);
          const errs = {};
          if (!U.isISODate(f.data)) errs.data = 'Data inválida.';
          if (!/^\d{2}:\d{2}$/.test(f.horaInicio)) errs.horaInicio = 'Horário inválido.';
          if (!UI.showErrors(form, errs)) return;
          if (!selecionados.length) { UI.toast('Selecione pelo menos um atleta.', 'error'); addSel.focus(); return; }
          const campos = { atletaIds: selecionados.slice(), horaInicio: f.horaInicio, duracaoMin: Number(f.duracaoMin), local: f.local, tipo: f.tipo, anotacoes: f.anotacoes };

          if (s) {
            // ----- Edição -----
            let escopo = 'uma';
            if (s.recorrenciaId) {
              escopo = await UI.choose({ title: 'Sessão recorrente', message: 'Aplicar as alterações a:', options: [{ label: 'Somente esta sessão', value: 'uma' }, { label: 'Esta e as próximas agendadas', value: 'futuras', cls: 'btn-gold' }] });
              if (!escopo) return;
            }
            const delta = U.diffDays(s.data, f.data);
            const alvo = escopo === 'futuras' ? Store.query('sessoes', (x) => x.recorrenciaId === s.recorrenciaId && x.data >= s.data && (x.id === s.id || x.status === 'agendada')) : [s];
            const propostas = alvo.map((x) => Object.assign({}, x, campos, { data: x.id === s.id ? f.data : U.addDays(x.data, delta) }));
            if (!(await confirmarConflitos(propostas, alvo.map((x) => x.id)))) return;
            const antes = s.status;
            Store.batch(() => propostas.forEach((p) => {
              const patch = Object.assign({}, campos, { data: p.data });
              if (p.id === s.id) { patch.status = f.status; } else delete patch.anotacoes; // anotações só na sessão editada
              Store.update('sessoes', p.id, patch);
            }));
            if (antes !== f.status) posStatus(Store.getById('sessoes', s.id), antes);
            UI.toast(alvo.length > 1 ? `${alvo.length} sessões atualizadas.` : 'Sessão atualizada.');
          } else {
            // ----- Criação (com ou sem recorrência) -----
            const datas = f.repetir ? datasRecorrencia(f) : [f.data];
            if (!datas.length) { UI.toast('A recorrência não gera nenhuma data. Revise os dias e o término.', 'error'); return; }
            if (datas.length > 260) { UI.toast('Recorrência longa demais (máx. 260 sessões).', 'error'); return; }
            const recId = datas.length > 1 ? U.uid('rec_') : null;
            const propostas = datas.map((d) => Object.assign({}, campos, { data: d, status: 'agendada', recorrenciaId: recId }));
            if (!(await confirmarConflitos(propostas, []))) return;
            Store.batch(() => propostas.forEach((p) => Store.create('sessoes', p)));
            UI.toast(datas.length > 1 ? `${datas.length} sessões agendadas.` : 'Sessão agendada.');
          }
          close(); MR3.refresh();
        });
      },
    });
  }

  /** Datas da recorrência a partir dos campos do formulário. */
  function datasRecorrencia(f) {
    const dias = (f.dias || []).map(Number);
    if (!U.isISODate(f.data) || !dias.length) return [];
    const inicioSemana = U.startOfWeek(f.data);
    const limite = f.fimTipo === 'data' ? (U.isISODate(f.ate) ? f.ate : f.data) : U.addDays(inicioSemana, 7 * U.clamp(Number(f.semanas) || 1, 1, 52) - 1);
    const out = [];
    for (let d = f.data; d <= limite && out.length < 400; d = U.addDays(d, 1)) if (dias.includes(U.weekday(d))) out.push(d);
    return out;
  }

  /** Mostra aviso de conflito. Resolve true para prosseguir. */
  async function confirmarConflitos(propostas, ignorar) {
    const conflitos = [];
    propostas.forEach((p) => D.conflitos(p, ignorar).forEach((c) => conflitos.push({ p, c })));
    // conflitos entre as próprias propostas (ex.: grupo duplicado)
    if (!conflitos.length) return true;
    const lista = conflitos.slice(0, 6).map(({ p, c }) => `<li><b>${U.fmtDateDow(p.data)} ${esc(p.horaInicio)}</b> conflita com ${esc((c.atletaIds || []).map(D.nomeAtleta).join(', '))} (${esc(c.horaInicio)}–${esc(D.fimSessao(c))})</li>`).join('');
    return UI.confirm({
      title: 'Conflito de horário', html: true, confirmText: 'Salvar mesmo assim',
      message: `<div class="alert warning mb-3">${UI.icon('alert-triangle')}<div>${U.plural(conflitos.length, 'horário já está ocupado', 'horários já estão ocupados')}.</div></div><ul class="small" style="padding-left:18px;margin:0">${lista}</ul>${conflitos.length > 6 ? `<p class="muted small mt-2">…e mais ${conflitos.length - 6}.</p>` : ''}`,
    });
  }

  /* =====================================================================
     DETALHE DA SESSÃO + AÇÕES DE STATUS
     ===================================================================== */
  function openDetalhe(id) {
    const s = Store.getById('sessoes', id);
    if (!s) { UI.toast('Sessão não encontrada.', 'error'); return; }
    const atletas = (s.atletaIds || []).map((x) => Store.getById('atletas', x)).filter(Boolean);
    const body = `
      <div class="row mb-3" style="justify-content:space-between;flex-wrap:wrap">
        <div><div class="strong" style="font-size:16px">${U.capitalize(U.DIAS[U.weekday(s.data)])}, ${U.fmtDate(s.data)}</div>
          <div class="muted">${esc(s.horaInicio)} – ${esc(D.fimSessao(s))} · ${esc(s.duracaoMin)} min${s.recorrenciaId ? ' · ↻ recorrente' : ''}</div></div>
        ${UI.badgeSessao(s.status)}
      </div>
      <div class="stack mb-3">${atletas.map((a) => {
        const pac = D.saldoPacote(a.id);
        return `<div class="row">${UI.personLink(a, esc(a.modalidade || ''))}<span class="spacer"></span>${pac ? UI.badge(`Pacote: ${pac.saldo} restantes`, pac.saldo <= Store.getConfig().alertaSaldoPacote ? 'warning' : 'no-dot') : ''}
          ${a.telefone ? `<button class="icon-btn sm" data-lembrete="${esc(a.id)}" aria-label="Enviar lembrete por WhatsApp para ${esc(a.nome)}" title="Lembrete WhatsApp">${UI.icon('message-circle')}</button>` : ''}</div>`;
      }).join('') || '<span class="muted">Sem atletas</span>'}</div>
      <dl class="dl mb-3">
        <dt>Tipo</dt><dd>${esc(s.tipo || '—')}</dd>
        <dt>Local</dt><dd>${esc(s.local || '—')}</dd>
        ${s.pse != null && s.pse !== '' ? `<dt>PSE</dt><dd>${esc(s.pse)} / 10</dd>` : ''}
        ${s.anotacoes ? `<dt>Anotações</dt><dd style="white-space:pre-wrap">${esc(s.anotacoes)}</dd>` : ''}
        ${s.evolucao ? `<dt>Evolução</dt><dd style="white-space:pre-wrap">${esc(s.evolucao)}</dd>` : ''}
      </dl>
      <div class="field-label mb-2">Marcar como</div>
      <div class="row-wrap">
        <button class="btn btn-success" data-st="realizada" ${s.status === 'realizada' ? 'disabled' : ''}>${UI.icon('check')}Realizada</button>
        <button class="btn btn-danger" data-st="falta" ${s.status === 'falta' ? 'disabled' : ''}>${UI.icon('x')}Falta</button>
        <button class="btn" data-st="cancelada" ${s.status === 'cancelada' ? 'disabled' : ''}>${UI.icon('calendar-x')}Cancelar</button>
        <button class="btn" data-st="remarcada" ${s.status === 'remarcada' ? 'disabled' : ''}>${UI.icon('calendar-clock')}Remarcar</button>
        ${s.status !== 'agendada' ? `<button class="btn btn-ghost" data-st="agendada">${UI.icon('rotate-ccw')}Voltar p/ agendada</button>` : ''}
      </div>`;
    UI.modal({
      title: 'Sessão', body,
      footer: `<button class="btn btn-danger" id="d-del">${UI.icon('trash-2')}Excluir</button><span class="spacer"></span><button class="btn" id="d-edit">${UI.icon('pencil')}Editar</button><button class="btn btn-gold" data-close>Fechar</button>`,
      onOpen(el, close) {
        el.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => { close(); marcar(s.id, b.dataset.st); }));
        el.querySelector('#d-edit').onclick = () => { close(); openSessao({}, s.id); };
        el.querySelector('#d-del').onclick = () => { close(); excluir(s.id); };
        el.querySelectorAll('[data-lembrete]').forEach((b) => b.addEventListener('click', () => {
          const a = Store.getById('atletas', b.dataset.lembrete); const cfg = Store.getConfig();
          UI.whatsapp({ telefone: a.telefone, nome: a.nome, titulo: 'Lembrete de sessão', mensagem: U.fillTemplate(cfg.mensagens.lembrete, { nome: U.firstName(a.nome), data: `${U.DIAS[U.weekday(s.data)]}, ${U.fmtDate(s.data)}`, hora: s.horaInicio, local: s.local || '', profissional: cfg.nomeProfissional, empresa: cfg.empresa }) });
        }));
      },
    });
  }

  /** Altera o status (1 clique). "Realizada" abre anotações/PSE opcionais. */
  async function marcar(id, status) {
    const s = Store.getById('sessoes', id);
    if (!s) return;
    const antes = s.status;
    if (status === 'realizada') { openRealizada(s); return; }
    if (status === 'remarcada') {
      Store.update('sessoes', id, { status: 'remarcada' });
      UI.toast('Sessão marcada como remarcada. Escolha a nova data.', 'info');
      MR3.refresh();
      openSessao({ atletaIds: s.atletaIds, horaInicio: s.horaInicio, duracaoMin: s.duracaoMin, local: s.local, tipo: s.tipo, data: U.addDays(s.data, 1), anotacoes: `Remarcada de ${U.fmtDate(s.data)} ${s.horaInicio}` });
      return;
    }
    if (status === 'cancelada' && s.recorrenciaId && s.status === 'agendada') {
      const escopo = await UI.choose({ title: 'Cancelar sessão recorrente', message: 'O que deseja cancelar?', options: [{ label: 'Somente esta sessão', value: 'uma' }, { label: 'Esta e todas as próximas', value: 'futuras', cls: 'btn-danger' }] });
      if (!escopo) return;
      if (escopo === 'futuras') {
        const alvo = Store.query('sessoes', (x) => x.recorrenciaId === s.recorrenciaId && x.data >= s.data && x.status === 'agendada');
        Store.batch(() => alvo.forEach((x) => Store.update('sessoes', x.id, { status: 'cancelada' })));
        UI.toast(`${alvo.length} sessões canceladas.`); MR3.refresh(); return;
      }
    }
    Store.update('sessoes', id, { status });
    posStatus(Store.getById('sessoes', id), antes);
    UI.toast(`Sessão marcada como ${D.STATUS_SESSAO[status].label.toLowerCase()}.`);
    MR3.refresh();
  }

  function openRealizada(s) {
    const antes = s.status;
    UI.modal({
      title: 'Sessão realizada',
      body: `<form id="real-form" novalidate class="stack">
        <p class="muted">${esc((s.atletaIds || []).map(D.nomeAtleta).join(', '))} · ${U.fmtDateDow(s.data)} ${esc(s.horaInicio)}</p>
        <div class="field"><span class="field-label" id="pse-lbl">PSE — percepção subjetiva de esforço (opcional)</span>
          <div class="pse-scale" role="radiogroup" aria-labelledby="pse-lbl">${Array.from({ length: 11 }, (_, i) => `<label><input type="radio" name="pse" value="${i}" ${String(s.pse) === String(i) ? 'checked' : ''}><span>${i}</span></label>`).join('')}</div>
          <span class="hint">0 = repouso · 5 = difícil · 10 = esforço máximo</span></div>
        <div class="field"><label for="r-an">O que foi trabalhado</label><textarea id="r-an" class="input" name="anotacoes" rows="3">${esc(s.anotacoes)}</textarea></div>
        <div class="field"><label for="r-ev">Evolução / observações</label><textarea id="r-ev" class="input" name="evolucao" rows="2">${esc(s.evolucao)}</textarea></div>
      </form>`,
      footer: `<button class="btn" id="r-skip">Só marcar</button><button class="btn btn-gold" id="r-ok">${UI.icon('check')}Salvar</button>`,
      onOpen(el, close) {
        const save = (comDados) => {
          const f = UI.formData(el.querySelector('#real-form'));
          const patch = { status: 'realizada' };
          if (comDados) Object.assign(patch, { pse: f.pse === '' ? null : Number(f.pse), anotacoes: f.anotacoes, evolucao: f.evolucao });
          Store.update('sessoes', s.id, patch);
          close();
          posStatus(Store.getById('sessoes', s.id), antes);
          UI.toast('Sessão marcada como realizada.');
          MR3.refresh();
        };
        el.querySelector('#r-ok').onclick = () => save(true);
        el.querySelector('#r-skip').onclick = () => save(false);
      },
    });
  }

  /** Efeitos após mudança de status: alerta de pacote e cobrança avulsa. */
  function posStatus(s, antes) {
    if (!s) return;
    const cfg = Store.getConfig();
    const consumiu = D.consome(s, cfg) && !D.consome(Object.assign({}, s, { status: antes }), cfg);
    (s.atletaIds || []).forEach((aid) => {
      const a = Store.getById('atletas', aid); if (!a) return;
      if (consumiu) {
        const pac = D.saldoPacote(aid);
        if (pac && pac.saldo <= cfg.alertaSaldoPacote) setTimeout(() => UI.toast(pac.saldo <= 0 ? `${U.firstName(a.nome)}: o pacote acabou (saldo ${pac.saldo}).` : `${U.firstName(a.nome)}: restam ${U.plural(pac.saldo, 'sessão', 'sessões')} no pacote.`, 'warning', 6000), 400);
      }
      // Plano avulso: gera a cobrança da sessão realizada (uma única vez)
      const p = D.plano(a);
      if (s.status === 'realizada' && p && p.tipo === 'avulso' && !Store.query('cobrancas', (c) => c.sessaoId === s.id && c.atletaId === aid).length) {
        Store.create('cobrancas', { atletaId: aid, sessaoId: s.id, tipo: 'avulso', referencia: `Sessão avulsa ${U.fmtDate(s.data)}`, valor: D.valorPlano(a) || cfg.valoresPadrao.sessaoAvulsa, desconto: 0, vencimento: s.data, status: 'pendente', pagamentos: [] });
        setTimeout(() => UI.toast(`Cobrança avulsa gerada para ${U.firstName(a.nome)}.`, 'info'), 200);
      }
    });
  }

  async function excluir(id) {
    const s = Store.getById('sessoes', id);
    let escopo = 'uma';
    if (s.recorrenciaId) {
      escopo = await UI.choose({ title: 'Excluir sessão recorrente', message: 'O que deseja excluir?', options: [{ label: 'Somente esta sessão', value: 'uma' }, { label: 'Esta e as próximas agendadas', value: 'futuras', cls: 'btn-danger' }] });
      if (!escopo) return;
    } else if (!(await UI.confirm({ title: 'Excluir sessão', message: 'Excluir esta sessão? Para manter o histórico, prefira marcar como cancelada.', danger: true, confirmText: 'Excluir' }))) return;
    if (escopo === 'futuras') {
      const n = Store.removeWhere('sessoes', (x) => x.recorrenciaId === s.recorrenciaId && (x.id === s.id || (x.data >= s.data && x.status === 'agendada')));
      UI.toast(`${n} sessões excluídas.`);
    } else { Store.remove('sessoes', id); UI.toast('Sessão excluída.'); }
    MR3.refresh();
  }

  MR3.modules.agenda = { title: 'Agenda', render };
  MR3.Agenda = { openSessao, openDetalhe, marcar };
})();
