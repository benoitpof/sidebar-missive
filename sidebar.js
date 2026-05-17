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
  convPageId:     null,
  convOrigText:   '',
  personIndex:    null,  // Map<email, person> — chargée au boot
  indexLoading:   null,  // Promise<void> en cours de chargement
};

/* ════════════════════════════════════════════════════════
   INDEX PERSONS (cache local sessionStorage, TTL 30 min)
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
  try {
    sessionStorage.setItem(INDEX_CACHE_KEY, JSON.stringify({ ts: Date.now(), persons }));
  } catch {}
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
    name:            hit.name,
    email:           hit.email,
    person_instructions: hit.instructions || ''
  };
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

// Lookup: matching local instantané sur l'index pré-chargé. Fallback proxy si pas d'email.
async function lookupInNotion(p) {
  const local = lookupLocal(p);
  if (local) return local;
  // Pas trouvé dans l'index local : on n'attaque pas la base, on renvoie directement found=false.
  // (l'utilisateur peut créer la fiche via le bouton, ce qui rafraîchira l'index)
  return { found: false };
}
const lookupInFolk                = p => callProxy('lookup_folk',   { email: p.email, name: p.name });
const lookupParticipantInNotion   = p => lookupInNotion(p);
const createPersonInNotion        = p => callProxy('create_person', { email: p.email, name: p.name });
const updatePersonInstructions    = (pageId, text) => callProxy('update_person_instructions', { page_id: pageId, text });
const listConvTasks               = convId => callProxy('list_conv_tasks', { missive_conversation_id: convId });

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
  return list;
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
          <span class="badge badge-found">${icon('check')} Notion</span>
        </div>

        <div class="action-row">
          <a href="${esc(pageUrl)}" target="_blank" class="btn btn-outline btn-block">
            ${icon('external')} Ouvrir dans Notion
          </a>
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

  } else {
    container.innerHTML = `
      <div class="card">
        <div class="person-header">
          <div class="avatar">${initials(person.name)}</div>
          <div class="person-meta">
            <div class="person-name">${esc(person.name)}</div>
            <div class="person-email">${esc(person.email)}</div>
          </div>
          <span class="badge badge-missing" id="main-badge">${icon('x')} Non trouvé</span>
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
    // Invalide le cache local : la valeur a changé en base
    sessionStorage.removeItem(INDEX_CACHE_KEY);
    S.personIndex = null;
    ensureIndex().catch(() => {});
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
  const badge   = document.getElementById('main-badge');

  if (r?.success && actions && badge) {
    badge.className = 'badge badge-found';
    badge.innerHTML = `${icon('check')} Notion`;
    const url = r.notion_page_url || notionHref(r.notion_page_id);
    actions.innerHTML = `
      <a href="${esc(url)}" target="_blank" class="btn btn-outline btn-block">
        ${icon('external')} Fiche créée — ouvrir
      </a>`;
    // Invalide le cache local : nouvelle personne ajoutée
    sessionStorage.removeItem(INDEX_CACHE_KEY);
    S.personIndex = null;
    ensureIndex().catch(() => {});
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
    <div class="participant" id="p-${i}">
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

  others.forEach(async (p, i) => {
    const data = await lookupParticipantInNotion(p);
    if (convToken !== S.conversationId) return;
    const item = document.getElementById(`p-${i}`);
    const dot  = document.getElementById(`dot-${i}`);
    if (!item || !dot) return;

    if (data?.found) {
      dot.classList.remove('missing');
      dot.classList.add('found');
      const url = data.notion_page_url || notionHref(data.notion_page_id);
      item.onclick = () => window.open(url, '_blank');
      item.title   = `Ouvrir ${data.name || p.name} dans Notion`;
    } else {
      item.onclick = () => {
        if (confirm(`${p.name} n'est pas dans Notion.\nOuvrir Folk pour le chercher ?`)) {
          window.open('https://app.folk.app/contacts', '_blank');
        }
      };
    }
  });
}

/* ════════════════════════════════════════════════════════
   TÂCHES NOTION (onglet Tâche)
   ════════════════════════════════════════════════════════ */
async function renderTasksFor(convId) {
  const pane = document.getElementById('pane-task');
  pane.innerHTML = `
    <div class="label">Tâches liées</div>
    <div class="waiting">
      <div class="spinner"></div>
      <div class="msg">Chargement des tâches…</div>
    </div>`;

  const r = await listConvTasks(convId);
  if (convId !== S.conversationId) return; // race guard

  if (r?.error) {
    pane.innerHTML = `
      <div class="label">Tâches liées</div>
      <div class="waiting">${icon('alert')}<div class="msg">Erreur : ${esc(r.error)}</div></div>`;
    return;
  }

  const tasks = r?.tasks || [];
  const convUrl = r?.conv_page_url;
  if (!tasks.length) {
    pane.innerHTML = `
      <div class="label">Tâches liées</div>
      <div class="waiting">
        ${icon('taskBox')}
        <div class="msg">Aucune tâche liée à cette conversation</div>
        ${convUrl ? `<a href="${esc(convUrl)}" target="_blank" class="btn btn-outline" style="margin-top:8px">${icon('external')} Page conversation</a>` : ''}
      </div>`;
    return;
  }

  pane.innerHTML = `
    <div class="label">Tâches liées (${tasks.length})</div>
    <div id="tasks-list"></div>
    ${convUrl ? `<a href="${esc(convUrl)}" target="_blank" class="btn btn-outline btn-block" style="margin-top:10px">${icon('external')} Ouvrir la conversation dans Notion</a>` : ''}`;
  document.getElementById('tasks-list').innerHTML = tasks.map(t => `
    <a href="${esc(t.url)}" target="_blank" class="card" style="display:block; text-decoration:none; color:inherit; margin-bottom:6px">
      <div style="display:flex; align-items:center; gap:10px">
        <div style="flex:1; min-width:0">
          <div class="p-name">${esc(t.title)}</div>
          ${t.status ? `<div class="p-email" style="margin-top:2px">${esc(t.status)}</div>` : ''}
        </div>
        <span class="p-arrow" style="opacity:1">${icon('external')}</span>
      </div>
    </a>`).join('');
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

    const main   = participants[0];
    const others = participants.slice(1);

    renderMainLoading(main);
    renderOthers(others, id);
    loadConvInstructions(id);
    renderTasksFor(id);

    // Attend l'index (instantané si déjà chargé/caché) puis match local
    await ensureIndex();
    if (id !== S.conversationId) return;

    const notionData = await lookupInNotion(main);
    if (id !== S.conversationId) return;
    renderMain(main, notionData);
  });
}

window.addEventListener('DOMContentLoaded', bootMissive);
