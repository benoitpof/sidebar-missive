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
  aiNotes:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-9"/><path d="M11 9l5 0"/><path d="M11 13l5 0"/><path d="M11 17l3 0"/><path d="M5 6l1.2 -.4l.4 -1.2l.4 1.2l1.2 .4l-1.2 .4l-.4 1.2l-.4 -1.2z" fill="currentColor"/></svg>`,
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
  star:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/></svg>`,
  starFill:  `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.4"><path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/></svg>`,
  building:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l18 0"/><path d="M9 8l1 0"/><path d="M9 12l1 0"/><path d="M9 16l1 0"/><path d="M14 8l1 0"/><path d="M14 12l1 0"/><path d="M14 16l1 0"/><path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16"/></svg>`,
  tag:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M7.859 6h-2.834a2.025 2.025 0 0 0 -2.025 2.025v2.834c0 .537 .213 1.052 .593 1.432l6.116 6.116a2.025 2.025 0 0 0 2.864 0l2.834 -2.834a2.025 2.025 0 0 0 0 -2.864l-6.116 -6.116a2.025 2.025 0 0 0 -1.432 -.593z"/><path d="M7.5 9.5l0 .01"/></svg>`,
  phone:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2"/></svg>`,
  whatsapp:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.498 14.382c-.301 -.15 -1.767 -.867 -2.04 -.966c-.273 -.101 -.473 -.15 -.673 .15c-.197 .295 -.771 .964 -.944 1.162c-.175 .195 -.348 .21 -.646 .075c-.3 -.15 -1.263 -.465 -2.403 -1.485c-.888 -.795 -1.484 -1.77 -1.66 -2.07c-.174 -.3 -.019 -.465 .13 -.615c.136 -.135 .301 -.345 .451 -.523c.146 -.181 .194 -.301 .297 -.496c.1 -.21 .049 -.375 -.025 -.524c-.075 -.15 -.672 -1.62 -.922 -2.206c-.24 -.584 -.487 -.51 -.672 -.51c-.172 -.015 -.371 -.015 -.571 -.015c-.2 0 -.523 .074 -.797 .359c-.273 .3 -1.045 1.02 -1.045 2.475c0 1.455 1.07 2.865 1.219 3.075c.149 .195 2.105 3.195 5.1 4.485c.714 .3 1.27 .48 1.704 .629c.715 .227 1.365 .195 1.88 .121c.574 -.091 1.767 -.721 2.016 -1.426c.255 -.705 .255 -1.29 .18 -1.425c-.074 -.135 -.27 -.21 -.57 -.345m-5.422 7.403h-.004a9.87 9.87 0 0 1 -5.031 -1.378l-.361 -.214l-3.741 .982l.998 -3.648l-.235 -.374a9.86 9.86 0 0 1 -1.51 -5.26c.001 -5.45 4.436 -9.884 9.888 -9.884c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45 -4.437 9.884 -9.885 9.884m8.413 -18.297a11.815 11.815 0 0 0 -8.413 -3.488c-6.554 0 -11.89 5.335 -11.893 11.893c0 2.096 .547 4.142 1.588 5.945l-1.688 6.165l6.305 -1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89 -5.335 11.893 -11.893a11.821 11.821 0 0 0 -3.48 -8.418z"/></svg>`,
  plusCircle:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M9 12h6"/><path d="M12 9v6"/></svg>`,
  videoCam:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276v-4z"/><path d="M3 6m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z"/></svg>`,
  trash:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/></svg>`,
  wand:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21l15 -15l-3 -3l-15 15l3 3"/><path d="M15 6l3 3"/><path d="M9 3a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2"/><path d="M19 13a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2"/></svg>`,
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
  convSuggested:  false,
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
function normalizeName(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}
function buildIndex(persons) {
  const idx = new Map();        // email -> person
  const nameIdx = new Map();    // normalized name -> person (fallback)
  for (const p of persons) {
    if (p.email) idx.set(p.email.toLowerCase().trim(), p);
    if (p.name)  nameIdx.set(normalizeName(p.name), p);
  }
  idx._byName = nameIdx;
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
  let hit = email ? S.personIndex.get(email) : null;
  // Fallback : matching par nom normalisé
  if (!hit && person.name && S.personIndex._byName) {
    hit = S.personIndex._byName.get(normalizeName(person.name));
  }
  if (!hit) return null;
  return {
    found: true,
    notion_page_id:  hit.page_id,
    notion_page_url: hit.page_url,
    name:            hit.name || person.name,
    email:           hit.email || person.email,
    person_instructions: hit.instructions || '',
    // Champs enrichis (préservés s'ils existent dans le dump)
    vip:        hit.vip || false,
    company:    hit.company || '',
    tags:       hit.tags || [],
    phone:      hit.phone || '',
    phone_source: hit.phone_source || (hit.phone ? 'notion' : 'none'),
    meetings:   hit.meetings || [],
    matched_by: email && S.personIndex.get(email) ? 'email' : 'name',
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

/* Unified "linked to Notion" pill — small grey badge with Notion logo + label.
   Use wherever an object opens its corresponding Notion page so sync state
   reads the same way across the whole sidebar. */
function notionPill(href, { label = 'Notion', title = 'Ouvrir dans Notion' } = {}) {
  const arrow = `<svg class="pill-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2 -9.2"/><path d="M7 7h10v10"/></svg>`;
  return `<a class="notion-pill" href="${esc(href || '#')}" target="_blank" rel="noopener" title="${esc(title)}" aria-label="${esc(title)}">${icon('notion')}<span>${esc(label)}</span>${arrow}</a>`;
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

// Lookup local-first : utilise l'index cache. Fallback proxy si pas trouvé.
async function lookupInNotion(p) {
  await ensureIndex();
  const local = lookupLocal(p);
  if (local) return local;
  // Fallback proxy : tente une recherche serveur (email + nom)
  return callProxy('lookup_person', { email: p.email, name: p.name });
}

// Pour le main contact : lance en parallèle un enrichissement (meetings)
// qui re-render quand prêt. Retourne le local match instant.
async function enrichMainAsync(p) {
  try {
    const r = await callProxy('lookup_person', { email: p.email, name: p.name, with_meetings: true });
    if (!r?.found) return;
    if (S.main !== p) return; // user a changé de conv entre-temps
    S.mainNotion = { ...(S.mainNotion || {}), ...r };
    renderMain(S.main, S.mainNotion);
  } catch (e) { console.warn('[POF] enrichMainAsync failed:', e); }
}

// Lookup pour les participants secondaires : LOCAL UNIQUEMENT.
// Pas de roundtrip serveur pour éviter d'attendre N×5s sur tous les autres.
async function lookupParticipantInNotion(p) {
  await ensureIndex();
  return lookupLocal(p) || { found: false };
}

// Folk silent : cache sessionStorage par email, pas de UI spinner.
const FOLK_CACHE_KEY = 'pof_folk_v1';
const FOLK_TTL_MS = 30 * 60 * 1000;
function getFolkCache() {
  try { return JSON.parse(sessionStorage.getItem(FOLK_CACHE_KEY) || '{}'); } catch { return {}; }
}
function setFolkCache(email, data) {
  const c = getFolkCache();
  c[email] = { ts: Date.now(), data };
  try { sessionStorage.setItem(FOLK_CACHE_KEY, JSON.stringify(c)); } catch {}
}
async function lookupFolkSilent(p) {
  const email = (p.email || '').toLowerCase();
  if (!email) return { found: false };
  const hit = getFolkCache()[email];
  if (hit && Date.now() - hit.ts < FOLK_TTL_MS) return hit.data;
  const r = await callProxy('lookup_folk', { email: p.email, name: p.name });
  setFolkCache(email, r);
  return r;
}
const lookupInFolk                = lookupFolkSilent;
const createPersonInNotion        = p => callProxy('create_person', { email: p.email, name: p.name });
const updatePersonInstructions    = (pageId, text) => callProxy('update_person_instructions', { page_id: pageId, text });

/* ════════════════════════════════════════════════════════
   EXTRACT PARTICIPANTS
   ════════════════════════════════════════════════════════ */
function extractParticipants(conv) {
  if (!conv) return [];
  const seen = new Set();
  const list = [];
  const add = field => {
    const arr = Array.isArray(field) ? field : (field ? [field] : []);
    arr.forEach(p => {
      if (!p) return;
      const email = (p.address || p.email || '').toLowerCase().trim();
      const name  = p.name || p.display_name || email.split('@')[0] || '';
      if (email && !seen.has(email)) { seen.add(email); list.push({ name, email }); }
    });
  };
  // Shape 1 : objet conversation avec latest_message
  const msg = conv.latest_message || (Array.isArray(conv.messages) ? conv.messages[conv.messages.length - 1] : null);
  if (msg) {
    add(msg.from_field);
    add(msg.to_fields);
    add(msg.cc_fields);
    add(msg.bcc_fields);
  }
  // Shape 2 : conversation.users (Missive SDK officiel)
  if (Array.isArray(conv.users)) conv.users.forEach(add);
  // Shape 3 : conversation.contacts
  if (Array.isArray(conv.contacts)) conv.contacts.forEach(add);
  // Shape 4 : conversation.participants
  if (Array.isArray(conv.participants)) conv.participants.forEach(add);
  // Shape 5 : depuis tous les messages
  if (Array.isArray(conv.messages)) {
    conv.messages.forEach(m => {
      add(m.from_field);
      add(m.to_fields);
      add(m.cc_fields);
    });
  }
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
  const suggested    = !!data?.suggested;
  S.convPageId    = data?.notion_page_id || null;
  S.convOrigText  = instructions;
  S.convSuggested = suggested;
  const ta = document.getElementById('conv-textarea');
  ta.value = instructions;
  ta.classList.toggle('is-suggested', suggested && !!instructions);
}

function saveConv() {
  const text = document.getElementById('conv-textarea').value;
  const btn  = document.getElementById('conv-save-btn');

  if (!S.conversationId) {
    btn.innerHTML = `${icon('alert')} Aucune conversation`;
    setTimeout(() => { btn.innerHTML = 'Sauvegarder'; }, 2500);
    return;
  }

  // Feedback immédiat — pas d'attente serveur
  S.convOrigText  = text;
  S.convSuggested = false;
  document.getElementById('conv-textarea').classList.remove('is-suggested');
  btn.innerHTML  = `${icon('check')} Sauvegardé`;
  btn.disabled = true;
  setTimeout(() => { btn.innerHTML = 'Sauvegarder'; btn.disabled = false; }, 2000);

  // Sync en arrière-plan
  callProxy('upsert_conv', {
    missive_conversation_id: S.conversationId,
    text,
    ...(S.convPageId ? { page_id: S.convPageId } : {}),
  }).then(r => {
    if (r?.notion_page_id) S.convPageId = r.notion_page_id;
    if (!r?.success) {
      console.warn('[POF] upsert_conv failed:', r);
      toast(r?.error || 'Échec sauvegarde conv', 'error');
    }
  }).catch(() => toast('Erreur réseau', 'error'));
}

function resetConv() {
  const ta = document.getElementById('conv-textarea');
  ta.value = S.convOrigText;
  ta.classList.toggle('is-suggested', !!S.convSuggested && !!S.convOrigText);
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
    const isVip            = !!notionData.vip;

    container.innerHTML = `
      <div class="card">
        <div class="person-header">
          <div class="avatar">${initials(notionData.name || person.name)}</div>
          <div class="person-meta">
            <div class="person-name">${esc(notionData.name || person.name)}</div>
            <div class="person-email">${esc(notionData.email || person.email)}</div>
          </div>
          <div class="person-header-right">
            <button class="vip-star ${isVip ? 'is-vip' : ''}" id="vip-toggle"
                    title="${isVip ? 'Retirer du statut VIP' : 'Marquer comme VIP'}"
                    aria-pressed="${isVip ? 'true' : 'false'}">
              ${isVip ? icon('starFill') : icon('star')}
            </button>
            <a href="${esc(pageUrl)}" target="_blank" class="badge badge-found" title="Ouvrir dans Notion">
              ${icon('check')} Notion
              <svg class="badge-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2 -9.2"/><path d="M7 7h10v10"/></svg>
            </a>
          </div>
        </div>

        ${renderContactFields(notionData, person)}

        <button class="action-row-btn" id="enrich-toggle" style="margin-top:10px">
          <span class="action-icon">${icon('sparkles')}</span>
          <span class="action-label">Enrichir le contact</span>
          <span class="action-arrow action-arrow-gen" title="Génère des informations">${icon('wand')}</span>
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
    setupVipToggle(notionData.notion_page_id);
    setupContactFieldActions(notionData, person);

  } else {
    // Rendu instantané "Non trouvé" — pas de spinner Folk bloquant.
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

    // En arrière-plan, Folk lookup silencieux. Si trouvé → upgrade UI.
    lookupFolkSilent(person).then(folkData => {
      if (S.main !== person) return; // user a changé de conv
      const badge = document.getElementById('main-badge');
      const actions = document.getElementById('fallback-actions');
      if (!badge || !folkData?.found) return;

      if (folkData.notion_page_id) {
        badge.outerHTML = `
          <a href="${esc(notionHref(folkData.notion_page_id))}" target="_blank" class="badge badge-found" title="Ouvrir dans Notion">
            ${icon('check')} Folk + Notion
            <svg class="badge-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2 -9.2"/><path d="M7 7h10v10"/></svg>
          </a>`;
        if (actions) actions.remove();
      } else {
        badge.className = 'badge badge-folk';
        badge.innerHTML = `${icon('alert')} Folk uniquement`;
        if (actions) {
          actions.innerHTML = `
            <button class="btn btn-primary btn-block" data-action="create-notion">
              ${icon('plus')} Créer la fiche Notion
            </button>`;
          actions.querySelector('[data-action="create-notion"]')
            .addEventListener('click', e => doCreateNotion(e, person));
        }
      }
    });
  }
}

function resetPersonInstructions(orig) {
  const ta = document.getElementById('person-instructions');
  if (ta) ta.value = orig;
}

function savePersonInstructions(pageId) {
  const ta  = document.getElementById('person-instructions');
  const btn = document.getElementById('person-save-btn');
  if (!ta || !btn) return;
  const text = ta.value;
  // Feedback immédiat
  btn.innerHTML = `${icon('check')} Sauvegardé`;
  btn.disabled = true;
  setTimeout(() => { btn.innerHTML = 'Sauvegarder'; btn.disabled = false; }, 2000);
  // Sync background
  updatePersonInstructions(pageId, text).then(r => {
    if (r?.success) {
      invalidateIndex();
    } else {
      console.warn('[POF] update_person_instructions failed:', r);
      toast(r?.error || 'Échec sauvegarde personne', 'error');
    }
  }).catch(() => toast('Erreur réseau', 'error'));
}

async function doCreateNotion(ev, person) {
  const btn = ev.currentTarget;
  btn.innerHTML = `<div class="spinner"></div> Création…`;
  btn.disabled  = true;
  const r = await createPersonInNotion(person);
  const actions = document.getElementById('fallback-actions');
  const badge   = document.getElementById('main-badge');

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
    btn.innerHTML = `${icon('alert')} Réessayer`;
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
      <button class="p-vip ${p.vip ? 'is-vip' : ''}" id="vip-other-${i}"
              data-idx="${i}" title="${p.vip ? 'Retirer du statut VIP' : 'Marquer comme VIP'}"
              aria-pressed="${p.vip ? 'true' : 'false'}">
        ${p.vip ? icon('starFill') : icon('star')}
      </button>
      <span class="p-arrow">${icon('arrow')}</span>
    </div>`).join('');

  // VIP toggle on participant rows — stop propagation so it doesn't also promote
  list.querySelectorAll('.p-vip').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx, 10);
      const part = S.others[idx];
      const nowVip = !btn.classList.contains('is-vip');
      btn.classList.toggle('is-vip', nowVip);
      btn.setAttribute('aria-pressed', nowVip ? 'true' : 'false');
      btn.title = nowVip ? 'Retirer du statut VIP' : 'Marquer comme VIP';
      btn.innerHTML = nowVip ? icon('starFill') : icon('star');
      if (part) part.vip = nowVip;
      toast(nowVip ? `${part?.name || 'Contact'} marqué VIP` : `${part?.name || 'Contact'} retiré des VIP`);
      callProxy('toggle_vip', { email: part?.email, vip: nowVip });
    });
  });

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
    // Propagate VIP status if Notion confirms
    if (data?.vip) {
      p.vip = true;
      const star = document.getElementById(`vip-other-${i}`);
      if (star && !star.classList.contains('is-vip')) {
        star.classList.add('is-vip');
        star.innerHTML = icon('starFill');
        star.title = 'Retirer du statut VIP';
        star.setAttribute('aria-pressed', 'true');
      }
    }
  });
}

/* ════════════════════════════════════════════════════════
   MISSIVE SDK ENTRY
   ════════════════════════════════════════════════════════ */
function bootMissive(attempt = 0) {
  if (!window.Missive) {
    if (attempt < 10) { // retry 10×200ms = 2s
      setTimeout(() => bootMissive(attempt + 1), 200);
      return;
    }
    console.error('[POF] Missive SDK introuvable après 2s.');
    document.getElementById('main-contact').innerHTML = `
      <div class="waiting">
        ${icon('alert')}
        <div class="msg">SDK Missive non chargée. Vérifie ta connexion et recharge Missive.</div>
      </div>`;
    return;
  }
  console.log('[POF] Missive SDK détectée.');

  // Pré-charge l'index Personnes en background
  ensureIndex().catch(e => console.warn('[POF] index preload failed:', e));

  // Mock preview : ancienne API on('conversation', cb)
  if (window.__POF_MOCK) {
    Missive.on('conversation', (id, payload) => handleConversation(id, payload?.conversation));
    return;
  }

  // Prod : API officielle Missive Sidebar SDK
  Missive.on('change:conversations', async (ids) => {
    console.log('[POF] change:conversations:', ids);
    if (!ids || !ids.length) { renderNoContact(); return; }
    const id = ids[0];
    try {
      const convs = await Missive.fetchConversations(ids);
      const conv = Array.isArray(convs) ? convs[0] : convs;
      handleConversation(id, conv);
    } catch (e) {
      console.error('[POF] fetchConversations failed:', e);
      handleConversation(id, null);
    }
  }, { retroactive: true });
}

async function handleConversation(id, conversation) {
  if (id === S.conversationId) return;
  S.conversationId = id;
  S.convPageId     = null;
  S.convOrigText   = '';
  S.convSuggested  = false;
  S.mainNotion     = null;
  TaskState._userExpanded = false;
  const _ta = document.getElementById('conv-textarea');
  _ta.value = '';
  _ta.classList.remove('is-suggested');
  document.getElementById('conv-missive-id').textContent = id || '—';

  const participants = extractParticipants(conversation);
  S.participants = participants;
  if (!participants.length) { renderNoContact(); return; }

  S.main   = participants[0];
  S.others = participants.slice(1);

  // Extrait le subject pour le brief podcast
  const msg = conversation?.latest_message || conversation?.messages?.[conversation.messages.length - 1];
  S.convSubject = msg?.subject || conversation?.subject || '';

  renderMainLoading(S.main);
  renderOthers(S.others, id);
  loadConvInstructions(id);
  loadTasks(id);

  // Pré-remplit le formulaire de tâche (respecte les champs dirty)
  prefillTaskForm();

  await ensureIndex();
  if (id !== S.conversationId) return;
  const notionData = await lookupInNotion(S.main);
  if (id !== S.conversationId) return;
  S.mainNotion = notionData;
  renderMain(S.main, notionData);

  // Si trouvé en prod, enrichit en background (meetings + données fraîches).
  // En mock, le dump_persons contient déjà tout.
  if (notionData?.found && !window.__POF_MOCK) {
    enrichMainAsync(S.main);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  bootMissive();
  setupTaskActions();
  setupTaskBacklog();
  setupDirtyTracking();
  setupConvTextarea();
});

/* Conv textarea focus behavior:
   - If content is AI-suggested → clear on focus (cursor ready to write)
   - If content is from Notion history → place cursor at end on focus  */
function setupConvTextarea() {
  const ta = document.getElementById('conv-textarea');
  if (!ta) return;
  ta.addEventListener('focus', () => {
    if (S.convSuggested && ta.value) {
      ta.value = '';
      ta.classList.remove('is-suggested');
      S.convSuggested = false;
      // S.convOrigText stays empty-equivalent — original was a suggestion,
      // not user-saved content, so cancel should clear too.
      S.convOrigText = '';
      return;
    }
    // Historical content — place cursor at end
    const len = ta.value.length;
    if (len > 0) {
      // Defer so the click's default caret placement doesn't override us
      requestAnimationFrame(() => {
        try { ta.setSelectionRange(len, len); } catch (_) {}
      });
    }
  });
  // If user types into suggested content directly (paste, IME), drop the styling
  ta.addEventListener('input', () => {
    if (ta.classList.contains('is-suggested')) {
      ta.classList.remove('is-suggested');
      S.convSuggested = false;
    }
  });
}

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
   TASK ACTIONS — optimistic everywhere
   ════════════════════════════════════════════════════════ */
function setupTaskActions() {
  // Briefing podcast — one-shot avec contexte enrichi
  const briefBtn = document.querySelector('[data-action="brief-podcast"]');
  if (briefBtn) briefBtn.addEventListener('click', () => {
    if (!S.conversationId) { toast('Aucune conversation', 'error'); return; }
    setActionDone(briefBtn, 'Briefing lancé');
    toast('Briefing podcast envoyé');
    callProxy('brief_podcast', {
      conversation_id: S.conversationId,
      subject: S.convSubject || '',
      main:    S.main,
      others:  S.others,
      person_instructions: S.mainNotion?.person_instructions || '',
      conv_instructions:   S.convOrigText || '',
    }).then(r => {
      if (!r?.success) {
        revertAction(briefBtn);
        toast(r?.error || 'Erreur briefing', 'error');
      }
    }).catch(() => { revertAction(briefBtn); toast('Erreur réseau', 'error'); });
  });

  // Estimer l'opportunité — one-shot
  const estBtn = document.querySelector('[data-action="estimate-opp"]');
  if (estBtn) estBtn.addEventListener('click', () => {
    if (!S.conversationId) { toast('Aucune conversation', 'error'); return; }
    setActionDone(estBtn, 'Estimation lancée');
    toast('Estimation en cours — résultat en commentaire');
    callProxy('estimate_opportunity', { conversation_id: S.conversationId }).then(r => {
      if (!r?.success) {
        revertAction(estBtn);
        toast(r?.error || 'Erreur estimation', 'error');
      }
    }).catch(() => { revertAction(estBtn); toast('Erreur réseau', 'error'); });
  });

  // Toggle panels
  togglePanel('[data-action="add-to-watch"]', 'watch-panel');
  togglePanel('[data-action="brief-reply"]',  'reply-panel');
  togglePanel('[data-action="sign-nda"]',     'nda-panel');

  // Pré-remplit le formulaire NDA quand on ouvre le panneau
  const ndaToggle = document.querySelector('[data-action="sign-nda"]');
  if (ndaToggle) ndaToggle.addEventListener('click', () => {
    setTimeout(prefillNdaForm, 0);
  });

  // Watch chips — écrit dans le briefing veille du contact principal
  document.querySelectorAll('[data-watch]').forEach(chip => {
    chip.addEventListener('click', () => {
      if (!S.conversationId) { toast('Aucune conversation', 'error'); return; }
      chip.classList.add('selected');
      const cat = chip.dataset.watch;
      const label = chip.textContent.trim();
      const row = document.querySelector('[data-action="add-to-watch"]');
      toast(`Ajouté à la veille « ${label} »`);
      setTimeout(() => {
        if (row && row.classList.contains('open')) row.click();
        if (row) setActionDone(row, `Veille : ${label}`);
        chip.classList.remove('selected');
      }, 400);
      callProxy('add_to_watch', {
        category: cat,
        conversation_id: S.conversationId,
        contact_page_id: S.mainNotion?.notion_page_id,
        contact_email:   S.main?.email,
        contact_name:    S.main?.name,
      }).then(r => {
        if (!r?.success) {
          if (row) revertAction(row);
          toast(r?.error || 'Erreur veille', 'error');
        }
      });
    });
  });

  // Brief reply submit — append à l'instruction conv
  const replyBtn = document.getElementById('reply-submit');
  if (replyBtn) replyBtn.addEventListener('click', () => {
    const ta = document.getElementById('reply-instructions');
    if (!ta.value.trim()) { ta.focus(); return; }
    const instructions = ta.value;
    const row = document.querySelector('[data-action="brief-reply"]');
    // UX immédiate : ferme, reset, toast
    ta.value = '';
    if (row) { row.click(); setActionDone(row, 'Réponse briefée'); }
    toast('Brief enregistré sur la conversation');
    callProxy('brief_reply', {
      instructions,
      conversation_id: S.conversationId,
    }).then(r => {
      if (!r?.success) {
        if (row) revertAction(row);
        toast(r?.error || 'Erreur brief', 'error');
      }
    });
  });

  // NDA submit + validation
  const ndaBtn = document.getElementById('nda-submit');
  if (ndaBtn) ndaBtn.addEventListener('click', () => {
    const form = document.getElementById('nda-panel');
    let valid = true;
    form.querySelectorAll('[required]').forEach(input => {
      if (!input.value.trim()) { input.classList.add('invalid'); valid = false; }
      else input.classList.remove('invalid');
    });
    const err = form.querySelector('.field-error');
    if (!valid) { err.removeAttribute('hidden'); return; }
    err.setAttribute('hidden', '');
    const data = {};
    form.querySelectorAll('input').forEach(i => { data[i.name] = i.value; });
    const row = document.querySelector('[data-action="sign-nda"]');
    if (row) { row.click(); setActionDone(row, 'NDA envoyé'); }
    toast('NDA envoyé');
    callProxy('send_nda', { ...data, conversation_id: S.conversationId }).then(r => {
      if (!r?.success) {
        if (row) revertAction(row);
        toast(r?.error || 'Erreur NDA', 'error');
      }
    });
  });
}

function revertAction(row) {
  if (!row) return;
  row.classList.remove('action-done', 'is-loading');
  const arr = row.querySelector('.action-arrow');
  if (arr) arr.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"><path d="M5 12l14 0"/><path d="M13 18l6 -6"/><path d="M13 6l6 6"/></svg>`;
  const lab = row.querySelector('.action-label');
  if (lab && lab.dataset.orig) { lab.textContent = lab.dataset.orig; delete lab.dataset.orig; }
  clearTimeout(row._t);
}

function prefillNdaForm() {
  const form = document.getElementById('nda-panel');
  if (!form || !S.main) return;
  const f = name => form.querySelector(`input[name="${name}"]`);
  if (f('signataire') && !isDirty(f('signataire'))) f('signataire').value = S.main.name || '';
  if (f('email')      && !isDirty(f('email')))      f('email').value      = S.main.email || '';
  if (f('societe')    && !isDirty(f('societe'))) {
    // Société = morceau avant le .com du domaine, capitalisé
    const dom = (S.main.email || '').split('@')[1] || '';
    const stub = dom.split('.')[0] || '';
    f('societe').value = stub ? stub.charAt(0).toUpperCase() + stub.slice(1) : '';
  }
  if (f('date') && !isDirty(f('date'))) f('date').value = new Date().toISOString().slice(0, 10);
}

/* Dirty tracking : marque un champ quand l'utilisateur l'a édité. */
function markDirty(el) { if (el) el.dataset.dirty = '1'; }
function isDirty(el)   { return el && el.dataset.dirty === '1'; }
function clearDirty(el){ if (el) delete el.dataset.dirty; }

function setupDirtyTracking() {
  ['task-name', 'task-desc', 'task-deadline'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => markDirty(el), { once: true });
  });
  document.querySelectorAll('#task-prio .seg, #task-assignee .seg').forEach(seg => {
    seg.addEventListener('click', () => markDirty(seg.parentElement), { once: true });
  });
  // NDA form fields
  document.querySelectorAll('#nda-panel input').forEach(el => {
    el.addEventListener('input', () => markDirty(el), { once: true });
  });
}

/* Pré-remplit le formulaire de tâche depuis le contact courant. */
function prefillTaskForm() {
  const name = document.getElementById('task-name');
  const desc = document.getElementById('task-desc');
  const deadline = document.getElementById('task-deadline');

  if (name && !isDirty(name) && S.main?.name) {
    name.value = `Répondre à ${S.main.name}`;
  }
  if (desc && !isDirty(desc) && S.convSubject) {
    desc.value = `Sujet : ${S.convSubject}`;
  }
  if (deadline && !isDirty(deadline)) {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    deadline.value = d.toISOString().slice(0, 10);
  }
}

function flashRow(row) {
  // Activated visual state — much more legible than a 600ms flash
  row.classList.add('is-loading');
}
function setActionDone(row, label) {
  row.classList.remove('is-loading');
  row.classList.add('action-done');
  // Replace arrow with a check
  const arrow = row.querySelector('.action-arrow');
  if (arrow) {
    arrow.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"><path d="M5 12l5 5l10 -10"/></svg>`;
  }
  if (label) {
    const lab = row.querySelector('.action-label');
    if (lab) {
      const origLabel = lab.dataset.orig || lab.textContent;
      lab.dataset.orig = origLabel;
      lab.textContent = label;
    }
  }
  // Auto-revert after 4s so the user can run it again
  clearTimeout(row._t);
  row._t = setTimeout(() => {
    row.classList.remove('action-done');
    const arr = row.querySelector('.action-arrow');
    if (arr) arr.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"><path d="M5 12l14 0"/><path d="M13 18l6 -6"/><path d="M13 6l6 6"/></svg>`;
    const lab = row.querySelector('.action-label');
    if (lab && lab.dataset.orig) { lab.textContent = lab.dataset.orig; delete lab.dataset.orig; }
  }, 4000);
}

/* ════════════════════════════════════════════════════════
   CONTACT FIELDS (Company, Tags, Phone, Meetings)
   ════════════════════════════════════════════════════════ */
function formatMeetingDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

function phoneToWhatsApp(phone) {
  return 'https://wa.me/' + (phone || '').replace(/[^\d]/g, '');
}

function renderContactFields(notionData, person) {
  const out = [];

  // Company
  if (notionData.company) {
    out.push(`
      <div class="contact-field is-readonly">
        <span class="cf-icon">${icon('building')}</span>
        <div class="cf-body">
          <div class="cf-label">Société</div>
          <div class="cf-value">${esc(notionData.company)}</div>
        </div>
      </div>`);
  }

  // Tags
  if (Array.isArray(notionData.tags) && notionData.tags.length) {
    out.push(`
      <div class="contact-field is-readonly">
        <span class="cf-icon">${icon('tag')}</span>
        <div class="cf-body">
          <div class="cf-label">Tags Notion</div>
          <div class="cf-tags">
            ${notionData.tags.map(t => `<span class="cf-tag">${esc(t)}</span>`).join('')}
          </div>
        </div>
      </div>`);
  }

  // Phone
  const phone       = notionData.phone || '';
  const phoneSource = notionData.phone_source || (phone ? 'notion' : 'none');
  if (phone) {
    const isAi = phoneSource === 'email_signature';
    out.push(`
      <div class="contact-field is-readonly">
        <span class="cf-icon">${icon('phone')}</span>
        <div class="cf-body">
          <div class="cf-label">
            Téléphone
            ${isAi ? `<span class="ai-found-badge" title="Détecté dans la signature du dernier email">${icon('sparkles')} signature email</span>` : ''}
          </div>
          <div class="phone-row">
            <span class="phone-number ${isAi ? 'ai-found' : ''}">${esc(phone)}</span>
            <a class="whatsapp-link" href="${esc(phoneToWhatsApp(phone))}" target="_blank" title="Ouvrir WhatsApp">
              ${icon('whatsapp')}
            </a>
            ${isAi ? `
              <button class="add-to-notion-btn" id="phone-add-notion" title="Ajouter ce numéro à la fiche Notion">
                ${icon('plus')} Ajouter à Notion
              </button>` : ''}
          </div>
        </div>
      </div>`);
  }

  // Meetings (last 5)
  if (Array.isArray(notionData.meetings) && notionData.meetings.length) {
    const meetings = notionData.meetings.slice(0, 5);
    out.push(`
      <div class="contact-field is-readonly">
        <span class="cf-icon">${icon('aiNotes')}</span>
        <div class="cf-body">
          <div class="cf-label">Notes de réunion Notion</div>
          <div class="cf-meetings">
            ${meetings.map(m => `
              <div class="cf-meeting">
                <span class="cf-meeting-title">${esc(m.title)}</span>
                <span class="cf-meeting-date">${esc(formatMeetingDate(m.date))}</span>
                ${notionPill(m.url, { title: 'Ouvrir la note dans Notion' })}
              </div>`).join('')}
          </div>
        </div>
      </div>`);
  }

  if (!out.length) return '';
  return `<div class="contact-fields">${out.join('')}</div>`;
}

function setupVipToggle(pageId) {
  const btn = document.getElementById('vip-toggle');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const wasVip = btn.classList.contains('is-vip');
    const nowVip = !wasVip;
    btn.classList.toggle('is-vip', nowVip);
    btn.setAttribute('aria-pressed', nowVip ? 'true' : 'false');
    btn.title = nowVip ? 'Retirer du statut VIP' : 'Marquer comme VIP';
    btn.innerHTML = nowVip ? icon('starFill') : icon('star');
    btn.classList.remove('just-toggled');
    void btn.offsetWidth;
    btn.classList.add('just-toggled');
    toast(nowVip ? 'Marqué VIP' : 'Retiré des VIP');
    await callProxy('toggle_vip', { page_id: pageId, vip: nowVip });
  });
}

function setupContactFieldActions(notionData, person) {
  const addBtn = document.getElementById('phone-add-notion');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      addBtn.disabled = true;
      addBtn.innerHTML = `<div class="spinner" style="width:11px;height:11px;border-width:1.5px"></div> Ajout…`;
      const r = await callProxy('add_phone_to_notion', {
        page_id: notionData.notion_page_id,
        phone: notionData.phone,
      });
      if (r?.success) {
        // Promote to "notion" source
        const row = addBtn.closest('.contact-field');
        if (row) {
          const num = row.querySelector('.phone-number');
          if (num) num.classList.remove('ai-found');
          const badge = row.querySelector('.ai-found-badge');
          if (badge) badge.remove();
          addBtn.outerHTML = '';
        }
        toast('Numéro ajouté à Notion');
      } else {
        addBtn.disabled = false;
        addBtn.innerHTML = `${icon('alert')} Réessayer`;
      }
    });
  }
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

  if (submit) submit.addEventListener('click', () => {
    const ta = document.getElementById('enrich-instructions');
    if (!ta?.value.trim()) { ta?.focus(); return; }
    const instructions = ta.value;
    // UX immédiate : ferme, reset, toast
    ta.value = '';
    btn.click();
    toast('Briefing veille mis à jour');
    // Sync background avec contexte contact
    callProxy('enrich_contact', {
      conversation_id: S.conversationId,
      instructions,
      contact_page_id: S.mainNotion?.notion_page_id,
      contact_email:   S.main?.email,
      contact_name:    S.main?.name,
    }).then(r => {
      if (!r?.success) toast(r?.error || 'Erreur enrichissement', 'error');
    });
  });
}

/* ════════════════════════════════════════════════════════
   TASK BACKLOG
   ════════════════════════════════════════════════════════ */
const TaskState = {
  tasks: [],
  proposed: [],
  prio:  'P1',
  assignee: 'ai',
  _userExpanded: false,
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

  // Toggle: show all quick actions
  const toggleBtn = document.getElementById('actions-toggle');
  if (toggleBtn) toggleBtn.addEventListener('click', () => {
    const sec = document.getElementById('actions-secondary');
    const isCollapsed = sec.classList.contains('collapsed');
    if (isCollapsed) {
      sec.classList.remove('collapsed');
      toggleBtn.classList.add('expanded');
      toggleBtn.querySelector('.show-more-label').textContent = 'Replier les actions';
      TaskState._userExpanded = true;
    } else {
      sec.classList.add('collapsed');
      toggleBtn.classList.remove('expanded');
      toggleBtn.querySelector('.show-more-label').textContent = '3 actions de plus';
      TaskState._userExpanded = false;
    }
  });

  // Toggle: expand "Créer une tâche personnalisée"
  const newTaskToggle = document.getElementById('new-task-toggle');
  const newTaskForm   = document.getElementById('new-task-form');
  if (newTaskToggle && newTaskForm) {
    newTaskToggle.addEventListener('click', () => {
      const isOpen = newTaskToggle.classList.toggle('open');
      if (isOpen) {
        newTaskForm.removeAttribute('hidden');
        setTimeout(() => document.getElementById('task-name')?.focus(), 80);
      } else {
        newTaskForm.setAttribute('hidden', '');
      }
    });
  }
}

async function loadTasks(convId) {
  const [r, p] = await Promise.all([
    callProxy('list_tasks', { conversation_id: convId }),
    callProxy('list_proposed_tasks', { conversation_id: convId }),
  ]);
  TaskState.tasks    = Array.isArray(r?.tasks) ? r.tasks : [];
  TaskState.proposed = Array.isArray(p?.proposed) ? p.proposed : [];
  renderTasks();
  renderProposed();
  updateActionsCollapse();
}

/* ════════════════════════════════════════════════════════
   PROPOSED TASKS
   ════════════════════════════════════════════════════════ */
function renderProposed() {
  const list = document.getElementById('proposed-list');
  const cnt  = document.getElementById('proposed-count');
  if (!list || !cnt) return;
  const items = TaskState.proposed || [];
  cnt.textContent = items.length;

  if (!items.length) {
    list.innerHTML = `<div class="proposed-empty">Pas de tâche détectée dans la conversation.</div>`;
    return;
  }

  list.innerHTML = items.map(t => {
    const dueLabel = formatDeadline(t.deadline);
    const overdue  = isOverdue(t.deadline);
    const assignee = t.assignee === 'human'
      ? `<span class="meta-item">${icon('human')} Humain</span>`
      : `<span class="meta-item">${icon('robot')} IA</span>`;
    return `
      <div class="proposed-task" data-id="${esc(t.id)}">
        <div class="proposed-head">
          <div class="proposed-title">${esc(t.name)}</div>
          <div class="proposed-actions">
            <button class="proposed-btn" data-pt-expand="${esc(t.id)}" title="Détails">
              ${icon('chevron')}
            </button>
            <button class="proposed-btn dismiss" data-pt-dismiss="${esc(t.id)}" title="Ignorer">
              ${icon('x')}
            </button>
            <button class="proposed-btn accept" data-pt-accept="${esc(t.id)}" title="Créer cette tâche">
              ${icon('check')}
            </button>
          </div>
        </div>
        <div class="proposed-meta">
          <span class="task-prio ${t.prio.toLowerCase()}">${esc(t.prio)}</span>
          <span class="meta-item ${overdue ? 'overdue' : ''}">${icon('calendar')} ${esc(dueLabel)}</span>
          ${assignee}
        </div>
        <div class="proposed-desc">${esc(t.description || '')}</div>
      </div>`;
  }).join('');

  // Wire actions
  list.querySelectorAll('[data-pt-expand]').forEach(b => {
    b.addEventListener('click', () => {
      const card = b.closest('.proposed-task');
      const open = card.classList.toggle('expanded');
      const svg = b.querySelector('svg');
      if (svg) svg.style.transform = open ? 'rotate(90deg)' : '';
    });
  });
  list.querySelectorAll('[data-pt-dismiss]').forEach(b => {
    b.addEventListener('click', () => dismissProposed(b.dataset.ptDismiss));
  });
  list.querySelectorAll('[data-pt-accept]').forEach(b => {
    b.addEventListener('click', () => acceptProposed(b.dataset.ptAccept));
  });
}

function dismissProposed(id) {
  const card = document.querySelector(`.proposed-task[data-id="${CSS.escape(id)}"]`);
  if (!card) return;
  card.classList.add('dismissed');
  setTimeout(() => {
    TaskState.proposed = TaskState.proposed.filter(t => t.id !== id);
    renderProposed();
    updateActionsCollapse();
  }, 280);
}

async function acceptProposed(id) {
  const t = TaskState.proposed.find(x => x.id === id);
  if (!t) return;
  const card = document.querySelector(`.proposed-task[data-id="${CSS.escape(id)}"]`);
  if (card) {
    card.classList.add('accepted');
    const btn = card.querySelector('[data-pt-accept]');
    if (btn) {
      btn.innerHTML = `<div class="spinner" style="width:11px;height:11px;border-width:1.5px"></div>`;
      btn.disabled = true;
    }
  }
  const r = await callProxy('create_task', {
    conversation_id: S.conversationId,
    name: t.name, description: t.description, deadline: t.deadline,
    prio: t.prio, assignee: t.assignee,
  });
  const newTask = r?.task || {
    id: 'acc-' + Date.now(), name: t.name, prio: t.prio,
    assignee: t.assignee, deadline: t.deadline, done: false,
    notion_url: r?.notion_url || '#',
  };
  TaskState.tasks.unshift(newTask);
  toast('Tâche créée dans Notion');
  setTimeout(() => {
    TaskState.proposed = TaskState.proposed.filter(x => x.id !== id);
    renderTasks();
    renderProposed();
    updateActionsCollapse();
  }, 380);
}

/* ════════════════════════════════════════════════════════
   QUICK ACTIONS — collapse when many tasks/proposed
   ════════════════════════════════════════════════════════ */
function updateActionsCollapse() {
  const sec    = document.getElementById('actions-secondary');
  const toggle = document.getElementById('actions-toggle');
  if (!sec || !toggle) return;

  const taskCount     = TaskState.tasks.length + (TaskState.proposed?.length || 0);
  const manyTasks     = taskCount > 1;

  if (TaskState._userExpanded) {
    // User chose to expand — keep open + show "Voir moins"
    sec.classList.remove('collapsed');
    toggle.classList.add('expanded');
    toggle.querySelector('.show-more-label').textContent = 'Replier les actions';
    toggle.removeAttribute('hidden');
    return;
  }

  if (manyTasks) {
    sec.classList.add('collapsed');
    toggle.removeAttribute('hidden');
    toggle.querySelector('.show-more-label').textContent = '3 actions de plus';
    toggle.classList.remove('expanded');
  } else {
    sec.classList.remove('collapsed');
    toggle.setAttribute('hidden', '');
  }
}

function renderTasks() {
  const list = document.getElementById('task-list');
  const cnt  = document.getElementById('task-count');
  if (!list || !cnt) return;
  cnt.textContent = TaskState.tasks.length;

  if (!TaskState.tasks.length) {
    list.innerHTML = `
      <div style="padding:14px 4px;color:var(--text-xmuted);font-size:11.5px;text-align:left;">
        Aucune tâche liée à cette conversation.
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
      <div class="task-item ${t.done ? 'done' : ''} ${t._pending ? 'pending' : ''}" data-id="${esc(t.id)}" ${t._pending ? 'style="opacity:.55"' : ''}>
        <button class="task-check" data-task-toggle="${esc(t.id)}" aria-label="Cocher" ${t._pending ? 'disabled' : ''}>
          ${t._pending ? '<div class="spinner" style="width:11px;height:11px"></div>' : icon('check')}
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
        ${notionPill(t.notion_url)}
      </div>`;
  }).join('');

  // Wire toggles
  list.querySelectorAll('[data-task-toggle]').forEach(b => {
    b.addEventListener('click', () => toggleTask(b.dataset.taskToggle));
  });
}

function toggleTask(id) {
  const t = TaskState.tasks.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
  renderTasks();
  toast(t.done ? 'Tâche validée' : 'Tâche réouverte');
  callProxy('toggle_task', { id, done: t.done, conversation_id: S.conversationId })
    .then(r => {
      if (!r?.success) {
        // Rollback
        t.done = !t.done;
        renderTasks();
        toast(r?.error || 'Échec toggle tâche', 'error');
      }
    })
    .catch(() => { t.done = !t.done; renderTasks(); toast('Erreur réseau', 'error'); });
}

/* Création optimiste :
   1. Confirme immédiatement (toast + tâche en tête avec marker _pending)
   2. Reset le form pour chaîner
   3. Sync en arrière-plan; rollback si échec
*/
function createTask() {
  if (!S.conversationId) { toast('Aucune conversation', 'error'); return; }
  const nameEl = document.getElementById('task-name');
  const descEl = document.getElementById('task-desc');
  const deadlineEl = document.getElementById('task-deadline');
  const name = nameEl.value.trim();
  if (!name) { nameEl.focus(); return; }
  const desc = descEl.value.trim();
  const deadline = deadlineEl.value;
  const prio = TaskState.prio;
  const assignee = TaskState.assignee;

  // 1. Optimistic UI : ajout immédiat
  const tempId = 'pending-' + Date.now();
  const ghost = {
    id: tempId, name, prio, assignee, deadline,
    done: false, notion_url: '#', _pending: true
  };
  TaskState.tasks.unshift(ghost);
  renderTasks();

  // 2. Reset form (garde deadline/prio/assignee comme défauts)
  nameEl.value = ''; clearDirty(nameEl);
  descEl.value = ''; clearDirty(descEl);

  toast('Tâche créée dans Notion');

  // 3. Sync background
  callProxy('create_task', {
    conversation_id: S.conversationId,
    name, description: desc, deadline, prio, assignee,
  }).then(r => {
    const idx = TaskState.tasks.findIndex(t => t.id === tempId);
    if (idx < 0) return;
    if (r?.success && r.task) {
      TaskState.tasks[idx] = { ...r.task, _pending: false };
      renderTasks();
    } else if (!r?.success) {
      TaskState.tasks.splice(idx, 1);
      renderTasks();
      toast(r?.error || 'Erreur création tâche', 'error');
    }
  }).catch(() => {
    const idx = TaskState.tasks.findIndex(t => t.id === tempId);
    if (idx >= 0) { TaskState.tasks.splice(idx, 1); renderTasks(); }
    toast('Erreur réseau', 'error');
  });
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
