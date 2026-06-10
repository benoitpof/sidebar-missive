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
  linkedin:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.881 3.87 6 2.5 6S.02 4.881.02 3.5C.02 2.12 1.13 1 2.5 1s2.48 1.12 2.48 2.5zM5 8H0v16h5V8zm7.982 0H8.014v16H13v-8.4c0-4.66 6-5 6 0V24h5V13.92c0-7.88-8.922-7.593-11.018-3.71V8z"/></svg>`,
  plusCircle:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M9 12h6"/><path d="M12 9v6"/></svg>`,
  videoCam:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276v-4z"/><path d="M3 6m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z"/></svg>`,
  trash:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/></svg>`,
  wand:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21l15 -15l-3 -3l-15 15l3 3"/><path d="M15 6l3 3"/><path d="M9 3a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2"/><path d="M19 13a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2"/></svg>`,
  pin:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v6l-2 4v2h10v-2l-2 -4v-6"/><path d="M12 16l0 5"/><path d="M8 4l8 0"/></svg>`,
  refresh:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/></svg>`,
  mail:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"/><path d="M3 7l9 6l9 -6"/></svg>`,
  arrowUR:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 7l-10 10"/><path d="M8 7h9v9"/></svg>`,
  alertCircle:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
  checks:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M7 12l5 5l10 -10"/><path d="M2 12l5 5m5 -5l5 -5"/></svg>`,
  signature: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17c3.333 -3.333 5 -6 5 -8c0 -3 -1 -3 -2 -3s-2.032 1.085 -2 3c.034 2.048 1.658 3.877 2.5 5c1.5 2 2.5 2.5 3.5 1l2 -3c.667 1.333 1.667 3.333 3 3h3"/><path d="M18 16l3 -1l-2 3"/></svg>`,
  gavel:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M13 10l7.383 7.418c.823 .82 .823 2.148 0 2.967a2.11 2.11 0 0 1 -2.976 0l-7.407 -7.385"/><path d="M6 9l4 4"/><path d="M13 10l-4 -4"/><path d="M3 21h7"/><path d="M6.793 15.793l-3.586 -3.586a1 1 0 0 1 0 -1.414l2.293 -2.293l.5 .5l3 -3l-.5 -.5l2.293 -2.293a1 1 0 0 1 1.414 0l3.586 3.586a1 1 0 0 1 0 1.414l-2.293 2.293l-.5 -.5l-3 3l.5 .5l-2.293 2.293a1 1 0 0 1 -1.414 0z"/></svg>`,
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
  conversation:   null,  // dernier objet conversation Missive (pour extraire le texte du thread)
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
   INDEX PERSONS (cache local localStorage, TTL 6h)
   Persistance entre sessions navigateur — évite le rechargement 30s
   à chaque ouverture de Missive.
   ════════════════════════════════════════════════════════ */
const INDEX_CACHE_KEY = 'pof_persons_v2';
const INDEX_TTL_MS    = 6 * 60 * 60 * 1000;

function _indexStore() { try { return window.localStorage; } catch { return window.sessionStorage; } }

function loadIndexFromCache() {
  try {
    const raw = _indexStore().getItem(INDEX_CACHE_KEY);
    if (!raw) return null;
    const { ts, persons } = JSON.parse(raw);
    if (!ts || Date.now() - ts > INDEX_TTL_MS) return null;
    return persons;
  } catch { return null; }
}
function saveIndexToCache(persons) {
  try { _indexStore().setItem(INDEX_CACHE_KEY, JSON.stringify({ ts: Date.now(), persons })); } catch {}
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
    company_source: hit.company_source || (hit.company ? 'notion' : 'none'),
    title:      hit.title || '',
    title_source:   hit.title_source || (hit.title ? 'notion' : 'none'),
    tags:       hit.tags || [],
    phone:      hit.phone || '',
    phone_source: hit.phone_source || (hit.phone ? 'notion' : 'none'),
    meetings:   hit.meetings || [],
    matched_by: email && S.personIndex.get(email) ? 'email' : 'name',
  };
}
function invalidateIndex() {
  _indexStore().removeItem(INDEX_CACHE_KEY);
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

/* Parse un lien Folk → {folk_id, network_id, group_id, url}.
   Tolère les deux formats : .../groups/{grp}/people/{id} et .../people/{id}.
   Retourne null si pas de segment people/{id}. */
function parseFolkUrl(url) {
  const net  = String(url || '').match(/network\/([0-9a-f-]{36})/i);
  const grp  = String(url || '').match(/groups\/([0-9a-f-]{36})/i);
  const pers = String(url || '').match(/people\/([0-9a-f-]{36})/i);
  if (!pers) return null;
  return { folk_id: pers[1], network_id: net ? net[1] : null, group_id: grp ? grp[1] : null, url: String(url).trim() };
}

/* Unified "linked to Notion" pill — small grey badge with Notion logo + label.
   Use wherever an object opens its corresponding Notion page so sync state
   reads the same way across the whole sidebar. */
function notionPill(href, { label = 'Notion', title = 'Ouvrir dans Notion' } = {}) {
  const arrow = `<svg class="pill-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2 -9.2"/><path d="M7 7h10v10"/></svg>`;
  return `<a class="notion-pill" href="${esc(href || '#')}" target="_blank" rel="noopener" title="${esc(title)}" aria-label="${esc(title)}"><span>${esc(label)}</span>${arrow}</a>`;
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
  if (local) return local;
  // Fallback proxy direct (récupère les champs enrichis : meetings, tags, etc.)
  return callProxy('lookup_person', { email: p.email, name: p.name });
}
const lookupInFolk                = p => callProxy('lookup_folk',   { email: p.email, name: p.name });
const reconcileFolk               = args => callProxy('reconcile_folk', args);
const lookupParticipantInNotion   = p => lookupInNotion(p);
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
  showEmptyShell();
}

/* ════════════════════════════════════════════════════════
   EMPTY SHELL — no conversation selected
   ════════════════════════════════════════════════════════ */
function showEmptyShell() {
  document.body.classList.add('no-conversation');
  const shell = document.getElementById('empty-shell');
  if (shell) shell.removeAttribute('hidden');
  loadLastTriageReport();
}
function hideEmptyShell() {
  document.body.classList.remove('no-conversation');
  const shell = document.getElementById('empty-shell');
  if (shell) shell.setAttribute('hidden', '');
}

async function loadLastTriageReport() {
  const wrap = document.getElementById('es-report-wrap');
  if (!wrap) return;
  const r = await callProxy('last_triage_report', {});
  if (!r || r.found === false) {
    wrap.innerHTML = `
      <div class="label es-report-label">
        <span class="label-with-icon">
          <svg style="width:11px;height:11px;vertical-align:-1px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 7v5l3 3"/></svg>
          Dernier triage
        </span>
      </div>
      <div class="es-report-empty" style="font-size:11.5px;color:var(--text-xmuted);padding:10px 4px;border:1px dashed var(--border);border-radius:var(--r-md);text-align:center">
        Aucun rapport pour l'instant.
      </div>`;
    return;
  }
  const card  = document.getElementById('es-report-card');
  const url   = r.notion_page_url || notionHref(r.notion_page_id);
  if (card) card.setAttribute('href', url);

  const name = document.getElementById('es-report-name');
  if (name) name.textContent = r.title || 'Dernier rapport de triage';

  const date = document.getElementById('es-report-date');
  if (date) date.querySelector('span').textContent = r.run_at_label || formatTriageDate(r.run_at);

  const stats = r.stats || {};
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'es-stat-prio') {
      el.querySelector('span:last-child').textContent = (v ?? 0);
    } else {
      el.textContent = (v ?? 0);
    }
  };
  set('es-stat-tries', stats.triaged);
  set('es-stat-arch',  stats.archived);
  set('es-stat-prio',  stats.priority_1);
}

function formatTriageDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const opts = { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
    return d.toLocaleString('fr-FR', opts).replace(/:/, 'h');
  } catch { return iso; }
}

/* Wire the Lancer le triage CTA */
(function wireTriageCta() {
  const start = () => {
    const btn = document.getElementById('es-triage-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (btn.classList.contains('is-loading') || btn.classList.contains('is-done')) return;
      btn.classList.add('is-loading');
      const titleEl = btn.querySelector('.es-cta-title');
      const subEl   = btn.querySelector('.es-cta-sub');
      const origTitle = titleEl?.textContent;
      const origSub   = subEl?.textContent;
      if (titleEl) titleEl.textContent = 'Triage en cours…';
      if (subEl)   subEl.textContent   = "L'agent analyse l'Inbox principale.";
      try {
        await callProxy('run_triage', {});
        btn.classList.remove('is-loading');
        btn.classList.add('is-done');
        if (titleEl) titleEl.textContent = 'Triage lancé';
        if (subEl)   subEl.textContent   = 'Tu recevras le rapport dans Notion.';
        const arr = btn.querySelector('.es-cta-arrow');
        if (arr) arr.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"><path d="M5 12l5 5l10 -10"/></svg>`;
        toast('Triage automatique lancé');
        setTimeout(() => {
          btn.classList.remove('is-done');
          if (titleEl) titleEl.textContent = origTitle;
          if (subEl)   subEl.textContent   = origSub;
          if (arr) arr.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9"><path d="M5 12l14 0"/><path d="M13 18l6 -6"/><path d="M13 6l6 6"/></svg>`;
        }, 4500);
      } catch (e) {
        btn.classList.remove('is-loading');
        if (titleEl) titleEl.textContent = origTitle;
        if (subEl)   subEl.textContent   = origSub;
        toast('Échec du lancement', 'error');
      }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

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
        <div class="spinner"></div><span id="main-loading-msg">${S.personIndex ? 'Recherche dans Notion…' : 'Première synchro Notion en cours (~30s)…'}</span>
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
    // Rendu "Non trouvé" instantané, sans spinner Folk bloquant
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
        ${folkReconcileBlock()}
      </div>`;
    container.querySelector('[data-action="create-notion"]')
      .addEventListener('click', e => doCreateNotion(e, person));
    setupFolkReconcile(person);

    // Folk silent background : upgrade UI si trouvé
    lookupInFolk(person).then(folkData => {
      if (S.main !== person) return;
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
        const recBlock = document.getElementById('folk-reconcile');
        if (recBlock) recBlock.remove();
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
    }).catch(() => {});
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

/* Bloc repliable "Lien Folk introuvable ?" — réconciliation manuelle.
   Affiché sous les actions dans les états "Non trouvé" et "Folk uniquement". */
function folkReconcileBlock() {
  return `
    <details id="folk-reconcile">
      <summary class="field-label">${icon('external')} Lien Folk introuvable ?</summary>
      <div class="form-field">
        <input type="url" id="folk-reconcile-url" placeholder="Coller le lien Folk du contact…">
        <div class="action-row">
          <button class="btn btn-primary btn-block" data-action="reconcile-folk">
            ${icon('check')} Réconcilier
          </button>
        </div>
        <div class="field-error" id="folk-reconcile-error" hidden></div>
      </div>
    </details>`;
}

function setupFolkReconcile(person) {
  const block = document.getElementById('folk-reconcile');
  if (!block) return;
  block.querySelector('[data-action="reconcile-folk"]')
    .addEventListener('click', e => doReconcileFolk(e, person));
}

async function doReconcileFolk(ev, person) {
  const btn   = ev.currentTarget;
  const input = document.getElementById('folk-reconcile-url');
  const err   = document.getElementById('folk-reconcile-error');
  const showErr = msg => { if (err) { err.innerHTML = `${icon('alert')} ${esc(msg)}`; err.hidden = false; } };
  if (err) err.hidden = true;

  const parsed = parseFolkUrl(input ? input.value : '');
  if (!parsed) {
    if (input) input.classList.add('invalid');
    showErr('Lien Folk invalide (segment people/{id} introuvable).');
    return;
  }
  if (input) input.classList.remove('invalid');

  btn.innerHTML = `<div class="spinner"></div> Réconciliation…`;
  btn.disabled  = true;

  const r = await reconcileFolk({
    email:      person.email,
    name:       person.name,
    folk_id:    parsed.folk_id,
    folk_url:   parsed.url,
    network_id: parsed.network_id,
    group_id:   parsed.group_id,
  });

  if (r?.ok) {
    const badge = document.getElementById('main-badge');
    const actions = document.getElementById('fallback-actions');
    if (badge) {
      badge.outerHTML = `
        <a href="${esc(notionHref(r.notion_page_id))}" target="_blank" class="badge badge-found" title="Ouvrir dans Notion">
          ${icon('check')} Folk + Notion
          <svg class="badge-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2 -9.2"/><path d="M7 7h10v10"/></svg>
        </a>`;
    }
    if (actions) actions.remove();
    const block = document.getElementById('folk-reconcile');
    if (block) block.remove();
    invalidateIndex();
  } else {
    btn.innerHTML = `${icon('check')} Réconcilier`;
    btn.disabled  = false;
    showErr(r?.error || 'Échec de la réconciliation.');
  }
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
  S.conversation   = conversation || null;
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

  hideEmptyShell();
  S.main   = participants[0];
  S.others = participants.slice(1);

  // Extrait le subject pour le brief podcast
  const msg = conversation?.latest_message || conversation?.messages?.[conversation.messages.length - 1];
  S.convSubject = msg?.subject || conversation?.subject || '';

  renderMainLoading(S.main);
  renderOthers(S.others, id);
  loadConvInstructions(id);
  loadTasks(id);
  loadTimeline(id);
  loadContent(id);

  // Pré-remplit le formulaire de tâche (respecte les champs dirty)
  prefillTaskForm();

  await ensureIndex();
  if (id !== S.conversationId) return;
  const notionData = await lookupInNotion(S.main);
  if (id !== S.conversationId) return;
  S.mainNotion = notionData;
  renderMain(S.main, notionData);
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
/* Build the form HTML for each footer-sheet action. */
const SHEET_TEMPLATES = {
  reply: {
    title: 'Briefer une réponse',
    iconName: 'edit',
    html: `
      <div class="panel-hint">Instructions pour rédiger la réponse :</div>
      <textarea id="sheet-reply-instructions" rows="5" placeholder="Ex : remercier, demander l'accord pour un appel cette semaine, ne pas s'engager sur le ticket avant validation…"></textarea>
      <div class="save-bar">
        <button class="btn btn-ghost" type="button" data-sheet-close>Annuler</button>
        <button class="btn btn-primary" id="sheet-reply-submit" type="button">Lancer</button>
      </div>`,
  },
  nda: {
    title: 'Signer un NDA',
    iconName: 'fileShield',
    html: `
      <div class="panel-hint">Vérifier les champs pré-remplis avant envoi :</div>
      <form id="sheet-nda-form">
        <div class="form-field">
          <label class="form-field-label">Signataire <span class="required-dot"></span></label>
          <input name="signataire" type="text" required>
        </div>
        <div class="form-field">
          <label class="form-field-label">Email <span class="required-dot"></span></label>
          <input name="email" type="email" required>
        </div>
        <div class="form-field">
          <label class="form-field-label">Société <span class="required-dot"></span></label>
          <input name="societe" type="text" required>
        </div>
        <div class="form-field">
          <label class="form-field-label">Date d'effet <span class="required-dot"></span></label>
          <input name="date" type="date" required>
        </div>
        <div class="field-error" hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/><path d="M12 16h.01"/></svg>
          Veuillez remplir tous les champs obligatoires.
        </div>
        <div class="save-bar">
          <button class="btn btn-ghost" type="button" data-sheet-close>Annuler</button>
          <button class="btn btn-primary" id="sheet-nda-submit" type="button">Envoyer le NDA</button>
        </div>
      </form>`,
  },
  feedback: {
    title: 'Feedback à l\'agent',
    iconName: 'message',
    html: `
      <div class="panel-hint">Donne ton retour à l'agent : suggestion ratée, règle de tri à ajuster, comportement à corriger…</div>
      <textarea id="sheet-feedback-text" rows="5" placeholder="Ex : ce mail aurait dû être archivé automatiquement. Ou : la synthèse a raté le point clé sur la valorisation. Ou : Marc passe en VIP dès qu'il parle term-sheet…"></textarea>
      <div class="save-bar">
        <button class="btn btn-ghost" type="button" data-sheet-close>Annuler</button>
        <button class="btn btn-primary" id="sheet-feedback-submit" type="button">Envoyer</button>
      </div>`,
  },
  signature: {
    title: 'Signature & documents juridiques',
    iconName: 'signature',
    // Two-column layout: left = action choices, right = attachments aside.
    // Each action processes the selected attachments via the proxy.
    html: `
      <div class="panel-hint">Choisis une action — elle s'appliquera aux pièces jointes sélectionnées à droite.</div>
      <div class="sig-grid">
        <div class="sig-actions">
          <button class="sig-action" type="button" data-sig-action="legal_analysis">
            <span class="sig-action-icon">${icon('gavel')}</span>
            <span class="sig-action-body">
              <span class="sig-action-title">Analyse juridique</span>
              <span class="sig-action-sub">Lecture des documents et propositions — points sensibles, clauses, risques.</span>
            </span>
            <span class="sig-action-arrow">${icon('arrow')}</span>
          </button>
          <button class="sig-action" type="button" data-sig-action="sign_documents">
            <span class="sig-action-icon">${icon('signature')}</span>
            <span class="sig-action-body">
              <span class="sig-action-title">Signature des documents</span>
              <span class="sig-action-sub">Envoi à DocuSign avec les signataires identifiés.</span>
            </span>
            <span class="sig-action-arrow">${icon('arrow')}</span>
          </button>
          <button class="sig-action" type="button" data-sig-action="generate_nda">
            <span class="sig-action-icon">${icon('fileShield')}</span>
            <span class="sig-action-body">
              <span class="sig-action-title">Générer un NDA</span>
              <span class="sig-action-sub">Création d'un NDA standard côté POF, injecté dans la conversation.</span>
            </span>
            <span class="sig-action-arrow">${icon('arrow')}</span>
          </button>
        </div>
        <aside class="sig-aside">
          <div class="sig-aside-label">Documents concernés</div>
          <div class="sig-attachment-list" id="sig-attachment-list"></div>
        </aside>
      </div>`,
  },
};

function openSheet(kind) {
  const tpl = SHEET_TEMPLATES[kind];
  if (!tpl) return;
  const sheet  = document.getElementById('footer-sheet');
  const title  = document.getElementById('sheet-title');
  const iconEl = document.getElementById('sheet-icon');
  const body   = document.getElementById('sheet-content');
  if (!sheet || !body) return;
  title.textContent = tpl.title;
  iconEl.innerHTML  = icon(tpl.iconName);
  body.innerHTML    = tpl.html;
  sheet.removeAttribute('hidden');
  sheet.dataset.kind = kind;

  // Wire close handlers (backdrop, X button, cancel buttons)
  sheet.querySelectorAll('[data-sheet-close]').forEach(el => {
    el.addEventListener('click', closeSheet);
  });

  if (kind === 'ask')       wireAskSheet();
  if (kind === 'reply')     wireReplySheet();
  if (kind === 'nda')       { prefillSheetNda(); wireNdaSheet(); }
  if (kind === 'feedback')  wireFeedbackSheet();
  if (kind === 'signature') wireSignatureSheet();
  // Mark the trigger button active
  document.querySelectorAll('.footer-action').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('fa-' + kind);
  if (btn) btn.classList.add('active');
  // Esc to close
  setTimeout(() => sheet.querySelector('input, textarea')?.focus(), 60);
}

function closeSheet() {
  const sheet = document.getElementById('footer-sheet');
  if (!sheet) return;
  sheet.setAttribute('hidden', '');
  document.querySelectorAll('.footer-action').forEach(b => b.classList.remove('active'));
}

function wireAskSheet() {
  const submit = document.getElementById('sheet-ask-submit');
  const mic    = document.getElementById('sheet-ask-mic');
  if (mic) mic.addEventListener('click', () => {
    mic.classList.add('listening');
    toast('Démo : dictée vocale activée');
    setTimeout(() => {
      mic.classList.remove('listening');
      const ta = document.getElementById('sheet-ask-prompt');
      if (ta && !ta.value) {
        ta.value = "Vérifie si Marc a déjà signé un term-sheet ailleurs et adapte les tâches suggérées.";
      }
    }, 1500);
  });
  if (!submit) return;
  submit.addEventListener('click', () => {
    const ta = document.getElementById('sheet-ask-prompt');
    if (!ta?.value.trim()) { ta?.focus(); return; }
    const prompt = ta.value;
    closeSheet();
    toast('Agent en cours d\'exécution — la synthèse sera mise à jour');
    callProxy('ask_agent', {
      prompt,
      conversation_id: S.conversationId,
      main: S.main,
      situation: TimelineState.situation,
    }).then(r => {
      if (r?.situation) {
        TimelineState.situation = r.situation;
        renderSituationNote();
      }
      if (Array.isArray(r?.proposed)) {
        TaskState.proposed = r.proposed;
        renderProposed();
        renderSituationNote();
      }
    }).catch(() => toast('Erreur agent', 'error'));
  });
}

function wireReplySheet() {
  const submit = document.getElementById('sheet-reply-submit');
  if (!submit) return;
  submit.addEventListener('click', () => {
    const ta = document.getElementById('sheet-reply-instructions');
    if (!ta?.value.trim()) { ta?.focus(); return; }
    const instructions = ta.value;
    const btn = document.getElementById('fa-reply');
    closeSheet();
    if (btn) markFooterDone(btn);
    toast('Brief enregistré sur la conversation');
    callProxy('brief_reply', { instructions, conversation_id: S.conversationId }).then(r => {
      if (!r?.success) toast(r?.error || 'Erreur brief', 'error');
    });
  });
}

function wireFeedbackSheet() {
  const submit = document.getElementById('sheet-feedback-submit');
  if (!submit) return;
  submit.addEventListener('click', () => {
    const ta = document.getElementById('sheet-feedback-text');
    if (!ta?.value.trim()) { ta?.focus(); return; }
    const text = ta.value;
    const btn = document.getElementById('fa-feedback');
    closeSheet();
    if (btn) markFooterDone(btn);
    toast('Feedback envoyé à l\'agent');
    callProxy('submit_agent_feedback', {
      text,
      conversation_id: S.conversationId,
      situation: TimelineState.situation,
    }).then(r => {
      if (r && r.success === false) toast(r.error || 'Erreur feedback', 'error');
    });
  });
}

function wireSignatureSheet() {
  // Populate the attachment picker with the conversation's attachments.
  const list = document.getElementById('sig-attachment-list');
  if (list) {
    const items = ContentState.attachments || [];
    if (!items.length) {
      list.innerHTML = `<div class="sig-empty">Aucune pièce jointe dans la conversation.</div>`;
    } else {
      list.innerHTML = items.map((a, i) => {
        const badge = fileTypeBadge(a.type);
        // Default: first attachment checked, others unchecked. The user adjusts as needed.
        const checked = i === 0 ? 'checked' : '';
        return `
          <label class="sig-att" data-att-id="${esc(a.id)}">
            <input type="checkbox" data-sig-att="${esc(a.id)}" ${checked}>
            <span class="sig-att-icon" data-type="${badge.type}">${badge.label}</span>
            <span class="sig-att-meta">
              <span class="sig-att-name">${esc(a.name)}</span>
              <span class="sig-att-size">${esc(a.size || '')}</span>
            </span>
          </label>`;
      }).join('');
    }
  }
  // Wire each action button
  document.querySelectorAll('[data-sig-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.sigAction;
      const selected = [...document.querySelectorAll('[data-sig-att]:checked')].map(cb => cb.dataset.sigAtt);
      const fakeBtn = document.getElementById('fa-signature');
      // Labels for toast confirmation
      const labels = {
        legal_analysis: "Analyse juridique lancée",
        sign_documents: "Documents envoyés en signature",
        generate_nda:   "NDA généré dans la conversation",
      };
      closeSheet();
      if (fakeBtn) markFooterDone(fakeBtn);
      toast(labels[action] || 'Action lancée');
      callProxy('signature_action', {
        action,
        attachment_ids: selected,
        conversation_id: S.conversationId,
        main: S.main,
      }).then(r => {
        if (r && r.success === false) toast(r.error || 'Erreur signature', 'error');
      }).catch(() => toast('Erreur réseau', 'error'));
    });
  });
}

function prefillSheetNda() {
  const f = name => document.querySelector(`#sheet-nda-form input[name="${name}"]`);
  if (f('signataire')) f('signataire').value = S.main?.name || '';
  if (f('email'))      f('email').value      = S.main?.email || '';
  if (f('societe')) {
    const dom = (S.main?.email || '').split('@')[1] || '';
    const stub = dom.split('.')[0] || '';
    f('societe').value = stub ? stub.charAt(0).toUpperCase() + stub.slice(1) : '';
  }
  if (f('date')) f('date').value = new Date().toISOString().slice(0, 10);
}

function wireNdaSheet() {
  const submit = document.getElementById('sheet-nda-submit');
  if (!submit) return;
  submit.addEventListener('click', () => {
    const form = document.getElementById('sheet-nda-form');
    let valid = true;
    form.querySelectorAll('[required]').forEach(i => {
      if (!i.value.trim()) { i.classList.add('invalid'); valid = false; }
      else i.classList.remove('invalid');
    });
    const err = form.querySelector('.field-error');
    if (!valid) { err.removeAttribute('hidden'); return; }
    err.setAttribute('hidden', '');
    const data = {};
    form.querySelectorAll('input').forEach(i => { data[i.name] = i.value; });
    const btn = document.getElementById('fa-nda');
    closeSheet();
    if (btn) markFooterDone(btn);
    toast('NDA envoyé');
    callProxy('send_nda', { ...data, conversation_id: S.conversationId }).then(r => {
      if (!r?.success) toast(r?.error || 'Erreur NDA', 'error');
    });
  });
}

function markFooterDone(btn) {
  btn.classList.add('done');
  clearTimeout(btn._t);
  btn._t = setTimeout(() => btn.classList.remove('done'), 4000);
}

function setupTaskActions() {
  // One-shot actions
  const podcastBtn = document.getElementById('fa-podcast');
  if (podcastBtn) podcastBtn.addEventListener('click', () => {
    if (!S.conversationId) { toast('Aucune conversation', 'error'); return; }
    // Même comportement que le gros bouton : synthèse de ce qui est coché (tout par défaut).
    markFooterDone(podcastBtn);
    toast('Briefing podcast envoyé');
    launchPodcastBrief().then(r => {
      if (!r?.success) { podcastBtn.classList.remove('done'); toast(r?.error || 'Erreur briefing', 'error'); }
    }).catch(() => { podcastBtn.classList.remove('done'); toast('Erreur réseau', 'error'); });
  });

  const estBtn = document.getElementById('fa-estimate');
  if (estBtn) estBtn.addEventListener('click', () => {
    if (!S.conversationId) { toast('Aucune conversation', 'error'); return; }
    markFooterDone(estBtn);
    toast('Estimation en cours — résultat en commentaire');
    callProxy('estimate_opportunity', { conversation_id: S.conversationId }).then(r => {
      if (!r?.success) { estBtn.classList.remove('done'); toast(r?.error || 'Erreur estimation', 'error'); }
    }).catch(() => { estBtn.classList.remove('done'); toast('Erreur réseau', 'error'); });
  });

  // Sheet actions
  const replyBtn = document.getElementById('fa-reply');
  if (replyBtn) replyBtn.addEventListener('click', () => {
    if (!S.conversationId) { toast('Aucune conversation', 'error'); return; }
    openSheet('reply');
  });
  const ndaBtn = document.getElementById('fa-nda');
  if (ndaBtn) ndaBtn.addEventListener('click', () => {
    if (!S.conversationId) { toast('Aucune conversation', 'error'); return; }
    openSheet('nda');
  });
  const feedbackBtn = document.getElementById('fa-feedback');
  if (feedbackBtn) feedbackBtn.addEventListener('click', () => {
    openSheet('feedback');
  });
  const signatureBtn = document.getElementById('fa-signature');
  if (signatureBtn) signatureBtn.addEventListener('click', () => {
    openSheet('signature');
  });

  // Global esc to close sheet
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const sheet = document.getElementById('footer-sheet');
      if (sheet && !sheet.hasAttribute('hidden')) closeSheet();
    }
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

  // Job title (role / position)
  const title       = notionData.title || '';
  const titleSource = notionData.title_source || (title ? 'notion' : 'none');
  if (title) {
    const isAi = titleSource === 'email_signature';
    out.push(`
      <div class="contact-field is-readonly">
        <span class="cf-icon">${icon('clipboard')}</span>
        <div class="cf-body">
          <div class="cf-label">
            Titre / Rôle
            ${isAi ? `<span class="ai-found-badge" title="Détecté dans la signature du dernier email">${icon('sparkles')} signature email</span>` : ''}
          </div>
          <div class="phone-row">
            <span class="cf-text-value ${isAi ? 'ai-found' : ''}">${esc(title)}</span>
            ${isAi ? `
              <button class="add-to-notion-btn" data-add-notion="title" data-value="${esc(title)}" title="Ajouter ce titre à la fiche Notion">
                ${icon('plus')} Ajouter à Notion
              </button>` : ''}
          </div>
        </div>
      </div>`);
  }

  // Company
  if (notionData.company) {
    const compSource = notionData.company_source || 'notion';
    const isAi = compSource === 'email_signature';
    out.push(`
      <div class="contact-field is-readonly">
        <span class="cf-icon">${icon('building')}</span>
        <div class="cf-body">
          <div class="cf-label">
            Société
            ${isAi ? `<span class="ai-found-badge" title="Détecté dans la signature du dernier email">${icon('sparkles')} signature email</span>` : ''}
          </div>
          <div class="phone-row">
            <span class="cf-text-value ${isAi ? 'ai-found' : ''}">${esc(notionData.company)}</span>
            ${isAi ? `
              <button class="add-to-notion-btn" data-add-notion="company" data-value="${esc(notionData.company)}" title="Ajouter cette société à la fiche Notion">
                ${icon('plus')} Ajouter à Notion
              </button>` : ''}
          </div>
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
  // Phone "Add to Notion" button
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

  // Generic field add-to-Notion (title, company)
  document.querySelectorAll('[data-add-notion]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const field = btn.dataset.addNotion;
      const value = btn.dataset.value;
      btn.disabled = true;
      btn.innerHTML = `<div class="spinner" style="width:11px;height:11px;border-width:1.5px"></div> Ajout…`;
      const r = await callProxy('add_field_to_notion', {
        page_id: notionData.notion_page_id,
        field, value,
      });
      if (r?.success) {
        const row = btn.closest('.contact-field');
        if (row) {
          const val = row.querySelector('.cf-text-value');
          if (val) val.classList.remove('ai-found');
          const badge = row.querySelector('.ai-found-badge');
          if (badge) badge.remove();
          btn.outerHTML = '';
        }
        toast(`${field === 'title' ? 'Titre' : 'Société'} ajouté à Notion`);
      } else {
        btn.disabled = false;
        btn.innerHTML = `${icon('alert')} Réessayer`;
      }
    });
  });
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
  if (typeof refreshSituationTodos === 'function') refreshSituationTodos();
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
    if (typeof refreshSituationTodos === 'function') refreshSituationTodos();
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
    if (typeof refreshSituationTodos === 'function') refreshSituationTodos();
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
  if (typeof refreshSituationTodos === 'function') refreshSituationTodos();
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
  if (typeof refreshSituationTodos === 'function') refreshSituationTodos();

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


/* ════════════════════════════════════════════════════════
   TIMELINE PANE
   ════════════════════════════════════════════════════════ */
const TimelineState = { situation: null, upcoming: [], interactions: [] };

const TL_TYPE_META = {
  email:    { icon: 'mail',      label: 'Email' },
  whatsapp: { icon: 'whatsapp',  label: 'WhatsApp' },
  linkedin: { icon: 'linkedin',  label: 'LinkedIn' },
  visio:    { icon: 'videoCam',  label: 'Note de réunion' },
  meeting:  { icon: 'videoCam',  label: 'Réunion' },
  task:     { icon: 'taskBox',   label: 'À faire' },
  nda:      { icon: 'signature', label: 'NDA signé' },
  note:     { icon: 'notes',     label: 'Note Notion' },
  mou:      { icon: 'clipboard', label: 'MOU' },
  contrat:  { icon: 'signature', label: 'Contrat' },
};
// "is-note" styling for types that come from Notion notes (visio + note)
const TL_NOTE_TYPES = new Set(['visio', 'note']);

const TL_UPCOMING_TYPE_ICON = {
  meeting: 'videoCam',
  task:    'taskBox',
};

async function loadTimeline(convId) {
  const r = await callProxy('list_timeline', { conversation_id: convId });
  if (convId !== S.conversationId) return;
  TimelineState.situation    = r?.situation || null;
  TimelineState.upcoming     = Array.isArray(r?.upcoming) ? r.upcoming : [];
  TimelineState.interactions = Array.isArray(r?.interactions) ? r.interactions : [];
  TimelineState.interactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  renderSituationNote();
  renderTimeline();
}

/* Public hook : when tasks/proposed change in the Task tab, re-render the
   "À faire" section so both tabs stay in sync. */
function refreshSituationTodos() {
  if (TimelineState.situation) renderSituationNote();
}

/* ── Situation note ────────────────────────────────────── */
function renderSituationNote() {
  const root = document.getElementById('situation-note');
  if (!root) return;
  const s = TimelineState.situation;
  if (!s) {
    root.innerHTML = `
      <div class="waiting" style="padding:20px 8px">
        ${icon('inbox')}
        <div class="msg">Pas de synthèse disponible pour cette conversation</div>
      </div>`;
    return;
  }
  const stamp = formatRelStamp(s.updated);

  // À FAIRE = tasks planifiées (non done) + proposées
  const planned  = (TaskState.tasks || []).filter(t => !t.done);
  const proposed = TaskState.proposed || [];
  const todosHtml = renderTodosList(planned, proposed);

  // Risques (data carries icon names, NOT emoji)
  const risks = (s.risks || []).map(r => `
    <div class="pn-risk" data-sev="${esc(r.severity || 'high')}">
      <span class="pn-risk-icon">${icon(r.icon || 'alertCircle')}</span>
      <span class="pn-risk-text">${esc(r.text)}</span>
    </div>`).join('');

  // Status : structured bullets or legacy prose
  const statusHtml = renderStatusBody(s);

  root.innerHTML = `
    <div class="pn-head">
      <span class="pn-head-icon">${icon('pin')}</span>
      <span class="pn-head-title">Executive summary</span>
      <span class="pn-head-stamp" title="${esc(s.updated || '')}">Maj ${esc(stamp)}</span>
      <button class="pn-regen" id="pn-regen" title="Régénérer la synthèse">${icon('refresh')}</button>
    </div>
    ${statusHtml}
    <div class="pn-section actions">
      <div class="pn-section-title"><span class="pn-section-icon">${icon('checks')}</span><span>À faire</span></div>
      <div class="pn-list">${todosHtml}</div>
    </div>
    ${risks ? `
      <div class="pn-section risks">
        <div class="pn-section-title"><span class="pn-section-icon">${icon('alertCircle')}</span><span>Points de vigilance</span></div>
        <div class="pn-list">${risks}</div>
      </div>` : ''}
  `;

  wireSituationActions();
  wirePnStatusEditable();
}

/* Render situation status as either structured bullets or a fallback paragraph. */
function renderStatusBody(s) {
  // Editable rich-text block. Combines headline + bullets into a single
  // contenteditable surface. Keyboard-only formatting:
  //   Cmd/Ctrl + B → bold     · Cmd/Ctrl + I → italic
  //   Cmd/Ctrl + L → bullet list toggle
  //   Enter inside a <li> creates a new bullet; empty <li> on Enter exits the list
  // Saves on blur (debounced).
  let inner = '';
  if (s.headline) inner += `<p class="pn-status-headline"><strong>${esc(s.headline)}</strong></p>`;
  if (Array.isArray(s.bullets) && s.bullets.length) {
    inner += '<ul class="pn-status-bullets">' + s.bullets.map(b => `
      <li>${b.label ? `<strong>${esc(b.label)} :</strong> ` : ''}${esc(b.value || '')}</li>`).join('') + '</ul>';
  }
  if (!inner && s.status) inner = `<p>${esc(s.status)}</p>`;
  return `<div class="pn-status" id="pn-status-editable" contenteditable="true" spellcheck="false"
    data-placeholder="Aucune synthèse — clique pour en saisir une.">${inner}</div>`;
}

/* Wire up keyboard shortcuts + autosave on the editable executive summary. */
function wirePnStatusEditable() {
  const el = document.getElementById('pn-status-editable');
  if (!el || el.dataset.wired) return;
  el.dataset.wired = '1';

  const exec = (cmd, val) => {
    try { document.execCommand(cmd, false, val || null); } catch (_) {}
  };

  el.addEventListener('keydown', e => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); exec('bold'); return; }
    if (mod && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); exec('italic'); return; }
    if (mod && (e.key === 'l' || e.key === 'L')) { e.preventDefault(); exec('insertUnorderedList'); return; }
    // Empty-line in a bullet → exit the list (default browser behavior is fine, kept for clarity)
    // Enter inside an existing <li> creates a new one (browser default)
  });

  // Strip pasted formatting → plain text only, then re-apply current bold/italic.
  el.addEventListener('paste', e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    exec('insertText', text);
  });

  let saveTimer;
  const persist = () => {
    if (!TimelineState.situation) return;
    TimelineState.situation._editedHtml = el.innerHTML;
    callProxy('update_situation', {
      conversation_id: S.conversationId,
      html: el.innerHTML,
    }).catch(() => {});
  };
  el.addEventListener('blur', persist);
  el.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 1200);
  });
}

function renderTodosList(planned, proposed) {
  const arrow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2 -9.2"/><path d="M7 7h10v10"/></svg>`;
  const chevron = `<svg class="pn-todo-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6l6 -6"/></svg>`;
  const checkSvg = icon('check');

  const renderEditableFields = (t) => `
    <div class="pn-todo-edit">
      <label class="pn-todo-field pn-todo-field-stack">
        <span>${icon('aiNotes')} Description</span>
        <textarea data-field="description" rows="2" placeholder="Détails, contexte, à-faire…">${esc(t.description || '')}</textarea>
      </label>
      <div class="pn-todo-fields">
        <label class="pn-todo-field">
          <span>${icon('calendar')} Échéance</span>
          <input type="date" data-field="deadline" value="${esc(t.deadline || '')}">
        </label>
        <div class="pn-todo-field">
          <span>${icon('flag')} Priorité</span>
          <div class="pn-task-prio" data-prio-current="${esc(t.prio || 'P1')}">
            ${['P0','P1','P2','P3'].map(p => `
              <button type="button" data-prio-val="${p}" class="${t.prio === p ? 'selected ' + p.toLowerCase() : ''}">${p}</button>`).join('')}
          </div>
        </div>
        <div class="pn-todo-field">
          <span>${icon('user')} Assigné à</span>
          <div class="pn-todo-assignee" data-assignee-current="${esc(t.assignee || 'ai')}">
            <button type="button" data-assignee-val="ai" class="${t.assignee !== 'human' ? 'selected' : ''}">${icon('robot')} IA</button>
            <button type="button" data-assignee-val="human" class="${t.assignee === 'human' ? 'selected' : ''}">${icon('human')} Humain</button>
          </div>
        </div>
      </div>
    </div>`;

  const plannedHtml = planned.map(t => `
    <div class="pn-todo ${t.done ? 'done' : ''}" data-todo-id="${esc(t.id)}">
      <div class="pn-todo-row">
        <button class="pn-todo-check" data-todo-toggle="${esc(t.id)}" title="Marquer fait">${checkSvg}</button>
        <span class="pn-todo-text">${esc(t.name)}</span>
        <span class="pn-todo-prio ${esc((t.prio || 'P1').toLowerCase())}">${esc(t.prio || 'P1')}</span>
        <button class="pn-todo-expand" data-todo-expand="${esc(t.id)}" title="Détails / éditer" aria-expanded="false">${chevron}</button>
        ${t.notion_url && t.notion_url !== '#' ? `<a class="pn-todo-link" href="${esc(t.notion_url)}" target="_blank" rel="noopener" title="Ouvrir dans Notion">${arrow}</a>` : ''}
      </div>
      ${renderEditableFields(t)}
    </div>`).join('');

  const proposedHtml = proposed.map(t => `
    <div class="pn-todo proposed" data-proposed-id="${esc(t.id)}">
      <div class="pn-todo-row">
        <span class="pn-todo-check" title="Tâche suggérée par l'IA">${icon('wand')}</span>
        <span class="pn-todo-text">${esc(t.name)}</span>
        <span class="pn-todo-prio ${esc((t.prio || 'P1').toLowerCase())}">${esc(t.prio || 'P1')}</span>
        <button class="pn-todo-expand" data-todo-expand="${esc(t.id)}" title="Détails / éditer" aria-expanded="false">${chevron}</button>
        <span class="pn-todo-actions">
          <button class="pn-todo-btn dismiss" data-proposed-dismiss="${esc(t.id)}" title="Ignorer">${icon('x')}</button>
          <button class="pn-todo-btn accept" data-proposed-accept="${esc(t.id)}" title="Créer cette tâche">${icon('check')}</button>
        </span>
      </div>
      ${renderEditableFields(t)}
    </div>`).join('');

  const addBtn = `
    <button class="pn-todo-add" id="pn-todo-add" type="button" title="Créer une tâche">
      <span class="pn-todo-add-icon">${icon('plus')}</span>
      <span>Ajouter une tâche…</span>
    </button>
    <div class="pn-task-form" id="pn-task-form" data-prio="P1">
      <input type="text" class="pn-task-input" id="pn-task-input" placeholder="Intitulé de la tâche…" autocomplete="off">
      <div class="pn-task-row">
        <div class="pn-task-prio" id="pn-task-prio">
          <button type="button" data-prio="P0">P0</button>
          <button type="button" data-prio="P1" class="selected p1">P1</button>
          <button type="button" data-prio="P2">P2</button>
          <button type="button" data-prio="P3">P3</button>
        </div>
        <div class="pn-task-actions">
          <button type="button" class="pn-task-cancel" id="pn-task-cancel">Annuler</button>
          <button type="button" class="pn-task-save" id="pn-task-save">${icon('check')} Créer</button>
        </div>
      </div>
    </div>`;

  if (!planned.length && !proposed.length) {
    return `
      <div style="font-size:11px;color:var(--text-xmuted);padding:2px 4px 6px;">
        Aucune tâche pour cette conversation.
      </div>
      ${addBtn}`;
  }
  return plannedHtml + proposedHtml + addBtn;
}

/* Wire the editable fields inside an expanded task (date / prio / assignee).
   Edits are persisted optimistically: planned tasks → TaskState.tasks + proxy.
   Proposed tasks → TaskState.proposed (local only until accepted). */
function wireTodoEditFields(todoEl) {
  if (todoEl.dataset.editWired) return;
  todoEl.dataset.editWired = '1';
  const isProposed = todoEl.classList.contains('proposed');
  const id = isProposed ? todoEl.dataset.proposedId : todoEl.dataset.todoId;
  const findTask = () => isProposed
    ? TaskState.proposed.find(t => t.id === id)
    : TaskState.tasks.find(t => t.id === id);

  // Deadline
  const dateInput = todoEl.querySelector('input[data-field="deadline"]');
  if (dateInput) dateInput.addEventListener('change', () => {
    const t = findTask();
    if (!t) return;
    t.deadline = dateInput.value;
    if (!isProposed) {
      callProxy('update_task', { id, deadline: t.deadline, conversation_id: S.conversationId });
      toast('Échéance mise à jour');
    }
  });

  // Title (in-card edit — mirror change to the row text)
  const nameInput = todoEl.querySelector('input[data-field="name"]');
  if (nameInput) {
    const commitName = () => {
      const t = findTask();
      if (!t) return;
      const v = nameInput.value.trim();
      if (!v || v === t.name) return;
      t.name = v;
      const rowText = todoEl.querySelector('.pn-todo-row .pn-todo-text');
      if (rowText) rowText.textContent = v;
      if (!isProposed) {
        callProxy('update_task', { id, name: v, conversation_id: S.conversationId });
        toast('Titre mis à jour');
      }
    };
    nameInput.addEventListener('change', commitName);
    nameInput.addEventListener('blur',   commitName);
  }

  // Description (editable textarea)
  const descInput = todoEl.querySelector('textarea[data-field="description"]');
  if (descInput) {
    const commitDesc = () => {
      const t = findTask();
      if (!t) return;
      const v = descInput.value;
      if (v === (t.description || '')) return;
      t.description = v;
      if (!isProposed) {
        callProxy('update_task', { id, description: v, conversation_id: S.conversationId });
        toast('Description mise à jour');
      }
    };
    descInput.addEventListener('blur', commitDesc);
  }

  // Priority
  todoEl.querySelectorAll('[data-prio-val]').forEach(b => {
    b.addEventListener('click', () => {
      const t = findTask();
      if (!t) return;
      const val = b.dataset.prioVal;
      t.prio = val;
      todoEl.querySelectorAll('[data-prio-val]').forEach(x => {
        x.classList.remove('selected', 'p0', 'p1', 'p2', 'p3');
      });
      b.classList.add('selected', val.toLowerCase());
      // Update the small inline prio badge
      const badge = todoEl.querySelector('.pn-todo-row .pn-todo-prio');
      if (badge) {
        badge.className = 'pn-todo-prio ' + val.toLowerCase();
        badge.textContent = val;
      }
      if (!isProposed) {
        callProxy('update_task', { id, prio: val, conversation_id: S.conversationId });
        toast('Priorité mise à jour');
      }
    });
  });

  // Assignee
  todoEl.querySelectorAll('[data-assignee-val]').forEach(b => {
    b.addEventListener('click', () => {
      const t = findTask();
      if (!t) return;
      const val = b.dataset.assigneeVal;
      t.assignee = val;
      todoEl.querySelectorAll('[data-assignee-val]').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      if (!isProposed) {
        callProxy('update_task', { id, assignee: val, conversation_id: S.conversationId });
        toast(`Assigné à ${val === 'human' ? 'humain' : 'IA'}`);
      }
    });
  });
}

function wireSituationActions() {
  const regen = document.getElementById('pn-regen');
  if (regen) regen.addEventListener('click', () => {
    regen.classList.add('spinning');
    toast('Synthèse en cours de régénération…');
    setTimeout(() => regen.classList.remove('spinning'), 800);
    callProxy('regen_situation', { conversation_id: S.conversationId }).catch(() => {});
  });

  // ASK button — focuses the agent dock chat input
  const askBtn = document.getElementById('pn-ask');
  if (askBtn) askBtn.addEventListener('click', () => {
    if (typeof openAgentDockWithFocus === 'function') openAgentDockWithFocus();
  });

  // Briefing podcast pour la synthèse situation
  const synthPodBtn = document.getElementById('pn-podcast-btn');
  if (synthPodBtn) synthPodBtn.addEventListener('click', () => {
    if (!S.conversationId) { toast('Aucune conversation', 'error'); return; }
    synthPodBtn.classList.add('done');
    synthPodBtn.innerHTML = `${icon('check')}<span>Lancé</span>`;
    toast('Briefing de la synthèse en cours');
    callProxy('brief_podcast', {
      conversation_id: S.conversationId,
      scope: 'situation',
      situation: TimelineState.situation,
    }).catch(() => toast('Erreur réseau', 'error'));
  });

  // Briefing podcast button (in Contenu pane's mail summary header)
  const podBtn = document.getElementById('summary-podcast-btn');
  if (podBtn && !podBtn.dataset.wired) {
    podBtn.dataset.wired = '1';
    podBtn.addEventListener('click', () => {
      if (!S.conversationId) { toast('Aucune conversation', 'error'); return; }
      podBtn.classList.add('done');
      podBtn.innerHTML = `${icon('check')}<span>Briefing lancé</span>`;
      toast('Briefing podcast en cours');
      callProxy('brief_podcast', {
        conversation_id: S.conversationId,
        subject: S.convSubject || '',
        main: S.main,
        others: S.others,
      }).catch(() => toast('Erreur réseau', 'error'));
    });
  }

  // Expand/collapse for tasks (planned and proposed)
  document.querySelectorAll('#situation-note [data-todo-expand]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const todo = btn.closest('.pn-todo');
      const isOpen = todo.classList.toggle('expanded');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen) wireTodoEditFields(todo);
    });
  });

  // Planned task toggle (same as Task tab)
  document.querySelectorAll('#situation-note [data-todo-toggle]').forEach(b => {
    b.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      toggleTask(b.dataset.todoToggle);
      renderSituationNote();
    });
  });

  // Proposed accept
  document.querySelectorAll('#situation-note [data-proposed-accept]').forEach(b => {
    b.addEventListener('click', async e => {
      e.preventDefault(); e.stopPropagation();
      const id = b.dataset.proposedAccept;
      await acceptProposed(id);
      renderSituationNote();
    });
  });
  // Proposed dismiss
  document.querySelectorAll('#situation-note [data-proposed-dismiss]').forEach(b => {
    b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      dismissProposed(b.dataset.proposedDismiss);
      setTimeout(() => renderSituationNote(), 300);
    });
  });

  // + Ajouter une tâche → formulaire inline (pas de bascule vers Tâche tab)
  const addBtn = document.getElementById('pn-todo-add');
  const form   = document.getElementById('pn-task-form');
  const input  = document.getElementById('pn-task-input');
  const cancel = document.getElementById('pn-task-cancel');
  const save   = document.getElementById('pn-task-save');
  const prioGroup = document.getElementById('pn-task-prio');

  function openForm() {
    if (!form) return;
    form.classList.add('open');
    if (addBtn) addBtn.style.display = 'none';
    setTimeout(() => input?.focus(), 30);
  }
  function closeForm() {
    if (!form) return;
    form.classList.remove('open');
    if (addBtn) addBtn.style.display = '';
    if (input) input.value = '';
    form.dataset.prio = 'P1';
    prioGroup?.querySelectorAll('button').forEach(b => {
      b.classList.toggle('selected', b.dataset.prio === 'P1');
      b.classList.remove('p0', 'p1', 'p2', 'p3');
      if (b.dataset.prio === 'P1') b.classList.add('p1');
    });
  }
  function submitForm() {
    const name = input?.value.trim();
    if (!name) { input?.focus(); return; }
    const prio = form.dataset.prio || 'P1';
    // Optimistic insert into TaskState.tasks + create via proxy (uses existing pipeline)
    const tempId = 'pn-' + Date.now();
    TaskState.tasks.unshift({
      id: tempId, name, prio, assignee: 'human', deadline: '',
      done: false, notion_url: '#', _pending: true,
    });
    renderTasks();
    renderSituationNote();
    toast('Tâche créée');
    callProxy('create_task', {
      conversation_id: S.conversationId,
      name, description: '', deadline: '', prio, assignee: 'human',
    }).then(r => {
      const idx = TaskState.tasks.findIndex(t => t.id === tempId);
      if (idx < 0) return;
      if (r?.success && r.task) {
        TaskState.tasks[idx] = { ...r.task, _pending: false };
      } else {
        TaskState.tasks.splice(idx, 1);
        toast(r?.error || 'Erreur création', 'error');
      }
      renderTasks();
      renderSituationNote();
    });
  }

  if (addBtn) addBtn.addEventListener('click', openForm);
  if (cancel) cancel.addEventListener('click', closeForm);
  if (save)   save.addEventListener('click', submitForm);
  if (input) input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); submitForm(); }
    if (e.key === 'Escape') { e.preventDefault(); closeForm(); }
  });
  if (prioGroup) prioGroup.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      prioGroup.querySelectorAll('button').forEach(b => {
        b.classList.remove('selected', 'p0', 'p1', 'p2', 'p3');
      });
      btn.classList.add('selected', btn.dataset.prio.toLowerCase());
      form.dataset.prio = btn.dataset.prio;
    });
  });

  // Inline edit on task name (click to edit, blur/Enter to save)
  document.querySelectorAll('#situation-note .pn-todo:not(.proposed) .pn-todo-text').forEach(el => {
    el.title = 'Cliquer pour modifier';
    el.addEventListener('click', e => {
      const todo = el.closest('.pn-todo');
      const id = todo?.dataset.todoId;
      if (!id) return;
      makeInlineEditable(el, id);
    });
  });
}

/* Turn a task name span into an inline editable text node */
function makeInlineEditable(el, taskId) {
  if (el.isContentEditable) return;
  const original = el.textContent;
  el.contentEditable = 'true';
  el.style.outline = '1px solid var(--focus)';
  el.style.outlineOffset = '2px';
  el.style.borderRadius = '3px';
  el.style.background = 'var(--bg)';
  el.focus();
  // place caret at end
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  const finish = (commit) => {
    el.contentEditable = 'false';
    el.style.outline = '';
    el.style.outlineOffset = '';
    el.style.background = '';
    const newName = el.textContent.trim();
    if (!commit || !newName || newName === original) {
      el.textContent = original;
      return;
    }
    const t = TaskState.tasks.find(x => x.id === taskId);
    if (t) { t.name = newName; }
    renderTasks();
    renderSituationNote();
    toast('Tâche mise à jour');
    callProxy('update_task', { id: taskId, name: newName, conversation_id: S.conversationId })
      .catch(() => toast('Erreur sync', 'error'));
  };

  el.addEventListener('blur', () => finish(true), { once: true });
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
    if (e.key === 'Escape') { e.preventDefault(); el.textContent = original; el.blur(); }
  });
}

/* ── Key dates ─────────────────────────────────────────── */
function renderKeyDates() {
  const list = document.getElementById('key-dates');
  const cnt  = document.getElementById('key-dates-count');
  if (!list) return;
  const items = TimelineState.upcoming || [];
  if (cnt) cnt.textContent = items.length;

  if (!items.length) {
    list.innerHTML = `<div class="tl-empty">Pas de date clé à venir.</div>`;
    return;
  }

  const sorted = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));

  list.innerHTML = sorted.map(d => {
    const dObj = new Date(d.date);
    const day  = dObj.getDate();
    const mon  = dObj.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
    const rel  = formatRelDate(d.date);
    const today = isToday(dObj);
    const imminent = !today && daysUntil(dObj) <= 3 && daysUntil(dObj) >= 0;
    const iconName = TL_UPCOMING_TYPE_ICON[d.type] || 'calendar';
    const cls = ['key-date', today && 'today', imminent && 'imminent'].filter(Boolean).join(' ');
    const tag = d.url ? 'a' : 'div';
    const href = d.url ? ` href="${esc(d.url)}" target="_blank" rel="noopener"` : '';
    return `
      <${tag} class="${cls}"${href}>
        <div class="kd-day">
          <span class="kd-day-num">${day}</span>
          <span class="kd-day-mon">${esc(mon)}</span>
        </div>
        <div class="kd-body">
          <div class="kd-title">${esc(d.title)}</div>
          <div class="kd-meta">
            <span class="kd-rel">${esc(rel)}</span>
            ${d.meta ? `<span style="opacity:.5">·</span><span>${esc(d.meta)}</span>` : ''}
          </div>
        </div>
        <span class="kd-type-icon">${icon(iconName)}</span>
      </${tag}>`;
  }).join('');
}

/* ── Timeline (unified : future + past) ─────────────────
   Future events bubble to the top, sorted ascending (closest first),
   under an "À venir" header. Past events use the existing relative buckets.
   Future rows are visually distinct (tinted background, "Dans X j" prefix). */
function renderTimeline() {
  const list = document.getElementById('timeline-list');
  if (!list) return;
  const past = (TimelineState.interactions || []).slice();
  const upcoming = (TimelineState.upcoming || []).slice();
  if (!past.length && !upcoming.length) {
    list.innerHTML = `<div class="tl-empty">Aucun événement enregistré pour cette conversation.</div>`;
    return;
  }

  const arrowSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2 -9.2"/><path d="M7 7h10v10"/></svg>`;

  // Future events : sort ascending (closest first)
  upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
  // Past events : sort descending (newest first)
  past.sort((a, b) => new Date(b.date) - new Date(a.date));

  const renderFutureItem = (it) => {
    const meta = TL_TYPE_META[it.type] || (it.type === 'meeting' ? { icon: 'videoCam', label: 'Réunion' } : { icon: 'taskBox', label: 'À faire' });
    const title = it.title || meta.label;
    const rel = formatRelDate(it.date);
    const hasTime = (it.date || '').length > 10;
    const d = new Date(it.date);
    const time = hasTime ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
    const timeBit = time ? `${rel} · ${time}` : rel;
    return `
      <div class="tl-item future" data-type="${esc(it.type)}">
        <span class="tl-node" data-type="${esc(it.type)}" title="${esc(meta.label)}">${icon(meta.icon)}</span>
        <div class="tl-body">
          <div class="tl-head">
            <div class="tl-title">${esc(title)}</div>
            <span class="tl-time">${esc(timeBit)}</span>
          </div>
          ${it.meta ? `<div class="tl-summary">${esc(it.meta)}</div>` : ''}
          ${it.url ? `<div class="tl-meta"><a class="tl-link" href="${esc(it.url)}" target="_blank" rel="noopener" title="Ouvrir">${arrowSvg}</a></div>` : ''}
        </div>
      </div>`;
  };

  const renderPastItem = (it) => {
    const meta = TL_TYPE_META[it.type] || { icon: 'inbox', label: it.type || '' };
    const isNote = TL_NOTE_TYPES.has(it.type);
    const defaultTitle = it.type === 'whatsapp' ? 'Message WhatsApp' :
                         it.type === 'linkedin' ? 'Message LinkedIn' :
                         it.type === 'email'    ? 'Email' :
                         it.type === 'visio'    ? 'Note de réunion' :
                         it.type === 'note'     ? 'Note Notion' :
                         it.type === 'mou'      ? 'MOU' :
                         it.type === 'contrat'  ? 'Contrat' :
                         it.type === 'nda'      ? 'NDA' : '—';
    const title = it.title || defaultTitle;
    const time = formatTime(it.date);
    const authorBit = it.author ? `<span class="tl-author-name">${esc(it.author)}</span>` : '';
    const summaryHtml = it.summary ? `<div class="tl-summary">${esc(it.summary)}</div>` : '';
    return `
      <div class="tl-item ${isNote ? 'is-note' : ''}" data-type="${esc(it.type)}">
        <span class="tl-node" data-type="${esc(it.type)}" title="${esc(meta.label)}">${icon(meta.icon)}</span>
        <div class="tl-body">
          <div class="tl-head">
            <div class="tl-title">${esc(title)}</div>
            <span class="tl-time">${esc(time)}</span>
          </div>
          ${summaryHtml}
          ${authorBit || it.url ? `
            <div class="tl-meta">
              ${authorBit}
              ${it.url ? `<a class="tl-link" href="${esc(it.url)}" target="_blank" rel="noopener" title="Ouvrir">${arrowSvg}</a>` : ''}
            </div>` : ''}
        </div>
      </div>`;
  };

  // Group past events by relative bucket
  const pastBuckets = [];
  let lastBucket = null;
  past.forEach(it => {
    const b = bucketLabel(it.date);
    if (b !== lastBucket) {
      pastBuckets.push({ label: b, items: [] });
      lastBucket = b;
    }
    pastBuckets[pastBuckets.length - 1].items.push(it);
  });

  const futureHtml = upcoming.length
    ? `<div class="tl-day-sep tl-day-sep-future">À venir</div>${upcoming.map(renderFutureItem).join('')}`
    : '';
  const pastHtml = pastBuckets.map(bk =>
    `<div class="tl-day-sep">${esc(bk.label)}</div>${bk.items.map(renderPastItem).join('')}`
  ).join('');

  list.innerHTML = futureHtml + pastHtml;
}

/* ── Date helpers ──────────────────────────────────────── */
function isToday(d) {
  const t = new Date(); t.setHours(0,0,0,0);
  const dd = new Date(d); dd.setHours(0,0,0,0);
  return dd.getTime() === t.getTime();
}
function daysUntil(d) {
  const t = new Date(); t.setHours(0,0,0,0);
  const dd = new Date(d); dd.setHours(0,0,0,0);
  return Math.round((dd - t) / 86400000);
}
function formatRelDate(iso) {
  const diff = daysUntil(new Date(iso));
  if (diff === 0)  return "Aujourd'hui";
  if (diff === 1)  return 'Demain';
  if (diff === -1) return 'Hier';
  if (diff > 0 && diff < 7)  return `Dans ${diff} j`;
  if (diff < 0 && diff > -7) return `Il y a ${-diff} j`;
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
function formatRelStamp(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)        return "à l'instant";
  if (diff < 3600)      return `il y a ${Math.round(diff/60)} min`;
  if (diff < 86400)     return `il y a ${Math.round(diff/3600)} h`;
  if (diff < 7*86400)   return `il y a ${Math.round(diff/86400)} j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const hasTime = (iso.length > 10);
  const diff = daysUntil(d);
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 0)  return hasTime ? time : "Aujourd'hui";
  if (diff === -1) return hasTime ? `Hier · ${time}` : 'Hier';
  if (diff > -7)   return hasTime ? `${d.toLocaleDateString('fr-FR', { weekday: 'short' })} · ${time}` : d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + (hasTime ? ' · ' + time : '');
}
function bucketLabel(iso) {
  const diff = daysUntil(new Date(iso));
  if (diff === 0)             return "Aujourd'hui";
  if (diff === -1)            return 'Hier';
  if (diff > -7)              return 'Cette semaine';
  if (diff > -30)             return 'Ce mois-ci';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}


/* ════════════════════════════════════════════════════════
   CONTENT PANE — Mail summary + Attachments + Sources
   ════════════════════════════════════════════════════════ */
const ContentState = { summary: '', attachments: [], sources: [] };

async function loadContent(convId) {
  // Le résumé se remplit tout seul : on envoie au backend le texte réel du thread
  // (récupéré via le SDK Missive) en plus du sujet et des instructions Notion.
  const convText = await fetchConvText(S.conversation);
  if (convId !== S.conversationId) return;
  const r = await callProxy('analyze_content', {
    conversation_id:     convId,
    subject:             S.convSubject || '',
    main:                S.main ? { name: S.main.name, email: S.main.email } : null,
    conv_text:           convText,
    person_instructions: S.mainNotion?.person_instructions || '',
    conv_instructions:   S.convOrigText || '',
  });
  if (convId !== S.conversationId) return;
  ContentState.summary     = r?.summary || '';
  ContentState.attachments = Array.isArray(r?.attachments) ? r.attachments : [];
  ContentState.sources     = Array.isArray(r?.sources) ? r.sources : [];
  renderMailSummary();
  renderAttachments();
  renderSources();
}

/* Strip HTML → texte brut (le SDK Missive renvoie des corps de messages en HTML). */
function htmlToText(s) {
  const d = document.createElement('div');
  d.innerHTML = String(s || '');
  return (d.textContent || d.innerText || '').replace(/[ \t]+\n/g, '\n').trim();
}

/* Construit un transcript texte du thread Missive pour le résumé IA.
 * Tente d'enrichir avec les corps complets via Missive.fetchMessages ;
 * retombe sur les previews/bodies déjà présents sur l'objet conversation. */
async function fetchConvText(conv) {
  try {
    let msgs = Array.isArray(conv?.messages) ? conv.messages.slice() : [];
    // Enrichissement : corps complets via le SDK (les objets conv n'ont souvent qu'un preview)
    const ids = msgs.map(m => m && m.id).filter(Boolean);
    if (ids.length && window.Missive && typeof Missive.fetchMessages === 'function') {
      try {
        const full = await Missive.fetchMessages(ids);
        if (Array.isArray(full) && full.length) msgs = full;
      } catch (e) { console.warn('[POF] fetchMessages failed:', e); }
    }
    if (!msgs.length && conv?.latest_message) msgs = [conv.latest_message];
    const parts = msgs.slice(-12).map(m => {
      const f   = m.from_field || {};
      const who = f.name || f.address || '';
      const txt = htmlToText(m.body || m.preview || m.text || '');
      if (!txt) return '';
      return (who ? who + ' :\n' : '') + txt;
    }).filter(Boolean);
    let out = parts.join('\n\n---\n\n');
    if (out.length > 12000) out = out.slice(0, 12000) + '…';
    return out;
  } catch (e) {
    console.warn('[POF] fetchConvText error:', e);
    return '';
  }
}

function renderMailSummary() {
  // v3 layout: editable textarea inside #summary-edit
  const editRoot = document.getElementById('summary-edit');
  if (editRoot) {
    const text = ContentState.summary || '';
    editRoot.innerHTML = `
      <textarea id="summary-edit-text" rows="5"
        placeholder="Le résumé de la conversation apparaîtra ici…">${esc(text)}</textarea>`;
    const ta = document.getElementById('summary-edit-text');
    if (ta) {
      ta.addEventListener('input', () => {
        ContentState.summary = ta.value;
        updatePodcastLaunchSub();
      });
    }
    updatePodcastLaunchSub();
    return;
  }
  // v2 layout: read-only display in #mail-summary
  const root = document.getElementById('mail-summary');
  if (!root) return;
  if (!ContentState.summary) {
    root.innerHTML = `<div style="font-size:11.5px;color:var(--text-xmuted);">Pas de résumé disponible.</div>`;
    return;
  }
  root.innerHTML = `<div class="mail-summary-text">${esc(ContentState.summary)}</div>`;
}

function fileTypeBadge(type) {
  const t = (type || '').toLowerCase();
  if (['pdf'].includes(t)) return { type: 'pdf', label: 'PDF' };
  if (['doc', 'docx'].includes(t)) return { type: 'doc', label: 'DOC' };
  if (['xls', 'xlsx', 'csv'].includes(t)) return { type: 'xls', label: 'XLS' };
  if (['ppt', 'pptx'].includes(t)) return { type: 'ppt', label: 'PPT' };
  if (['jpg', 'png', 'jpeg', 'gif', 'webp'].includes(t)) return { type: 'img', label: 'IMG' };
  return { type: 'other', label: t.slice(0, 3).toUpperCase() || 'FILE' };
}

function renderAttachments() {
  const list = document.getElementById('attachment-list');
  const cnt  = document.getElementById('attachments-count');
  if (!list) return;
  const items = ContentState.attachments;
  if (cnt) cnt.textContent = items.length;
  // v3 layout: unified podcast launcher → render checkbox per item
  const v3 = !!document.getElementById('podcast-launch-btn');
  if (!items.length) {
    list.innerHTML = `<div style="font-size:11.5px;color:var(--text-xmuted);padding:6px 4px;">Aucune pièce jointe.</div>`;
    if (v3) updatePodcastLaunchSub();
    return;
  }
  // Sélection par défaut : tout est coché (résumé + toutes les PJ).
  items.forEach(a => { if (typeof a._pod === 'undefined') a._pod = true; });

  list.innerHTML = items.map(a => {
    const badge = fileTypeBadge(a.type);
    const arrowSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2 -9.2"/><path d="M7 7h10v10"/></svg>`;
    const headRight = v3
      ? `<a class="att-open" href="${esc(a.url || '#')}" target="_blank" rel="noopener" title="Ouvrir le document" aria-label="Ouvrir ${esc(a.name)}">${arrowSvg}</a>`
      : `<span class="att-size">${esc(a.size || '')}</span>`;
    const footRight = v3
      ? `<label class="att-pod-toggle" title="Inclure dans le briefing podcast">
           <input type="checkbox" data-att-pod="${esc(a.id)}" ${a._pod ? 'checked' : ''}>
           <span>Podcast</span>
         </label>`
      : `<button class="att-podcast" data-att-podcast="${esc(a.id)}" title="Générer un briefing podcast de cette PJ">
           ${icon('microphone')} Briefing podcast
         </button>
         ${notionPill(a.url, { label: 'Ouvrir', title: 'Ouvrir le document' })}`;
    return `
      <div class="attachment ${v3 ? 'v3' : ''}" data-att-id="${esc(a.id)}">
        <div class="att-icon" data-type="${badge.type}">${badge.label}</div>
        <div class="att-body">
          <div class="att-head">
            <span class="att-name">${esc(a.name)}</span>
            ${headRight}
          </div>
          ${a.summary ? `<div class="att-summary">${esc(a.summary)}</div>` : ''}
          <div class="att-foot">
            ${footRight}
          </div>
        </div>
      </div>`;
  }).join('');

  if (!v3) {
    list.querySelectorAll('[data-att-podcast]').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.attPodcast;
        const a = ContentState.attachments.find(x => x.id === id);
        b.classList.add('done');
        b.innerHTML = `${icon('check')} Briefing lancé`;
        toast(`Briefing « ${a?.name || ''} » en cours`);
        callProxy('brief_attachment', {
          attachment_id: id,
          attachment_name: a?.name,
          conversation_id: S.conversationId,
        }).then(r => {
          if (!r?.success) {
            b.classList.remove('done');
            b.innerHTML = `${icon('microphone')} Briefing podcast`;
            toast(r?.error || 'Erreur briefing PJ', 'error');
          }
        });
      });
    });
  } else {
    list.querySelectorAll('[data-att-pod]').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.attPod;
        const a = ContentState.attachments.find(x => x.id === id);
        if (a) a._pod = cb.checked;
        updatePodcastLaunchSub();
      });
    });
    updatePodcastLaunchSub();
  }
}

const SOURCE_ICON = {
  linkedin: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.881 3.87 6 2.5 6S.02 4.881.02 3.5C.02 2.12 1.13 1 2.5 1s2.48 1.12 2.48 2.5zM5 8H0v16h5V8zm7.982 0H8.014v16H13v-8.4c0-4.66 6-5 6 0V24h5V13.92c0-7.88-8.922-7.593-11.018-3.71V8z"/></svg>`,
  web: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M3.6 9h16.8"/><path d="M3.6 15h16.8"/><path d="M11.5 3a17 17 0 0 0 0 18"/><path d="M12.5 3a17 17 0 0 1 0 18"/></svg>`,
};

function renderSources() {
  const list = document.getElementById('source-list');
  const cnt  = document.getElementById('sources-count');
  if (!list) return;
  const items = ContentState.sources;
  if (cnt) cnt.textContent = items.length;
  if (!items.length) {
    list.innerHTML = `<div style="font-size:11.5px;color:var(--text-xmuted);padding:6px 4px;">Aucune source détectée.</div>`;
    return;
  }
  list.innerHTML = items.map(s => {
    const isLinkedIn = s.type === 'linkedin';
    const actionLabel = isLinkedIn ? 'Suivre' : 'Ajouter à la veille';
    const doneLabel   = isLinkedIn ? 'Suivi' : 'En veille';
    return `
      <div class="source-item" data-src-id="${esc(s.id)}">
        <span class="src-icon" data-type="${esc(s.type)}">${SOURCE_ICON[s.type] || SOURCE_ICON.web}</span>
        <div class="src-body">
          <a class="src-name" href="${esc(s.url || '#')}" target="_blank" rel="noopener">${esc(s.name)}</a>
          ${s.subtitle ? `<div class="src-sub">${esc(s.subtitle)}</div>` : ''}
          ${s.meta ? `<div class="src-meta">${esc(s.meta)}</div>` : ''}
        </div>
        <a class="src-open" href="${esc(s.url || '#')}" target="_blank" rel="noopener" title="Ouvrir le lien" aria-label="Ouvrir ${esc(s.name)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2 -9.2"/><path d="M7 7h10v10"/></svg>
        </a>
        <button class="src-action ${s.watched ? 'watched' : ''}" data-src-action="${esc(s.id)}"
                aria-pressed="${s.watched ? 'true' : 'false'}">
          ${s.watched ? icon('check') + ' ' + doneLabel : icon('plus') + ' ' + actionLabel}
        </button>
      </div>`;
  }).join('');

  list.querySelectorAll('[data-src-action]').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.dataset.srcAction;
      const s = ContentState.sources.find(x => x.id === id);
      if (!s) return;
      s.watched = !s.watched;
      const isLinkedIn = s.type === 'linkedin';
      const actionLabel = isLinkedIn ? 'Suivre' : 'Ajouter à la veille';
      const doneLabel   = isLinkedIn ? 'Suivi' : 'En veille';
      b.classList.toggle('watched', s.watched);
      b.setAttribute('aria-pressed', s.watched ? 'true' : 'false');
      b.innerHTML = s.watched ? icon('check') + ' ' + doneLabel : icon('plus') + ' ' + actionLabel;
      toast(s.watched ? `Ajouté à la veille : ${s.name}` : `Retiré de la veille : ${s.name}`);
      callProxy('follow_source', { source_id: id, watched: s.watched, conversation_id: S.conversationId });
    });
  });
}


/* ════════════════════════════════════════════════════════
   AGENT CHAT DOCK
   ════════════════════════════════════════════════════════ */
const AgentState = {
  messages: [],  // {role: 'user'|'agent', text, ts}
  sending: false,
};

function setupAgentDock() {
  const dock      = document.getElementById('agent-dock');
  const toggle    = document.getElementById('agent-thread-toggle');
  const thread    = document.getElementById('agent-thread');
  const composer  = document.getElementById('agent-composer');
  const input     = document.getElementById('agent-input');
  const sendBtn   = document.getElementById('agent-send');
  const mic       = document.getElementById('agent-mic');
  if (!dock || !toggle || !composer || !input) return;

  // Open by default when no conversation has started yet.
  // Check again after a short delay in case Missive resolves a conv quickly.
  if (!S.conversationId) toggleAgentDock(true);
  setTimeout(() => {
    if (!S.conversationId && dock.dataset.state !== 'open') toggleAgentDock(true);
  }, 800);

  // Auto-grow textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });

  // Toggle thread
  toggle.addEventListener('click', () => toggleAgentDock());

  // Submit on Enter (Shift+Enter = newline)
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAgentMessage();
    }
  });

  composer.addEventListener('submit', e => {
    e.preventDefault();
    sendAgentMessage();
  });

  // Mic — demo dictation
  if (mic) mic.addEventListener('click', () => {
    mic.classList.add('listening');
    toast('Démo : dictée vocale activée');
    setTimeout(() => {
      mic.classList.remove('listening');
      if (!input.value) {
        input.value = "Vérifie si Marc a déjà signé un term-sheet ailleurs et adapte les tâches suggérées.";
        input.dispatchEvent(new Event('input'));
        input.focus();
      }
    }, 1500);
  });
}

function toggleAgentDock(force) {
  const dock   = document.getElementById('agent-dock');
  const thread = document.getElementById('agent-thread');
  const toggle = document.getElementById('agent-thread-toggle');
  if (!dock || !thread || !toggle) return;
  const willOpen = force !== undefined ? force : (dock.dataset.state !== 'open');
  dock.dataset.state = willOpen ? 'open' : 'collapsed';
  toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  if (willOpen) {
    thread.removeAttribute('hidden');
    scrollAgentThreadBottom();
  } else {
    thread.setAttribute('hidden', '');
  }
}

function openAgentDockWithFocus() {
  toggleAgentDock(true);
  setTimeout(() => document.getElementById('agent-input')?.focus(), 80);
}

function sendAgentMessage() {
  const input = document.getElementById('agent-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text || AgentState.sending) return;
  AgentState.sending = true;

  // Add user message
  AgentState.messages.push({ role: 'user', text, ts: Date.now() });
  input.value = '';
  input.style.height = 'auto';
  toggleAgentDock(true);
  renderAgentMessages();

  // Thinking indicator
  AgentState.messages.push({ role: 'agent', text: '', ts: Date.now(), _thinking: true });
  renderAgentMessages();

  callProxy('ask_agent', {
    prompt: text,
    conversation_id: S.conversationId,
    main: S.main,
    situation: TimelineState.situation,
  }).then(r => {
    // Remove thinking
    AgentState.messages = AgentState.messages.filter(m => !m._thinking);
    const reply = r?.reply || (r?.situation
      ? "Synthèse mise à jour. J'ai aussi régénéré les tâches suggérées dans l'onglet Actions."
      : "OK, j'ai pris en compte ta demande. Les éléments sont mis à jour dans les onglets concernés.");
    AgentState.messages.push({ role: 'agent', text: reply, ts: Date.now() });
    AgentState.sending = false;
    renderAgentMessages();
    updateAgentPreview();
    // Side-effects: if the agent updated the situation or proposed tasks, refresh views
    if (r?.situation) {
      TimelineState.situation = r.situation;
      renderSituationNote();
    }
    if (Array.isArray(r?.proposed)) {
      TaskState.proposed = r.proposed;
      renderProposed();
      renderSituationNote();
    }
  }).catch(() => {
    AgentState.messages = AgentState.messages.filter(m => !m._thinking);
    AgentState.messages.push({ role: 'agent', text: 'Erreur réseau, réessaie.', ts: Date.now() });
    AgentState.sending = false;
    renderAgentMessages();
  });
}

function renderAgentMessages() {
  const list  = document.getElementById('agent-messages');
  if (!list) return;
  if (!AgentState.messages.length) {
    list.innerHTML = '';
    return;
  }
  list.innerHTML = AgentState.messages.map(m => {
    if (m._thinking) {
      return `
        <div class="agent-msg agent thinking">
          <span class="agent-msg-avatar">${icon('wand')}</span>
          <div class="agent-msg-bubble">
            <span class="agent-typing"><span></span><span></span><span></span></span>
          </div>
        </div>`;
    }
    const avatar = m.role === 'agent'
      ? `<span class="agent-msg-avatar">${icon('wand')}</span>`
      : `<span class="agent-msg-avatar">${esc(initials(S.main?.name || 'Moi'))}</span>`;
    return `
      <div class="agent-msg ${m.role}">
        ${avatar}
        <div class="agent-msg-bubble">${esc(m.text)}</div>
      </div>`;
  }).join('');
  scrollAgentThreadBottom();
}

function scrollAgentThreadBottom() {
  const thread = document.getElementById('agent-thread');
  if (thread) thread.scrollTop = thread.scrollHeight;
}

function updateAgentPreview() {
  const previewEl = document.getElementById('agent-thread-preview');
  const countEl   = document.getElementById('agent-thread-count');
  if (!previewEl) return;
  const lastAgent = [...AgentState.messages].reverse().find(m => m.role === 'agent' && !m._thinking);
  if (lastAgent) {
    const short = lastAgent.text.length > 70 ? lastAgent.text.slice(0, 70) + '…' : lastAgent.text;
    previewEl.textContent = short;
  }
  const count = AgentState.messages.filter(m => !m._thinking).length;
  if (countEl) {
    if (count > 0) {
      countEl.textContent = count;
      countEl.removeAttribute('hidden');
    } else {
      countEl.setAttribute('hidden', '');
    }
  }
}

// Boot
window.addEventListener('DOMContentLoaded', setupAgentDock);

/* ════════════════════════════════════════════════════════
   V3 — Conv. fusionnée : feedback + podcast launcher unique
   ════════════════════════════════════════════════════════ */
function sendFeedback() {
  const ta  = document.getElementById('feedback-textarea');
  const btn = document.getElementById('feedback-send-btn');
  if (!ta || !btn) return;
  const text = ta.value.trim();
  if (!text) {
    ta.focus();
    btn.innerHTML = `${icon('alert')} Texte vide`;
    setTimeout(() => { btn.innerHTML = 'Envoyer'; }, 1800);
    return;
  }
  btn.innerHTML  = `${icon('check')} Envoyé`;
  btn.disabled = true;
  toast('Merci — feedback envoyé à l\'équipe IA');
  callProxy('submit_rules_feedback', {
    conversation_id: S.conversationId,
    text,
  }).catch(() => {});
  setTimeout(() => {
    ta.value = '';
    btn.innerHTML = 'Envoyer';
    btn.disabled = false;
  }, 1800);
}
function resetFeedback() {
  const ta = document.getElementById('feedback-textarea');
  if (ta) ta.value = '';
}

/* Update the count line under the big "Lancer le briefing podcast" button */
function updatePodcastLaunchSub() {
  const sub = document.getElementById('podcast-launch-sub');
  if (!sub) return;
  const summaryIncluded = !!document.getElementById('pod-incl-summary')?.checked;
  const selectedPJ = (ContentState.attachments || []).filter(a => a._pod !== false).length;
  const parts = [];
  if (summaryIncluded) parts.push('Résumé');
  if (selectedPJ === 1) parts.push('1 pièce jointe');
  else if (selectedPJ > 1) parts.push(`${selectedPJ} pièces jointes`);
  sub.innerHTML = parts.length
    ? esc(parts.join(' + '))
    : `<span style="color:#c46a3a">Rien de sélectionné</span>`;
  const btn = document.getElementById('podcast-launch-btn');
  if (btn) btn.disabled = parts.length === 0;
}

/* Déclencheur unique du briefing podcast — partagé par le gros bouton et le
 * footer PODCAST. Synthétise ce qui est coché : résumé (si inclus) + PJ
 * sélectionnées (toutes par défaut) + sources. Le backend lit le fil et les PDF. */
function launchPodcastBrief() {
  if (!S.conversationId) { toast('Aucune conversation', 'error'); return Promise.resolve({ success: false }); }
  const incl = document.getElementById('pod-incl-summary');
  const summaryIncluded = incl ? !!incl.checked : true;
  const summaryText = document.getElementById('summary-edit-text')?.value || ContentState.summary || '';
  const atts = ContentState.attachments || [];
  const payload = {
    conversation_id:     S.conversationId,
    include_summary:     summaryIncluded,
    summary_text:        summaryText,
    sources:             ContentState.sources || [],
    subject:             S.convSubject || '',
    main:                S.main,
    others:              S.others,
    person_instructions: S.mainNotion?.person_instructions || '',
    conv_instructions:   S.convOrigText || '',
  };
  // PJ chargées → envoie la sélection (tout coché par défaut). Sinon, omettre
  // laisse le backend lire toutes les PJ non-inline de la conversation.
  if (atts.length) payload.attachment_ids = atts.filter(a => a._pod !== false).map(a => a.id);
  return callProxy('brief_podcast', payload);
}

function setupPodcastLauncher() {
  const incl = document.getElementById('pod-incl-summary');
  const btn  = document.getElementById('podcast-launch-btn');
  if (!btn) return;
  if (incl) incl.addEventListener('change', updatePodcastLaunchSub);
  btn.addEventListener('click', () => {
    if (!S.conversationId) { toast('Aucune conversation', 'error'); return; }
    const summaryIncluded = !!incl?.checked;
    const summaryText = document.getElementById('summary-edit-text')?.value || ContentState.summary || '';
    const selectedPJ = (ContentState.attachments || []).filter(a => a._pod !== false);
    if (!summaryIncluded && !selectedPJ.length) {
      toast('Sélectionne au moins un élément', 'error');
      return;
    }
    btn.classList.add('done');
    btn.disabled = true;
    const titleEl = btn.querySelector('.bpb-title');
    const subEl   = btn.querySelector('.bpb-sub');
    const arrowEl = btn.querySelector('.bpb-arrow');
    if (titleEl) titleEl.textContent = 'Briefing podcast lancé';
    if (subEl)   subEl.textContent   = 'Tu recevras le rendu dans Notion.';
    if (arrowEl) arrowEl.innerHTML   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M5 12l5 5l10 -10"/></svg>`;
    toast('Briefing podcast en cours');
    launchPodcastBrief().catch(() => toast('Erreur réseau', 'error'));
    setTimeout(() => {
      btn.classList.remove('done');
      btn.disabled = false;
      if (titleEl) titleEl.textContent = 'Lancer le briefing podcast';
      if (arrowEl) arrowEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M5 12l14 0"/><path d="M13 18l6 -6"/><path d="M13 6l6 6"/></svg>`;
      updatePodcastLaunchSub();
    }, 4800);
  });
  updatePodcastLaunchSub();
}

window.addEventListener('DOMContentLoaded', () => {
  setupPodcastLauncher();
  // Cmd/Ctrl+Enter to send feedback
  const fb = document.getElementById('feedback-textarea');
  if (fb) fb.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      sendFeedback();
    }
  });
});
