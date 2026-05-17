/* ============================================================
   POF Sidebar — logic
   ============================================================ */

/* ── ICONS (Tabler outline, inlined per POF ICONS.md) ──── */
const ICON = {
  task:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l10 -10"/></svg>`,
  taskBox:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3l8 -8"/><path d="M20 12v6a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h9"/></svg>`,
  user:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/></svg>`,
  message:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-13a3 3 0 0 1 3 -3h10a3 3 0 0 1 3 3v6a3 3 0 0 1 -3 3h-9l-4 4"/><path d="M8 9h8"/><path d="M8 13h6"/></svg>`,
  check:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l10 -10"/></svg>`,
  alert:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/><path d="M12 16h.01"/></svg>`,
  x:         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6l-12 12"/><path d="M6 6l12 12"/></svg>`,
  plus:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5l0 14"/><path d="M5 12l14 0"/></svg>`,
  external:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6"/><path d="M11 13l9 -9"/><path d="M15 4h5v5"/></svg>`,
  arrow:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l14 0"/><path d="M13 18l6 -6"/><path d="M13 6l6 6"/></svg>`,
  inbox:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13h3l3 3h4l3 -3h3"/><path d="M4 4h16v16h-16z"/></svg>`,
  clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2"/><path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>`,
  notes:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z"/><path d="M9 7l6 0"/><path d="M9 11l6 0"/><path d="M9 15l4 0"/></svg>`,
  hash:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l14 0"/><path d="M5 15l14 0"/><path d="M11 4l-4 16"/><path d="M17 4l-4 16"/></svg>`,
  microphone:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2m0 3a3 3 0 0 1 3 -3h0a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3h0a3 3 0 0 1 -3 -3z"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M8 21l8 0"/><path d="M12 17l0 4"/></svg>`,
  radar:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M18.364 19.364a9 9 0 1 0 -12.728 0"/><path d="M15.536 16.536a5 5 0 1 0 -7.072 0"/><path d="M12 13m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/></svg>`,
  fileShield:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11.46 20.846a12 12 0 0 1 -7.96 -14.846a12 12 0 0 0 8.5 -3a12 12 0 0 0 8.5 3a12 12 0 0 1 -.09 7.06"/><path d="M15 19l2 2l4 -4"/></svg>`,
  target:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0"/><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/></svg>`,
  edit:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1"/><path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z"/><path d="M16 5l3 3"/></svg>`,
  fileShield:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11.46 20.846a12 12 0 0 1 -7.96 -14.846a12 12 0 0 0 8.5 -3a12 12 0 0 0 8.5 3a12 12 0 0 1 -.09 7.06"/><path d="M15 19l2 2l4 -4"/></svg>`,
  shieldCheck:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11.46 20.846a12 12 0 0 1 -7.96 -14.846a12 12 0 0 0 8.5 -3a12 12 0 0 0 8.5 3a12 12 0 0 1 -.09 7.06"/><path d="M15 19l2 2l4 -4"/></svg>`,
  robot:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2z"/><path d="M9 16c1 .667 2 1 3 1s2 -.333 3 -1"/><path d="M9 7l-1 -4"/><path d="M15 7l1 -4"/><circle cx="9" cy="11" r=".5" fill="currentColor"/><circle cx="15" cy="11" r=".5" fill="currentColor"/></svg>`,
  human:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/></svg>`,
  calendar:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3l0 4"/><path d="M8 3l0 4"/><path d="M4 11l16 0"/></svg>`,
  flag:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1 -7 0a5 5 0 0 0 -7 0v-9z"/><path d="M5 21v-7"/></svg>`,
  sparkles:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z"/></svg>`,
  chevron:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6l-6 6"/></svg>`,
  notion: `<svg class="logo-inline" viewBox="0 0 120 126" xmlns="http://www.w3.org/2000/svg"><path d="M24 8l68-5c8-1 11 4 11 12v89c0 7-3 11-10 12l-66 4c-7 0-11-3-15-9L4 96c-4-5-5-9-5-13V25c0-7 3-13 12-14L24 8z" fill="currentColor"/></svg>`,
};

function icon(name) { return ICON[name] || ''; }

/* ════════════════════════════════════════════════════════
   CONFIG
   ════════════════════════════════════════════════════════ */
const CFG = {
  PROXY_URL:   'https://script.google.com/macros/s/AKfycbyWYMvnepoAivX4Hb2NOZRFFd40XPuxD3SJWxUiunmdPimmJUcT7dXZpLbikyCZ5Hki/exec',
  PROXY_TOKEN: 'c191e56286569c1fecd30e7d61ba3c66',
};

/* ════════════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════════════ */
const S = {
  conversationId: null,
  participants:   [],
  main:           null,
  others:         [],
  mainNotion:     null,  // dernier résultat lookup_person pour S.main
  convPageId:     null,
  convOrigText:   '',
  convSubject:    '',
  personIndex:    null,
  indexLoading:   null,
};

/* ════════════════════════════════════════════════════════
   INDEX PERSONS (cache local sessionStorage, TTL 30 min)
   Pré-chargement de toute la base Personnes en un appel,
   puis matching client instantané pour tous les participants.
   ════════════════════════════════════════════════════════ */
const INDEX_CACHE_KEY = 'pof_persons_v1';
const INDEX_TTL_MS    = 30 * 60 * 1000;

function loadIndexFromCache() {
  try {
    const raw = sessionStorage.getItem(INDEX_CACHE_KEY);
    if (!raw) return null;
    const { ts, persons } = JSON.parse(raw);
    if (!ts || Date.now() - ts > INDEX_TTL_MS) return null;
    return persons;
  } catch { return null; }
}
function saveIndexToCache(persons) {
  try { sessionStorage.setItem(INDEX_CACHE_KEY, JSON.stringify({ ts: Date.now(), persons })); } catch {}
}
function buildIndex(persons) {
  const idx = new Map();
  for (const p of persons) {
    if (p.email) idx.set(p.email.toLowerCase().trim(), p);
  }
  return idx;
}
async function ensureIndex() {
  if (S.personIndex) return S.personIndex;
  if (S.indexLoading) return S.indexLoading;
  S.indexLoading = (async () => {
    let persons = loadIndexFromCache();
    if (!persons) {
      const r = await callProxy('dump_persons', {});
      persons = r?.persons || [];
      if (persons.length) saveIndexToCache(persons);
    }
    S.personIndex = buildIndex(persons);
    return S.personIndex;
  })();
  return S.indexLoading;
}
function lookupLocal(person) {
  if (!S.personIndex) return null;
  const email = (person.email || '').toLowerCase().trim();
  if (!email) return null;
  const hit = S.personIndex.get(email);
  if (!hit) return null;
  return {
    found: true,
    notion_page_id:  hit.page_id,
    notion_page_url: hit.page_url,
    name:            hit.name || person.name,
    email:           hit.email,
    person_instructions: hit.instructions || ''
  };
}
function invalidateIndex() {
  sessionStorage.removeItem(INDEX_CACHE_KEY);
  S.personIndex = null;
  S.indexLoading = null;
  ensureIndex().catch(() => {});
}

/* ════════════════════════════════════════════════════════
   TABS
   ════════════════════════════════════════════════════════ */
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    const target = t.dataset.pane;
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + target));
  });
});

/* ════════════════════════════════════════════════════════
   ESCAPE
   ════════════════════════════════════════════════════════ */
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function initials(name) {
  return (name || '').split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '?';
}
function notionHref(pageId) {
  return `https://notion.so/${(pageId || '').replace(/-/g, '')}`;
}

/* ════════════════════════════════════════════════════════
   PROXY
   ════════════════════════════════════════════════════════ */
async function callProxy(action, args = {}) {
  if (window.__POF_MOCK) return window.__pofMock(action, args);
  try {
    const res = await fetch(CFG.PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: CFG.PROXY_TOKEN, ...args }),
      redirect: 'follow',
    });
    if (!res.ok) return { error: `proxy ${res.status}` };
    return await res.json();
  } catch (e) {
    return { error: String(e && e.message || e) };
  }
}

// Lookup local-first : utilise l'index cache. Fallback proxy uniquement
// si l'index n'est pas encore chargé OU si pas trouvé localement.
async function lookupInNotion(p) {
  await ensureIndex();
  const local = lookupLocal(p);
  return local || { found: false };
}
const lookupInFolk                = p => callProxy('lookup_folk',   { email: p.email, name: p.name });
const lookupParticipantInNotion   = p => lookupInNotion(p);
const createPersonInNotion        = p => callProxy('create_person', { email: p.email, name: p.name });
const updatePersonInstructions    = (pageId, text) => callProxy('update_person_instructions', { page_id: pageId, text });

/* ════════════════════════════════════════════════════════
   EXTRACT PARTICIPANTS
   ════════════════════════════════════════════════════════ */
function extractParticipants(conv) {
  const seen = new Set();
  const list = [];
  const add = field => {
    const arr = Array.isArray(field) ? field : (field ? [field] : []);
    arr.forEach(p => {
      const email = (p.address || p.email || '').toLowerCase().trim();
      const name  = p.name || email.split('@')[0] || '';
      if (email && !seen.has(email)) { seen.add(email); list.push({ name, email }); }
    });
  };
  const msg = conv?.latest_message || conv?.messages?.[0];
  if (msg) { add(msg.from_field); add(msg.to_fields); add(msg.cc_fields); }
  if (!list.length && conv?.contacts) conv.contacts.forEach(add);
  return sortParticipants(list);
}

/* Sort: external contacts first (the focus), then @plasticodyssey.org (internal team). */
function isInternal(p) {
  return (p.email || '').toLowerCase().endsWith('@plasticodyssey.org');
}
function sortParticipants(list) {
  // Stable sort: externals first, internals last, original order preserved within each group.
  const ext = list.filter(p => !isInternal(p));
  const int = list.filter(p =>  isInternal(p));
  return [...ext, ...int];
}

/* Promote a participant to "Contact principal" — keeps the previous main in `others`. */
async function promoteParticipant(idx) {
  if (idx < 0 || idx >= S.others.length) return;
  const newMain = S.others[idx];
  const oldMain = S.main;
  // Rebuild lists: new main on top; old main moves into others (re-sorted).
  S.main   = newMain;
  S.others = sortParticipants([oldMain, ...S.others.filter((_, i) => i !== idx)]);

  renderMainLoading(newMain);
  renderOthers(S.others, S.conversationId);
  const data = await lookupInNotion(newMain);
  if (S.main !== newMain) return; // user clicked again before lookup returned
  renderMain(newMain, data);
}

/* ════════════════════════════════════════════════════════
   CONV INSTRUCTIONS
   ════════════════════════════════════════════════════════ */
async function loadConvInstructions(convId) {
  const data = await callProxy('lookup_conv', { missive_conversation_id: convId });
  const instructions = data?.instructions || '';
  S.convPageId   = data?.notion_page_id || null;
  S.convOrigText = instructions;
  document.getElementById('conv-textarea').value = instructions;
}

async function saveConv() {
  const text = document.getElementById('conv-textarea').value;
  const btn  = document.getElementById('conv-save-btn');

  if (!S.conversationId) {
    btn.innerHTML = `${icon('alert')} Aucune conversation`;
    setTimeout(() => { btn.innerHTML = 'Sauvegarder'; btn.disabled = false; }, 2500);
    return;
  }

  btn.innerHTML = `<div class="spinner"></div> Sauvegarde…`;
  btn.disabled  = true;

  const r = await callProxy('upsert_conv', {
    missive_conversation_id: S.conversationId,
    text,
    ...(S.convPageId ? { page_id: S.convPageId } : {}),
  });

  if (r?.notion_page_id) S.convPageId = r.notion_page_id;
  if (r?.success) {
    S.convOrigText = text;
    btn.innerHTML  = `${icon('check')} Sauvegardé`;
  } else {
    btn.innerHTML  = `${icon('alert')} ${esc(r?.error || 'Erreur')}`;
    btn.title      = r?.error || '';
    console.warn('[POF] upsert_conv failed:', r);
  }
  setTimeout(() => { btn.innerHTML = 'Sauvegarder'; btn.disabled = false; btn.title=''; }, 2500);
}

function resetConv() {
  document.getElementById('conv-textarea').value = S.convOrigText;
}

/* ════════════════════════════════════════════════════════
   RENDER — MAIN CONTACT
   ════════════════════════════════════════════════════════ */
function renderNoContact() {
  document.getElementById('main-contact').innerHTML = `
    <div class="waiting">
      ${icon('inbox')}
      <div class="msg">Aucun contact identifié dans cette conversation</div>
    </div>`;
  document.getElementById('others-section').style.display = 'none';
}

function renderMainLoading(person) {
  document.getElementById('main-contact').innerHTML = `
    <div class="card">
      <div class="person-header">
        <div class="avatar">${initials(person.name)}</div>
        <div class="person-meta">
          <div class="person-name">${esc(person.name)}</div>
          <div class="person-email">${esc(person.email)}</div>
        </div>
        <span class="badge badge-loading">…</span>
      </div>
      <div class="search-status">
        <div class="spinner"></div><span>Recherche dans Notion…</span>
      </div>
    </div>`;
}

async function renderMain(person, notionData) {
  const container = document.getElementById('main-contact');

  if (notionData?.found) {
    const pageUrl          = notionData.notion_page_url || notionHref(notionData.notion_page_id);
    const origInstructions = notionData.person_instructions || '';

    container.innerHTML = `
      <div class="card">
        <div class="person-header">
          <div class="avatar">${initials(notionData.name || person.name)}</div>
          <div class="person-meta">
            <div class="person-name">${esc(notionData.name || person.name)}</div>
            <div class="person-email">${esc(notionData.email || person.email)}</div>
          </div>
          <a href="${esc(pageUrl)}" target="_blank" class="badge badge-found" title="Ouvrir dans Notion">
            ${icon('check')} Notion
            <svg class="badge-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2 -9.2"/><path d="M7 7h10v10"/></svg>
          </a>
        </div>

        <button class="action-row-btn" id="enrich-toggle" style="margin-top:4px">
          <span class="action-icon">${icon('sparkles')}</span>
          <span class="action-label">Enrichir le contact</span>
          <span class="action-arrow">${icon('chevron')}</span>
        </button>
        <div class="action-panel" id="enrich-panel" hidden>
          <div class="panel-hint">Que cherche-t-on ? (rôle exact, mandats, intérêts publics, contexte sociétaire…)</div>
          <textarea id="enrich-instructions" rows="3" placeholder="Ex : rôle actuel chez ICS Services, board memberships connues, articles ou interviews récents…"></textarea>
          <div class="save-bar">
            <button class="btn btn-ghost" type="button" onclick="document.getElementById('enrich-toggle').click()">Annuler</button>
            <button class="btn btn-primary" id="enrich-submit" type="button">Lancer l'enrichissement</button>
          </div>
        </div>

        <hr class="divider">

        <div class="field-label">${icon('notes')} Instructions personne</div>
        <textarea id="person-instructions" rows="4"
          placeholder="Instructions spécifiques à ${esc(person.name)} (visibles par les agents)…">${esc(origInstructions)}</textarea>
        <div class="save-bar">
          <button class="btn btn-ghost" data-action="reset-person">Annuler</button>
          <button class="btn btn-primary" id="person-save-btn" data-action="save-person">Sauvegarder</button>
        </div>
      </div>`;

    container.querySelector('[data-action="reset-person"]')
      .addEventListener('click', () => resetPersonInstructions(origInstructions));
    container.querySelector('[data-action="save-person"]')
      .addEventListener('click', () => savePersonInstructions(notionData.notion_page_id));

    setupEnrichContact();

  } else {
    container.innerHTML = `
      <div class="card">
        <div class="person-header">
          <div class="avatar">${initials(person.name)}</div>
          <div class="person-meta">
            <div class="person-name">${esc(person.name)}</div>
            <div class="person-email">${esc(person.email)}</div>
          </div>
          <span class="badge badge-missing">${icon('x')} Non trouvé</span>
        </div>
        <div id="fallback-actions" class="action-row">
          <button class="btn btn-primary" data-action="create-notion">
            ${icon('plus')} Créer dans Notion
          </button>
          <a href="https://app.folk.app/contacts" target="_blank" class="btn btn-outline">
            ${icon('external')} Chercher dans Folk
          </a>
        </div>
      </div>`;

    container.querySelector('[data-action="create-notion"]')
      .addEventListener('click', e => doCreateNotion(e, person));
  }
}

function resetPersonInstructions(orig) {
  const ta = document.getElementById('person-instructions');
  if (ta) ta.value = orig;
}

async function savePersonInstructions(pageId) {
  const ta  = document.getElementById('person-instructions');
  const btn = document.getElementById('person-save-btn');
  if (!ta || !btn) return;
  btn.innerHTML = `<div class="spinner"></div> Sauvegarde…`;
  btn.disabled  = true;
  const r = await updatePersonInstructions(pageId, ta.value);
  if (r?.success) {
    btn.innerHTML = `${icon('check')} Sauvegardé`;
    invalidateIndex();
  } else {
    btn.innerHTML = `${icon('alert')} ${esc(r?.error || 'Erreur')}`;
    btn.title     = r?.error || '';
    console.warn('[POF] update_person_instructions failed:', r);
  }
  setTimeout(() => { btn.innerHTML = 'Sauvegarder'; btn.disabled = false; btn.title=''; }, 2500);
}

async function doCreateNotion(ev, person) {
  const btn = ev.currentTarget;
  btn.innerHTML = `<div class="spinner"></div> Création…`;
  btn.disabled  = true;
  const r = await createPersonInNotion(person);
  const actions = document.getElementById('fallback-actions');
  const card = btn.closest('.card');
  const badge = card ? card.querySelector('.badge') : null;

  if (r?.success && actions && badge) {
    const url = r.notion_page_url || notionHref(r.notion_page_id);
    badge.outerHTML = `
      <a href="${esc(url)}" target="_blank" class="badge badge-found" title="Ouvrir dans Notion">
        ${icon('check')} Notion
        <svg class="badge-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2 -9.2"/><path d="M7 7h10v10"/></svg>
      </a>`;
    actions.remove();
    invalidateIndex();
  } else {
    btn.innerHTML = `${icon('alert')} ${esc(r?.error || 'Réessayer')}`;
    btn.title     = r?.error || '';
    btn.disabled  = false;
  }
}

/* ════════════════════════════════════════════════════════
   RENDER — AUTRES PARTICIPANTS
   ════════════════════════════════════════════════════════ */
function renderOthers(others, convToken) {
  const section = document.getElementById('others-section');
  const list    = document.getElementById('others-list');

  if (!others.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  list.innerHTML = others.map((p, i) => `
    <div class="participant" id="p-${i}" data-idx="${i}" title="Cliquer pour afficher ce contact en tête">
      <div class="p-avatar">
        ${initials(p.name)}
        <span class="p-status missing" id="dot-${i}"></span>
      </div>
      <div class="p-info">
        <div class="p-name">${esc(p.name)}</div>
        <div class="p-email">${esc(p.email)}</div>
      </div>
      <span class="p-arrow">${icon('arrow')}</span>
    </div>`).join('');

  // Row click → promote this participant to "Contact principal"
  list.querySelectorAll('.participant').forEach(row => {
    row.addEventListener('click', () => {
      const idx = parseInt(row.dataset.idx, 10);
      promoteParticipant(idx);
    });
  });

  // Async lookup just to show the status dot
  others.forEach(async (p, i) => {
    const data = await lookupParticipantInNotion(p);
    if (convToken !== S.conversationId) return;
    const dot = document.getElementById(`dot-${i}`);
    if (!dot) return;
    if (data?.found) {
      dot.classList.remove('missing');
      dot.classList.add('found');
    }
  });
}

/* ════════════════════════════════════════════════════════
   MISSIVE SDK ENTRY
   ════════════════════════════════════════════════════════ */
function bootMissive() {
  if (!window.Missive) return;

  // Pré-chargement asynchrone de l'index Personnes (fire and forget)
  ensureIndex().catch(e => console.warn('[POF] index preload failed:', e));

  Missive.on('conversation', async function(id, { conversation }) {
    if (id === S.conversationId) return;
    S.conversationId = id;
    S.convPageId     = null;
    S.convOrigText   = '';
    document.getElementById('conv-textarea').value = '';
    document.getElementById('conv-missive-id').textContent = id || '—';

    const participants = extractParticipants(conversation);
    S.participants = participants;
    if (!participants.length) { renderNoContact(); return; }

    S.main   = participants[0];
    S.others = participants.slice(1);

    renderMainLoading(S.main);
    renderOthers(S.others, id);
    loadConvInstructions(id);
    loadTasks(id);

    // Tente d'extraire le subject de la conversation pour le brief podcast
    const msg = conversation?.latest_message || conversation?.messages?.[0];
    S.convSubject = msg?.subject || conversation?.subject || '';

    await ensureIndex();
    if (id !== S.conversationId) return;
    const notionData = await lookupInNotion(S.main);
    if (id !== S.conversationId) return;
    S.mainNotion = notionData;
    renderMain(S.main, notionData);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  bootMissive();
  setupTaskActions();
  setupTaskBacklog();
});

/* ════════════════════════════════════════════════════════
   TOAST
   ════════════════════════════════════════════════════════ */
function toast(msg, kind = 'success') {
  let el = document.getElementById('sb-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sb-toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.className = `toast toast-${kind}`;
  el.innerHTML = `${icon('check')} ${esc(msg)}`;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ════════════════════════════════════════════════════════
   PANEL TOGGLE
   ════════════════════════════════════════════════════════ */
function togglePanel(triggerSel, panelId) {
  const btn   = document.querySelector(triggerSel);
  const panel = document.getElementById(panelId);
  if (!btn || !panel) return;
  btn.addEventListener('click', e => {
    const isOpen = btn.classList.contains('open');
    // Close all sibling panels in same .quick-actions group
    const group = btn.closest('.quick-actions');
    if (group) {
      group.querySelectorAll('.action-row-btn.open').forEach(b => b.classList.remove('open'));
      group.querySelectorAll('.action-panel').forEach(p => p.setAttribute('hidden', ''));
    }
    if (!isOpen) {
      btn.classList.add('open');
      panel.removeAttribute('hidden');
    }
  });
}

/* ════════════════════════════════════════════════════════
   TASK ACTIONS
   ════════════════════════════════════════════════════════ */
function setupTaskActions() {
  // Briefing podcast — appel direct webhook avec contexte
  const briefBtn = document.querySelector('[data-action="brief-podcast"]');
  if (briefBtn) briefBtn.addEventListener('click', async () => {
    if (!S.conversationId) { toast('Aucune conversation', 'error'); return; }
    flashRow(briefBtn);
    const r = await callProxy('brief_podcast', {
      conversation_id: S.conversationId,
      subject: S.convSubject || '',
      main:    S.main,
      others:  S.others,
      person_instructions: S.mainNotion?.person_instructions || '',
      conv_instructions:   S.convOrigText || '',
    });
    toast(r?.success ? 'Briefing podcast envoyé' : (r?.error || 'Erreur'), r?.success ? 'success' : 'error');
  });

  // Estimer l'opportunité — one-shot
  const estBtn = document.querySelector('[data-action="estimate-opp"]');
  if (estBtn) estBtn.addEventListener('click', async () => {
    if (!S.conversationId) { toast('Aucune conversation', 'error'); return; }
    flashRow(estBtn);
    const r = await callProxy('estimate_opportunity', { conversation_id: S.conversationId });
    toast(r?.success ? 'Estimation en cours — résultat en commentaire' : (r?.error || 'Erreur'), r?.success ? 'success' : 'error');
  });

  // Toggle panels
  togglePanel('[data-action="add-to-watch"]', 'watch-panel');
  togglePanel('[data-action="brief-reply"]',  'reply-panel');
  togglePanel('[data-action="sign-nda"]',     'nda-panel');

  // Pré-remplit le formulaire NDA quand on ouvre le panneau (depuis S.main)
  const ndaToggle = document.querySelector('[data-action="sign-nda"]');
  if (ndaToggle) ndaToggle.addEventListener('click', () => {
    setTimeout(prefillNdaForm, 0);
  });

  // Watch chips → écrit dans le champ Briefing veille du contact principal
  document.querySelectorAll('[data-watch]').forEach(chip => {
    chip.addEventListener('click', async () => {
      if (!S.conversationId) { toast('Aucune conversation', 'error'); return; }
      if (!S.mainNotion?.notion_page_id && !S.main?.email) {
        toast('Contact non identifié', 'error');
        return;
      }
      chip.classList.add('selected');
      const cat = chip.dataset.watch;
      const r = await callProxy('add_to_watch', {
        category: cat,
        conversation_id: S.conversationId,
        contact_page_id: S.mainNotion?.notion_page_id,
        contact_email:   S.main?.email,
        contact_name:    S.main?.name,
      });
      if (r?.success) toast(`Ajouté à la veille « ${chip.textContent.trim()} »`);
      else            toast(r?.error || 'Erreur veille', 'error');
      setTimeout(() => chip.classList.remove('selected'), 1200);
    });
  });

  // Brief reply → append à Instruction spécifique de la conversation
  const replyBtn = document.getElementById('reply-submit');
  if (replyBtn) replyBtn.addEventListener('click', async () => {
    const ta = document.getElementById('reply-instructions');
    if (!ta.value.trim()) { ta.focus(); return; }
    replyBtn.disabled = true;
    replyBtn.innerHTML = `<div class="spinner"></div> Envoi…`;
    const r = await callProxy('brief_reply', {
      instructions: ta.value,
      conversation_id: S.conversationId,
    });
    replyBtn.disabled = false;
    replyBtn.innerHTML = 'Lancer';
    if (r?.success) {
      ta.value = '';
      document.querySelector('[data-action="brief-reply"]')?.click();
      toast('Brief enregistré sur la conversation');
    } else {
      toast(r?.error || 'Erreur brief', 'error');
    }
  });

  // NDA submit + validation
  const ndaBtn = document.getElementById('nda-submit');
  if (ndaBtn) ndaBtn.addEventListener('click', async () => {
    const form = document.getElementById('nda-panel'); // l'id réel du <form>
    if (!form) return;
    let valid = true;
    form.querySelectorAll('[required]').forEach(input => {
      if (!input.value.trim()) { input.classList.add('invalid'); valid = false; }
      else input.classList.remove('invalid');
    });
    const err = form.querySelector('.field-error');
    if (!valid) { if (err) err.removeAttribute('hidden'); return; }
    if (err) err.setAttribute('hidden', '');
    ndaBtn.disabled = true;
    ndaBtn.innerHTML = `<div class="spinner"></div> Envoi…`;
    const data = {};
    form.querySelectorAll('input').forEach(i => { data[i.name] = i.value; });
    const r = await callProxy('send_nda', { ...data, conversation_id: S.conversationId });
    ndaBtn.disabled = false;
    ndaBtn.innerHTML = 'Envoyer le NDA';
    if (r?.success) {
      document.querySelector('[data-action="sign-nda"]')?.click();
      toast('NDA envoyé');
    } else {
      toast(r?.error || 'Erreur NDA', 'error');
    }
  });
}

function prefillNdaForm() {
  const form = document.getElementById('nda-panel');
  if (!form || !S.main) return;
  const f = name => form.querySelector(`input[name="${name}"]`);
  if (f('signataire')) f('signataire').value = S.main.name || '';
  if (f('email'))      f('email').value      = S.main.email || '';
  if (f('societe')) {
    // Société = morceau avant le .com du domaine, capitalisé
    const dom = (S.main.email || '').split('@')[1] || '';
    const stub = dom.split('.')[0] || '';
    f('societe').value = stub ? stub.charAt(0).toUpperCase() + stub.slice(1) : '';
  }
  if (f('date')) f('date').value = new Date().toISOString().slice(0, 10);
}

function flashRow(row) {
  row.style.borderColor = 'var(--pof-teal-dark)';
  row.style.background  = '#F1F8F7';
  setTimeout(() => { row.style.borderColor = ''; row.style.background = ''; }, 600);
}

/* ════════════════════════════════════════════════════════
   ENRICH CONTACT (Contact pane)
   ════════════════════════════════════════════════════════ */
function setupEnrichContact() {
  const btn   = document.getElementById('enrich-toggle');
  const panel = document.getElementById('enrich-panel');
  const submit= document.getElementById('enrich-submit');
  if (!btn || !panel) return;

  btn.addEventListener('click', () => {
    const open = btn.classList.toggle('open');
    if (open) panel.removeAttribute('hidden');
    else panel.setAttribute('hidden', '');
  });

  if (submit) submit.addEventListener('click', async () => {
    const ta = document.getElementById('enrich-instructions');
    if (!ta?.value.trim()) { ta?.focus(); return; }
    submit.disabled = true;
    submit.innerHTML = `<div class="spinner"></div> Lancement…`;
    const r = await callProxy('enrich_contact', {
      conversation_id: S.conversationId,
      instructions: ta?.value || '',
      contact_page_id: S.mainNotion?.notion_page_id,
      contact_email:   S.main?.email,
      contact_name:    S.main?.name,
    });
    submit.disabled = false;
    submit.innerHTML = 'Lancer l\'enrichissement';
    if (r?.success) {
      if (ta) ta.value = '';
      btn.click();
      toast('Briefing veille mis à jour');
    } else {
      toast(r?.error || 'Erreur enrichissement', 'error');
    }
  });
}

/* ════════════════════════════════════════════════════════
   TASK BACKLOG
   ════════════════════════════════════════════════════════ */
const TaskState = {
  tasks: [],
  prio:  'P1',
  assignee: 'ai',
};

function setupTaskBacklog() {
  // Segmented controls
  document.querySelectorAll('#task-prio .seg').forEach(seg => {
    seg.addEventListener('click', () => {
      seg.parentElement.querySelectorAll('.seg').forEach(s => s.classList.remove('selected'));
      seg.classList.add('selected');
      TaskState.prio = seg.dataset.val;
    });
  });
  document.querySelectorAll('#task-assignee .seg').forEach(seg => {
    seg.addEventListener('click', () => {
      seg.parentElement.querySelectorAll('.seg').forEach(s => s.classList.remove('selected'));
      seg.classList.add('selected');
      TaskState.assignee = seg.dataset.val;
    });
  });

  // Create button
  const createBtn = document.getElementById('task-create');
  if (createBtn) createBtn.addEventListener('click', createTask);
}

async function loadTasks(convId) {
  const r = await callProxy('list_tasks', { conversation_id: convId });
  TaskState.tasks = Array.isArray(r?.tasks) ? r.tasks : [];
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById('task-list');
  const cnt  = document.getElementById('task-count');
  if (!list || !cnt) return;
  cnt.textContent = TaskState.tasks.length;

  if (!TaskState.tasks.length) {
    list.innerHTML = `
      <div style="padding:14px 4px;color:var(--text-xmuted);font-size:11.5px;text-align:left;">
        Aucune tâche liée — créez-en une ci-dessous.
      </div>`;
    return;
  }

  list.innerHTML = TaskState.tasks.map(t => {
    const dueLabel = formatDeadline(t.deadline);
    const overdue  = isOverdue(t.deadline) && !t.done;
    const assignee = t.assignee === 'human'
      ? `<span class="meta-item">${icon('human')} Humain</span>`
      : `<span class="meta-item">${icon('robot')} IA</span>`;
    return `
      <div class="task-item ${t.done ? 'done' : ''}" data-id="${esc(t.id)}">
        <button class="task-check" data-task-toggle="${esc(t.id)}" aria-label="Cocher">
          ${icon('check')}
        </button>
        <div class="task-info">
          <div class="task-name">${esc(t.name)}</div>
          <div class="task-meta">
            <span class="task-prio ${t.prio.toLowerCase()}">${esc(t.prio)}</span>
            <span class="meta-item ${overdue ? 'overdue' : ''}">
              ${icon('calendar')} ${esc(dueLabel)}
            </span>
            ${assignee}
          </div>
        </div>
        <a href="${esc(t.notion_url || '#')}" target="_blank" class="task-arrow" aria-label="Ouvrir dans Notion" title="Ouvrir dans Notion">
          ${icon('external')}
        </a>
      </div>`;
  }).join('');

  // Wire toggles
  list.querySelectorAll('[data-task-toggle]').forEach(b => {
    b.addEventListener('click', () => toggleTask(b.dataset.taskToggle));
  });
}

async function toggleTask(id) {
  const t = TaskState.tasks.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
  renderTasks();
  await callProxy('toggle_task', { id, done: t.done, conversation_id: S.conversationId });
  toast(t.done ? 'Tâche validée' : 'Tâche réouverte');
}

async function createTask() {
  const btn = document.getElementById('task-create');
  const name = document.getElementById('task-name').value.trim();
  const desc = document.getElementById('task-desc').value.trim();
  const deadline = document.getElementById('task-deadline').value;

  if (!name) { document.getElementById('task-name').focus(); return; }

  btn.disabled = true;
  btn.innerHTML = `<div class="spinner"></div> Création…`;

  const r = await callProxy('create_task', {
    conversation_id: S.conversationId,
    name, description: desc, deadline,
    prio: TaskState.prio,
    assignee: TaskState.assignee,
  });

  btn.disabled = false;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" style="width:13px;height:13px"><path d="M12 5l0 14"/><path d="M5 12l14 0"/></svg> Créer la tâche`;

  if (r?.success) {
    const newTask = r.task || {
      id: 'tmp-' + Date.now(),
      name, prio: TaskState.prio, assignee: TaskState.assignee,
      deadline, done: false, notion_url: r.notion_url || '#',
    };
    TaskState.tasks.unshift(newTask);
    renderTasks();
    toast('Tâche créée dans Notion');
    // Reset form name/desc so user sees it
    document.getElementById('task-name').value = '';
    document.getElementById('task-desc').value = '';
  } else {
    toast('Erreur création tâche', 'error');
  }
}

function formatDeadline(iso) {
  if (!iso) return 'Sans deadline';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0)  return "Aujourd'hui";
  if (diff === 1)  return 'Demain';
  if (diff === -1) return 'Hier';
  if (diff > 1 && diff < 7) return `Dans ${diff} j`;
  if (diff < -1 && diff > -7) return `Il y a ${-diff} j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function isOverdue(iso) {
  if (!iso) return false;
  const d = new Date(iso + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  return d < today;
}
