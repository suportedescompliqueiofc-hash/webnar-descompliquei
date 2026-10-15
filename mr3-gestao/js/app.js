/* =========================================================================
   app.js — inicialização, roteamento por hash, layout (menu, tema,
   busca global, aviso de backup) e atalhos de teclado.
   Rotas: #/dashboard, #/atletas, #/atletas/:id[/aba], #/agenda,
          #/sessoes, #/financeiro, #/relatorios, #/config
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const { U, UI, Store } = MR3;
  const esc = U.esc;

  const NAV = [
    { route: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { route: 'agenda', label: 'Agenda', icon: 'calendar-days' },
    { route: 'atletas', label: 'Atletas', icon: 'users' },
    { route: 'fichas', label: 'Fichas de cadastro', icon: 'clipboard-pen', badge: () => Store.query('fichas', { status: 'pendente' }).length },
    { route: 'materiais', label: 'Materiais', icon: 'folder-open' },
    { route: 'sessoes', label: 'Planos e sessões', icon: 'clipboard-list' },
    { route: 'financeiro', label: 'Financeiro', icon: 'wallet' },
    { route: 'relatorios', label: 'Relatórios', icon: 'bar-chart-3' },
    { sep: true },
    { route: 'config', label: 'Configurações', icon: 'settings' },
  ];
  const BOTTOM = ['dashboard', 'agenda', '+', 'atletas', 'financeiro'];
  const SHORT = { dashboard: 'Início', agenda: 'Agenda', atletas: 'Atletas', financeiro: 'Financeiro' };
  const QUICK = [
    { icon: 'calendar-plus', label: 'Nova sessão', run: () => MR3.Agenda.openSessao({ data: U.today() }) },
    { icon: 'user-plus', label: 'Novo atleta', run: () => MR3.Atletas.openForm() },
    { icon: 'banknote', label: 'Registrar pagamento', run: () => { location.hash = '#/financeiro'; } },
    { icon: 'send', label: 'Enviar ficha de cadastro', run: () => MR3.Fichas.enviar() },
    { icon: 'upload', label: 'Adicionar material', run: () => MR3.Materiais.openForm() },
  ];

  let currentRoute = null;

  /* ---------------- Roteamento ---------------- */
  function parseHash() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const query = {};
    new URLSearchParams(qs || '').forEach((v, k) => (query[k] = v));
    return { route: parts[0] || 'dashboard', params: parts.slice(1), query };
  }

  function render() {
    const { route, params, query } = parseHash();
    const mod = MR3.modules[route];
    const main = document.getElementById('main');
    UI.destroyCharts();
    closeDrawer();
    closeSearch();
    if (!mod) { location.hash = '#/dashboard'; return; }
    const changedRoute = route !== currentRoute;
    currentRoute = route;
    setActiveNav(route);
    try {
      // Container novo a cada render: listeners da tela anterior são descartados junto
      main.innerHTML = '';
      const view = document.createElement('div');
      view.className = 'view';
      main.appendChild(view);
      mod.render(view, params, query);
      document.title = `${mod.title ? mod.title + ' · ' : ''}MR3 Gestão`;
    } catch (e) {
      console.error(e);
      main.innerHTML = UI.empty({ icon: 'bug', title: 'Algo deu errado nesta tela', text: e.message, action: '<a class="btn" href="#/dashboard">Voltar ao início</a>' });
    }
    UI.refreshIcons(main);
    UI.bindMasks(main);
    UI.stackTables(main);
    if (changedRoute) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
    renderBanner();
  }
  /** Re-renderiza a tela atual (após salvar algo). Mantém a rolagem. */
  MR3.refresh = function () {
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
  };
  MR3.go = function (hash) {
    if (location.hash === hash) MR3.refresh(); else location.hash = hash;
  };

  /* ---------------- Layout ---------------- */
  function renderNav() {
    document.getElementById('nav').innerHTML = NAV.map((n) => {
      if (n.sep) return '<div class="nav-sep"></div>';
      const b = n.badge ? n.badge() : 0;
      return `<a href="#/${n.route}" data-route="${n.route}">${UI.icon(n.icon)}<span>${n.label}</span>${b ? `<span class="count-pill">${b}</span>` : ''}</a>`;
    }).join('');
    document.getElementById('bottom-nav').innerHTML = BOTTOM.map((r) => {
      if (r === '+') return `<button type="button" class="bn-fab" id="bn-fab" aria-label="Ações rápidas" aria-haspopup="dialog">${UI.icon('plus')}</button>`;
      const n = NAV.find((x) => x.route === r);
      return `<a href="#/${r}" data-route="${r}">${UI.icon(n.icon)}<span>${SHORT[r]}</span></a>`;
    }).join('');
    document.getElementById('sidebar-version').textContent = `v2.0 · schema ${Store.SCHEMA_VERSION}`;
  }
  function setActiveNav(route) {
    document.querySelectorAll('[data-route]').forEach((a) => {
      const on = a.dataset.route === route;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function openDrawer() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('drawer-backdrop').hidden = false;
    document.getElementById('btn-menu').setAttribute('aria-expanded', 'true');
  }
  function closeDrawer() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('drawer-backdrop').hidden = true;
    document.getElementById('btn-menu').setAttribute('aria-expanded', 'false');
  }

  /* ---------------- Tema ---------------- */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', t === 'light' ? '#F5F7FB' : '#0A1428');
    const btn = document.getElementById('btn-theme');
    btn.innerHTML = UI.icon(t === 'light' ? 'moon' : 'sun');
    btn.setAttribute('aria-label', t === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro');
    UI.refreshIcons(btn);
  }
  MR3.setTheme = function (t) {
    try { localStorage.setItem('mr3:tema', t); } catch (e) { /* ignore */ }
    Store.setConfig({ tema: t });
    applyTheme(t);
    MR3.refresh(); // redesenha gráficos com as cores do tema
  };
  MR3.getTheme = () => document.documentElement.getAttribute('data-theme') || 'dark';

  /* ---------------- Aviso de backup ---------------- */
  function renderBanner() {
    const area = document.getElementById('banner-area');
    const meta = Store.getMeta();
    const temDados = Store.getAll('atletas').length > 0;
    const dias = meta.ultimoBackup ? U.diffDays(U.tsToDate(meta.ultimoBackup), U.today()) : null;
    const snooze = sessionStorage.getItem('mr3:backup-snooze');
    if (!temDados || snooze || (dias != null && dias <= 7) || currentRoute === 'config') { area.innerHTML = ''; return; }
    area.innerHTML = `<div class="banner warning" role="status">${UI.icon('shield-alert')}
      <span>${dias == null ? 'Você ainda não fez nenhum backup dos dados.' : `Seu último backup foi há ${dias} dias.`} Os dados ficam só neste navegador.</span>
      <button class="btn btn-sm" id="bn-backup">${UI.icon('download')}Fazer backup</button>
      <button class="icon-btn sm ghost" id="bn-snooze" aria-label="Dispensar aviso">${UI.icon('x')}</button></div>`;
    UI.refreshIcons(area);
    area.querySelector('#bn-backup').onclick = () => MR3.modules.config.exportJSON();
    area.querySelector('#bn-snooze').onclick = () => { sessionStorage.setItem('mr3:backup-snooze', '1'); area.innerHTML = ''; };
  }
  MR3.renderBanner = renderBanner;

  /* ---------------- Busca global ---------------- */
  let searchIdx = -1;
  function runSearch() {
    const input = document.getElementById('global-search');
    const box = document.getElementById('global-search-results');
    const q = U.norm(input.value);
    if (!q) { closeSearch(); return; }
    const res = Store.getAll('atletas').filter((a) => U.norm(a.nome).includes(q) || U.onlyDigits(a.telefone).includes(U.onlyDigits(q) || '#'))
      .sort((a, b) => (a.status === b.status ? a.nome.localeCompare(b.nome, 'pt-BR') : a.status === 'ativo' ? -1 : 1)).slice(0, 8);
    searchIdx = res.length ? 0 : -1;
    box.innerHTML = res.length ? res.map((a, i) => `<a class="gs-item${i === 0 ? ' active' : ''}" role="option" href="#/atletas/${esc(a.id)}">${UI.avatar(a, 'sm')}
      <span class="grow truncate"><span class="strong">${esc(a.nome)}</span><br><span class="muted small">${esc(a.modalidade || '—')}${a.posicao ? ' · ' + esc(a.posicao) : ''}</span></span>${UI.badgeAtleta(a)}</a>`).join('')
      : '<div class="gs-empty">Nenhum atleta encontrado.</div>';
    box.hidden = false;
    UI.refreshIcons(box);
  }
  function closeSearch() {
    const box = document.getElementById('global-search-results');
    if (box) box.hidden = true;
  }
  function bindSearch() {
    const input = document.getElementById('global-search');
    const box = document.getElementById('global-search-results');
    input.addEventListener('input', U.debounce(runSearch, 120));
    input.addEventListener('focus', () => input.value && runSearch());
    input.addEventListener('keydown', (e) => {
      const items = [...box.querySelectorAll('.gs-item')];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!items.length) return;
        searchIdx = (searchIdx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((x, i) => x.classList.toggle('active', i === searchIdx));
      } else if (e.key === 'Enter' && items[searchIdx]) {
        e.preventDefault(); location.hash = items[searchIdx].getAttribute('href'); input.value = ''; input.blur(); closeSearch();
      } else if (e.key === 'Escape') { input.value = ''; closeSearch(); input.blur(); }
    });
    box.addEventListener('click', (e) => { if (e.target.closest('.gs-item')) { input.value = ''; closeSearch(); } });
    document.addEventListener('click', (e) => { if (!e.target.closest('.global-search')) closeSearch(); });
  }

  /* ---------------- Ações rápidas (botão + do celular) ---------------- */
  function quickActions() {
    UI.modal({
      title: 'O que você quer fazer?', size: 'sm',
      body: `<div class="quick-grid">${QUICK.map((q, i) => `<button type="button" class="quick-item" data-q="${i}">${UI.icon(q.icon)}<span>${q.label}</span></button>`).join('')}</div>`,
      onOpen(el, close) { el.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => { close(); QUICK[+b.dataset.q].run(); })); },
    });
  }

  /* ---------------- Inicialização ---------------- */
  async function init() {
    await Store.init();
    // Sincroniza tema salvo na config (caso tenha vindo de um backup)
    const saved = (() => { try { return localStorage.getItem('mr3:tema'); } catch (e) { return null; } })();
    applyTheme(saved || MR3.getTheme());

    renderNav();
    UI.refreshIcons(document.querySelector('.topbar'));
    bindSearch();

    document.getElementById('btn-theme').addEventListener('click', () => MR3.setTheme(MR3.getTheme() === 'light' ? 'dark' : 'light'));
    document.getElementById('btn-menu').addEventListener('click', openDrawer);
    document.getElementById('drawer-backdrop').addEventListener('click', closeDrawer);
    document.getElementById('bottom-nav').addEventListener('click', (e) => { if (e.target.closest('#bn-fab')) quickActions(); });
    // Ícones e tabelas "empilháveis" em todo conteúdo novo (telas, filtros, modais)
    let raf = 0;
    const obs = new MutationObserver(() => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; UI.refreshIcons(document.getElementById('main')); UI.stackTables(document.getElementById('main')); UI.refreshIcons(document.getElementById('modal-root')); }); });
    obs.observe(document.getElementById('main'), { childList: true, subtree: true });
    obs.observe(document.getElementById('modal-root'), { childList: true, subtree: true });
    // Fichas salvas pelo ficha.html neste aparelho
    const novas = MR3.Fichas.consumirFila();
    if (novas) setTimeout(() => UI.toast(`${U.plural(novas, 'ficha nova recebida', 'fichas novas recebidas')}. Veja em Fichas de cadastro.`), 600);
    Store.subscribe(U.debounce(() => { renderNav(); setActiveNav(currentRoute); UI.refreshIcons(document.getElementById('sidebar')); }, 300));
    document.getElementById('nav').addEventListener('click', (e) => { if (e.target.closest('a')) closeDrawer(); });

    // Atalhos: Esc fecha modal/drawer; "/" foca a busca
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (UI.closeTopModal()) { e.preventDefault(); return; }
        closeDrawer();
      }
      if (e.key === '/' && !UI.hasModal() && !/input|textarea|select/i.test(document.activeElement.tagName)) {
        e.preventDefault(); document.getElementById('global-search').focus();
      }
    });

    window.addEventListener('hashchange', render);
    if (!location.hash) history.replaceState(null, '', '#/dashboard');
    render();
  }

  MR3.modules = MR3.modules || {};
  document.addEventListener('DOMContentLoaded', () => init().catch((e) => {
    console.error(e);
    document.getElementById('main').innerHTML = `<div class="empty"><h3>Falha ao iniciar</h3><p>${esc(e.message)}</p></div>`;
  }));
})();
