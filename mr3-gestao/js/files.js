/* =========================================================================
   files.js — armazenamento de arquivos (PDF, vídeo, imagem) no IndexedDB.
   O localStorage tem ~5 MB; o IndexedDB comporta centenas de MB, então os
   arquivos dos Materiais ficam aqui e o Store guarda só os metadados.
   API: MR3.Files.put(blob) -> id · get(id) -> Blob · remove(id) · uso()
   (Na migração para Supabase, trocar por Supabase Storage com a mesma API.)
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const DB_NAME = 'mr3-arquivos';
  const STORE = 'arquivos';
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('Este navegador não permite guardar arquivos.')); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Falha ao abrir o armazenamento de arquivos.'));
    });
    dbPromise.catch(() => { dbPromise = null; });
    return dbPromise;
  }
  function tx(mode, fn) {
    return open().then((db) => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const st = t.objectStore(STORE);
      let result;
      const r = fn(st);
      if (r) r.onsuccess = () => { result = r.result; };
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('Operação cancelada (espaço insuficiente?).'));
    }));
  }

  const cache = new Map(); // id -> objectURL (evita recriar URLs)

  MR3.Files = {
    async put(blob) {
      const id = MR3.U.uid('fl_');
      await tx('readwrite', (st) => st.put(blob, id));
      return id;
    },
    get(id) { return tx('readonly', (st) => st.get(id)); },
    async url(id) {
      if (cache.has(id)) return cache.get(id);
      const blob = await MR3.Files.get(id);
      if (!blob) return null;
      const u = URL.createObjectURL(blob);
      cache.set(id, u);
      return u;
    },
    async remove(id) {
      if (cache.has(id)) { URL.revokeObjectURL(cache.get(id)); cache.delete(id); }
      await tx('readwrite', (st) => st.delete(id));
    },
    async clear() { cache.forEach((u) => URL.revokeObjectURL(u)); cache.clear(); await tx('readwrite', (st) => st.clear()); },
    /** Uso estimado do armazenamento do navegador (bytes). */
    async uso() {
      try { const e = await navigator.storage.estimate(); return { usado: e.usage || 0, cota: e.quota || 0 }; } catch (e) { return null; }
    },
  };
})();
