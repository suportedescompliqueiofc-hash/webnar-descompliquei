/* =========================================================================
   ui.js — componentes de interface reutilizáveis:
   toasts, modais (com foco preso e Esc), confirmação, badges, avatar,
   estados vazios, máscaras, gráficos (Chart.js) e WhatsApp.
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const U = MR3.U;
  const esc = U.esc;

  const charts = new Set();
  const modalStack = [];

  const UI = {
    /** Ícone Lucide (substituído por SVG em refreshIcons). */
    icon(name, cls = '') { return `<i data-lucide="${name}"${cls ? ` class="${cls}"` : ''} aria-hidden="true"></i>`; },
    refreshIcons(root) {
      if (window.lucide && window.lucide.createIcons) {
        try { window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' }, nameAttr: 'data-lucide', root: root || document }); } catch (e) { window.lucide.createIcons(); }
      }
    },

    /* ---------------- Toast ---------------- */
    toast(msg, type = 'success', ms = 3600) {
      const area = document.getElementById('toast-area');
      if (!area) return;
      const ic = { success: 'check-circle-2', error: 'alert-octagon', warning: 'alert-triangle', info: 'info' }[type] || 'info';
      const el = document.createElement('div');
      el.className = `toast ${type}`;
      el.setAttribute('role', type === 'error' ? 'alert' : 'status');
      el.innerHTML = `${UI.icon(ic)}<div>${esc(msg)}</div>`;
      area.appendChild(el);
      UI.refreshIcons(el);
      setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 220); }, ms);
    },

    /* ---------------- Modal ----------------
       opts: { title, body (html), footer (html), size: 'sm'|'lg', onOpen(el, close), onClose() }
       Retorna { el, close }. */
    modal(opts) {
      const root = document.getElementById('modal-root');
      const prevFocus = document.activeElement;
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const titleId = U.uid('mt_');
      overlay.innerHTML = `
        <div class="modal ${opts.size || ''}" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
          <div class="modal-head">
            <h2 id="${titleId}">${esc(opts.title || '')}</h2>
            <button class="icon-btn sm ghost" data-close aria-label="Fechar">${UI.icon('x')}</button>
          </div>
          <div class="modal-body">${opts.body || ''}</div>
          ${opts.footer ? `<div class="modal-foot">${opts.footer}</div>` : ''}
        </div>`;
      root.appendChild(overlay);
      document.body.style.overflow = 'hidden';
      let closed = false;
      const close = () => {
        if (closed) return; closed = true;
        overlay.remove();
        modalStack.splice(modalStack.indexOf(api), 1);
        if (!modalStack.length) document.body.style.overflow = '';
        opts.onClose && opts.onClose();
        if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus();
      };
      const api = { el: overlay, close };
      modalStack.push(api);
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) overlay._downOnOverlay = true; });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay && overlay._downOnOverlay) close();
        overlay._downOnOverlay = false;
        if (e.target.closest('[data-close]')) close();
      });
      // Foco preso no modal (Tab / Shift+Tab)
      overlay.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        const f = [...overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      });
      UI.refreshIcons(overlay);
      UI.bindMasks(overlay);
      UI.stackTables(overlay);
      opts.onOpen && opts.onOpen(overlay, close);
      setTimeout(() => {
        const first = overlay.querySelector('[autofocus]') || overlay.querySelector('.modal-body input:not([type=hidden]), .modal-body select, .modal-body textarea') || overlay.querySelector('.modal-foot .btn');
        first && first.focus();
      }, 30);
      return api;
    },
    /** Fecha o modal do topo (usado pelo Esc global). */
    closeTopModal() { const m = modalStack[modalStack.length - 1]; if (m) { m.close(); return true; } return false; },
    hasModal() { return modalStack.length > 0; },

    /** Confirmação. Retorna Promise<boolean>. */
    confirm({ title = 'Confirmar', message = '', confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false, html = false } = {}) {
      return new Promise((resolve) => {
        let ok = false;
        UI.modal({
          title, size: 'sm',
          body: html ? message : `<p>${esc(message).replace(/\n/g, '<br>')}</p>`,
          footer: `<button class="btn" data-close>${esc(cancelText)}</button><button class="btn ${danger ? 'btn-danger-solid' : 'btn-gold'}" data-ok>${esc(confirmText)}</button>`,
          onOpen(el, close) { el.querySelector('[data-ok]').addEventListener('click', () => { ok = true; close(); }); },
          onClose() { resolve(ok); },
        });
      });
    },
    /** Escolha entre opções (ex.: "só esta" / "esta e futuras"). Resolve com o value ou null. */
    choose({ title, message, options }) {
      return new Promise((resolve) => {
        let val = null;
        UI.modal({
          title, size: 'sm',
          body: `<p class="mb-3">${esc(message)}</p><div class="stack">${options.map((o, i) => `<button class="btn btn-block ${o.cls || ''}" data-i="${i}">${esc(o.label)}</button>`).join('')}</div>`,
          onOpen(el, close) { el.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => { val = options[+b.dataset.i].value; close(); })); },
          onClose() { resolve(val); },
        });
      });
    },

    /* ---------------- Pequenos componentes ---------------- */
    badge(text, cls = '') { return `<span class="badge ${cls}">${esc(text)}</span>`; },
    badgeSessao(st) { const s = MR3.D.STATUS_SESSAO[st] || { label: st, cls: '' }; return UI.badge(s.label, s.cls); },
    badgeCobranca(c) {
      const st = c._status || MR3.D.statusCobranca(c);
      if (st !== 'pago' && st !== 'cancelado' && MR3.D.isParcial(c)) return UI.badge(st === 'atrasado' ? 'Atrasado (parcial)' : 'Parcial', st === 'atrasado' ? 'danger' : 'warning');
      const s = MR3.D.STATUS_COBRANCA[st]; return UI.badge(s.label, s.cls);
    },
    badgeAtleta(a) { return a.status === 'ativo' ? UI.badge('Ativo', 'success') : UI.badge('Inativo', ''); },
    avatar(a, size = '') {
      if (!a) return `<span class="avatar ${size}">?</span>`;
      return `<span class="avatar ${size}">${a.foto ? `<img src="${esc(a.foto)}" alt="">` : esc(U.initials(a.nome))}</span>`;
    },
    /** Link com avatar + nome para o perfil. */
    personLink(a, sub = '') {
      if (!a) return '<span class="muted">Atleta removido</span>';
      return `<a class="person" href="#/atletas/${esc(a.id)}">${UI.avatar(a, 'sm')}<span class="truncate"><span class="name">${esc(a.nome)}</span>${sub ? `<br><span class="muted small">${sub}</span>` : ''}</span></a>`;
    },
    empty({ icon = 'inbox', title = 'Nada por aqui', text = '', action = '', compact = false }) {
      return `<div class="empty ${compact ? 'compact' : ''}"><div class="empty-icon">${UI.icon(icon)}</div><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;
    },
    kpi({ label, value, sub = '', icon = 'activity', href = '' }) {
      const tag = href ? 'a' : 'div';
      return `<${tag} class="card kpi"${href ? ` href="${href}"` : ''}><div class="kpi-label">${UI.icon(icon)}${esc(label)}</div><div class="kpi-value">${value}</div>${sub ? `<div class="kpi-sub">${sub}</div>` : ''}</${tag}>`;
    },
    options(map, selected, { empty } = {}) {
      const entries = Array.isArray(map) ? map.map((v) => (typeof v === 'object' ? [v.value, v.label] : [v, v])) : Object.entries(map);
      return (empty != null ? `<option value="">${esc(empty)}</option>` : '') + entries.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(selected ?? '') ? ' selected' : ''}>${esc(l)}</option>`).join('');
    },

    /* ---------------- Formulários ---------------- */
    /** Lê os campos de um <form> em objeto (checkbox múltiplo vira array). */
    formData(form) {
      const out = {};
      [...form.elements].forEach((el) => {
        if (!el.name || el.disabled) return;
        if (el.type === 'checkbox') {
          const many = form.querySelectorAll(`[name="${el.name}"]`).length > 1;
          if (many) { out[el.name] = out[el.name] || []; if (el.checked) out[el.name].push(el.value); }
          else out[el.name] = el.checked;
        } else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; else if (!(el.name in out)) out[el.name] = ''; }
        else if (el.dataset.mask === 'money') out[el.name] = el.value.trim() === '' ? '' : U.parseMoney(el.value);
        else out[el.name] = el.value.trim();
      });
      return out;
    },
    /** Marca campos inválidos. errors: { campo: 'mensagem' }. Retorna true se válido. */
    showErrors(form, errors) {
      form.querySelectorAll('.invalid').forEach((x) => x.classList.remove('invalid'));
      form.querySelectorAll('.error-msg').forEach((x) => x.remove());
      const keys = Object.keys(errors);
      keys.forEach((k) => {
        const el = form.querySelector(`[name="${k}"]`);
        if (!el) return;
        el.classList.add('invalid');
        el.setAttribute('aria-invalid', 'true');
        const m = document.createElement('span');
        m.className = 'error-msg'; m.textContent = errors[k];
        (el.closest('.field') || el.parentElement).appendChild(m);
      });
      if (keys.length) { const f = form.querySelector('.invalid'); f && f.focus(); }
      return !keys.length;
    },
    /** Aplica máscaras: data-mask="phone" | "money". */
    bindMasks(root = document) {
      root.querySelectorAll('[data-mask="phone"]:not([data-masked])').forEach((el) => {
        el.dataset.masked = '1';
        el.setAttribute('inputmode', 'tel');
        el.addEventListener('input', () => { el.value = U.maskPhone(el.value); });
        if (el.value) el.value = U.maskPhone(el.value);
      });
      root.querySelectorAll('[data-mask="money"]:not([data-masked])').forEach((el) => {
        el.dataset.masked = '1';
        el.setAttribute('inputmode', 'decimal');
        el.addEventListener('input', () => { el.value = el.value.replace(/[^\d,.]/g, ''); });
        el.addEventListener('blur', () => { if (el.value.trim() !== '') el.value = U.fmtMoneyInput(U.parseMoney(el.value)); });
      });
    },
    moneyInput(name, value, attrs = '') {
      return `<div class="input-group"><span class="prefix">R$</span><input class="input" name="${name}" data-mask="money" value="${value === '' || value == null ? '' : U.fmtMoneyInput(value)}" placeholder="0,00" ${attrs}></div>`;
    },

    /* ---------------- Gráficos ---------------- */
    cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); },
    /** Cores do tema atual para os gráficos. */
    chartColors() {
      const v = UI.cssVar;
      return {
        text: v('--text-2'), grid: v('--border'), gold: v('--gold'), goldLight: v('--gold-light'), primary: v('--primary-hover'),
        success: v('--success'), danger: v('--danger'), warning: v('--warning'), surface: v('--surface'), muted: v('--text-3'),
        series: [v('--primary-hover'), v('--gold'), '#22C55E', '#EF4444', '#A78BFA', '#F59E0B', '#06B6D4', '#94A3B8'],
      };
    },
    /** Cria um gráfico Chart.js num container (.chart-box). Destrói os antigos ao trocar de tela. */
    chart(container, config) {
      if (!container) return null;
      if (!window.Chart) {
        container.innerHTML = '<div class="chart-fallback small">Gráfico indisponível (sem conexão com a biblioteca Chart.js).</div>';
        return null;
      }
      container.innerHTML = '<canvas></canvas>';
      const c = UI.chartColors();
      const Chart = window.Chart;
      Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
      Chart.defaults.color = c.text;
      Chart.defaults.borderColor = c.grid;
      const base = {
        responsive: true, maintainAspectRatio: false, animation: { duration: 350 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'rectRounded', padding: 14 } },
          tooltip: { backgroundColor: UI.cssVar('--surface-3'), titleColor: UI.cssVar('--text'), bodyColor: UI.cssVar('--text'), borderColor: c.grid, borderWidth: 1, padding: 10, cornerRadius: 8 },
        },
      };
      if (config.type !== 'doughnut' && config.type !== 'pie') {
        base.scales = { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: c.grid }, border: { display: false } } };
      }
      config.options = deepMerge(base, config.options || {});
      const ch = new Chart(container.querySelector('canvas'), config);
      charts.add(ch);
      return ch;
    },
    destroyCharts() { charts.forEach((c) => { try { c.destroy(); } catch (e) { /* ignore */ } }); charts.clear(); },
    moneyTick(v) { return v >= 1000 ? 'R$ ' + U.fmtNum(v / 1000, 1) + 'k' : 'R$ ' + U.fmtNum(v, 0); },

    /* ---------------- WhatsApp ---------------- */
    /** Modal com mensagem editável e link real para o wa.me (funciona no celular e em navegadores embutidos). */
    whatsapp({ telefone, mensagem, titulo = 'Enviar WhatsApp', nome = '', permitirSemNumero = false }) {
      const num = U.phoneToWa(telefone);
      UI.modal({
        title: titulo,
        body: `
          ${!num && !permitirSemNumero ? `<div class="alert warning mb-3">${UI.icon('alert-triangle')}<div>Sem telefone cadastrado. Digite um número abaixo.</div></div>` : ''}
          <div class="field mb-3"><label for="wa-num">Número (WhatsApp)${permitirSemNumero ? ' <span class="muted">— opcional</span>' : ''}</label><input id="wa-num" class="input" data-mask="phone" value="${esc(U.maskPhone(num.replace(/^55/, '')))}" placeholder="(11) 98765-4321">
            ${permitirSemNumero ? '<span class="hint">Deixe vazio para escolher o contato dentro do WhatsApp.</span>' : ''}</div>
          <div class="field"><label for="wa-msg">Mensagem${nome ? ` para ${esc(nome)}` : ''}</label><textarea id="wa-msg" class="input" rows="9">${esc(mensagem)}</textarea><span class="hint">Edite à vontade antes de enviar.</span></div>`,
        footer: `<button class="btn" data-close>Cancelar</button><a class="btn btn-wa" id="wa-send" target="_blank" rel="noopener" href="#">${UI.icon('message-circle')}Abrir WhatsApp</a>`,
        onOpen(el, close) {
          const a = el.querySelector('#wa-send');
          const numIn = el.querySelector('#wa-num'), msgIn = el.querySelector('#wa-msg');
          const valido = () => { const d = U.onlyDigits(numIn.value); return d ? U.validPhone(d) : permitirSemNumero; };
          const upd = () => {
            const d = U.onlyDigits(numIn.value);
            a.href = `https://wa.me/${d ? U.phoneToWa(d) : ''}?text=${encodeURIComponent(msgIn.value)}`;
            a.classList.toggle('is-disabled', !valido());
          };
          numIn.addEventListener('input', upd); msgIn.addEventListener('input', upd); upd();
          a.addEventListener('click', (e) => {
            if (!valido()) { e.preventDefault(); UI.toast('Informe um telefone válido com DDD.', 'error'); numIn.focus(); return; }
            setTimeout(close, 300);
          });
        },
      });
    },

    /** Rótulos das colunas em cada célula: no celular a tabela vira lista de cartões. */
    stackTables(root = document) {
      root.querySelectorAll('table.table:not(.no-stack)').forEach((t) => {
        const heads = [...t.querySelectorAll('thead th')].map((th) => th.textContent.replace(/[↑↓]/g, '').trim());
        t.classList.add('stackable');
        t.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => { if (heads[i] && !td.dataset.label) td.dataset.label = heads[i]; }));
      });
    },

    /* ---------------- Impressão ---------------- */
    /** Imprime um HTML isolado (recibos). */
    print(html) {
      const area = document.getElementById('print-area');
      area.innerHTML = html;
      document.body.classList.add('printing');
      const done = () => { document.body.classList.remove('printing'); area.innerHTML = ''; window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      setTimeout(() => { window.print(); setTimeout(done, 500); }, 50);
    },
  };

  function deepMerge(a, b) {
    Object.keys(b).forEach((k) => {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') a[k] = deepMerge(a[k], b[k]);
      else a[k] = b[k];
    });
    return a;
  }

  MR3.UI = UI;
})();
