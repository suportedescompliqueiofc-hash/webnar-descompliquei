/* =========================================================================
   utils.js — datas, moeda BRL, validações, IDs, CSV e helpers gerais.
   Datas são sempre strings ISO "AAAA-MM-DD" (sem fuso) e horas "HH:MM".
   "Hoje" é calculado no fuso America/Sao_Paulo.
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const TZ = 'America/Sao_Paulo';
  const pad = (n) => String(n).padStart(2, '0');

  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  // Semana começa na segunda-feira: índice 0 = segunda ... 6 = domingo
  const DIAS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
  const DIAS_CURTOS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const num2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

  const U = {
    MESES, MESES_CURTOS, DIAS, DIAS_CURTOS, TZ,

    /** Gera um ID único curto (ordenável por tempo). */
    uid(prefix = '') {
      return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    },

    /** Escapa HTML para evitar injeção ao montar templates. */
    esc(s) {
      return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    /* ---------------- Datas ---------------- */
    /** Data de hoje (AAAA-MM-DD) no fuso de São Paulo. */
    today() {
      return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    },
    /** Hora atual (HH:MM) no fuso de São Paulo. */
    nowTime() {
      const s = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
      return s.replace(/^24/, '00');
    },
    /** Timestamp ISO completo (para criadoEm/atualizadoEm). */
    nowISO() { return new Date().toISOString(); },
    /** Converte "AAAA-MM-DD" em Date local (meia-noite) — só para aritmética. */
    parse(iso) {
      if (!iso) return null;
      const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
      return new Date(y, m - 1, d);
    },
    toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; },
    isISODate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(U.parse(s)); },
    addDays(iso, n) { const d = U.parse(iso); d.setDate(d.getDate() + n); return U.toISO(d); },
    /** Soma meses mantendo o dia (limitado ao último dia do mês). */
    addMonths(iso, n) {
      const d = U.parse(iso);
      const day = d.getDate();
      d.setDate(1); d.setMonth(d.getMonth() + n);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, last));
      return U.toISO(d);
    },
    diffDays(a, b) { return Math.round((U.parse(b) - U.parse(a)) / 86400000); },
    /** Dia da semana com segunda = 0. */
    weekday(iso) { return (U.parse(iso).getDay() + 6) % 7; },
    startOfWeek(iso) { return U.addDays(iso, -U.weekday(iso)); },
    startOfMonth(iso) { return iso.slice(0, 8) + '01'; },
    endOfMonth(iso) { const d = U.parse(iso); return U.toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)); },
    monthKey(iso) { return iso.slice(0, 7); },
    /** "2026-10" -> "out/26" */
    monthShort(key) { const [y, m] = key.split('-'); return `${MESES_CURTOS[+m - 1]}/${y.slice(2)}`; },
    /** "2026-10" -> "outubro de 2026" */
    monthLong(key) { const [y, m] = key.split('-'); return `${MESES[+m - 1]} de ${y}`; },
    /** "2026-10" -> "10/2026" (referência de mensalidade) */
    monthRef(key) { const [y, m] = key.split('-'); return `${m}/${y}`; },
    addMonthKey(key, n) { return U.addMonths(key + '-01', n).slice(0, 7); },
    /** Lista de chaves de mês terminando em `endKey` (inclusive). */
    lastMonths(n, endKey = U.today().slice(0, 7)) {
      const out = [];
      for (let i = n - 1; i >= 0; i--) out.push(U.addMonthKey(endKey, -i));
      return out;
    },
    daysInMonth(key) { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); },
    /** dd/mm/aaaa */
    fmtDate(iso) {
      if (!iso) return '—';
      const s = String(iso).slice(0, 10);
      const [y, m, d] = s.split('-');
      return d && m && y ? `${d}/${m}/${y}` : '—';
    },
    fmtDateShort(iso) { if (!iso) return '—'; const [, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}`; },
    /** "seg, 14/10" */
    fmtDateDow(iso) { return `${DIAS_CURTOS[U.weekday(iso)]}, ${U.fmtDateShort(iso)}`; },
    /** Converte timestamp ISO completo em data local (São Paulo) AAAA-MM-DD. */
    tsToDate(ts) {
      if (!ts) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(ts)) return ts;
      return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts));
    },
    /** Converte "dd/mm/aaaa" em ISO (usado na importação de CSV/entrada livre). */
    brToISO(s) {
      const m = String(s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
    },
    age(iso) {
      if (!iso) return null;
      const t = U.parse(U.today()); const b = U.parse(iso);
      let a = t.getFullYear() - b.getFullYear();
      if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
      return a;
    },
    /** Duração legível: "1 ano e 3 meses", "5 meses", "12 dias". */
    fmtDuration(days) {
      if (days == null || isNaN(days)) return '—';
      if (days < 31) return `${days} ${days === 1 ? 'dia' : 'dias'}`;
      const months = Math.floor(days / 30.4375);
      const y = Math.floor(months / 12); const m = months % 12;
      const parts = [];
      if (y) parts.push(`${y} ${y === 1 ? 'ano' : 'anos'}`);
      if (m) parts.push(`${m} ${m === 1 ? 'mês' : 'meses'}`);
      return parts.join(' e ');
    },

    /* ---------------- Horas ---------------- */
    timeToMin(t) { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); },
    minToTime(min) { min = Math.max(0, Math.round(min)); return `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`; },
    addMinutes(t, n) { return U.minToTime(U.timeToMin(t) + n); },

    /* ---------------- Números e moeda ---------------- */
    fmtMoney(n) { return brl.format(Number(n) || 0); },
    /** Valor para exibir dentro de input (sem "R$"): 1.234,56 */
    fmtMoneyInput(n) { return n === '' || n == null || isNaN(n) ? '' : num2.format(Number(n)); },
    /** Interpreta "1.234,56", "1234.56", "R$ 80" etc. Retorna número (0 se vazio). */
    parseMoney(v) {
      if (typeof v === 'number') return v;
      let s = String(v || '').replace(/[^\d,.-]/g, '');
      if (!s) return 0;
      if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
      const n = parseFloat(s);
      return isNaN(n) ? 0 : Math.round(n * 100) / 100;
    },
    fmtNum(n, dec = 1) { return dec === 1 ? num1.format(n || 0) : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: dec }).format(n || 0); },
    fmtPct(ratio, dec = 1) {
      if (ratio == null || !isFinite(ratio)) return '—';
      return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: dec }).format(ratio);
    },
    round2(n) { return Math.round((Number(n) || 0) * 100) / 100; },
    sum(arr, fn = (x) => x) { return arr.reduce((acc, x) => acc + (Number(fn(x)) || 0), 0); },
    clamp(n, a, b) { return Math.min(b, Math.max(a, n)); },

    /* ---------------- Texto / validação ---------------- */
    onlyDigits(s) { return String(s || '').replace(/\D/g, ''); },
    /** Máscara de telefone brasileiro: (11) 98765-4321 */
    maskPhone(v) {
      const d = U.onlyDigits(v).slice(0, 11);
      if (d.length <= 2) return d.length ? `(${d}` : '';
      if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    },
    validPhone(v) { const d = U.onlyDigits(v); return d.length === 10 || d.length === 11; },
    validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim()); },
    /** Número no formato aceito pelo wa.me (55 + DDD + número). */
    phoneToWa(v) {
      const d = U.onlyDigits(v);
      if (!d) return '';
      if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d;
      return '55' + d;
    },
    initials(nome) {
      const p = String(nome || '?').trim().split(/\s+/);
      return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
    },
    firstName(nome) { return String(nome || '').trim().split(/\s+/)[0] || ''; },
    /** Normaliza para busca (sem acento, minúsculo). */
    norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); },
    plural(n, um, varios) { return `${n} ${n === 1 ? um : varios}`; },
    capitalize(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); },
    /** Substitui {chaves} do modelo pelos valores. */
    fillTemplate(tpl, vars) {
      return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    },

    /* ---------------- Coleções ---------------- */
    groupBy(arr, fn) {
      const m = {};
      arr.forEach((x) => { const k = fn(x); (m[k] = m[k] || []).push(x); });
      return m;
    },
    sortBy(arr, fn, dir = 1) {
      return [...arr].sort((a, b) => {
        const x = fn(a), y = fn(b);
        if (typeof x === 'string' || typeof y === 'string') return String(x ?? '').localeCompare(String(y ?? ''), 'pt-BR') * dir;
        return ((x ?? 0) - (y ?? 0)) * dir;
      });
    },

    /* ---------------- Arquivos ---------------- */
    /** Gera CSV com ";" (padrão Excel pt-BR) e BOM UTF-8. columns: [{label, value: fn}] */
    toCSV(rows, columns) {
      const escCell = (v) => {
        const s = v == null ? '' : String(v);
        return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const head = columns.map((c) => escCell(c.label)).join(';');
      const body = rows.map((r) => columns.map((c) => escCell(c.value(r))).join(';'));
      return '﻿' + [head, ...body].join('\r\n');
    },
    download(filename, content, mime = 'text/plain;charset=utf-8') {
      const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    /** Lê arquivo de imagem e reduz para no máx. `max` px (JPEG base64) — evita estourar o localStorage. */
    resizeImage(file, max = 240) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Falha ao ler a imagem'));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error('Imagem inválida'));
          img.onload = () => {
            const scale = Math.min(1, max / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            resolve(c.toDataURL('image/jpeg', 0.82));
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    },

    debounce(fn, ms = 200) {
      let t;
      return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    },
    /** Gerador pseudoaleatório determinístico (dados de demonstração reprodutíveis). */
    seededRandom(seed = 42) {
      let s = seed >>> 0;
      return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    },
  };

  MR3.U = U;
})();
