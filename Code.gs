/**
 * missive-sidebar-proxy
 *
 * Proxy GAS pour la sidebar Missive Notion (HTML statique GitHub Pages).
 * Suit le pattern Secrets_Proxy POF. Tous les tokens via getSecret_().
 *
 * Architecture :
 *  - Notion : appels REST API directs (auth Bearer via NOTION_API_TOKEN).
 *  - Folk   : Anthropic API + MCP Zapier (fallback CRM).
 *
 * Actions :
 *   ping
 *   lookup_person                {email, name}
 *   create_person                {email, name}
 *   update_person_instructions   {page_id, text}
 *   lookup_conv                  {missive_conversation_id}
 *   upsert_conv                  {missive_conversation_id, text, page_id?}
 *   lookup_folk                  {email, name}
 *   reconcile_folk               {email, name, folk_id, folk_url, network_id?, group_id?, page_id?}
 *   setup_config                 {config} — one-shot, locked after first call
 */

const NOTION_API_VERSION = '2022-06-28';
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_MAX_TOKENS = 800;
const MCP_FOLK = 'https://mcp.zapier.com/api/mcp/a/13565407/mcp';
const FOLK_API_BASE = 'https://api.folk.app/v1';
const FOLK_NETWORK_ID = '66210930-178c-4c34-8322-8936ec19186a';

/* ═══════════════════════════════════════════════════════════════
   ENTRY POINTS
   ═══════════════════════════════════════════════════════════════ */

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (body.action === 'setup_config') {
      return json_(handleSetupConfig_(body));
    }

    const auth = checkAuth_(body.token);
    if (!auth.ok) return json_({ error: auth.error });

    const action = body.action;
    let result;
    switch (action) {
      case 'ping':                       result = { ok: true, version: '1.17.0', agents: Object.keys(AGENTS) }; break;
      case 'agent_invoke':               result = handleAgentInvoke_(body);           break;
      case 'agent_list':                 result = handleAgentList_();                 break;
      // v1.10 — Spec 2 V1 (agent sidebar + apprentissage observationnel)
      case 'reload_config':              result = handleReloadConfig_(body);          break;
      case 'run_nightly_scan':           result = handleRunNightlyScan_(body);        break;
      case 'setup_nightly_trigger':      result = handleSetupNightlyTrigger_(body);   break;
      case 'update_outcome':             result = handleUpdateOutcome_(body);         break;
      case 'dump_persons':               result = handleDumpPersons_(body);           break;
      case 'lookup_person':              result = handleLookupPerson_(body);          break;
      case 'create_person':              result = handleCreatePerson_(body);          break;
      case 'update_person_instructions': result = handleUpdatePersonInstr_(body);     break;
      case 'lookup_conv':                result = handleLookupConv_(body);            break;
      case 'upsert_conv':                result = handleUpsertConv_(body);            break;
      case 'list_conv_tasks':            result = handleListConvTasks_(body);         break;
      case 'list_tasks':                 result = handleListTasks_(body);             break;
      case 'create_task':                result = handleCreateTask_(body);            break;
      case 'toggle_task':                result = handleToggleTask_(body);            break;
      case 'brief_podcast':              result = handleBriefPodcast_(body);          break;
      case 'add_to_watch':               result = handleAddToWatch_(body);            break;
      case 'enrich_contact':             result = handleEnrichContact_(body);         break;
      case 'brief_reply':                result = handleBriefReply_(body);            break;
      case 'toggle_vip':                 result = handleToggleVip_(body);             break;
      case 'add_phone_to_notion':        result = handleAddPhoneToNotion_(body);      break;
      case 'list_proposed_tasks':        result = handleListProposedTasks_(body);     break;
      case 'estimate_opportunity':       result = handleQueueAgentTask_(body, 'estimate_opportunity'); break;
      case 'send_nda':                   result = handleQueueAgentTask_(body, 'send_nda');             break;
      case 'lookup_folk':                result = handleLookupFolk_(body);            break;
      case 'reconcile_folk':             result = handleReconcileFolk_(body);         break;
      // v1.8 — nouveaux endpoints sidebar v4
      case 'analyze_content':            result = handleAnalyzeContent_(body);        break;
      case 'list_attachments':           result = handleListAttachments_(body);       break;
      case 'brief_attachment':           result = handleBriefAttachment_(body);       break;
      case 'follow_source':              result = handleFollowSource_(body);          break;
      case 'list_timeline':              result = handleListTimeline_(body);          break;
      case 'last_triage_report':         result = handleLastTriageReport_(body);      break;
      case 'run_triage':                 result = handleRunTriage_(body);             break;
      case 'submit_agent_feedback':      result = handleSubmitFeedback_(body, 'agent');  break;
      case 'submit_rules_feedback':      result = handleSubmitFeedback_(body, 'rules');  break;
      case 'add_field_to_notion':        result = handleAddFieldToNotion_(body);      break;
      case 'update_task':                result = handleUpdateTask_(body);            break;
      case 'update_situation':           result = handleUpdateSituation_(body);       break;
      // Stubs : nécessitent une spec dédiée — voir Missive Sidebar Notion
      case 'regen_situation':            result = handleRegenSituation_(body);        break;
      case 'ask_agent':                  result = handleAskAgentWithLogging_(body);   break;
      case 'signature_action':           result = handleSignatureAction_(body);       break;
      case 'odoo_sign':                  result = handleOdooSign_(body);             break;
      // Alias quand le frontend écrase la routing key avec action: 'legal_analysis|sign_documents|generate_nda'
      case 'legal_analysis':             result = handleSignatureAction_({ ...body, sub_action: 'legal_analysis' });  break;
      case 'sign_documents':             result = handleSignatureAction_({ ...body, sub_action: 'sign_documents' });  break;
      case 'generate_nda':               result = handleSignatureAction_({ ...body, sub_action: 'generate_nda' });    break;
      default:                           return json_({ error: 'unknown action: ' + action });
    }
    return json_(result);
  } catch (err) {
    return json_({ error: String((err && err.message) || err), stack: String((err && err.stack) || '').slice(0, 500) });
  }
}

function doGet(_e) {
  return json_({ ok: true, service: 'missive-sidebar-proxy', version: '1.17.0', agents: Object.keys(AGENTS) });
}

/* ═══════════════════════════════════════════════════════════════
   v1.8 — TIMELINE, ANALYZE, TRIAGE, FEEDBACK, GENERIC PATCH
   ═══════════════════════════════════════════════════════════════ */

const NOTES_DB_ID    = '259c2ce245e880ba81ece0c55d926a80';
const MOUS_DB_ID     = 'db667ae8-96a6-4e98-96be-306ab6a762d4';
const FEEDBACK_DB_ID = '6a1cdf41-5aec-4377-9afb-02b4aa87ba6d';

/* ─── analyze_content ──────────────────────────────────────── */
/**
 * Résumé IA + extraction de sources (LinkedIn, web) depuis le contexte conv.
 * Pas d'accès au body Missive (pas de Missive API wiré ici) — l'IA travaille
 * sur subject + person_instructions + conv_instructions + participants.
 */
function handleAnalyzeContent_(body) {
  var convId = String(body.conversation_id || '');
  if (!convId) return { summary: '', attachments: [], sources: [] };

  // PJ : indépendantes du résumé IA. On les récupère d'abord via Missive API
  // pour qu'elles s'affichent même si l'analyse IA est court-circuitée ou échoue.
  // (v1.15 — avant, le backend renvoyait toujours attachments: [], la sidebar
  //  affichait "Aucune pièce jointe" même sur un mail avec PJ.)
  var attachments = collectConvAttachments_(convId);

  var subject = String(body.subject || '');
  var mainName = (body.main && body.main.name) || '';
  var mainEmail = (body.main && body.main.email) || '';
  var personInstr = String(body.person_instructions || '');
  var convInstr   = String(body.conv_instructions || '');
  var convText    = String(body.conv_text || '');
  // Garde-fou taille : on borne le transcript envoyé à l'IA (12k chars côté front, on re-coupe ici)
  if (convText.length > 14000) convText = convText.slice(0, 14000);

  // Pas d'info → réponse rapide (PJ quand même), pas d'appel IA
  if (!convText && !subject && !personInstr && !convInstr) {
    return { summary: '', attachments: attachments, sources: [] };
  }

  var apiKey;
  try { apiKey = getSecret_('ANTROPIC_API_TOKEN'); }
  catch (_e) { return { summary: '', attachments: attachments, sources: [], error: 'no_anthropic_key' }; }

  var system = 'Tu es un assistant qui résume une conversation Missive pour Benoit (CEO POF). ' +
    'Réponds UNIQUEMENT en JSON valide, sans markdown : ' +
    '{"summary":"résumé 2-4 phrases", "sources":[{"type":"linkedin|web|other", "url":"...", "label":"..."}]}. ' +
    'Résume le fil de la conversation (le contenu réel des messages) en français : où on en est, ' +
    'la demande ou le sujet de fond, et ce qui est actionnable pour Benoit. Pas d em-dashes, pas d invention. ' +
    'Si tu n as pas d url évidente, sources = []. Si le fil est vide, résume à partir du sujet et des instructions.';

  var prompt = 'Contact principal : ' + mainName + ' (' + mainEmail + ')\n' +
    (subject ? 'Sujet : ' + subject + '\n' : '') +
    (convText ? '\n--- Fil de la conversation ---\n' + convText + '\n--- fin du fil ---\n' : '') +
    (personInstr ? '\nInstructions Notion personne :\n' + personInstr + '\n' : '') +
    (convInstr ? '\nInstructions Notion conv :\n' + convInstr + '\n' : '');

  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: ANTHROPIC_MODEL, max_tokens: 500, system: system,
      messages: [{ role: 'user', content: prompt }]
    }), muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    return { summary: '', attachments: attachments, sources: [], error: 'anthropic_' + res.getResponseCode() };
  }
  var data = JSON.parse(res.getContentText());
  var textBlock = (data.content || []).filter(function (b) { return b.type === 'text'; })[0];
  var parsed = parseJsonLoose_(textBlock ? textBlock.text : '');
  return {
    summary: (parsed && parsed.summary) || '',
    attachments: attachments,
    sources: (parsed && Array.isArray(parsed.sources)) ? parsed.sources : []
  };
}

/* ─── list_attachments : PJ seules, sans IA (rapide, ~0.5s) ───
 * Appel dédié pour afficher les pièces jointes immédiatement, sans attendre
 * le résumé IA de analyze_content. */
function handleListAttachments_(body) {
  var convId = String(body.conversation_id || '');
  return { attachments: collectConvAttachments_(convId) };
}

/* ─── Pièces jointes d'une conversation (Missive API) ──────────
 * Normalise les PJ de tous les messages d'une conversation vers la forme
 * attendue par le frontend (renderAttachments) : { id, name, type, size, url }.
 * - type : extension minuscule (pdf, docx, xlsx…) pour le badge.
 * - size : chaîne lisible ("3.13 MB") ; le frontend la reparse (sizeBytes).
 * Best-effort : déduplique par id et retourne [] si l'API Missive échoue. */
function collectConvAttachments_(convId) {
  if (!convId) return [];
  var out = [];
  var seen = {};
  try {
    // Missive plafonne ce endpoint à limit=10 (au-delà : HTTP 400 "max 'limit' value is 10").
    var msgs = (missiveListMessages_(convId, 10).messages) || [];
    msgs.forEach(function (m) {
      (m.attachments || []).forEach(function (a) {
        if (isDecorativeImage_(a, m.body)) return;        // images embarquées (signature, logo) : exclues
        var name = a.filename || a.name || '(sans nom)';
        var key = name + '|' + (a.size || '');
        if (seen[key]) return;                // même fichier re-cité dans des réponses du thread
        seen[key] = true;
        out.push({
          id:   a.id || '',
          name: name,
          type: attachmentExt_(a, name),
          size: humanFileSize_(a.size),
          url:  a.url || a.download_url || ''
        });
      });
    });
    Logger.log('collectConvAttachments_ : ' + out.length + ' PJ (hors inline) pour conv ' + convId);
  } catch (e) {
    Logger.log('collectConvAttachments_ échec (' + convId + ') : ' + e.message);
    return [];
  }
  return out;
}

/* Image décorative à exclure (signature, logo, icône réseau social, bandeau).
 * Ne s'applique qu'aux images : les PDF et autres docs passent toujours.
 * Une image est gardée seulement si elle a une vraie valeur (photo, scan, capture).
 * L'API REST Missive n'expose ni flag inline ni content-id, donc on combine :
 *  a) référencée dans le corps du message (cid embarqué) → décorative ;
 *  b) nom typique (image001, logo, signature, bandeau, réseaux sociaux) ;
 *  c) trop petite (< 50 Ko ou < 400 px) ou bandeau très allongé. */
function isDecorativeImage_(a, bodyHtml) {
  var mt = String(a.media_type || '').toLowerCase();
  if (mt !== 'image') return false;                 // PDF / docs : jamais filtrés ici
  var fn = String(a.filename || a.name || '');
  var fnl = fn.toLowerCase();
  // a) embarquée inline (le nom de fichier apparaît dans le corps HTML via cid)
  if (bodyHtml && fn && String(bodyHtml).indexOf(fn) !== -1) return true;
  // b) noms décoratifs / icônes réseaux sociaux
  if (/^image\d+\.[a-z0-9]+$/.test(fnl)) return true;
  if (/(logo|signature|sign[-_]?off|banner|banniere|ent[eê]te|icon|icone|avatar|footer|header|spacer|pixel|emoji|facebook|twitter|linkedin|youtube|instagram|tiktok|whatsapp|telegram)/.test(fnl)) return true;
  // c) trop petite pour avoir de la valeur, ou bandeau très allongé
  var size = Number(a.size) || 0;
  var w = Number(a.width) || 0, h = Number(a.height) || 0;
  if (size && size < 50 * 1024) return true;
  if (w && h) {
    if (Math.max(w, h) < 400) return true;
    if (w / h > 4 || h / w > 4) return true;
  }
  return false;
}

/* Extension minuscule pour le badge frontend. Préfère a.extension,
 * sinon dérive depuis le nom de fichier. */
function attachmentExt_(a, name) {
  var ext = String(a.extension || '').toLowerCase().replace(/^\./, '');
  if (!ext && name) {
    var m = String(name).match(/\.([a-z0-9]+)\s*$/i);
    if (m) ext = m[1].toLowerCase();
  }
  return ext;
}

/* Octets → chaîne lisible ("3.13 MB"). Tolère number ou string. */
function humanFileSize_(bytes) {
  var n = Number(bytes);
  if (!n || n < 0 || isNaN(n)) return '';
  if (n < 1024) return n + ' B';
  var units = ['KB', 'MB', 'GB', 'TB'];
  var i = -1;
  do { n = n / 1024; i++; } while (n >= 1024 && i < units.length - 1);
  return (n >= 10 ? n.toFixed(0) : n.toFixed(2)) + ' ' + units[i];
}

/* ─── brief_attachment (stub : besoin Missive API) ─────────── */
function handleBriefAttachment_(_body) {
  return { success: false, error: 'requires_missive_api', message: 'Analyse de PJ nécessite Missive API token côté GAS — non wiré pour cette itération.' };
}

/* ─── follow_source : ajoute à la veille du contact ────────── */
function handleFollowSource_(body) {
  // Mappe vers add_to_watch avec catégorie déduite
  var source_type = String(body.source_type || '').toLowerCase();
  var category = source_type === 'concurrent' ? 'concurrents'
                : source_type === 'appel' ? 'appels-a-projets'
                : 'strategiques';
  return handleAddToWatch_({
    category: category,
    conversation_id: body.conversation_id,
    contact_page_id: body.contact_page_id,
    contact_email:   body.contact_email,
    contact_name:    body.contact_name
  });
}

/* ─── Construit l'objet situation normalisé attendu par le frontend ──────────
 * (renderSituationNote/renderStatusBody : headline + bullets[{value}] + risks[{severity,icon,text}]).
 * Retourne null si rien à afficher. */
function buildSituationObject_(summary, bulletsArr, risksArr, updatedAt, source) {
  var bullets = (bulletsArr || []).filter(function (b) { return b; }).map(function (b) {
    return { value: String(b) };
  });
  var risks = (risksArr || []).filter(function (r) { return r; }).map(function (r) {
    return { severity: 'high', icon: 'alertCircle', text: String(r) };
  });
  if (!summary && !bullets.length && !risks.length) return null;
  return {
    headline: summary || '',
    bullets: bullets,
    risks: risks,
    updated: updatedAt || '',
    source: source || 'ia'
  };
}

/* ─── Relit la synthèse exécutive persistée sur la page Conversation ─────────
 * Query par Agent session ID (NE crée PAS la page, contrairement à ensureConvPage_).
 * Reconstruit bullets/risks depuis les blobs texte (préfixes • et ⚠ strippés). */
function readConvSituation_(convId) {
  var dbId = cfg_('NOTION_CONVS_DB');
  var idProp = cfg_('CONV_MISSIVE_ID_PROP') || 'Agent session ID';
  if (!dbId || !convId) return null;
  var search = notionFetch_('POST', '/databases/' + dbId + '/query', {
    filter: { property: idProp, rich_text: { equals: convId } }, page_size: 1
  });
  if (!search.results || !search.results.length) return null;
  var props = search.results[0].properties || {};
  var summary     = richTextValue_((props[CONV_SITUATION_SUMMARY_PROP] && props[CONV_SITUATION_SUMMARY_PROP].rich_text) || []);
  var bulletsText = richTextValue_((props[CONV_SITUATION_BULLETS_PROP]  && props[CONV_SITUATION_BULLETS_PROP].rich_text)  || []);
  var risksText   = richTextValue_((props[CONV_SITUATION_RISKS_PROP]    && props[CONV_SITUATION_RISKS_PROP].rich_text)    || []);
  var updated     = (props[CONV_SITUATION_UPDATED_PROP] && props[CONV_SITUATION_UPDATED_PROP].date && props[CONV_SITUATION_UPDATED_PROP].date.start) || '';
  var source      = (props[CONV_SITUATION_SOURCE_PROP]  && props[CONV_SITUATION_SOURCE_PROP].select && props[CONV_SITUATION_SOURCE_PROP].select.name) || 'ia';
  var bullets = bulletsText ? bulletsText.split('\n').map(function (l) { return l.replace(/^[••\-\s]+/, '').trim(); }).filter(Boolean) : [];
  var risks   = risksText   ? risksText.split('\n').map(function (l) { return l.replace(/^[⚠\s]+/, '').trim(); }).filter(Boolean) : [];
  return buildSituationObject_(summary, bullets, risks, updated, source);
}

/* ─── list_timeline : synthèse persistée + Notes/MOUs liés au contact ─────────
 * conversation_id → relit la synthèse exécutive ; contact_page_id → Notes + MOUs.
 * Les deux args sont indépendants : l'un sans l'autre fonctionne. */
function handleListTimeline_(body) {
  var contactPageId = String(body.contact_page_id || '');
  var convId        = String(body.conversation_id || '');

  // 1. Synthèse exécutive persistée (relue depuis la page Conversation)
  var situation = null;
  if (convId) {
    try { situation = readConvSituation_(convId); } catch (_e) {}
  }

  // 2. Notes + MOUs liés au contact (nécessite contact_page_id)
  if (!contactPageId) return { situation: situation, upcoming: [], interactions: [] };

  var interactions = [];

  // Fetch la page contact pour récupérer les relations Notes + MOUs
  var page;
  try { page = notionFetch_('GET', '/pages/' + contactPageId, null); }
  catch (e) { return { situation: situation, upcoming: [], interactions: [], error: String(e) }; }
  var props = page.properties || {};

  // 1. Notes liées (relation "Notes")
  var notesRel = (props['Notes'] && props['Notes'].relation) || [];
  for (var i = 0; i < Math.min(notesRel.length, 20); i++) {
    try {
      var p = notionFetch_('GET', '/pages/' + notesRel[i].id, null);
      var nprops = p.properties || {};
      var title = '', type = '', summary = '', date = p.last_edited_time || p.created_time || '';
      for (var k in nprops) {
        if (nprops[k].type === 'title') title = richTextValue_(nprops[k].title || []);
        if (k.toLowerCase() === 'type' && nprops[k].select && nprops[k].select.name) type = nprops[k].select.name;
        if (k.toLowerCase() === 'type' && nprops[k].rich_text) type = richTextValue_(nprops[k].rich_text);
        if (k.toLowerCase() === 'contenu' && nprops[k].rich_text) summary = richTextValue_(nprops[k].rich_text);
        if (nprops[k].type === 'date' && nprops[k].date && nprops[k].date.start) date = nprops[k].date.start;
      }
      interactions.push({
        kind: 'note',
        type: type || 'note',
        title: title || '(sans titre)',
        summary: summary,
        date: (date || '').slice(0, 10),
        url: p.url || notionPageUrl_(p.id)
      });
    } catch (_e) {}
  }

  // 2. MOUs liés (relation "Inventaire MOUs et Partenariats")
  var mousRel = (props['Inventaire MOUs et Partenariats'] && props['Inventaire MOUs et Partenariats'].relation) || [];
  for (var j = 0; j < Math.min(mousRel.length, 20); j++) {
    try {
      var m = notionFetch_('GET', '/pages/' + mousRel[j].id, null);
      var mprops = m.properties || {};
      var docName = (mprops['Document Name'] && mprops['Document Name'].title) || [];
      var resume = (mprops['Résumé du document'] && mprops['Résumé du document'].rich_text) || [];
      var status = (mprops['Status'] && mprops['Status'].select && mprops['Status'].select.name) || '';
      var modDate = (mprops['Date de Modification'] && mprops['Date de Modification'].date && mprops['Date de Modification'].date.start) || '';
      var creaDate = (mprops['Date de Création'] && mprops['Date de Création'].date && mprops['Date de Création'].date.start) || '';
      var bestDate = modDate || creaDate || m.last_edited_time || m.created_time || '';
      interactions.push({
        kind: 'document',
        type: 'MOU / Contrat',
        title: richTextValue_(docName) || '(sans titre)',
        summary: richTextValue_(resume),
        status: status,
        date: (bestDate || '').slice(0, 10),
        url: m.url || notionPageUrl_(m.id)
      });
    } catch (_e) {}
  }

  // Trie par date desc
  interactions.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

  return {
    situation: situation,  // relue depuis la page Conversation (champs Situation *)
    upcoming: [],          // v2 : à wirer plus tard
    interactions: interactions
  };
}

/* ─── last_triage_report ─────────────────────────────────────── */
function handleLastTriageReport_(_body) {
  try {
    var resp = notionFetch_('POST', '/databases/' + TASKS_DB_ID + '/query', {
      filter: { property: 'Tags', multi_select: { contains: 'daily-mail-triage' } },
      sorts: [{ property: 'Date de création', direction: 'descending' }],
      page_size: 1
    });
    if (!resp.results || !resp.results.length) return { found: false };
    var page = resp.results[0];
    var title = (page.properties[TASKS_TITLE_PROP] && page.properties[TASKS_TITLE_PROP].title) || [];
    // Stats : parsées depuis le champ Logs si présent
    var logs = (page.properties['Logs'] && page.properties['Logs'].rich_text) || [];
    var logsText = richTextValue_(logs);
    var stats = { triaged: null, archived: null, prio1: null };
    var m1 = logsText.match(/(\d+)\s+tri[ée]s?/i);  if (m1) stats.triaged  = parseInt(m1[1], 10);
    var m2 = logsText.match(/(\d+)\s+archiv/i);     if (m2) stats.archived = parseInt(m2[1], 10);
    var m3 = logsText.match(/(\d+)\s+(?:prio\s*1|P1)/i); if (m3) stats.prio1 = parseInt(m3[1], 10);
    return {
      found: true,
      title: richTextValue_(title),
      stats: stats,
      run_at: page.created_time,
      url: page.url || notionPageUrl_(page.id)
    };
  } catch (e) {
    return { found: false, error: String(e && e.message || e) };
  }
}

/* ─── run_triage : crée une tâche Backlog manuelle ─────────── */
function handleRunTriage_(_body) {
  var properties = {};
  properties[TASKS_TITLE_PROP] = { title: [{ text: { content: 'Lancer daily-mail-triage (hors planning)' } }] };
  properties['Type d\'action'] = { select: { name: 'Mail' } };
  properties['Mode']    = { select: { name: "Confier à l'IA" } };
  properties['Etat']    = { status: { name: 'A faire' } };
  properties['Priorité']= { select: { name: 'Prio 2' } };
  properties['Tags']    = { multi_select: [{ name: 'daily-mail-triage' }] };
  properties['Prompt']  = { rich_text: [{ text: { content: 'Lance un cycle complet de daily-mail-triage maintenant. Déclenché depuis la sidebar Missive (Empty Shell). Reprise par execute-task-backlog au prochain cron.' } }] };
  var task = notionFetch_('POST', '/pages', {
    parent: { database_id: TASKS_DB_ID }, properties: properties
  });
  return {
    queued: true,
    task_id: task.id,
    task_url: task.url || notionPageUrl_(task.id)
  };
}

/* ─── submit_*_feedback : insert dans Feedback Atomic ────────── */
function handleSubmitFeedback_(body, kind) {
  var title = String(body.title || body.message || '(feedback sans titre)').slice(0, 200);
  var text  = String(body.text || body.message || '');
  var severity = String(body.severity || 'medium');
  var domain = kind === 'rules' ? 'Workflow' : 'Skill';
  var type = String(body.type || 'improvement'); // bug | improvement | friction | rex

  var properties = {
    'Titre': { title: [{ text: { content: title } }] },
    'Domain': { select: { name: domain } },
    'Type':   { select: { name: type } },
    'Severity': { select: { name: severity } },
    'Status': { status: { name: 'Pas commencé' } }
  };
  if (text) properties['Demande utilisateur'] = { rich_text: [{ text: { content: text.slice(0, 1900) } }] };
  if (body.conversation_id) properties['Context'] = { url: 'https://mail.missiveapp.com/#inbox/conversations/' + body.conversation_id };

  var page = notionFetch_('POST', '/pages', {
    parent: { data_source_id: FEEDBACK_DB_ID }, properties: properties
  });
  return { success: true, feedback_id: page.id, url: page.url || notionPageUrl_(page.id) };
}

/* ─── add_field_to_notion : PATCH générique (whitelist) ─────── */
const ADD_FIELD_WHITELIST = {
  'Société': 'rich_text',
  'Nom de domaine': 'rich_text',
  'Description': 'rich_text',
  'Lien Folk': 'url',
  'ID folk': 'rich_text',
  'Téléphone': 'phone_number',
  'E-mail': 'email'
};
function handleAddFieldToNotion_(body) {
  var pageId = String(body.page_id || '');
  var field = String(body.field || '');
  var value = body.value;
  if (!pageId) return { success: false, error: 'page_id required' };
  var kind = ADD_FIELD_WHITELIST[field];
  if (!kind) return { success: false, error: 'field_not_whitelisted: ' + field };

  var prop = {};
  if (kind === 'rich_text')       prop[field] = { rich_text: [{ text: { content: String(value || '') } }] };
  else if (kind === 'phone_number') prop[field] = { phone_number: String(value || '') };
  else if (kind === 'email')      prop[field] = { email: String(value || '') };
  else if (kind === 'url')        prop[field] = { url: String(value || '') };

  notionFetch_('PATCH', '/pages/' + pageId, { properties: prop });
  return { success: true };
}

/* ─── update_task : PATCH sur Tasks Backlog ────────────────── */
function handleUpdateTask_(body) {
  var id = String(body.id || '');
  if (!id) return { success: false, error: 'id required' };
  var properties = {};
  if (body.name)     properties[TASKS_TITLE_PROP] = { title: [{ text: { content: String(body.name) } }] };
  if (body.deadline) properties['Due'] = { date: { start: String(body.deadline) } };
  if (body.prio)     properties['Priorité'] = { select: { name: priorityToNotion_(String(body.prio)) } };
  if (body.assignee) properties['Mode'] = { select: { name: assigneeToMode_(String(body.assignee)) } };
  if (typeof body.done === 'boolean') {
    properties['Etat'] = { status: { name: body.done ? 'Terminé' : 'A faire' } };
    properties['Done'] = body.done ? { date: { start: new Date().toISOString().slice(0, 10) } } : { date: null };
  }
  if (!Object.keys(properties).length) return { success: false, error: 'nothing_to_update' };
  notionFetch_('PATCH', '/pages/' + id, { properties: properties });
  return { success: true };
}

/* ─── update_situation : append à un champ Situation (Conv) ─── */
function handleUpdateSituation_(body) {
  var convId = String(body.conversation_id || '');
  var text   = String(body.text || '').trim();
  if (!convId) return { success: false, error: 'conversation_id required' };
  if (!text)   return { success: false, error: 'text required' };
  var pageId = ensureConvPage_(convId);
  // Stocke dans le champ "Instruction spécifique" (champ texte existant) — la spec agent
  // pourra introduire un champ dédié "Situation" si besoin
  var prop = cfg_('CONV_INSTRUCTIONS_PROP') || 'Instruction spécifique';
  appendToRichText_(pageId, prop, 'Situation : ' + text);
  return { success: true, conv_page_id: pageId };
}

/* ─── signature_action : router vers la skill juridique ──────
   Note : le frontend envoie {action: 'signature_action', action: 'legal_analysis'}
   ce qui écrase la routing key. On accepte donc sub_action/kind/sig_action
   en priorité, et fallback sur body.action si le switch nous a routés ici. */
const SLACK_LEGAL_CHANNEL = '#ai-assistan-legal';

/* ─── odoo_sign : signe en direct via Odoo JSON-RPC ─── */
/*
 * Connexion Odoo JSON-RPC (prod) :
 *   URL  : https://po-factories-production.odoo.com
 *   DB   : po-factories-production
 *   User : benoit@plasticodyssey.org (res.users id 2)
 *   Key  : secret Doppler ODOO_API_KEY
 *
 * Profil signataire V1 (statique) :
 *   Nom      : "Benoit BLANCHER"
 *   Fait à   : "Dakar" (ou body.lieu)
 *   Date     : date du jour
 *
 * Retourne { success: true, doc_name, signed_at } ou { success: false, error }
 */
var ODOO_URL = 'https://po-factories-production.odoo.com';
var ODOO_DB  = 'po-factories-production';

function handleOdooSign_(body) {
  var docName    = String(body.doc_name || body.subject || '');
  var lieu       = String(body.lieu || 'Dakar');
  var signerName = String(body.nom  || 'Benoit BLANCHER');
  var today      = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy');

  try {
    var apiKey = getSecret_('ODOO_API_KEY');

    // ── 1. Authentification JSON-RPC → uid ──
    var uid = odooRpc_('common', 'authenticate', [ODOO_DB, 'benoit@plasticodyssey.org', apiKey, {}]);
    if (!uid) return { success: false, error: 'Authentification Odoo échouée' };

    // ── 2. Trouver les sign.request.item en attente pour Benoît ──
    var items = odooCall_(uid, apiKey, 'sign.request.item', 'search_read',
      [[['signer_email', '=', 'benoit@plasticodyssey.org'], ['state', '=', 'sent']]],
      { fields: ['id', 'sign_request_id', 'role_id', 'access_token'] }
    );

    // Filtrer : émetteur = Ouraye (create_uid 59), sign.request à l'état sent
    var target = null;
    for (var i = 0; i < items.length; i++) {
      var reqId = items[i].sign_request_id && items[i].sign_request_id[0];
      if (!reqId) continue;
      var reqs = odooCall_(uid, apiKey, 'sign.request', 'read',
        [[reqId]],
        { fields: ['id', 'reference', 'state', 'create_uid', 'template_id'] }
      );
      var req = reqs && reqs[0];
      if (req && req.state === 'sent' && req.create_uid && req.create_uid[0] === 59) {
        target = { item: items[i], req: req };
        break;
      }
    }

    if (!target) {
      return { success: false, error: 'Aucune demande d\'Ouraye en attente de ta signature. Elle est peut-être déjà signée ou expirée.' };
    }

    var itemId     = target.item.id;
    var roleId     = target.item.role_id && target.item.role_id[0];
    var templateId = target.req.template_id && target.req.template_id[0];

    // ── 3. Identifier les champs du template pour ce rôle ──
    var signItems = odooCall_(uid, apiKey, 'sign.item', 'search_read',
      [[['template_id', '=', templateId], ['responsible_id', '=', roleId]]],
      { fields: ['id', 'type_id', 'name', 'required'] }
    );

    // ── 4. Charger la signature enregistrée sur le compte Benoît ──
    var users = odooCall_(uid, apiKey, 'res.users', 'read',
      [[uid]],
      { fields: ['sign_signature', 'sign_initials'] }
    );
    var userData = users && users[0];
    if (!userData || !userData.sign_signature) {
      return { success: false, error: 'Aucune signature enregistrée dans Odoo. Va dans Préférences > Signature pour en déposer une.' };
    }
    var sigBlob  = userData.sign_signature;
    var initBlob = userData.sign_initials || sigBlob;

    // ── 5. Construire le payload { sign_item_id: valeur } ──
    var payload = {};
    for (var j = 0; j < signItems.length; j++) {
      var si       = signItems[j];
      var typeSlug = (si.type_id && si.type_id[1] ? si.type_id[1] : '').toLowerCase();
      if (typeSlug === 'signature')                           { payload[String(si.id)] = sigBlob;    }
      else if (typeSlug === 'initials' || typeSlug === 'initial') { payload[String(si.id)] = initBlob;   }
      else if (typeSlug === 'name'   || si.name === 'Nom')   { payload[String(si.id)] = signerName; }
      else if (typeSlug === 'date')                          { payload[String(si.id)] = today;       }
      else if (typeSlug === 'text')                          { payload[String(si.id)] = lieu;        }
      // Autres types (checkbox, radio…) : skippés en V1
    }

    // ── 6. Signer via le contrôleur web Odoo (sign() exige sudo, impossible en JSON-RPC) ──
    var accessToken = target.item.access_token;
    if (!accessToken) throw new Error('access_token absent sur sign.request.item ' + itemId);
    var signUrl = ODOO_URL + '/sign/sign_request_item/sign/' + target.req.id + '/' + accessToken;
    var signResp = UrlFetchApp.fetch(signUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: 1, params: { signature: payload } }),
      muteHttpExceptions: true,
    });
    var signData = JSON.parse(signResp.getContentText());
    if (signData.error) {
      throw new Error('Odoo Sign error: ' + JSON.stringify(signData.error.data || signData.error).slice(0, 300));
    }

    return {
      success:    true,
      doc_name:   target.req.reference || docName,
      signed_at:  today,
      request_id: target.req.id,
    };

  } catch (e) {
    return { success: false, error: String((e && e.message) || e) };
  }
}

/* ─── Helpers JSON-RPC Odoo ─── */
function odooRpc_(service, method, args) {
  var resp = UrlFetchApp.fetch(ODOO_URL + '/jsonrpc', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: 1,
      params: { service: service, method: method, args: args },
    }),
    muteHttpExceptions: true,
  });
  var data = JSON.parse(resp.getContentText());
  if (data.error) throw new Error('Odoo RPC error: ' + JSON.stringify(data.error).slice(0, 300));
  return data.result;
}

function odooCall_(uid, apiKey, model, method, args, kwargs) {
  return odooRpc_('object', 'execute_kw', [
    ODOO_DB, uid, apiKey, model, method, args, kwargs || {},
  ]);
}

function handleSignatureAction_(body) {
  var action = String(body.sub_action || body.kind || body.sig_action || body.action || '');
  var convId = String(body.conversation_id || '');
  if (!convId) return { success: false, error: 'conversation_id required' };

  if (action === 'legal_analysis')  return handleLegalAnalysis_(body);
  if (action === 'sign_documents')  return handleSignDocuments_(body);
  if (action === 'generate_nda')    return handleGenerateNda_(body);
  return { success: false, error: 'unknown_signature_action: ' + action };
}

/* ─── legal_analysis : analyse via Claude + commentaire Missive + Slack si signature ─── */

function handleLegalAnalysis_(body) {
  var convId = String(body.conversation_id || '');
  var mainName = (body.main && body.main.name) || '';
  var subject = String(body.subject || '');
  var personInstr = String(body.person_instructions || '');

  // 1. Extraire le contenu pertinent depuis Missive API (PJ si fournies, sinon body du dernier message)
  var contextDoc = '';
  var attachmentIds = body.attachment_ids || [];
  var docTitle = '(document Missive)';
  try {
    var msgs = missiveListMessages_(convId, 5);
    var lastMsg = (msgs.messages || [])[0] || null;
    if (lastMsg) {
      contextDoc += 'Message expéditeur : ' + ((lastMsg.from_field && lastMsg.from_field.name) || '') + '\n';
      contextDoc += 'Date : ' + (lastMsg.delivered_at || '') + '\n';
      contextDoc += 'Subject : ' + (lastMsg.subject || subject) + '\n\n';
      var bodyText = lastMsg.body || lastMsg.preview || '';
      contextDoc += 'Corps du dernier message :\n' + String(bodyText).slice(0, 4000) + '\n';
      var atts = lastMsg.attachments || [];
      if (atts.length) {
        contextDoc += '\nPièces jointes détectées (' + atts.length + ') :\n';
        atts.forEach(function (a) { contextDoc += '  - ' + (a.filename || a.name || a.id) + ' (' + (a.media_type || '') + ')\n'; });
        docTitle = atts[0].filename || docTitle;
      }
    }
  } catch (e) {
    contextDoc = '[Missive API indisponible : ' + e.message + ']\n\nAnalyse basée sur les méta-données fournies par la sidebar.';
  }

  // 2. Analyse via Claude Sonnet — classification + verdict
  var apiKey = getSecret_('ANTROPIC_API_TOKEN');
  var system = 'Tu es un assistant juridique pour Plastic Odyssey Factories (POF, SAS française). ' +
    'Tu analyses un document juridique extrait d\'un mail Missive et tu produis un rapport STRICT JSON : ' +
    '{"type": "NDA|Contrat de travail|Contrat corporate|MOU|Pacte d\'associés|Autre", ' +
    '"verdict": "OK|ALERT|BLOCK", ' +
    '"score_anomalie": 0-100, ' +
    '"red_flags": ["..."], ' +
    '"points_cles": ["..."], ' +
    '"recommandation": "...", ' +
    '"signature_requise": boolean, ' +
    '"juridiction_detectee": "FR|SN|EN|Autre|Inconnue"}. ' +
    'OK = peut être signé tel quel par Benoit. ALERT = points à vérifier avant signature. BLOCK = anomalies critiques, ne pas signer. ' +
    'Score anomalie : 0 = standard POF, 100 = totalement non conforme. ' +
    'Tu réponds en français, sans markdown autour du JSON.';
  var prompt =
    'Sujet du mail : ' + subject + '\n' +
    'Interlocuteur : ' + mainName + '\n' +
    (personInstr ? '\nContexte Notion sur la personne :\n' + personInstr + '\n' : '') +
    '\n--- DOCUMENT ---\n' + contextDoc;

  var anaRes = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      system: system,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });
  if (anaRes.getResponseCode() !== 200) {
    return { success: false, error: 'anthropic_' + anaRes.getResponseCode() };
  }
  var anaData = JSON.parse(anaRes.getContentText());
  var anaTextBlock = (anaData.content || []).filter(function (b) { return b.type === 'text'; })[0];
  var report = parseJsonLoose_(anaTextBlock ? anaTextBlock.text : '');
  if (!report) return { success: false, error: 'invalid_analysis_json' };

  // 3. Format du commentaire Missive
  var verdictIcon = report.verdict === 'OK' ? '✅' : (report.verdict === 'BLOCK' ? '🚫' : '⚠️');
  var commentText =
    verdictIcon + ' Analyse juridique sidebar — ' + (report.type || 'Document') + '\n' +
    'Verdict : ' + (report.verdict || 'Inconnu') + ' (score anomalie : ' + (report.score_anomalie || 0) + '/100)\n' +
    'Juridiction détectée : ' + (report.juridiction_detectee || 'Inconnue') + '\n\n' +
    (report.red_flags && report.red_flags.length
      ? 'Red flags :\n' + report.red_flags.map(function (r) { return '  • ' + r; }).join('\n') + '\n\n'
      : '') +
    (report.points_cles && report.points_cles.length
      ? 'Points clés :\n' + report.points_cles.map(function (p) { return '  • ' + p; }).join('\n') + '\n\n'
      : '') +
    'Recommandation : ' + (report.recommandation || '—') + '\n' +
    (report.signature_requise ? '\n→ Signature requise. Slack envoyé à #ai-assistan-legal.' : '');

  // 4. Poster en commentaire Missive (équipe-visible)
  var commentResult = { posted: false };
  try {
    var notifTitle = verdictIcon + ' Analyse juridique — ' + (report.type || 'Document') + ' (' + (report.verdict || '') + ')';
    missivePostComment_(convId, commentText, notifTitle);
    commentResult.posted = true;
  } catch (e) {
    commentResult.error = e.message;
  }

  // 5. Slack DM si signature requise OU si verdict ALERT/BLOCK
  var slackResult = { sent: false };
  if (report.signature_requise || report.verdict === 'ALERT' || report.verdict === 'BLOCK') {
    var slackText = verdictIcon + ' *Document juridique à examiner* — ' + (report.type || 'Document') + '\n' +
      'Conversation Missive : `' + convId + '`\n' +
      'Interlocuteur : ' + mainName + '\n' +
      'Verdict : *' + (report.verdict || '') + '* (score ' + (report.score_anomalie || 0) + '/100)\n' +
      'Recommandation : ' + (report.recommandation || '—') + '\n' +
      (report.red_flags && report.red_flags.length
        ? '\n_Red flags_ :\n' + report.red_flags.map(function (r) { return '• ' + r; }).join('\n')
        : '');
    var sres = slackPost_(SLACK_LEGAL_CHANNEL, slackText);
    slackResult.sent = !!(sres && sres.ok);
    if (!sres || !sres.ok) slackResult.error = (sres && sres.error) || 'no_token';
  }

  return {
    success: true,
    action: 'legal_analysis',
    report: report,
    comment: commentResult,
    slack: slackResult
  };
}

/* ─── sign_documents : queue Backlog + Slack DM avec contexte ─── */

function handleSignDocuments_(body) {
  var convId = String(body.conversation_id || '');
  var signataires = body.signataires || [];
  var mainName = (body.main && body.main.name) || '';

  // Queue Backlog pour traitement Odoo Sign (templates en suspens, ce sera plug-and-play)
  var taskTitle = 'Lancer signature — conv ' + convId.slice(0, 12);
  var promptText = 'Lancer signature Odoo Sign via odoo-sign-launcher.\n' +
    'Signataires : ' + JSON.stringify(signataires) + '\n' +
    'Attachments IDs : ' + JSON.stringify(body.attachment_ids || []) + '\n' +
    'Conv Missive : ' + convId + '\n' +
    '[NB] Templates Odoo Sign en cours de création. Cette tâche est queue jusqu\'à activation.';

  var properties = {};
  properties[TASKS_TITLE_PROP] = { title: [{ text: { content: taskTitle } }] };
  properties['Type d\'action'] = { select: { name: 'Autre' } };
  properties['Mode']    = { select: { name: "Confier à l'IA" } };
  properties['Etat']    = { status: { name: 'AI -⏳ En attente' } };
  properties['Priorité']= { select: { name: 'Prio 2' } };
  properties['Tags']    = { multi_select: [{ name: 'sidebar-legal' }] };
  properties['Prompt']  = { rich_text: [{ text: { content: promptText.slice(0, 1900) } }] };

  var task = notionFetch_('POST', '/pages', {
    parent: { database_id: TASKS_DB_ID }, properties: properties
  });

  // Lier à la conversation
  try {
    var convPageId = ensureConvPage_(convId);
    var convPage = notionFetch_('GET', '/pages/' + convPageId, null);
    var existing = (convPage.properties['Tâche associée'] && convPage.properties['Tâche associée'].relation) || [];
    existing.push({ id: task.id });
    notionFetch_('PATCH', '/pages/' + convPageId, {
      properties: { 'Tâche associée': { relation: existing } }
    });
  } catch (_e) {}

  // Slack DM Benoit
  var slackText = '🖋 *Signature demandée depuis sidebar*\n' +
    'Conv : `' + convId + '`\n' +
    'Interlocuteur : ' + mainName + '\n' +
    'Signataires : ' + signataires.map(function (s) { return s.name || s.email || s; }).join(', ') + '\n' +
    '[Templates Odoo en suspens — traitement manuel pour cette itération]';
  var sres = slackPost_(SLACK_LEGAL_CHANNEL, slackText);

  return {
    success: true,
    action: 'sign_documents',
    queued: true,
    task_id: task.id,
    task_url: task.url || notionPageUrl_(task.id),
    slack: { sent: !!(sres && sres.ok), error: (sres && !sres.ok) ? sres.error : null },
    note: 'Templates Odoo Sign en suspens. Tâche en attente jusqu\'à activation.'
  };
}

/* ─── generate_nda : queue Backlog + Slack DM avec params ─── */

function handleGenerateNda_(body) {
  var convId = String(body.conversation_id || '');
  var mainName = (body.main && body.main.name) || '';
  var societe = String(body.societe || (body.main && body.main.company) || '');
  var langue = String(body.langue || 'FR');

  var taskTitle = 'Générer NDA POF — ' + (mainName || societe || convId.slice(0, 12));
  var promptText = 'Générer un NDA POF (Template Odoo Sign PDF) puis envoyer en signature via odoo-sign-launcher.\n' +
    'Signataire : ' + mainName + ' (' + ((body.main && body.main.email) || '') + ')\n' +
    'Société : ' + societe + '\n' +
    'Langue : ' + langue + '\n' +
    'Conv : ' + convId + '\n' +
    '[NB] Template Odoo Sign NDA ' + langue + ' à créer. Une fois créé, plug-and-play.';

  var properties = {};
  properties[TASKS_TITLE_PROP] = { title: [{ text: { content: taskTitle } }] };
  properties['Type d\'action'] = { select: { name: 'Redaction' } };
  properties['Mode']    = { select: { name: "Confier à l'IA" } };
  properties['Etat']    = { status: { name: 'AI -⏳ En attente' } };
  properties['Priorité']= { select: { name: 'Prio 2' } };
  properties['Tags']    = { multi_select: [{ name: 'sidebar-legal' }] };
  properties['Prompt']  = { rich_text: [{ text: { content: promptText.slice(0, 1900) } }] };

  var task = notionFetch_('POST', '/pages', {
    parent: { database_id: TASKS_DB_ID }, properties: properties
  });

  // Lier à la conversation
  try {
    var convPageId = ensureConvPage_(convId);
    var convPage = notionFetch_('GET', '/pages/' + convPageId, null);
    var existing = (convPage.properties['Tâche associée'] && convPage.properties['Tâche associée'].relation) || [];
    existing.push({ id: task.id });
    notionFetch_('PATCH', '/pages/' + convPageId, {
      properties: { 'Tâche associée': { relation: existing } }
    });
  } catch (_e) {}

  var slackText = '📄 *NDA POF à générer depuis sidebar*\n' +
    'Conv : `' + convId + '`\n' +
    'Signataire : ' + mainName + '\n' +
    'Société : ' + societe + '\n' +
    'Langue : ' + langue + '\n' +
    '[Template Odoo Sign en attente de création — traitement manuel pour cette itération]';
  var sres = slackPost_(SLACK_LEGAL_CHANNEL, slackText);

  return {
    success: true,
    action: 'generate_nda',
    queued: true,
    task_id: task.id,
    task_url: task.url || notionPageUrl_(task.id),
    slack: { sent: !!(sres && sres.ok), error: (sres && !sres.ok) ? sres.error : null },
    note: 'Template Odoo Sign NDA en attente. Tâche en attente jusqu\'à activation.'
  };
}

/* ═══════════════════════════════════════════════════════════════
   ACTIONS DIRECTES (sans Backlog)
   ═══════════════════════════════════════════════════════════════ */

const PODCAST_WEBHOOK = 'https://hooks.zapier.com/hooks/catch/13566922/uwyi8u9/';

/** Append helper : ajoute une ligne au rich_text existant (max 2000 chars). */
function appendToRichText_(pageId, propName, addition) {
  var page = notionFetch_('GET', '/pages/' + pageId, null);
  var existing = (page.properties[propName] && page.properties[propName].rich_text) || [];
  var current = richTextValue_(existing);
  var stamped = '[' + new Date().toISOString().slice(0, 10) + '] ' + addition;
  var next = current ? (current + '\n\n' + stamped) : stamped;
  if (next.length > 1990) next = next.slice(-1990); // garde la fin si overflow

  var properties = {};
  properties[propName] = { rich_text: [{ text: { content: next } }] };
  notionFetch_('PATCH', '/pages/' + pageId, { properties: properties });
  return next;
}

/** Retrouve la page Personnes via page_id direct, puis email, puis fallback nom. */
function resolveContactPageId_(body) {
  if (body.contact_page_id) return body.contact_page_id;
  var dbId = cfg_('NOTION_PERSONS_DB');
  var email = String(body.contact_email || '').toLowerCase();
  var name  = String(body.contact_name || '').trim();
  if (email) {
    var emailProp = cfg_('PERSON_EMAIL_PROP') || 'E-mail';
    var r1 = notionFetch_('POST', '/databases/' + dbId + '/query', {
      filter: { property: emailProp, email: { equals: email } }, page_size: 1
    });
    if (r1.results && r1.results.length) return r1.results[0].id;
  }
  if (name) {
    var r2 = notionFetch_('POST', '/databases/' + dbId + '/query', {
      filter: { property: 'Nom', title: { contains: name } }, page_size: 1
    });
    if (r2.results && r2.results.length) return r2.results[0].id;
  }
  return null;
}

/* HTML → texte brut (les corps de messages Missive sont en HTML). */
function htmlToText_(s) {
  if (!s) return '';
  var t = String(s);
  t = t.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ');
  t = t.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n');
  t = t.replace(/<[^>]+>/g, ' ');
  t = t.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
       .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
  t = t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return t;
}

/* ─── brief_podcast : synthèse de ce qui est coché (résumé + fil + PJ lues + sources) ──
 * Unifié pour les deux déclencheurs frontend (gros bouton + footer PODCAST).
 * - include_summary / summary_text : le résumé édité, si coché.
 * - attachment_ids : PJ sélectionnées (absent => toutes les PJ non-inline).
 * - sources : sources identifiées par analyze_content.
 * Les PDF sélectionnés sont téléchargés et envoyés à Claude en blocs document (base64,
 * lecture native, pas de header beta). Forme validée contre l'API réelle. */
function handleBriefPodcast_(body) {
  var convId = String(body.conversation_id || '');
  if (!convId) return { success: false, error: 'conversation_id required' };

  var subject = String(body.subject || '');
  var mainName = (body.main && body.main.name) || '';
  var mainEmail = (body.main && body.main.email) || '';
  var othersList = (body.others || []).map(function (p) { return p.name || p.email; }).join(', ');
  var personInstr = String(body.person_instructions || '');
  var convInstr   = String(body.conv_instructions || '');
  var includeSummary = body.include_summary !== false; // défaut true
  var summaryText = String(body.summary_text || '');
  var selectedIds = Array.isArray(body.attachment_ids) ? body.attachment_ids : null; // null => toutes
  var sources = Array.isArray(body.sources) ? body.sources : [];

  // 1. Fil Missive (texte + PJ) en un seul appel — limit 10 (cap API).
  var convText = '';
  var docBlocks = [];     // PDF lus → blocs document Claude
  var pjRead = [];        // noms des PJ lues
  var pjSkipped = [];     // PJ non lues (trop lourdes, non-PDF, échec)
  var pdfBudgetBytes = 18 * 1024 * 1024; // garde-fou cumulatif
  var spentBytes = 0;
  var maxPdfs = 5;
  try {
    var msgs = (missiveListMessages_(convId, 10).messages) || [];
    var ordered = msgs.slice().reverse(); // missiveListMessages_ renvoie le plus récent d'abord
    var parts = [];
    var seenAtt = {};
    ordered.forEach(function (m) {
      var who = (m.from_field && (m.from_field.name || m.from_field.address)) || '';
      var txt = htmlToText_(m.body || m.preview || '');
      if (txt) parts.push((who ? who + ' :\n' : '') + txt);
      (m.attachments || []).forEach(function (a) {
        if (isDecorativeImage_(a, m.body)) return;
        var id = a.id || '';
        var name = a.filename || a.name || '(sans nom)';
        var key = name + '|' + (a.size || '');
        if (seenAtt[key]) return; seenAtt[key] = true;
        if (selectedIds && id && selectedIds.indexOf(id) === -1) return; // non sélectionnée
        var ext = attachmentExt_(a, name);
        if (ext !== 'pdf' || !a.url) { pjSkipped.push(name + (ext ? ' (.' + ext + ', non lu)' : ' (non lu)')); return; }
        var szNum = Number(a.size) || 0;
        if (szNum > 12 * 1024 * 1024) { pjSkipped.push(name + ' (PDF trop volumineux, ' + humanFileSize_(szNum) + ')'); return; }
        if (pjRead.length >= maxPdfs || (spentBytes + szNum) > pdfBudgetBytes) {
          pjSkipped.push(name + ' (budget PJ atteint)'); return;
        }
        try {
          var pdf = UrlFetchApp.fetch(a.url, { muteHttpExceptions: true });
          if (pdf.getResponseCode() === 200) {
            var bytes = pdf.getBlob().getBytes();
            spentBytes += bytes.length;
            docBlocks.push({
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: Utilities.base64Encode(bytes) },
              title: name
            });
            pjRead.push(name);
          } else {
            pjSkipped.push(name + ' (téléchargement ' + pdf.getResponseCode() + ')');
          }
        } catch (e2) {
          pjSkipped.push(name + ' (téléchargement échoué)');
        }
      });
    });
    convText = parts.join('\n\n---\n\n');
    if (convText.length > 12000) convText = convText.slice(0, 12000) + '…';
    Logger.log('brief_podcast : ' + pjRead.length + ' PDF lus, ' + pjSkipped.length + ' PJ ignorées, conv ' + convId);
  } catch (e) {
    Logger.log('brief_podcast : fil Missive indisponible (' + convId + ') : ' + e.message);
  }

  var apiKey = getSecret_('ANTROPIC_API_TOKEN');

  // Prompt aligné sur la skill /podcast-generator (même fonctionnement) + lecture PJ/sources.
  var system = 'Tu rédiges le briefing audio d un assistant exécutif affûté pour Benoit (CEO POF). ' +
    'Ce n est PAS un podcast journalistique : c est un briefing qui FILTRE, pas qui résume. ' +
    'Voix : tu connais Benoit, POF, ses priorités, son vocabulaire. Tu l adresses en "tu". Phrases courtes, déclaratives, une idée par phrase. Comme un CFO briefe un board. Pas d em-dashes. ' +
    'INTERDIT (zéro tolérance) : "Bienvenue", "Dans ce briefing", "Commençons", "Pour résumer", "En conclusion", "Passons à", "Il est important de noter", les questions rhétoriques, les clôtures ("Voilà pour aujourd hui", "Bonne journée"), le hedging ("il semblerait", "on pourrait penser"), le méta ("ce qu il faut retenir", "le point clé ici"). ' +
    'GARDER, dans cet ordre : 1) décisions prises ou à prendre (qui décide quoi, pour quand) 2) chiffres qui changent quelque chose 3) risques et blocages 4) engagements pris 5) info qui contredit une hypothèse. ' +
    'TUER : le contexte déjà connu, les descriptions de process, les caveats inutiles, les répétitions, tout ce qui est "intéressant" mais pas actionnable. ' +
    'Structure : accroche (1 phrase, l essentiel, aucun échauffement) ; corps par sujet décroissant en impact (fait précis avec nom/chiffre/date, puis implication, puis action) ; bottom line (1 phrase, celle qui compte si Benoit décroche). ' +
    'Format audio : pas de listes à puces (inaudibles), séquence à l oral ("Premier point.", "Deuxième chose."). Chiffres et montants EN TOUTES LETTRES ("douze millions d euros", jamais "12M€"). Max 1000 mots. ' +
    'IMPORTANT : la pièce jointe (souvent un PDF) est généralement l élément le plus important. Lis-la, analyse-la, restitue ses points clés : montants, dates, échéances, engagements, risques. ' +
    'Intègre les sources quand elles sont présentes. Sans instruction spécifique, déduis du sujet et du contenu ce qui compte vraiment. N invente jamais de chiffres ou de dates.';

  var p = [];
  p.push('Génère un briefing audio sur cette conversation Missive pour que Benoit comprenne où ça en est, sur son trajet vélo.');
  p.push('Contact principal : ' + mainName + (mainEmail ? ' (' + mainEmail + ')' : ''));
  if (subject) p.push('Sujet : ' + subject);
  if (othersList) p.push('Autres participants : ' + othersList);
  if (personInstr) p.push('\nInstructions Notion (personne) :\n' + personInstr);
  if (convInstr) p.push('\nInstructions Notion (conversation) :\n' + convInstr);
  if (includeSummary && summaryText) p.push('\nRésumé déjà rédigé (intègre-le et affine-le) :\n' + summaryText);
  if (convText) p.push('\n--- Fil de la conversation ---\n' + convText + '\n--- fin du fil ---');
  if (sources.length) p.push('\nSources identifiées :\n' + sources.map(function (s) {
    return '  - ' + (s.label || s.url || s.type || '') + (s.url ? ' (' + s.url + ')' : '');
  }).join('\n'));
  if (pjRead.length) p.push('\nPièces jointes fournies ci-dessous, à LIRE et résumer : ' + pjRead.join(', '));
  if (pjSkipped.length) p.push('\nPièces jointes non lues (mentionne-les seulement si pertinent) : ' + pjSkipped.join(', '));
  if (!includeSummary && !summaryText) p.push('\n(Aucun résumé pré-rédigé : construis la synthèse depuis le fil et les pièces jointes.)');

  var userContent = [{ type: 'text', text: p.join('\n') }];
  for (var i = 0; i < docBlocks.length; i++) userContent.push(docBlocks[i]);

  var claudeRes = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2000,
      system: system,
      messages: [{ role: 'user', content: userContent }]
    }),
    muteHttpExceptions: true
  });
  if (claudeRes.getResponseCode() !== 200) {
    return { success: false, error: 'Anthropic ' + claudeRes.getResponseCode() + ': ' + claudeRes.getContentText().slice(0, 200) };
  }
  var data = JSON.parse(claudeRes.getContentText());
  var textBlock = (data.content || []).filter(function (b) { return b.type === 'text'; })[0];
  var text = textBlock ? textBlock.text : '';
  if (!text) return { success: false, error: 'empty Anthropic response' };

  // POST direct au webhook Zapier qui pilote ElevenLabs
  var hookRes = UrlFetchApp.fetch(PODCAST_WEBHOOK, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ Texte_a_lire: text }),
    muteHttpExceptions: true
  });
  if (hookRes.getResponseCode() < 200 || hookRes.getResponseCode() >= 300) {
    return { success: false, error: 'webhook ' + hookRes.getResponseCode(), preview: text.slice(0, 200) };
  }

  return { success: true, preview: text.slice(0, 300), pdfs_read: pjRead.length, pj_skipped: pjSkipped.length };
}

/* ─── add_to_watch : append à "Briefing veille" du contact ─── */

function handleAddToWatch_(body) {
  var convId = String(body.conversation_id || '');
  var category = String(body.category || '');
  if (!convId)   return { success: false, error: 'conversation_id required' };
  if (!category) return { success: false, error: 'category required' };

  var pageId = resolveContactPageId_(body);
  if (!pageId) return { success: false, error: 'contact non identifié dans Notion (ni contact_page_id ni email matché)' };

  // Map category -> Type de veille (multi_select)
  var typeMap = { 'concurrents': 'Conccurent', 'strategiques': 'Strat.', 'appels-a-projets': 'Financement' };
  var typeVeille = typeMap[category] || null;

  var line = 'Catégorie : ' + category + ' (conv Missive ' + convId.slice(0, 12) + ')';
  appendToRichText_(pageId, 'Briefing veille', line);

  // Set Suivi veille = true + ajoute le Type de veille si dispo
  var patch = { properties: { 'Suivi veille': { checkbox: true } } };
  if (typeVeille) {
    var page = notionFetch_('GET', '/pages/' + pageId, null);
    var existingType = (page.properties['Type de veille'] && page.properties['Type de veille'].multi_select) || [];
    var names = existingType.map(function (o) { return o.name; });
    if (names.indexOf(typeVeille) === -1) names.push(typeVeille);
    patch.properties['Type de veille'] = { multi_select: names.map(function (n) { return { name: n }; }) };
  }
  notionFetch_('PATCH', '/pages/' + pageId, patch);

  return { success: true, contact_page_id: pageId, category: category };
}

/* ─── enrich_contact : append instructions à "Briefing veille" ─── */

function handleEnrichContact_(body) {
  var convId = String(body.conversation_id || '');
  var instructions = String(body.instructions || '').trim();
  if (!convId)         return { success: false, error: 'conversation_id required' };
  if (!instructions)   return { success: false, error: 'instructions required' };

  var pageId = resolveContactPageId_(body);
  if (!pageId) return { success: false, error: 'contact non identifié dans Notion' };

  var line = 'Enrichir : ' + instructions + ' (conv ' + convId.slice(0, 12) + ')';
  appendToRichText_(pageId, 'Briefing veille', line);
  return { success: true, contact_page_id: pageId };
}

/* ─── toggle_vip : ajoute/retire ⭐️ VIP du Type multi_select ─── */
function handleToggleVip_(body) {
  var pageId = String(body.page_id || '');
  var nowVip = !!body.vip;
  if (!pageId) return { success: false, error: 'page_id required' };

  var page = notionFetch_('GET', '/pages/' + pageId, null);
  var existing = (page.properties['Type'] && page.properties['Type'].multi_select) || [];
  var names = existing.map(function (o) { return o.name; });
  var idx = names.indexOf(VIP_TAG);
  if (nowVip && idx === -1) names.push(VIP_TAG);
  if (!nowVip && idx !== -1) names.splice(idx, 1);
  notionFetch_('PATCH', '/pages/' + pageId, {
    properties: { 'Type': { multi_select: names.map(function (n) { return { name: n }; }) } }
  });
  return { success: true, vip: nowVip };
}

/* ─── add_phone_to_notion : set le champ Téléphone ─── */
function handleAddPhoneToNotion_(body) {
  var pageId = String(body.page_id || '');
  var phone  = String(body.phone || '').trim();
  if (!pageId) return { success: false, error: 'page_id required' };
  if (!phone)  return { success: false, error: 'phone required' };
  notionFetch_('PATCH', '/pages/' + pageId, {
    properties: { 'Téléphone': { phone_number: phone } }
  });
  return { success: true };
}

/* ─── list_proposed_tasks : Claude analyse, retourne 0-3 tâches actionnables ─── */
function handleListProposedTasks_(body) {
  var convId = String(body.conversation_id || '');
  if (!convId) return { proposed: [] };

  var subject = String(body.subject || '');
  var mainName = (body.main && body.main.name) || '';
  var mainEmail = (body.main && body.main.email) || '';
  var othersList = (body.others || []).map(function (p) { return (p.name || '') + ' (' + (p.email || '') + ')'; }).join(', ');
  var personInstr = String(body.person_instructions || '');
  var convInstr   = String(body.conv_instructions || '');

  // Pas d'éléments de contexte forts ? On retourne tableau vide sans appel IA.
  if (!subject && !personInstr && !convInstr) {
    return { proposed: [] };
  }

  var apiKey;
  try { apiKey = getSecret_('ANTROPIC_API_TOKEN'); }
  catch (_e) { return { proposed: [], error: 'no_anthropic_key' }; }

  var system = 'Tu es un assistant qui analyse une conversation Missive et propose 0 à 3 tâches actionnables pour Benoit (CEO POF). ' +
    'Retourne UNIQUEMENT un JSON valide de la forme : ' +
    '{"proposed":[{"id":"p1","name":"...","description":"...","prio":"P0|P1|P2|P3","assignee":"ai|human","deadline":"YYYY-MM-DD"}]}. ' +
    'Règle : ne propose une tâche QUE si quelque chose est clairement actionnable (decision en attente, deadline mentionnée, engagement à prendre, suite à donner). ' +
    'Si rien d évident : retourne {"proposed":[]}. Pas plus de 3 tâches. P0 si urgent, P1 par défaut. assignee=human si engagement contractuel/relationnel, sinon ai.';

  var today = new Date().toISOString().slice(0, 10);
  var prompt = 'Aujourd hui : ' + today + '\n\n' +
    'Contact principal : ' + mainName + ' (' + mainEmail + ')\n' +
    (subject ? 'Sujet : ' + subject + '\n' : '') +
    (othersList ? 'Autres participants : ' + othersList + '\n' : '') +
    (personInstr ? '\nInstructions Notion sur la personne :\n' + personInstr + '\n' : '') +
    (convInstr ? '\nInstructions Notion sur la conversation :\n' + convInstr + '\n' : '') +
    '\nAnalyse ces éléments. Si une action concrète émerge (relance, validation, envoi, deadline imminente), propose 1-3 tâches. Sinon, retourne proposed: [].';

  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: ANTHROPIC_MODEL, max_tokens: 800, system: system,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return { proposed: [], error: 'anthropic_' + res.getResponseCode() };

  var data = JSON.parse(res.getContentText());
  var textBlock = (data.content || []).filter(function (b) { return b.type === 'text'; })[0];
  var text = textBlock ? textBlock.text : '';
  var parsed = parseJsonLoose_(text);
  if (!parsed || !Array.isArray(parsed.proposed)) return { proposed: [] };

  // Assure des IDs uniques et stables
  var out = parsed.proposed.slice(0, 3).map(function (t, i) {
    return {
      id: t.id || ('p' + (i + 1)),
      name: t.name || '(sans nom)',
      description: t.description || '',
      prio: t.prio || 'P2',
      assignee: t.assignee || 'ai',
      deadline: t.deadline || ''
    };
  });
  return { proposed: out };
}

/* ─── brief_reply : append instructions à "Instruction spécifique" de la conv ─── */

function handleBriefReply_(body) {
  var convId = String(body.conversation_id || '');
  var instructions = String(body.instructions || '').trim();
  if (!convId)       return { success: false, error: 'conversation_id required' };
  if (!instructions) return { success: false, error: 'instructions required' };

  var pageId = ensureConvPage_(convId);
  var instrProp = cfg_('CONV_INSTRUCTIONS_PROP') || 'Instruction spécifique';
  appendToRichText_(pageId, instrProp, 'Brief réponse : ' + instructions);
  return { success: true, conv_page_id: pageId };
}

/* ═══════════════════════════════════════════════════════════════
   TASKS BACKLOG (lecture / création / toggle)
   ═══════════════════════════════════════════════════════════════ */

const TASKS_DB_ID = '332c2ce245e8807ea247f8a7c403c53d';
const TASKS_TITLE_PROP = 'Virements persos '; // titre de la DB (sic, espace inclus)

/** Map spec prio (P0/P1/P2/P3) -> Notion option. P0 et P1 -> Prio 1. */
function priorityToNotion_(prio) {
  if (prio === 'P0' || prio === 'P1') return 'Prio 1';
  if (prio === 'P2') return 'Prio 2';
  if (prio === 'P3') return 'Prio 3';
  return 'Prio 2';
}
function notionToPriority_(name) {
  if (name === 'Prio 1') return 'P1';
  if (name === 'Prio 2') return 'P2';
  if (name === 'Prio 3') return 'P3';
  return 'P2';
}
function assigneeToMode_(assignee) {
  return assignee === 'human' ? 'Humain' : "Confier à l'IA";
}
function modeToAssignee_(mode) {
  return mode === 'Humain' ? 'human' : 'ai';
}

/** Récupère ou crée la page Conversation pour ce convId. Renvoie le pageId. */
function ensureConvPage_(convId) {
  var dbId = cfg_('NOTION_CONVS_DB');
  var idProp = cfg_('CONV_MISSIVE_ID_PROP') || 'Agent session ID';
  var search = notionFetch_('POST', '/databases/' + dbId + '/query', {
    filter: { property: idProp, rich_text: { equals: convId } }, page_size: 1
  });
  if (search.results && search.results.length) return search.results[0].id;
  var newProps = {};
  newProps['Nom'] = { title: [{ text: { content: 'Conv. ' + convId.slice(0, 12) } }] };
  newProps[idProp] = { rich_text: [{ text: { content: convId } }] };
  var created = notionFetch_('POST', '/pages', {
    parent: { database_id: dbId }, properties: newProps
  });
  return created.id;
}

/* ─── list_tasks ───────────────────────────────────────────── */
function handleListTasks_(body) {
  var convId = String(body.conversation_id || '');
  if (!convId) return { tasks: [] };

  var dbId = cfg_('NOTION_CONVS_DB');
  var idProp = cfg_('CONV_MISSIVE_ID_PROP') || 'Agent session ID';
  var search = notionFetch_('POST', '/databases/' + dbId + '/query', {
    filter: { property: idProp, rich_text: { equals: convId } }, page_size: 1
  });
  if (!search.results || !search.results.length) return { tasks: [] };

  var rel = (search.results[0].properties['Tâche associée'] &&
             search.results[0].properties['Tâche associée'].relation) || [];

  var tasks = [];
  for (var i = 0; i < rel.length && i < 30; i++) {
    try {
      var page = notionFetch_('GET', '/pages/' + rel[i].id, null);
      var p = page.properties || {};
      var title = (p[TASKS_TITLE_PROP] && p[TASKS_TITLE_PROP].title) || [];
      var prio = (p['Priorité'] && p['Priorité'].select && p['Priorité'].select.name) || '';
      var mode = (p['Mode'] && p['Mode'].select && p['Mode'].select.name) || '';
      var etat = (p['Etat'] && p['Etat'].status && p['Etat'].status.name) || '';
      var due  = (p['Due'] && p['Due'].date && p['Due'].date.start) || '';
      tasks.push({
        id: page.id,
        name: richTextValue_(title),
        prio: notionToPriority_(prio),
        assignee: modeToAssignee_(mode),
        deadline: due,
        done: (etat === 'Terminé' || etat === 'Archivé'),
        notion_url: page.url || notionPageUrl_(page.id)
      });
    } catch (_e) { /* skip */ }
  }
  return { tasks: tasks };
}

/* ─── create_task ──────────────────────────────────────────── */
function handleCreateTask_(body) {
  var convId   = String(body.conversation_id || '');
  var name     = String(body.name || '').trim();
  var desc     = String(body.description || '');
  var deadline = String(body.deadline || '');
  var prio     = String(body.prio || 'P2');
  var assignee = String(body.assignee || 'ai');

  if (!convId) throw new Error('conversation_id required');
  if (!name)   throw new Error('name required');

  // 1. Garantit l'existence de la page Conversation
  var convPageId = ensureConvPage_(convId);

  // 2. Crée la tâche
  var properties = {};
  properties[TASKS_TITLE_PROP] = { title: [{ text: { content: name } }] };
  properties['Priorité'] = { select: { name: priorityToNotion_(prio) } };
  properties['Mode'] = { select: { name: assigneeToMode_(assignee) } };
  properties['Etat'] = { status: { name: 'A faire' } };
  if (desc)     properties['Prompt'] = { rich_text: [{ text: { content: desc } }] };
  if (deadline) properties['Due'] = { date: { start: deadline } };

  var task = notionFetch_('POST', '/pages', {
    parent: { database_id: TASKS_DB_ID }, properties: properties
  });

  // 3. Lie la tâche à la conversation (PATCH la relation côté Conversation)
  try {
    var convPage = notionFetch_('GET', '/pages/' + convPageId, null);
    var existing = (convPage.properties['Tâche associée'] &&
                    convPage.properties['Tâche associée'].relation) || [];
    existing.push({ id: task.id });
    notionFetch_('PATCH', '/pages/' + convPageId, {
      properties: { 'Tâche associée': { relation: existing } }
    });
  } catch (e) {
    // Lien échoué -> on garde la tâche mais on remonte un warning
  }

  return {
    success: true,
    task: {
      id: task.id,
      name: name,
      prio: prio,
      assignee: assignee,
      deadline: deadline,
      done: false,
      notion_url: task.url || notionPageUrl_(task.id)
    }
  };
}

/* ─── toggle_task ──────────────────────────────────────────── */
function handleToggleTask_(body) {
  var id   = String(body.id || '');
  var done = !!body.done;
  if (!id) throw new Error('id required');
  var properties = {
    'Etat': { status: { name: done ? 'Terminé' : 'A faire' } }
  };
  if (done) properties['Done'] = { date: { start: new Date().toISOString().slice(0, 10) } };
  else      properties['Done'] = { date: null };
  notionFetch_('PATCH', '/pages/' + id, { properties: properties });
  return { success: true };
}

/* ═══════════════════════════════════════════════════════════════
   ACTIONS IA — Mode "queue agent task"
   Chaque action sidebar crée une tâche Backlog en Mode=Confier à l'IA
   avec un prompt typé. L'agent execute-task-backlog (cron 3x/jour)
   ou Build-Lead traite ensuite selon le Type d'action.
   ═══════════════════════════════════════════════════════════════ */

const AGENT_TASK_TEMPLATES = {
  brief_podcast: {
    title: 'Briefing podcast — conv %CONV%',
    type:  'Recherche',
    prompt_prefix: 'Génère un brief podcast à partir du contenu de la conversation Missive %CONV%. Format : 3-4 angles, citations clés, recommandation diffusion. Source : conv Missive.\n\nContext:\n'
  },
  add_to_watch: {
    title: 'Ajouter à la veille (%CATEGORY%) — conv %CONV%',
    type:  'Recherche',
    prompt_prefix: 'Ajouter cette conversation à la veille stratégique POF, catégorie %CATEGORY%. Trigger : veille-strategique-hebdo.\n\nContext:\n'
  },
  estimate_opportunity: {
    title: "Estimer l'opportunité — conv %CONV%",
    type:  'Recherche',
    prompt_prefix: "Évalue l'opportunité business de cette conversation Missive : taille du deal, probabilité, échéance, next steps. Poste le résultat en commentaire Missive sur la conversation.\n\nContext:\n"
  },
  brief_reply: {
    title: 'Brief réponse — conv %CONV%',
    type:  'Mail',
    prompt_prefix: 'Rédige un brouillon de réponse pour la conversation Missive selon les instructions ci-dessous. Pose le brouillon en draft dans Missive.\n\nInstructions :\n'
  },
  send_nda: {
    title: 'Envoyer NDA à %SIGNATAIRE% (%SOCIETE%)',
    type:  'Autre',
    prompt_prefix: "Trigger workflow Odoo Sign (skill odoo-sign-launcher) avec template NDA POF. Paramètres :\n"
  },
  enrich_contact: {
    title: 'Enrichir fiche Notion — conv %CONV%',
    type:  'Recherche',
    prompt_prefix: "Enrichir la fiche Notion du contact principal de la conversation Missive. Utiliser tavily-research + sources publiques. Mettre à jour les champs Notion existants (rôle, société, URLs, etc.).\n\nInstructions Benoit :\n"
  }
};

function handleQueueAgentTask_(body, kind) {
  var convId = String(body.conversation_id || '');
  if (!convId) return { success: false, error: 'conversation_id required' };

  var tpl = AGENT_TASK_TEMPLATES[kind];
  if (!tpl) return { success: false, error: 'unknown agent action: ' + kind };

  var title = tpl.title
    .replace('%CONV%', convId.slice(0, 12))
    .replace('%CATEGORY%', String(body.category || ''))
    .replace('%SIGNATAIRE%', String(body.signataire || ''))
    .replace('%SOCIETE%', String(body.societe || ''));

  // Construit le prompt en assemblant prefix + args utiles
  var promptBody = '';
  if (body.instructions) promptBody += String(body.instructions) + '\n\n';
  if (body.category)     promptBody += 'Category: ' + body.category + '\n';
  if (body.signataire)   promptBody += 'Signataire: ' + body.signataire + '\n';
  if (body.email)        promptBody += 'Email: ' + body.email + '\n';
  if (body.societe)      promptBody += 'Société: ' + body.societe + '\n';
  if (body.date)         promptBody += "Date d'effet: " + body.date + '\n';
  promptBody += '\nConversation Missive ID: ' + convId;

  var prompt = tpl.prompt_prefix + promptBody;

  // Garantit l'existence de la page Conversation pour pouvoir lier
  var convPageId = null;
  try { convPageId = ensureConvPage_(convId); } catch (_e) {}

  // Crée la tâche
  var properties = {};
  properties[TASKS_TITLE_PROP] = { title: [{ text: { content: title } }] };
  properties['Type d\'action'] = { select: { name: tpl.type } };
  properties['Mode']    = { select: { name: "Confier à l'IA" } };
  properties['Etat']    = { status: { name: 'A faire' } };
  properties['Priorité']= { select: { name: 'Prio 2' } };
  properties['Prompt']  = { rich_text: [{ text: { content: prompt.slice(0, 2000) } }] };

  var task = notionFetch_('POST', '/pages', {
    parent: { database_id: TASKS_DB_ID }, properties: properties
  });

  // Lien depuis la Conversation
  if (convPageId) {
    try {
      var convPage = notionFetch_('GET', '/pages/' + convPageId, null);
      var existing = (convPage.properties['Tâche associée'] &&
                      convPage.properties['Tâche associée'].relation) || [];
      existing.push({ id: task.id });
      notionFetch_('PATCH', '/pages/' + convPageId, {
        properties: { 'Tâche associée': { relation: existing } }
      });
    } catch (_e) {}
  }

  return {
    success: true,
    queued: true,
    task_id: task.id,
    task_url: task.url || notionPageUrl_(task.id)
  };
}

/* ═══════════════════════════════════════════════════════════════
   SETUP one-shot
   ═══════════════════════════════════════════════════════════════ */

function handleSetupConfig_(body) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('STATE_setup_done') === '1') {
    return { error: 'setup already locked' };
  }
  var config = body.config || {};
  var keys = Object.keys(config);
  if (!keys.length) return { error: 'empty config' };
  props.setProperties(config);
  props.setProperty('STATE_setup_done', '1');
  return { ok: true, keys_set: keys.length, keys: keys };
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function checkAuth_(token) {
  const expected = cfg_('PUBLIC_TOKEN');
  if (!expected) return { ok: false, error: 'PUBLIC_TOKEN not configured' };
  if (!token || token !== expected) return { ok: false, error: 'invalid token' };
  return { ok: true };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function cfg_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function notionPageUrl_(pageId) {
  return 'https://notion.so/' + String(pageId || '').replace(/-/g, '');
}

function richTextValue_(richTextArray) {
  if (!richTextArray || !richTextArray.length) return '';
  return richTextArray.map(function (rt) { return rt.plain_text || ''; }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   NOTION REST API
   ═══════════════════════════════════════════════════════════════ */

function notionFetch_(method, path, body) {
  var token = getSecret_('NOTION_API_TOKEN');
  var opts = {
    method: method.toLowerCase(),
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Notion-Version': NOTION_API_VERSION
    },
    muteHttpExceptions: true
  };
  if (body) opts.payload = JSON.stringify(body);
  var res = UrlFetchApp.fetch('https://api.notion.com/v1' + path, opts);
  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Notion API ' + code + ': ' + text.slice(0, 400));
  }
  return JSON.parse(text);
}

/* ─── Dump persons (index complet pour matching client) ────── */

/**
 * Retourne l'index complet de la base Personnes pour matching local instantané.
 * Mis en cache côté frontend (sessionStorage, TTL 30 min) → 1 seul appel
 * par session de navigation, puis lookups instantanés sur tous les participants.
 */
function handleDumpPersons_(_body) {
  var dbId = cfg_('NOTION_PERSONS_DB');
  if (!dbId) throw new Error('NOTION_PERSONS_DB not configured');

  var all = [];
  var cursor = null;
  var pageCount = 0;
  // Pagination Notion : 100 résultats max par page
  do {
    var payload = { page_size: 100 };
    if (cursor) payload.start_cursor = cursor;
    var resp = notionFetch_('POST', '/databases/' + dbId + '/query', payload);
    var results = resp.results || [];
    for (var i = 0; i < results.length; i++) {
      var enriched = extractPersonEnriched_(results[i], { with_meetings: false });
      // Le cache local utilise page_id/page_url (legacy). Remap pour compat.
      all.push({
        page_id:  enriched.notion_page_id,
        page_url: enriched.notion_page_url,
        name:     enriched.name,
        email:    String(enriched.email || '').toLowerCase(),
        instructions: enriched.person_instructions,
        vip:      enriched.vip,
        company:  enriched.company,
        tags:     enriched.tags,
        phone:    enriched.phone,
        phone_source: enriched.phone_source
      });
    }
    cursor = resp.has_more ? resp.next_cursor : null;
    pageCount++;
    if (pageCount > 50) break;
  } while (cursor);

  return { count: all.length, persons: all, ts: Date.now() };
}

/* ═══════════════════════════════════════════════════════════════
   ENRICHISSEMENT FICHE PERSONNE
   Extrait vip, company, tags, phone depuis une page Notion.
   Optionnellement fetch les meetings via la relation Notes.
   ═══════════════════════════════════════════════════════════════ */

const VIP_TAG = '⭐️ VIP';

function extractPersonEnriched_(page, opts) {
  opts = opts || {};
  var props = page.properties || {};
  var emailProp = cfg_('PERSON_EMAIL_PROP') || 'E-mail';
  var instrProp = cfg_('PERSON_INSTRUCTIONS_PROP') || 'Instruction traitement des mails';
  var title = (props['Nom'] && props['Nom'].title) || [];
  var emailVal = (props[emailProp] && props[emailProp].email) || '';
  var instrVal = (props[instrProp] && props[instrProp].rich_text) || [];

  // Type (multi_select) : VIP + tags
  var typeArr = (props['Type'] && props['Type'].multi_select) || [];
  var typeNames = typeArr.map(function (o) { return o.name; });
  var vip = typeNames.indexOf(VIP_TAG) !== -1;
  // Tags = Type sans VIP (qui est rendu séparément)
  var tags = typeNames.filter(function (n) { return n !== VIP_TAG; });

  var company = (props['Société'] && props['Société'].rich_text && richTextValue_(props['Société'].rich_text)) || '';
  var phone   = (props['Téléphone'] && props['Téléphone'].phone_number) || '';

  var out = {
    notion_page_id: page.id,
    notion_page_url: page.url || notionPageUrl_(page.id),
    name: richTextValue_(title),
    email: emailVal,
    person_instructions: richTextValue_(instrVal),
    vip: vip,
    company: company,
    tags: tags,
    phone: phone,
    phone_source: phone ? 'notion' : 'none'
  };

  // Meetings : fetch les pages liées via la relation "Notes" (limit 5)
  if (opts.with_meetings) {
    var rel = (props['Notes'] && props['Notes'].relation) || [];
    var meetings = [];
    for (var i = 0; i < Math.min(rel.length, 5); i++) {
      try {
        var noteP = notionFetch_('GET', '/pages/' + rel[i].id, null);
        var nprops = noteP.properties || {};
        // Find title prop (any)
        var titleStr = '';
        var dateStr = noteP.last_edited_time || noteP.created_time || '';
        for (var k in nprops) {
          if (nprops[k].type === 'title') {
            titleStr = richTextValue_(nprops[k].title || []);
          }
          if (nprops[k].type === 'date' && nprops[k].date && nprops[k].date.start) {
            dateStr = nprops[k].date.start;
          }
        }
        meetings.push({
          id: noteP.id,
          title: titleStr || '(sans titre)',
          date: (dateStr || '').slice(0, 10),
          url: noteP.url || notionPageUrl_(noteP.id)
        });
      } catch (_e) {}
    }
    // Sort by date desc
    meetings.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    out.meetings = meetings;
  }

  return out;
}

/* ─── Lookup person ─────────────────────────────────────────── */

function handleLookupPerson_(body) {
  var email = String(body.email || '').toLowerCase();
  var name  = String(body.name || '');
  var dbId  = cfg_('NOTION_PERSONS_DB');
  var emailProp = cfg_('PERSON_EMAIL_PROP') || 'E-mail';
  if (!dbId) throw new Error('NOTION_PERSONS_DB not configured');

  // 1) Query par email exact
  var page = null;
  if (email) {
    var resp = notionFetch_('POST', '/databases/' + dbId + '/query', {
      filter: { property: emailProp, email: { equals: email } },
      page_size: 1
    });
    if (resp.results && resp.results.length) page = resp.results[0];
  }
  // 2) Fallback : query par nom (title contains)
  if (!page && name) {
    var resp2 = notionFetch_('POST', '/databases/' + dbId + '/query', {
      filter: { property: 'Nom', title: { contains: name } }, page_size: 1
    });
    if (resp2.results && resp2.results.length) page = resp2.results[0];
  }
  if (!page) {
    return { found: false, notion_page_id: null, notion_page_url: null,
             name: null, email: null, person_instructions: null };
  }

  var enriched = extractPersonEnriched_(page, { with_meetings: !!body.with_meetings });
  enriched.found = true;
  return enriched;
}

/* ─── Create person ─────────────────────────────────────────── */

function handleCreatePerson_(body) {
  var email = String(body.email || '');
  var name  = String(body.name || '');
  var dbId  = cfg_('NOTION_PERSONS_DB');
  var emailProp = cfg_('PERSON_EMAIL_PROP') || 'E-mail';

  if (!dbId) throw new Error('NOTION_PERSONS_DB not configured');

  var properties = {};
  properties['Nom'] = { title: [{ text: { content: name || email || 'Sans nom' } }] };
  if (email) properties[emailProp] = { email: email };

  var resp = notionFetch_('POST', '/pages', {
    parent: { database_id: dbId },
    properties: properties
  });

  return {
    success: true,
    notion_page_id: resp.id,
    notion_page_url: resp.url || notionPageUrl_(resp.id)
  };
}

/* ─── Reconcile folk : réconciliation manuelle par lien Folk ───
   L'humain colle le lien Folk d'un contact que l'API ne voit pas.
   On crée/lie la fiche Notion et on y stocke l'ID + le lien Folk.
   Args : {email, name, folk_id, folk_url, network_id?, group_id?, page_id?} */
function handleReconcileFolk_(body) {
  var folkId  = String(body.folk_id || '');
  var folkUrl = String(body.folk_url || '');
  if (!folkId)  return { ok: false, error: 'folk_id required' };
  if (!folkUrl) return { ok: false, error: 'folk_url required' };

  try {
    // 1) Fiche Notion : réutilise create_person si pas de page_id fourni
    var pageId = String(body.page_id || '');
    if (!pageId) {
      var created = handleCreatePerson_({ email: body.email, name: body.name });
      if (!created.success) return { ok: false, error: 'create_person failed' };
      pageId = created.notion_page_id;
    }

    // 2) Écrit les champs Folk via le helper de PATCH whitelisté (add_field_to_notion)
    var link = handleAddFieldToNotion_({ page_id: pageId, field: 'Lien Folk', value: folkUrl });
    if (!link.success) return { ok: false, error: link.error || 'Lien Folk update failed' };
    var ident = handleAddFieldToNotion_({ page_id: pageId, field: 'ID folk', value: folkId });
    if (!ident.success) return { ok: false, error: ident.error || 'ID folk update failed' };

    return { ok: true, notion_page_id: pageId, folk_url: folkUrl, folk_id: folkId };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
}

/* ─── Update person instructions ─────────────────────────────── */

function handleUpdatePersonInstr_(body) {
  var pageId = String(body.page_id || '');
  var text   = String(body.text || '');
  var prop   = cfg_('PERSON_INSTRUCTIONS_PROP') || 'Instruction traitement des mails';

  if (!pageId) throw new Error('page_id required');

  var properties = {};
  properties[prop] = { rich_text: [{ text: { content: text } }] };

  notionFetch_('PATCH', '/pages/' + pageId, { properties: properties });
  return { success: true };
}

/* ─── Lookup conversation ────────────────────────────────────── */

function handleLookupConv_(body) {
  var convId = String(body.missive_conversation_id || '');
  var dbId   = cfg_('NOTION_CONVS_DB');
  var idProp = cfg_('CONV_MISSIVE_ID_PROP') || 'Agent session ID';
  var instrProp = cfg_('CONV_INSTRUCTIONS_PROP') || 'Instruction spécifique';

  if (!dbId)   throw new Error('NOTION_CONVS_DB not configured');
  if (!convId) throw new Error('missive_conversation_id required');

  var resp = notionFetch_('POST', '/databases/' + dbId + '/query', {
    filter: { property: idProp, rich_text: { equals: convId } },
    page_size: 1
  });

  if (!resp.results || !resp.results.length) {
    return { found: false, notion_page_id: null, instructions: null };
  }

  var page = resp.results[0];
  var props = page.properties || {};
  var instrVal = (props[instrProp] && props[instrProp].rich_text) || [];

  return {
    found: true,
    notion_page_id: page.id,
    instructions: richTextValue_(instrVal)
  };
}

/* ─── Upsert conversation ────────────────────────────────────── */

function handleUpsertConv_(body) {
  var convId = String(body.missive_conversation_id || '');
  var text   = String(body.text || '');
  var dbId   = cfg_('NOTION_CONVS_DB');
  var idProp = cfg_('CONV_MISSIVE_ID_PROP') || 'Agent session ID';
  var instrProp = cfg_('CONV_INSTRUCTIONS_PROP') || 'Instruction spécifique';

  if (!dbId)   throw new Error('NOTION_CONVS_DB not configured');
  if (!convId) throw new Error('missive_conversation_id required');

  var pageId = String(body.page_id || '');

  // Si pas de page_id passé, on cherche d'abord
  if (!pageId) {
    var search = notionFetch_('POST', '/databases/' + dbId + '/query', {
      filter: { property: idProp, rich_text: { equals: convId } },
      page_size: 1
    });
    if (search.results && search.results.length) pageId = search.results[0].id;
  }

  var instrPayload = { rich_text: [{ text: { content: text } }] };

  if (pageId) {
    // Update
    var properties = {};
    properties[instrProp] = instrPayload;
    notionFetch_('PATCH', '/pages/' + pageId, { properties: properties });
    return { success: true, notion_page_id: pageId, created: false };
  } else {
    // Create
    var newProps = {};
    newProps['Nom'] = { title: [{ text: { content: 'Conv. ' + convId.slice(0, 12) } }] };
    newProps[idProp]    = { rich_text: [{ text: { content: convId } }] };
    newProps[instrProp] = instrPayload;
    var created = notionFetch_('POST', '/pages', {
      parent: { database_id: dbId },
      properties: newProps
    });
    return { success: true, notion_page_id: created.id, created: true };
  }
}

/* ─── List conversation tasks ────────────────────────────────── */

/**
 * Retourne les tâches Notion liées à la conversation (relation "Tâche associée"
 * de la base Conversations vers Tasks Backlog).
 */
function handleListConvTasks_(body) {
  var convId = String(body.missive_conversation_id || '');
  var dbId   = cfg_('NOTION_CONVS_DB');
  var idProp = cfg_('CONV_MISSIVE_ID_PROP') || 'Agent session ID';
  var relProp = 'Tâche associée';

  if (!dbId)   throw new Error('NOTION_CONVS_DB not configured');
  if (!convId) return { found: false, tasks: [] };

  // 1) Find conversation page
  var search = notionFetch_('POST', '/databases/' + dbId + '/query', {
    filter: { property: idProp, rich_text: { equals: convId } },
    page_size: 1
  });
  if (!search.results || !search.results.length) {
    return { found: false, tasks: [], conv_page_id: null };
  }
  var convPage = search.results[0];
  var rel = (convPage.properties[relProp] && convPage.properties[relProp].relation) || [];

  // 2) Fetch each linked task
  var tasks = [];
  for (var i = 0; i < rel.length && i < 20; i++) {
    try {
      var taskPage = notionFetch_('GET', '/pages/' + rel[i].id, null);
      var p = taskPage.properties || {};
      // Recherche du titre : essaye plusieurs noms communs
      var titleProp = null;
      var titleKeys = Object.keys(p);
      for (var k = 0; k < titleKeys.length; k++) {
        if (p[titleKeys[k]].type === 'title') { titleProp = p[titleKeys[k]]; break; }
      }
      var title = titleProp ? richTextValue_(titleProp.title || []) : '(sans titre)';
      var status = (p['Etat'] && p['Etat'].status && p['Etat'].status.name) ||
                   (p['Status'] && p['Status'].status && p['Status'].status.name) || '';
      tasks.push({
        page_id: taskPage.id,
        url: taskPage.url || notionPageUrl_(taskPage.id),
        title: title,
        status: status
      });
    } catch (e) {
      // Skip pages we can't fetch (access denied, deleted, etc.)
    }
  }

  return {
    found: true,
    conv_page_id: convPage.id,
    conv_page_url: convPage.url || notionPageUrl_(convPage.id),
    tasks: tasks
  };
}

/* ═══════════════════════════════════════════════════════════════
   FOLK — API REST directe + fallback MCP
   Token : FOLK_API_KEY (Doppler), lu via getSecret_().
   Tant que le token n'est pas provisionné, bascule sur l'ancien
   chemin Claude + MCP Zapier (handleLookupFolkViaMcp_).
   ═══════════════════════════════════════════════════════════════ */

function handleLookupFolk_(body) {
  var email = String(body.email || '');
  var name  = String(body.name || '');

  // Token Folk via Secrets_Proxy. Absent/erreur → fallback MCP Zapier.
  var token;
  try {
    token = getSecret_('FOLK_API_KEY');
  } catch (e) {
    return handleLookupFolkViaMcp_(body);
  }
  if (!token) return handleLookupFolkViaMcp_(body);

  // Recherche workspace-wide en une requête : email OU nom, match partiel (like).
  var qs = [];
  if (email) qs.push('filter[emails][like]='   + encodeURIComponent(email));
  if (name)  qs.push('filter[fullName][like]=' + encodeURIComponent(name));
  qs.push('combinator=or');

  var res = UrlFetchApp.fetch(FOLK_API_BASE + '/people?' + qs.join('&'), {
    method: 'get',
    headers: { 'Authorization': 'Bearer ' + token },
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Folk API ' + code + ': ' + text.slice(0, 400));
  }

  var parsed = text ? JSON.parse(text) : {};
  // Forme réponse Folk confirmée : { data: { items: [...], pagination: {} } }.
  // Replis défensifs sur d'autres formes au cas où l'API évolue.
  var list = (parsed.data && parsed.data.items) ? parsed.data.items
           : (Array.isArray(parsed.data) ? parsed.data
           : (parsed.items || parsed.results || (Array.isArray(parsed) ? parsed : [])));
  if (!list || !list.length) {
    return { found: false, folk_id: null, notion_page_id: null,
             name: name || null, email: email || null, folk_url: null };
  }

  var person = list[0];
  // Les ids Folk sont préfixés (per_, grp_) ; l'URL web utilise l'UUID brut.
  var rawId = String(person.id || '').replace(/^per_/, '');
  var grp   = (person.groups && person.groups.length)
    ? String(person.groups[0].id || '').replace(/^grp_/, '') : '';
  var folkId  = rawId || null;
  var folkUrl = rawId
    ? 'https://app.folk.app/apps/contacts/network/' + FOLK_NETWORK_ID +
      (grp ? '/groups/' + grp : '') + '/people/' + rawId
    : null;

  // Nom / email renvoyés par Folk (forme exacte à valider), avec repli sur l'entrée.
  var folkName  = person.fullName || name || null;
  var folkEmail = email || null;
  if (!email && person.emails && person.emails.length) {
    folkEmail = (typeof person.emails[0] === 'string') ? person.emails[0]
              : (person.emails[0].email || person.emails[0].value || null);
  }

  // Croisement Notion par email : réutilise le lookup People existant. Pas de duplication.
  var notionPageId = null;
  if (folkEmail) {
    var notion = handleLookupPerson_({ email: folkEmail });
    if (notion && notion.found) notionPageId = notion.notion_page_id;
  }

  return {
    found: true,
    folk_id: folkId,
    notion_page_id: notionPageId,
    name: folkName,
    email: folkEmail,
    folk_url: folkUrl
  };
}

/** Ancien chemin Folk : Claude + MCP Zapier. Conservé en fallback tant que FOLK_API_KEY n'est pas provisionné. */
function handleLookupFolkViaMcp_(body) {
  var email = String(body.email || '');
  var name  = String(body.name || '');
  var prompt =
    'Cherche dans Folk un contact avec email ' + JSON.stringify(email) +
    ' ou nom ' + JSON.stringify(name) + '.\n\n' +
    'Retourne, sans markdown: ' +
    '{"found": boolean, "folk_id": string|null, "notion_page_id": string|null, ' +
    '"name": string|null, "email": string|null}';
  return callClaude_(
    'Tu es un assistant CRM Folk. Réponds UNIQUEMENT en JSON valide.',
    prompt,
    [MCP_FOLK]
  );
}

/* ═══════════════════════════════════════════════════════════════
   MISSIVE API
   Token : MISSIVE_API_TOKEN (Doppler "Access Missive")
   Doc base : https://public.missiveapp.com/v1/
   ═══════════════════════════════════════════════════════════════ */

function missiveApi_(method, path, body) {
  var token = getSecret_('MISSIVE_API_TOKEN');
  var opts = {
    method: method.toLowerCase(),
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + token },
    muteHttpExceptions: true
  };
  if (body) opts.payload = JSON.stringify(body);
  var res = UrlFetchApp.fetch('https://public.missiveapp.com/v1' + path, opts);
  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Missive API ' + code + ': ' + text.slice(0, 400));
  }
  return text ? JSON.parse(text) : {};
}

/** Crée un brouillon Missive dans une conversation existante. */
function missiveCreateDraft_(convId, body, opts) {
  opts = opts || {};
  var payload = {
    drafts: {
      conversation: convId,
      body: body,
      send: false,
      auto_followup: false,
      close: false
    }
  };
  if (opts.subject) payload.drafts.subject = opts.subject;
  return missiveApi_('POST', '/drafts', payload);
}

/** Poste un commentaire d'équipe dans une conversation Missive (visible à l'équipe, pas envoyé). */
function missivePostComment_(convId, text, notifTitle) {
  return missiveApi_('POST', '/posts', {
    posts: {
      conversation: convId,
      text: text,
      notification: {
        title: notifTitle || 'Analyse sidebar POF',
        body: text.split('\n').slice(0, 2).join(' — ').slice(0, 140)
      }
    }
  });
}

/** Récupère les messages d'une conversation Missive (avec PJ). */
function missiveListMessages_(convId, limit) {
  return missiveApi_('GET', '/conversations/' + convId + '/messages?limit=' + (limit || 20));
}

/* ═══════════════════════════════════════════════════════════════
   SLACK API
   Token : SLACK_BOT_TOKEN (Doppler)
   ═══════════════════════════════════════════════════════════════ */

function slackPost_(channel, text, blocks) {
  var token;
  try { token = getSecret_('SLACK_BOT_TOKEN'); }
  catch (_e) { return { ok: false, error: 'no_slack_token' }; }

  var payload = { channel: channel, text: text };
  if (blocks) payload.blocks = blocks;
  var res = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  return JSON.parse(res.getContentText() || '{}');
}

/* ═══════════════════════════════════════════════════════════════
   ASK AGENT (Spec 2 V1 — build-20260518-agent-sidebar-missive-v1)
   Détection d'intent LARGE + délégation Drafter A/B + chat libre.
   Création de brouillon Missive DIRECTE (pas de validation, par décision Benoit).
   V1.10 : ajout NLU fallback Haiku + log sidebar_interactions + feature flags.
   ═══════════════════════════════════════════════════════════════ */

/* --- Constantes V1.10 (Spec 2 — Agent sidebar + apprentissage observationnel) --- */
const SIDEBAR_CONFIG_PAGE_ID       = '364c2ce245e88197b7efcb9e9d7bafa7'; // Sidebar Agent Config (JSON dans content)
const SIDEBAR_INTERACTIONS_DS_ID   = '258d4583-2d78-4068-bf80-59183230f29c'; // DB Sidebar Interactions
const CONV_SITUATION_SUMMARY_PROP  = 'Situation summary';
const CONV_SITUATION_BULLETS_PROP  = 'Situation bullets';
const CONV_SITUATION_RISKS_PROP    = 'Situation risks';
const CONV_SITUATION_UPDATED_PROP  = 'Situation updated';
const CONV_SITUATION_SOURCE_PROP   = 'Situation source';
const SIDEBAR_CONFIG_CACHE_KEY     = 'sidebar_agent_config_v1';
const SIDEBAR_CONFIG_CACHE_TTL_SEC = 300; // 5 minutes
const SIDEBAR_AGENT_ID             = 'missive-sidebar-orchestrator';

const SIDEBAR_DEFAULTS = {
  enable_briefing_veille_autoappend: false,
  enable_instruction_personne_autoappend: false,
  enable_instruction_conv_autoappend: true,
  intent_fallback_model: 'claude-haiku-4-5',
  drafter_a_model: 'claude-haiku-4-5',
  drafter_b_model: 'claude-sonnet-4-6',
  context_tier_budget_tokens: 2400,
  sidebar_interactions_log_full: true,
  pattern_detection_threshold: 3,
  pattern_detection_window_days: 7,
  propose_confirm_required: ['instruction_personne', 'briefing_veille'],
  auto_execute_on_explicit: true,
  enable_cross_conversation_context: false,
  weekly_digest_slack: false,
};

const INTENT_PATTERNS = {
  draft_short: /\b(r[ée]pond|r[ée]ponse|draft|brouillon|envoie|relance|confirm[ée])\b.*\b(court|bref|rapide|direct|3 lignes|simple)\b|\b(r[ée]pond.{0,30}court|court.{0,30}r[ée]pond)\b/i,
  draft_long:  /\b(r[ée]pond|r[ée]ponse|draft|brouillon).*\b(structur|d[ée]taill|long|formel|complet|board)\b|\b(r[ée]dige|r[ée]daction)\b.{0,40}\b(pour|au|à)\b/i,
  draft_any:   /\b(r[ée]pond|r[ée]ponse|draft|brouillon|r[ée]dige|relance)\b/i,
  summarize:   /\b(r[ée]sum|synth[èe]se|synth[ée]tise|situation|o[uù] (ç|c)a en est|fais le point|recap)\b/i,
  task:        /\b(cr[ée]e|cr[ée]er|ajoute) (une |la )?(t[âa]che|todo)\b|\b(t[âa]che pour)\b/i,
  watch:       /\b(ajoute|mets) .{0,30}\bveille\b/i,
  legal:       /\b(NDA|contrat|signature|signer|juridique|legal|MOU|pacte)\b/i,
  podcast:     /\b(podcast|brief audio|briefing audio)\b/i,
};

function detectIntent_(query) {
  if (!query) return 'chat';
  if (INTENT_PATTERNS.draft_short.test(query)) return 'draft_short';
  if (INTENT_PATTERNS.draft_long.test(query))  return 'draft_long';
  if (INTENT_PATTERNS.draft_any.test(query))   return 'draft_any';
  if (INTENT_PATTERNS.summarize.test(query))   return 'summarize';
  if (INTENT_PATTERNS.task.test(query))        return 'task';
  if (INTENT_PATTERNS.watch.test(query))       return 'watch';
  if (INTENT_PATTERNS.legal.test(query))       return 'legal';
  if (INTENT_PATTERNS.podcast.test(query))     return 'podcast';
  return 'chat';
}

/** Brief commun de contexte (utilisé par Drafter A/B et chat libre). */
function buildAgentContext_(body) {
  var main = body.main || {};
  var others = body.others || [];
  var personInstr = String(body.person_instructions || '');
  var convInstr = String(body.conv_instructions || '');
  var subject = String(body.subject || '');
  return {
    main_name: main.name || '',
    main_email: main.email || '',
    others_names: others.map(function (p) { return p.name || p.email; }).join(', '),
    subject: subject,
    person_instructions: personInstr,
    conv_instructions: convInstr,
    conv_text: String(body.conv_text || '')
  };
}

/** Drafter A : Haiku, draft court direct (3-5 lignes). */
function callDrafterA_(ctx, userInstructions) {
  var apiKey = getSecret_('ANTROPIC_API_TOKEN');
  var system = 'Tu es Drafter A — Concis direct. Tu écris des réponses email en français, 3-5 lignes maximum, ton factuel et chaleureux. ' +
    'Voix Impact Realist POF : assertif, technique sans jargon, pas de em-dashes, pas de filler. ' +
    'Tu adresses la personne en respectant le Tutoiement détecté. ' +
    'Tu signes "Benoit" (CEO Plastic Odyssey Factories). Tu ne donnes que le corps du mail, sans objet ni en-tête.';
  var prompt =
    'Contact : ' + ctx.main_name + ' (' + ctx.main_email + ')\n' +
    (ctx.subject ? 'Sujet du fil : ' + ctx.subject + '\n' : '') +
    (ctx.others_names ? 'Autres participants : ' + ctx.others_names + '\n' : '') +
    (ctx.person_instructions ? '\nInstructions sur la personne (Notion) :\n' + ctx.person_instructions + '\n' : '') +
    (ctx.conv_instructions ? '\nInstructions sur la conversation (Notion) :\n' + ctx.conv_instructions + '\n' : '') +
    '\nDemande de Benoit :\n' + userInstructions +
    '\n\nÉcris la réponse mail (corps uniquement, 3-5 lignes, signature "Benoit") :';

  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: system,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('Drafter A ' + res.getResponseCode());
  var data = JSON.parse(res.getContentText());
  var textBlock = (data.content || []).filter(function (b) { return b.type === 'text'; })[0];
  return textBlock ? textBlock.text : '';
}

/** Drafter B : Sonnet, draft chaleureux structuré (6-12 lignes). */
function callDrafterB_(ctx, userInstructions) {
  var apiKey = getSecret_('ANTROPIC_API_TOKEN');
  var system = 'Tu es Drafter B — Chaleureux structuré. Tu écris des réponses email en français, 6-12 lignes, ton relationnel et structuré (bullets si actions multiples). ' +
    'Voix Impact Realist POF : assertif, technique sans jargon, pas de em-dashes, pas de filler. ' +
    'Tu adresses la personne en respectant le Tutoiement détecté. ' +
    'Tu signes "Benoit" (CEO Plastic Odyssey Factories). Tu ne donnes que le corps du mail, sans objet ni en-tête.';
  var prompt =
    'Contact : ' + ctx.main_name + ' (' + ctx.main_email + ')\n' +
    (ctx.subject ? 'Sujet du fil : ' + ctx.subject + '\n' : '') +
    (ctx.others_names ? 'Autres participants : ' + ctx.others_names + '\n' : '') +
    (ctx.person_instructions ? '\nInstructions sur la personne (Notion) :\n' + ctx.person_instructions + '\n' : '') +
    (ctx.conv_instructions ? '\nInstructions sur la conversation (Notion) :\n' + ctx.conv_instructions + '\n' : '') +
    '\nDemande de Benoit :\n' + userInstructions +
    '\n\nÉcris la réponse mail (corps uniquement, 6-12 lignes, bullets si actions multiples, signature "Benoit") :';

  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: ANTHROPIC_MODEL,  // claude-sonnet-4-6
      max_tokens: 1200,
      system: system,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('Drafter B ' + res.getResponseCode());
  var data = JSON.parse(res.getContentText());
  var textBlock = (data.content || []).filter(function (b) { return b.type === 'text'; })[0];
  return textBlock ? textBlock.text : '';
}

function handleAskAgent_(body) {
  var convId = String(body.conversation_id || '');
  var query  = String(body.query || '').trim();
  if (!convId) return { reply: '', error: 'conversation_id required' };
  if (!query)  return { reply: '', error: 'query required' };

  var intent = String(body.intent || '') || detectIntent_(query);
  var ctx = buildAgentContext_(body);

  try {
    // Cas 1 — Création de brouillon (Drafter A ou B selon intent)
    if (intent === 'draft_short' || intent === 'draft_long' || intent === 'draft_any') {
      var useB = (intent === 'draft_long');
      var draftText = useB ? callDrafterB_(ctx, query) : callDrafterA_(ctx, query);
      if (!draftText) return { reply: 'Le Drafter n\'a rien généré.', proposed: [] };

      // Création directe du brouillon Missive (pas de validation, décision Benoit)
      var draftRes = null;
      try { draftRes = missiveCreateDraft_(convId, draftText); }
      catch (e) {
        return {
          reply: 'Brouillon généré mais création Missive a échoué : ' + e.message + '\n\nTu peux copier le contenu ci-dessous :\n\n' + draftText,
          draft_text: draftText,
          intent: intent,
          error: 'missive_draft_failed'
        };
      }
      return {
        reply: '✓ Brouillon créé dans Missive (' + (useB ? 'Drafter B Sonnet' : 'Drafter A Haiku') + '). Ouvre-le pour relire et envoyer.',
        draft_text: draftText,
        draft_id: (draftRes && draftRes.drafts && draftRes.drafts.id) || null,
        intent: intent
      };
    }

    // Cas 2 — Résumé / situation
    if (intent === 'summarize') {
      var sit = handleRegenSituation_({ conversation_id: convId, main: body.main, others: body.others, subject: body.subject, conv_text: body.conv_text, person_instructions: body.person_instructions, conv_instructions: body.conv_instructions, return_only: true });
      return {
        reply: sit.summary || 'Synthèse indisponible.',
        bullets: sit.bullets || [],
        risks: sit.risks || [],
        situation: sit.situation || null,
        intent: 'summarize'
      };
    }

    // Cas 3 — Création de tâche (auto-exécution car commande explicite)
    if (intent === 'task') {
      // L'agent retourne une proposition structurée que le frontend peut soumettre
      return {
        reply: 'Tâche détectée. Le frontend peut l\'envoyer via `create_task` avec ces paramètres.',
        intent: 'task',
        proposed: [{
          kind: 'create_task',
          args: { name: query.length > 80 ? query.slice(0, 77) + '...' : query, description: query, prio: 'P2', assignee: 'human' },
          label: 'Créer cette tâche'
        }]
      };
    }

    // Cas 4 — Délégation veille / podcast / légal
    if (intent === 'watch') {
      return { reply: 'Action veille détectée. Le frontend doit ouvrir le panneau Veille pour choisir la catégorie.', intent: 'watch', delegate: 'add_to_watch' };
    }
    if (intent === 'podcast') {
      return { reply: 'Briefing podcast détecté. Le frontend doit appeler `brief_podcast`.', intent: 'podcast', delegate: 'brief_podcast' };
    }
    if (intent === 'legal') {
      return { reply: 'Action juridique détectée. Le frontend doit ouvrir le panneau Signature (cf. Spec 1).', intent: 'legal', delegate: 'signature_action' };
    }

    // Cas 5 — Chat libre (Sonnet sur contexte enrichi)
    var apiKey = getSecret_('ANTROPIC_API_TOKEN');
    var sys = 'Tu es un assistant exécutif pour Benoit, CEO de Plastic Odyssey Factories. ' +
      'Voix Impact Realist : assertif, pragmatique, technique sans jargon. Pas d\'em-dashes. Pas de filler. ' +
      'Tu réponds en français, format court (3-6 phrases max). Tu adresses Benoit en "tu". ' +
      'Tu utilises uniquement les éléments du contexte ci-dessous. Si l\'info manque, dis-le.';
    var prompt =
      'Contact : ' + ctx.main_name + ' (' + ctx.main_email + ')\n' +
      (ctx.subject ? 'Sujet : ' + ctx.subject + '\n' : '') +
      (ctx.others_names ? 'Autres participants : ' + ctx.others_names + '\n' : '') +
      (ctx.person_instructions ? '\nInstructions personne :\n' + ctx.person_instructions + '\n' : '') +
      (ctx.conv_instructions ? '\nInstructions conversation :\n' + ctx.conv_instructions + '\n' : '') +
      '\nQuestion de Benoit :\n' + query;

    var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post', contentType: 'application/json',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 600,
        system: sys,
        messages: [{ role: 'user', content: prompt }]
      }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) return { reply: 'Erreur Anthropic ' + res.getResponseCode(), error: true };
    var data = JSON.parse(res.getContentText());
    var textBlock = (data.content || []).filter(function (b) { return b.type === 'text'; })[0];
    return {
      reply: textBlock ? textBlock.text : '',
      intent: 'chat'
    };

  } catch (e) {
    return { reply: 'Erreur agent : ' + e.message, error: true };
  }
}

/* ═══════════════════════════════════════════════════════════════
   REGEN SITUATION (Spec 2)
   Synthèse exécutive 5-7 bullets + 1-3 risques, persiste sur Conv Notion.
   ═══════════════════════════════════════════════════════════════ */

function handleRegenSituation_(body) {
  var convId = String(body.conversation_id || '');
  if (!convId) return { error: 'conversation_id required' };

  var ctx = buildAgentContext_(body);
  var apiKey;
  try { apiKey = getSecret_('ANTROPIC_API_TOKEN'); }
  catch (_e) { return { error: 'no_anthropic_key' }; }

  var system = 'Tu génères une synthèse exécutive de conversation Missive pour Benoit, CEO POF. ' +
    'Format JSON strict : {"summary": "...", "bullets": ["..."], "risks": ["..."]}. ' +
    'summary = 1 phrase qui dit "où on en est" (sans em-dashes). ' +
    'bullets = 5 à 7 puces factuelles (actions prises, statuts, échéances mentionnées). ' +
    'risks = 1 à 3 risques détectés (deadline qui approche, désaccord, sujet sensible). Vide si rien. ' +
    'Si tu manques de contexte, signale-le dans summary. Pas d\'invention de chiffres ou de dates.';
  var prompt =
    'Contact principal : ' + ctx.main_name + ' (' + ctx.main_email + ')\n' +
    (ctx.subject ? 'Sujet : ' + ctx.subject + '\n' : '') +
    (ctx.others_names ? 'Autres participants : ' + ctx.others_names + '\n' : '') +
    (ctx.person_instructions ? '\nInstructions personne (Notion) :\n' + ctx.person_instructions + '\n' : '') +
    (ctx.conv_instructions ? '\nInstructions conversation (Notion) :\n' + ctx.conv_instructions + '\n' : '') +
    (ctx.conv_text ? '\nFil de la conversation (transcript Missive) :\n"""\n' + ctx.conv_text + '\n"""\n' : '') +
    '\nDate du jour : ' + new Date().toISOString().slice(0, 10);

  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 700,
      system: system,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return { error: 'anthropic_' + res.getResponseCode() };
  var data = JSON.parse(res.getContentText());
  var textBlock = (data.content || []).filter(function (b) { return b.type === 'text'; })[0];
  var parsed = parseJsonLoose_(textBlock ? textBlock.text : '');
  if (!parsed || typeof parsed !== 'object') return { error: 'invalid_json' };

  var sourceVal = body.source_hint === 'humain' ? 'humain' :
                  (body.source_hint === 'mixte' ? 'mixte' : 'ia');
  var out = {
    summary: parsed.summary || '',
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 7) : [],
    risks:   Array.isArray(parsed.risks)   ? parsed.risks.slice(0, 3)   : [],
    updated_at: new Date().toISOString()
  };
  // Objet normalisé prêt à rendre par le frontend (headline + bullets/risks structurés)
  out.situation = buildSituationObject_(out.summary, out.bullets, out.risks, out.updated_at, sourceVal);

  // Si return_only, ne persiste pas (utilisé en délégation ask_agent)
  if (body.return_only) return out;

  // Persistance V1.10 : écriture sur les champs dédiés Situation (Spec 2 §10)
  try {
    var convPageId = ensureConvPage_(convId);
    var bulletsText = out.bullets.map(function (b) { return '• ' + b; }).join('\n');
    var risksText   = out.risks.map(function (r) { return '⚠ ' + r; }).join('\n');
    updateConvSituationFields_(convPageId, {
      summary: out.summary,
      bullets: bulletsText,
      risks: risksText,
      updated_at: out.updated_at,
      source: sourceVal,
    });
    out.conv_page_id = convPageId;
  } catch (_e) {
    out.persist_error = String(_e && _e.message);
  }

  return out;
}

function callClaude_(system, userPrompt, mcpServers) {
  var apiKey = getSecret_('ANTROPIC_API_TOKEN');
  var payload = {
    model: ANTHROPIC_MODEL,
    max_tokens: ANTHROPIC_MAX_TOKENS,
    system: system,
    messages: [{ role: 'user', content: userPrompt }]
  };
  if (mcpServers && mcpServers.length) {
    payload.mcp_servers = mcpServers.map(function (u) {
      return { type: 'url', url: u, name: u.split('/')[2] };
    });
  }

  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'mcp-client-2025-04-04'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('Anthropic API ' + code + ': ' + res.getContentText().slice(0, 500));
  }

  var data = JSON.parse(res.getContentText());
  var textBlock = (data.content || []).filter(function (b) { return b.type === 'text'; })[0];
  var text = textBlock ? textBlock.text : '';
  return parseJsonLoose_(text);
}

function parseJsonLoose_(s) {
  if (!s) return null;
  var clean = s.replace(/```json\n?|```\n?/g, '').trim();
  try { return JSON.parse(clean); }
  catch (_e) { return { error: 'invalid json from model', raw: clean.slice(0, 300) }; }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ▼▼▼  POF AGENT REGISTRY  ▼▼▼
   Registre canonique des agents POF par fonction métier.
   Spec : https://www.notion.so/371c2ce245e88143b9c3e30f0122958c
   POC v0.1 : 7 agents, intégré dans missive-sidebar-proxy en attendant un GAS dédié.

   Endpoint :
     POST /exec  { action: "agent_invoke", token, agent, query, context?, mode? }
     POST /exec  { action: "agent_list", token }
   ═══════════════════════════════════════════════════════════════════════════════ */

const AGENTS = {

  /* ──────────────── marketing-comms/ ──────────────── */

  'marketing-comms/drafter-short': {
    fn: 'marketing-comms',
    role: 'Email court direct (3-5 lignes)',
    model: 'claude-haiku-4-5',
    max_tokens: 600,
    system: 'Tu es Drafter A — Concis direct. Tu écris des réponses email en français, 3-5 lignes maximum, ton factuel et chaleureux. ' +
      'Voix Impact Realist POF : assertif, technique sans jargon, pas de em-dashes, pas de filler. ' +
      'Tu adresses la personne en respectant le Tutoiement détecté. ' +
      'Tu signes "Benoit" (CEO Plastic Odyssey Factories). Tu ne donnes que le corps du mail, sans objet ni en-tête.',
    permissions: { create_missive_draft: true },
    notion_page: 'https://www.notion.so/362c2ce245e8814e8720f7defa8680da',
  },

  'marketing-comms/drafter-formal': {
    fn: 'marketing-comms',
    role: 'Email chaleureux structuré (6-12 lignes, bullets si actions multiples)',
    model: ANTHROPIC_MODEL,
    max_tokens: 1200,
    system: 'Tu es Drafter B — Chaleureux structuré. Tu écris des réponses email en français, 6-12 lignes, ton relationnel et structuré (bullets si actions multiples). ' +
      'Voix Impact Realist POF : assertif, technique sans jargon, pas de em-dashes, pas de filler. ' +
      'Tu adresses la personne en respectant le Tutoiement détecté. ' +
      'Tu signes "Benoit" (CEO Plastic Odyssey Factories). Tu ne donnes que le corps du mail, sans objet ni en-tête.',
    permissions: { create_missive_draft: true },
    notion_page: 'https://www.notion.so/362c2ce245e881308aa5ffdb7b7602ee',
  },

  'marketing-comms/podcast-briefer': {
    fn: 'marketing-comms',
    role: 'Brief audio 400-600 mots pour ElevenLabs',
    model: ANTHROPIC_MODEL,
    max_tokens: 1500,
    system: 'Tu es un assistant exécutif POF qui rédige des briefings audio. Voix Impact Realist : assertif, pragmatique, technique sans jargon, sans filler. ' +
      "Pas d'em-dashes. Démarre direct sur l'enjeu, sans préambule. Adresse Benoit en \"tu\". Chiffres en toutes lettres. 400-600 mots. Format briefing exécutif.",
    permissions: { post_zapier_webhook: true },
  },

  /* ──────────────── business-deals/ ──────────────── */

  'business-deals/situation-summarizer': {
    fn: 'business-deals',
    role: "Synthèse exécutive d'une conversation (bullets + risques)",
    model: 'claude-haiku-4-5',
    max_tokens: 700,
    system: 'Tu génères une synthèse exécutive de conversation Missive pour Benoit, CEO POF. ' +
      'Tu retournes TOUJOURS du JSON strict, jamais du markdown ni du texte libre : {"summary": "...", "bullets": ["..."], "risks": ["..."]}. ' +
      'summary = 1 phrase qui dit "où on en est" (sans em-dashes). ' +
      'bullets = 5 à 7 puces factuelles (actions prises, statuts, échéances mentionnées). ' +
      'risks = 1 à 3 risques détectés (deadline qui approche, désaccord, sujet sensible). Tableaux vides si rien. ' +
      "Si tu manques de contexte, summary commence par \"Contexte insuffisant —\" suivi de ce qui est connu, et bullets/risks restent vides. " +
      "Tu ne demandes JAMAIS de précision à l'utilisateur, tu fais avec ce que tu as. Pas d'invention de chiffres ou de dates.",
    permissions: { write_notion: true },
    output_format: 'json',
  },

  'business-deals/deal-analyst': {
    fn: 'business-deals',
    role: "Estimation d'opportunité business",
    model: ANTHROPIC_MODEL,
    max_tokens: 1200,
    system: "Tu évalues une opportunité business pour Plastic Odyssey Factories (POF, SAS française, économie circulaire plastique, focus Afrique de l'Ouest). " +
      'Tu retournes UNIQUEMENT du JSON : {"score": 0-100, "scope": "commercial|partenariat|financement|recrutement|autre", ' +
      '"size_estimate": "string", "probability": "low|medium|high", "deadline_pressure": "low|medium|high", ' +
      '"next_steps": ["..."], "risks": ["..."], "recommendation": "..."}. ' +
      "Tu réponds en français. Pas d'em-dashes.",
    permissions: { write_notion: true },
    output_format: 'json',
  },

  /* ──────────────── lawyer/ ──────────────── */

  'lawyer/legal-orchestrator': {
    fn: 'lawyer',
    role: "Router juridique : classifie un document/requête et dispatche vers l'expert",
    model: 'claude-haiku-4-5',
    max_tokens: 400,
    system: 'Tu es le router juridique POF. Tu reçois un document juridique extrait ou une requête utilisateur. ' +
      "Ta seule mission : classifier le type de document et recommander le sous-agent à invoquer. Tu n'analyses JAMAIS le contenu en détail. " +
      "Tu retournes UNIQUEMENT du JSON strict : " +
      '{"type": "NDA|Contrat de travail|Contrat corporate|MOU|Pacte d\'associés|Pacte d\'actionnaires|Contrat de marque|Autre", ' +
      '"confidence": 0-100, ' +
      '"sub_agent_recommended": "lawyer/nda-expert|lawyer/legal-analyzer|lawyer/corporate-governance-expert", ' +
      '"reason": "1 phrase courte"}. ' +
      "Règles de routing : " +
      "NDA → lawyer/nda-expert. " +
      "Pacte d'associés ou d'actionnaires ou Contrat de marque → lawyer/corporate-governance-expert. " +
      "Contrat de travail, Contrat corporate, MOU, Autre → lawyer/legal-analyzer. " +
      "Si la confidence < 50, ajoute un champ 'ambiguity' avec la question à poser.",
    permissions: {},
    output_format: 'json',
    kb_pages: [
      'https://www.notion.so/352c2ce245e88188ada2fc7fbf9ce98b',
      'https://www.notion.so/352c2ce245e881219299dcac498c87c9',
      'https://www.notion.so/352c2ce245e881c3a486d1ce37a85791',
      'https://www.notion.so/352c2ce245e881d5b2bccdc6fd1d1264',
      'https://www.notion.so/352c2ce245e881f39a11cdf33966b2e9',
      'https://www.notion.so/352c2ce245e88123972cc84b8a5fde8a',
      'https://www.notion.so/352c2ce245e881c088ceed4b003dea15'
    ],
  },

  'lawyer/legal-analyzer': {
    fn: 'lawyer',
    role: "Analyse d'un document juridique (NDA / contrat / MOU / pacte)",
    model: ANTHROPIC_MODEL,
    max_tokens: 1500,
    system: 'Tu es un assistant juridique pour Plastic Odyssey Factories (POF, SAS française). ' +
      "Tu analyses un document juridique extrait d'un mail Missive et tu produis un rapport STRICT JSON : " +
      '{"type": "NDA|Contrat de travail|Contrat corporate|MOU|Pacte d\'associés|Autre", ' +
      '"verdict": "OK|ALERT|BLOCK", ' +
      '"score_anomalie": 0-100, ' +
      '"red_flags": ["..."], ' +
      '"points_cles": ["..."], ' +
      '"recommandation": "...", ' +
      '"signature_requise": boolean, ' +
      '"juridiction_detectee": "FR|SN|EN|Autre|Inconnue"}. ' +
      'OK = peut être signé tel quel par Benoit. ALERT = points à vérifier avant signature. BLOCK = anomalies critiques, ne pas signer. ' +
      'Score anomalie : 0 = standard POF, 100 = totalement non conforme. ' +
      'Tu réponds en français, sans markdown autour du JSON. ' +
      "Tu te réfères aux 9 KB de contrôle POF documentées dans Gestion documentaire et aux Positions juridiques canoniques POF.",
    permissions: { post_missive_comment: true, send_slack: true, write_notion: true },
    output_format: 'json',
    slack_channel: '#ai-assistan-legal',
    kb_pages: ['https://www.notion.so/352c2ce245e880d9ad49ea835e83afe0', 'https://www.notion.so/372c2ce245e881bab739f5218d2df3ff'],
  },

  'lawyer/nda-expert': {
    fn: 'lawyer',
    role: "Expert NDA POF : analyse NDA adverse, génère NDA POF, valide signature",
    model: ANTHROPIC_MODEL,
    max_tokens: 1800,
    system: "Tu es l'expert NDA pour Plastic Odyssey Factories (POF, SAS française). Tu gères deux modes selon la demande : ANALYSE (NDA reçu d'un tiers) ou GÉNÉRATION (NDA POF à envoyer). " +
      "" +
      "Mode ANALYSE : tu reçois un NDA dans context.document_text et tu produis un rapport STRICT JSON : " +
      '{"mode": "analyse", ' +
      '"verdict": "OK|ALERT|BLOCK", ' +
      '"score_anomalie": 0-100, ' +
      '"duree_detectee": "string", ' +
      '"juridiction_detectee": "FR|SN|EN|HK|Autre|Inconnue", ' +
      '"mutual": boolean, ' +
      '"red_flags": ["..."], ' +
      '"clauses_a_renegocier": [{"clause": "...", "actuelle": "...", "proposition_pof": "..."}], ' +
      '"signature_directe_possible": boolean, ' +
      '"recommandation": "..."}. ' +
      "" +
      "Mode GÉNÉRATION : tu reçois {signataire, email, societe, langue, juridiction?} et tu produis : " +
      '{"mode": "generation", "template_recommended": "NDA-POF-FR|NDA-POF-EN", "fields": {"signataire": "...", "societe": "...", "date_effet": "YYYY-MM-DD", "juridiction": "FR|SN|EN"}, "ready_for_odoo": boolean, "notes": "..."}. ' +
      "" +
      "Règles POF non négociables : durée max 3 ans (préférée 2), juridiction française par défaut (sénégalaise si contrepartie locale, anglaise si international), pas de pénalité unitaire illimitée (cap global 100K€), exclusions standards (public domain, déjà connu, développé indépendamment, ordre judiciaire). " +
      "" +
      "Tu réponds en français, sans markdown autour du JSON.",
    permissions: { post_missive_comment: true, send_slack: true, odoo_sign: true, write_notion: true },
    output_format: 'json',
    slack_channel: '#ai-assistan-legal',
    kb_pages: [
      'https://www.notion.so/352c2ce245e88188ada2fc7fbf9ce98b',
      'https://www.notion.so/372c2ce245e881bab739f5218d2df3ff',
      'https://www.notion.so/352c2ce245e881a39916e9fc9e3433e9'
    ],
  },

  'lawyer/corporate-governance-expert': {
    fn: 'lawyer',
    role: "Expert gouvernance corporative : pactes associés/actionnaires, contrat de marque POF×PO",
    model: ANTHROPIC_MODEL,
    max_tokens: 2200,
    system: "Tu es l'expert gouvernance corporative POF. Tu analyses les documents sensibles : pacte d'associés, pacte d'actionnaires POF SAS, contrat de marque POF × Plastic Odyssey, modifications de statuts. " +
      "" +
      "Sortie STRICT JSON : " +
      '{"type": "Pacte d\'associés|Pacte d\'actionnaires|Contrat de marque|Modification statuts|Autre gouvernance", ' +
      '"verdict": "OK|ALERT|BLOCK|ESCALATE_REQUIRED", ' +
      '"changements_vs_version_actuelle": [{"clause": "...", "ancien": "...", "nouveau": "...", "impact": "..."}], ' +
      '"covenants_impacted": ["..."], ' +
      '"droits_modifies": [{"acteur": "...", "ancien": "...", "nouveau": "..."}], ' +
      '"red_flags": ["..."], ' +
      '"escalade_humaine_recommandee": [{"acteur": "Benoit|Simon (PO)|Ouraye|Avocat Delsol", "raison": "..."}], ' +
      '"prochaine_etape": "..."}. ' +
      "" +
      "Règle absolue : pour pacte associés, pacte actionnaires, contrat de marque → ESCALATE_REQUIRED systématique. Tu ne donnes JAMAIS un feu vert unilatéral sur ces documents. Tu fournis l'analyse, l'humain décide. " +
      "" +
      "Tu te réfères aux Covenants Pacte POF documentés et aux KB de contrôle. Pour le contrat de marque, escalade systématique vers Benoit + Simon Bernard (PO). " +
      "" +
      "Tu réponds en français, sans markdown autour du JSON.",
    permissions: { post_missive_comment: true, send_slack: true, write_notion: true },
    output_format: 'json',
    slack_channel: '#ai-assistan-legal',
    kb_pages: [
      'https://www.notion.so/352c2ce245e881f39a11cdf33966b2e9',
      'https://www.notion.so/352c2ce245e88123972cc84b8a5fde8a',
      'https://www.notion.so/352c2ce245e881c088ceed4b003dea15',
      'https://www.notion.so/372c2ce245e881719f5cc6a282ce7373',
      'https://www.notion.so/372c2ce245e881bab739f5218d2df3ff'
    ],
  },

  /* ──────────────── ops-it/ ──────────────── */

  'ops-it/workflow-architect': {
    fn: 'ops-it',
    role: 'Conception et amélioration de workflows POF',
    model: ANTHROPIC_MODEL,
    max_tokens: 2000,
    system: 'Tu es architecte de workflows pour Plastic Odyssey Factories. Tu conçois des automatisations en respectant les patterns POF : ' +
      'Secrets_Proxy, Gate Keeper, Audit Trail, Event Bus, Code_KGMemory. ' +
      "Tu réponds en français, factuel et précis. Pas d'em-dashes, pas de filler.",
    permissions: { write_notion: true },
  },
};

function handleAgentList_() {
  var out = {};
  Object.keys(AGENTS).forEach(function (k) {
    var a = AGENTS[k];
    out[k] = { fn: a.fn, role: a.role, model: a.model, permissions: a.permissions || {}, notion_page: a.notion_page || null };
  });
  return { ok: true, agents: out, count: Object.keys(AGENTS).length };
}

/** Helper interne — invocation d'un agent du Registry depuis les handlers legacy.
 *  Réutilisé par handleAskAgent_, handleRegenSituation_, handleBriefPodcast_,
 *  handleLegalAnalysis_, handleGenerateNda_ pour éliminer la duplication IA. */
function invokeAgent_(agentId, ctx, query, mode) {
  return handleAgentInvoke_({
    agent: agentId,
    query: query || '(invocation interne)',
    context: ctx || {},
    mode: mode || 'fast'
  });
}

function handleAgentInvoke_(body) {
  var startMs = Date.now();
  var agentId = String(body.agent || '');
  var query   = String(body.query || '').trim();
  var ctx     = body.context || {};
  var mode    = body.mode || 'fast';

  if (!agentId) return { ok: false, error: 'agent required (ex: "marketing-comms/drafter-short")' };
  if (!query)   return { ok: false, error: 'query required' };
  if (!AGENTS[agentId]) return { ok: false, error: 'unknown agent: ' + agentId, available: Object.keys(AGENTS) };

  var agent = AGENTS[agentId];
  var model = agent.model;
  // mode=deep upgrade Haiku → Sonnet si applicable
  if (mode === 'deep' && model === 'claude-haiku-4-5') model = ANTHROPIC_MODEL;

  var prompt = buildAgentPrompt_(agent, ctx, query);

  var apiKey = getSecret_('ANTROPIC_API_TOKEN');
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: model,
      max_tokens: agent.max_tokens || 1000,
      system: agent.system,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  if (code !== 200) {
    return { ok: false, agent: agentId, error: 'anthropic_' + code, detail: res.getContentText().slice(0, 400) };
  }
  var data = JSON.parse(res.getContentText());
  var textBlock = (data.content || []).filter(function (b) { return b.type === 'text'; })[0];
  var rawText = textBlock ? textBlock.text : '';

  var parsedOutput = null;
  if (agent.output_format === 'json') {
    parsedOutput = parseJsonLoose_(rawText);
  }

  return {
    ok: true,
    agent: agentId,
    model: model,
    mode: mode,
    reply: rawText,
    output: parsedOutput,
    proposed_actions: [],
    side_effects: {},
    tokens_used: (data.usage && (data.usage.input_tokens + data.usage.output_tokens)) || 0,
    duration_ms: Date.now() - startMs
  };
}

function buildAgentPrompt_(agent, ctx, query) {
  var parts = [];
  if (ctx.contact) {
    parts.push('Contact principal : ' + (ctx.contact.name || '') + ' (' + (ctx.contact.email || '') + ')');
    if (ctx.contact.company) parts.push('Société : ' + ctx.contact.company);
    if (ctx.contact.tags && ctx.contact.tags.length) parts.push('Tags : ' + ctx.contact.tags.join(', '));
  }
  if (ctx.conversation_id) parts.push('Missive conversation : ' + ctx.conversation_id);
  if (ctx.subject) parts.push('Sujet : ' + ctx.subject);
  if (Array.isArray(ctx.others) && ctx.others.length) {
    parts.push('Autres participants : ' + ctx.others.map(function (p) { return p.name || p.email; }).join(', '));
  }
  if (ctx.person_instructions) parts.push('\nInstructions Notion sur la personne :\n' + ctx.person_instructions);
  if (ctx.conv_instructions)   parts.push('\nInstructions Notion sur la conversation :\n' + ctx.conv_instructions);
  if (Array.isArray(ctx.attachments) && ctx.attachments.length) {
    parts.push('\nPièces jointes :\n' + ctx.attachments.map(function (a) { return '  - ' + (a.filename || a.name); }).join('\n'));
  }
  if (ctx.document_text) parts.push('\n--- DOCUMENT ---\n' + String(ctx.document_text).slice(0, 6000));
  parts.push('\nDate du jour : ' + new Date().toISOString().slice(0, 10));
  parts.push('\n--- DEMANDE ---\n' + query);
  return parts.join('\n');
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ▲▲▲  POF AGENT REGISTRY  ▲▲▲
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   getSecret_ — pattern Secrets_Proxy POF
   ═══════════════════════════════════════════════════════════════ */
function getSecret_(name) {
  var props = PropertiesService.getScriptProperties();
  var proxyUrl = props.getProperty('SECRETS_PROXY_URL');
  var proxyToken = props.getProperty('SECRETS_PROXY_TOKEN');
  if (!proxyUrl || !proxyToken) {
    throw new Error('SECRETS_PROXY_URL ou SECRETS_PROXY_TOKEN manquant dans Script Properties');
  }
  var url = proxyUrl + '?action=getSecret&name=' + encodeURIComponent(name) +
            '&token=' + encodeURIComponent(proxyToken);
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error('Secrets_Proxy erreur ' + response.getResponseCode() + ' pour ' + name);
  }
  var parsed = JSON.parse(response.getContentText());
  if (parsed.error) throw new Error('Secret non trouve ou erreur proxy : ' + parsed.error);
  if (!parsed.value) throw new Error('Secret vide : ' + name);
  return parsed.value;
}

/* ═══════════════════════════════════════════════════════════════
   V1.10 HELPERS — Spec 2 V1 (Agent sidebar + apprentissage observationnel)
   Chain ID : build-20260518-agent-sidebar-missive-v1
   ═══════════════════════════════════════════════════════════════ */

/**
 * Lit les feature flags depuis la page Notion Sidebar Agent Config.
 * Cache CacheService 5 min. Tout flag manquant ou invalide → fallback default.
 * Pour forcer un reload immédiat : POST {action:'reload_config'}.
 */
function getSidebarConfig_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(SIDEBAR_CONFIG_CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch (_e) { /* fall through */ }
  }
  var flags = {};
  try {
    // Récupère les blocs enfants de la page Config et cherche un code-block JSON
    var url = 'https://api.notion.com/v1/blocks/' + SIDEBAR_CONFIG_PAGE_ID + '/children?page_size=100';
    var token = getSecret_('NOTION_API_TOKEN');
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + token, 'Notion-Version': NOTION_API_VERSION },
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() === 200) {
      var data = JSON.parse(res.getContentText());
      var blocks = data.results || [];
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        if (b.type === 'code' && b.code && (b.code.language === 'json' || !b.code.language)) {
          var raw = (b.code.rich_text || []).map(function (rt) { return rt.plain_text || ''; }).join('');
          var parsed = parseJsonLoose_(raw);
          if (parsed && parsed.flags) { flags = parsed.flags; break; }
        }
      }
    }
  } catch (e) {
    // Fail-open : on log et on tombe sur les defaults
    Logger.log('getSidebarConfig_ error: ' + (e && e.message));
  }
  // Merge defaults + flags lus
  var merged = {};
  Object.keys(SIDEBAR_DEFAULTS).forEach(function (k) { merged[k] = SIDEBAR_DEFAULTS[k]; });
  Object.keys(flags).forEach(function (k) { if (k in SIDEBAR_DEFAULTS) merged[k] = flags[k]; });
  cache.put(SIDEBAR_CONFIG_CACHE_KEY, JSON.stringify(merged), SIDEBAR_CONFIG_CACHE_TTL_SEC);
  return merged;
}

function handleReloadConfig_(_body) {
  CacheService.getScriptCache().remove(SIDEBAR_CONFIG_CACHE_KEY);
  var cfg = getSidebarConfig_();
  return { ok: true, flags: cfg };
}

/**
 * Écrit une entrée dans la DB Sidebar Interactions.
 * Fire-and-forget : toute erreur est logguée mais ne fait pas échouer la requête principale.
 * payload : {conv_id, person_id, session_id, user_query, intent, tools_called[], delegations[],
 *            reply_excerpt, outcome, proposed_actions[], tokens_used, tier_loaded, human_in_loop}
 */
function logSidebarInteraction_(payload) {
  try {
    var cfg = getSidebarConfig_();
    var logFull = cfg.sidebar_interactions_log_full !== false;
    var ts = new Date().toISOString();
    var convId = String(payload.conv_id || '').slice(0, 200);
    var truncatedQuery = String(payload.user_query || '');
    var truncatedReply = String(payload.reply_excerpt || '');
    if (!logFull) {
      // Mode méta-seul : hash sha256-like court (just length+head fallback for GAS)
      truncatedQuery = '[hidden, len=' + truncatedQuery.length + ']';
      truncatedReply = '[hidden, len=' + truncatedReply.length + ']';
    } else {
      truncatedQuery = truncatedQuery.slice(0, 1900);
      truncatedReply = truncatedReply.slice(0, 1900);
    }
    var proposedStr = '';
    if (Array.isArray(payload.proposed_actions) && payload.proposed_actions.length) {
      proposedStr = JSON.stringify(payload.proposed_actions).slice(0, 1900);
    }
    var properties = {
      'Title': { title: [{ text: { content: (payload.intent || 'unknown') + ' · ' + ts.slice(0, 16) + ' · ' + convId.slice(-12) } }] },
      'Conv ID': { rich_text: [{ text: { content: convId } }] },
      'Person ID': { rich_text: [{ text: { content: String(payload.person_id || '').slice(0, 200) } }] },
      'Session ID': { rich_text: [{ text: { content: String(payload.session_id || '').slice(0, 200) } }] },
      'Intent': { select: { name: _validIntent_(payload.intent) } },
      'User query': { rich_text: [{ text: { content: truncatedQuery } }] },
      'Reply excerpt': { rich_text: [{ text: { content: truncatedReply } }] },
      'Outcome': { select: { name: _validOutcome_(payload.outcome) } },
      'Proposed actions': { rich_text: [{ text: { content: proposedStr } }] },
      'Tokens used': { number: Number(payload.tokens_used) || 0 },
      'Tier loaded': { select: { name: _validTier_(payload.tier_loaded) } },
      'Human in loop': { checkbox: payload.human_in_loop !== false },
      'Timestamp': { date: { start: ts } },
    };
    var tools = (payload.tools_called || []).filter(function (t) { return !!t; }).slice(0, 9);
    if (tools.length) properties['Tools called'] = { multi_select: tools.map(function (t) { return { name: t }; }) };
    var delegations = (payload.delegations || []).filter(function (d) { return !!d; }).slice(0, 9);
    if (delegations.length) properties['Delegations'] = { multi_select: delegations.map(function (d) { return { name: d }; }) };

    var res = UrlFetchApp.fetch('https://api.notion.com/v1/pages', {
      method: 'post', contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + getSecret_('NOTION_API_TOKEN'), 'Notion-Version': NOTION_API_VERSION },
      payload: JSON.stringify({
        parent: { database_id: SIDEBAR_INTERACTIONS_DS_ID },
        properties: properties,
      }),
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() >= 300) {
      Logger.log('logSidebarInteraction_ http ' + res.getResponseCode() + ' : ' + res.getContentText().slice(0, 300));
      return null;
    }
    var created = JSON.parse(res.getContentText());
    return created.id || null;
  } catch (e) {
    Logger.log('logSidebarInteraction_ error: ' + (e && e.message));
    return null;
  }
}

function _validIntent_(s) {
  var allowed = ['draft_short','draft_long','draft_any','summarize','task','watch','podcast','legal','chat','unknown'];
  return allowed.indexOf(s) >= 0 ? s : 'unknown';
}
function _validOutcome_(s) {
  var allowed = ['pending','accepted','edited','ignored','rejected','error'];
  return allowed.indexOf(s) >= 0 ? s : 'pending';
}
function _validTier_(s) {
  var allowed = ['couche0','couche0+couche1','couche0+couche1+couche2','minimal'];
  return allowed.indexOf(s) >= 0 ? s : 'minimal';
}

/**
 * Met à jour les 4 champs Situation sur une page Conversation Notion.
 * fields : {summary, bullets (str), risks (str), updated_at (ISO), source ('ia'|'humain'|'mixte')}
 */
function updateConvSituationFields_(pageId, fields) {
  var summary = String(fields.summary || '').slice(0, 1900);
  var bullets = String(fields.bullets || '').slice(0, 1900);
  var risks   = String(fields.risks || '').slice(0, 1900);
  var dateVal = String(fields.updated_at || new Date().toISOString());
  var props = {};
  props[CONV_SITUATION_SUMMARY_PROP] = { rich_text: [{ text: { content: summary } }] };
  props[CONV_SITUATION_BULLETS_PROP] = { rich_text: [{ text: { content: bullets } }] };
  props[CONV_SITUATION_RISKS_PROP]   = { rich_text: [{ text: { content: risks } }] };
  props[CONV_SITUATION_UPDATED_PROP] = { date: { start: dateVal } };
  props[CONV_SITUATION_SOURCE_PROP]  = { select: { name: fields.source || 'ia' } };
  var res = UrlFetchApp.fetch('https://api.notion.com/v1/pages/' + pageId, {
    method: 'patch', contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + getSecret_('NOTION_API_TOKEN'), 'Notion-Version': NOTION_API_VERSION },
    payload: JSON.stringify({ properties: props }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) {
    throw new Error('Conv situation update http ' + res.getResponseCode() + ' : ' + res.getContentText().slice(0, 300));
  }
  return true;
}

/**
 * Met à jour le champ Outcome d'une interaction loggée (utilisé quand le frontend
 * détecte que l'utilisateur a accepté/édité/ignoré la réponse de l'agent).
 * body : {interaction_id, outcome}
 */
function handleUpdateOutcome_(body) {
  var id = String(body.interaction_id || '');
  var outcome = _validOutcome_(body.outcome);
  if (!id) return { error: 'interaction_id required' };
  var res = UrlFetchApp.fetch('https://api.notion.com/v1/pages/' + id, {
    method: 'patch', contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + getSecret_('NOTION_API_TOKEN'), 'Notion-Version': NOTION_API_VERSION },
    payload: JSON.stringify({ properties: { 'Outcome': { select: { name: outcome } } } }),
    muteHttpExceptions: true,
  });
  return res.getResponseCode() < 300 ? { ok: true, outcome: outcome } : { error: 'http_' + res.getResponseCode() };
}

/**
 * NLU fallback Haiku pour intent flou.
 * Renvoie {intent, confidence} où intent ∈ INTENT_PATTERNS keys ou 'chat'.
 * Activé quand detectIntent_ retourne 'chat' (aucun mot-clé matché).
 */
function intentFallbackNlu_(query, cfg) {
  try {
    var model = (cfg && cfg.intent_fallback_model) || 'claude-haiku-4-5';
    var apiKey = getSecret_('ANTROPIC_API_TOKEN');
    var system = 'Tu classes l\'intention d\'une requête utilisateur sur une sidebar de boîte mail. ' +
      'Réponds en JSON strict : {"intent": "<one>", "confidence": 0-1}. ' +
      'Intents possibles : draft_short, draft_long, summarize, task, watch, legal, podcast, chat. ' +
      'Si la requête est une question d\'information ou autre, retourne "chat".';
    var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post', contentType: 'application/json',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify({
        model: model,
        max_tokens: 80,
        system: system,
        messages: [{ role: 'user', content: 'Requête : ' + String(query).slice(0, 400) }],
      }),
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) return { intent: 'chat', confidence: 0, error: 'http_' + res.getResponseCode() };
    var data = JSON.parse(res.getContentText());
    var textBlock = (data.content || []).filter(function (b) { return b.type === 'text'; })[0];
    var parsed = parseJsonLoose_(textBlock ? textBlock.text : '');
    if (!parsed) return { intent: 'chat', confidence: 0 };
    return { intent: _validIntent_(parsed.intent), confidence: Number(parsed.confidence) || 0 };
  } catch (e) {
    return { intent: 'chat', confidence: 0, error: String(e && e.message) };
  }
}

/**
 * Job nocturne : scanne sidebar_interactions des N derniers jours,
 * group by (person_id, intent), seuil dépassé → push Feedback Atomic.
 * Idempotence : dedupe par (person_id, intent, semaine YYYY-WW).
 */
function runNightlyPatternScan_() {
  var cfg = getSidebarConfig_();
  var threshold = Number(cfg.pattern_detection_threshold) || 3;
  var windowDays = Number(cfg.pattern_detection_window_days) || 7;
  var sinceIso = new Date(Date.now() - windowDays * 86400 * 1000).toISOString();

  var token = getSecret_('NOTION_API_TOKEN');
  var url = 'https://api.notion.com/v1/databases/' + SIDEBAR_INTERACTIONS_DS_ID + '/query';
  var allResults = [];
  var hasMore = true;
  var nextCursor = null;
  var pages = 0;
  while (hasMore && pages < 10) {
    var query = {
      filter: { property: 'Timestamp', date: { on_or_after: sinceIso } },
      page_size: 100,
    };
    if (nextCursor) query.start_cursor = nextCursor;
    var res = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + token, 'Notion-Version': NOTION_API_VERSION },
      payload: JSON.stringify(query),
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) {
      return { error: 'query_http_' + res.getResponseCode(), body: res.getContentText().slice(0, 300) };
    }
    var data = JSON.parse(res.getContentText());
    allResults = allResults.concat(data.results || []);
    hasMore = !!data.has_more;
    nextCursor = data.next_cursor;
    pages++;
  }

  // Group by (person_id, intent)
  var groups = {};
  allResults.forEach(function (page) {
    var props = page.properties || {};
    var personId = ((props['Person ID'] || {}).rich_text || []).map(function (r) { return r.plain_text || ''; }).join('').trim();
    var intent = ((props['Intent'] || {}).select || {}).name || 'unknown';
    if (!personId || personId === '') return; // ignore entries sans personne identifiée
    var key = personId + '|' + intent;
    if (!groups[key]) groups[key] = { person_id: personId, intent: intent, count: 0, samples: [] };
    groups[key].count++;
    if (groups[key].samples.length < 3) {
      var q = ((props['User query'] || {}).rich_text || []).map(function (r) { return r.plain_text || ''; }).join('').slice(0, 120);
      groups[key].samples.push(q);
    }
  });

  // Filter groups above threshold
  var triggered = Object.keys(groups).map(function (k) { return groups[k]; })
    .filter(function (g) { return g.count >= threshold; });

  // Dedupe par (person_id, intent, semaine)
  var weekStamp = _isoWeekStamp_(new Date());
  var posted = [];
  for (var i = 0; i < triggered.length; i++) {
    var g = triggered[i];
    var dedupeKey = 'pattern_scan_' + weekStamp + '_' + g.person_id.slice(-12) + '_' + g.intent;
    if (CacheService.getScriptCache().get(dedupeKey)) continue;
    var ok = _pushFeedbackPattern_(g, windowDays, weekStamp);
    if (ok) {
      CacheService.getScriptCache().put(dedupeKey, '1', 7 * 86400); // cache 7 jours
      posted.push({ person_id: g.person_id, intent: g.intent, count: g.count });
    }
    if (posted.length >= 5) break; // anti-spam : max 5 entrées par run
  }

  return { ok: true, scanned: allResults.length, groups: Object.keys(groups).length, triggered: triggered.length, posted: posted };
}

function _pushFeedbackPattern_(g, windowDays, weekStamp) {
  try {
    var title = '[Sidebar pattern] ' + g.count + ' requêtes "' + g.intent + '" sur ' + g.person_id.slice(-20) + ' (' + windowDays + 'j)';
    var description =
      'Pattern détecté par runNightlyPatternScan_ — semaine ' + weekStamp + '.\n\n' +
      'Person ID : ' + g.person_id + '\n' +
      'Intent : ' + g.intent + '\n' +
      'Count : ' + g.count + ' / seuil ' + (Number(getSidebarConfig_().pattern_detection_threshold) || 3) + '\n' +
      'Fenêtre : ' + windowDays + ' jours\n\n' +
      'Exemples de requêtes :\n' +
      g.samples.map(function (s) { return '• ' + s; }).join('\n') +
      '\n\nSuggestion : enrichir le Briefing veille de cette Personne pour éviter de répéter cette question.';
    // Écriture Feedback Atomic (réutilise le pattern existant handleSubmitFeedback_, mais on appelle directement)
    var res = UrlFetchApp.fetch('https://api.notion.com/v1/pages', {
      method: 'post', contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + getSecret_('NOTION_API_TOKEN'), 'Notion-Version': NOTION_API_VERSION },
      payload: JSON.stringify({
        parent: { database_id: FEEDBACK_DB_ID },
        properties: {
          'Name': { title: [{ text: { content: title.slice(0, 200) } }] },
          'Type': { select: { name: 'improvement' } },
          'Domain': { select: { name: 'Agent' } },
          'Severity': { select: { name: 'low' } },
          'Status': { select: { name: 'Pending' } },
          'Source': { select: { name: 'agent' } },
          'Description': { rich_text: [{ text: { content: description.slice(0, 1900) } }] },
        },
      }),
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() >= 300) {
      Logger.log('_pushFeedbackPattern_ http ' + res.getResponseCode() + ' : ' + res.getContentText().slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    Logger.log('_pushFeedbackPattern_ error: ' + (e && e.message));
    return false;
  }
}

function _isoWeekStamp_(d) {
  // YYYY-WW format pour dedupe hebdomadaire
  var target = new Date(d.valueOf());
  var dayNr = (d.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  var firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  var week = 1 + Math.ceil((firstThursday - target) / 604800000);
  return d.getUTCFullYear() + '-W' + (week < 10 ? '0' + week : week);
}

function handleRunNightlyScan_(_body) {
  return runNightlyPatternScan_();
}

/**
 * Crée (ou recrée) le trigger time-driven du job nocturne.
 * À appeler manuellement une seule fois via POST {action:'setup_nightly_trigger'}.
 * Le trigger se déclenche tous les jours à 2-3h Europe/Paris.
 */
function handleSetupNightlyTrigger_(_body) {
  // Supprime les triggers existants pour runNightlyPatternScan_
  var existing = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'runNightlyPatternScan_') {
      ScriptApp.deleteTrigger(existing[i]);
      removed++;
    }
  }
  // Crée un nouveau trigger : tous les jours à 2h (heure projet, Europe/Paris si bien configuré)
  ScriptApp.newTrigger('runNightlyPatternScan_')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
  return { ok: true, removed: removed, created: 1, handler: 'runNightlyPatternScan_' };
}

/**
 * Wrapper de handleAskAgent_ : applique le NLU fallback si intent flou,
 * appelle le handler original, puis loggue dans sidebar_interactions.
 * Retourne le résultat enrichi de {interaction_id, session_id} pour permettre
 * au frontend de remonter l'outcome via update_outcome.
 */
function handleAskAgentWithLogging_(body) {
  var cfg = getSidebarConfig_();

  // Session per conversation : récupère ou génère un session_id court
  var sessionId = String(body.session_id || '');
  if (!sessionId) {
    sessionId = 'sb_' + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  }
  body.session_id = sessionId;

  // NLU fallback : si intent vide / 'chat' et la query a >5 mots, tenter Haiku
  var rawIntent = String(body.intent || '') || detectIntent_(body.query || '');
  var fallbackUsed = false;
  if ((rawIntent === 'chat' || !rawIntent) && String(body.query || '').split(/\s+/).length > 4) {
    var nlu = intentFallbackNlu_(body.query, cfg);
    if (nlu && nlu.intent && nlu.intent !== 'chat' && (nlu.confidence || 0) >= 0.6) {
      rawIntent = nlu.intent;
      fallbackUsed = true;
    }
  }
  body.intent = rawIntent;

  // Détermine le tier loaded (heuristique simple : si body.main + others, on est sur couche0)
  var tierLoaded = 'minimal';
  if (body.main && body.main.name) tierLoaded = 'couche0';
  if (rawIntent && rawIntent.indexOf('draft') === 0) tierLoaded = 'couche0+couche1';

  // Appel du handler core
  var result = handleAskAgent_(body);

  // Détermine tools_called et delegations à partir du résultat
  var tools = [];
  var delegations = [];
  var intentReported = result.intent || rawIntent;
  if (intentReported === 'draft_short' || intentReported === 'draft_any') {
    tools.push('drafter_a'); delegations.push('drafter_a');
  } else if (intentReported === 'draft_long') {
    tools.push('drafter_b'); delegations.push('drafter_b');
  } else if (intentReported === 'summarize') {
    tools.push('regen_situation');
  } else if (intentReported === 'task') {
    tools.push('create_task');
  } else if (intentReported === 'watch') {
    tools.push('add_to_watch'); delegations.push('add_to_watch');
  } else if (intentReported === 'podcast') {
    tools.push('brief_podcast'); delegations.push('brief_podcast');
  } else if (intentReported === 'legal') {
    tools.push('signature_action'); delegations.push('signature_action');
  } else {
    tools.push('chat_libre');
  }

  // Persiste Agent session ID sur la Conv (cosmétique pour V1, utile pour le pipeline cron qui lit aussi ce champ)
  try {
    var convPageId = ensureConvPage_(body.conversation_id);
    if (convPageId) {
      UrlFetchApp.fetch('https://api.notion.com/v1/pages/' + convPageId, {
        method: 'patch', contentType: 'application/json',
        headers: { 'Authorization': 'Bearer ' + getSecret_('NOTION_API_TOKEN'), 'Notion-Version': NOTION_API_VERSION },
        payload: JSON.stringify({ properties: {
          'Agent session ID': { rich_text: [{ text: { content: sessionId } }] },
          'Last agent': { rich_text: [{ text: { content: SIDEBAR_AGENT_ID + ' · ' + intentReported } }] },
        } }),
        muteHttpExceptions: true,
      });
    }
  } catch (_e) { /* non-bloquant */ }

  // Log sidebar_interactions
  var payload = _buildInteractionPayload_(body, result, {
    intent: intentReported,
    tools: tools,
    delegations: delegations,
    session_id: sessionId,
    tier_loaded: tierLoaded,
    tokens_used: result.tokens_used || 0,
  });
  var interactionId = logSidebarInteraction_(payload);

  // Enrichit la réponse avec session_id + interaction_id (pour update_outcome ultérieur)
  result.session_id = sessionId;
  if (interactionId) result.interaction_id = interactionId;
  if (fallbackUsed) result.intent_via_nlu = true;
  result.flags = { context_tier_budget_tokens: cfg.context_tier_budget_tokens };
  return result;
}

/* ─── Logging hook utilitaire pour handleAskAgent_ ─────────────────
   Construit un payload sidebar_interactions à partir du body de la requête
   et du résultat du handler. */
function _buildInteractionPayload_(body, result, opts) {
  opts = opts || {};
  var tools = opts.tools || [];
  var delegations = opts.delegations || [];
  var personId = '';
  if (body.main && body.main.notion_page_id) personId = body.main.notion_page_id;
  else if (body.person_id) personId = body.person_id;
  return {
    conv_id: body.conversation_id || '',
    person_id: personId,
    session_id: opts.session_id || body.session_id || '',
    user_query: body.query || '',
    intent: opts.intent || result.intent || 'unknown',
    tools_called: tools,
    delegations: delegations,
    reply_excerpt: (result && result.reply ? String(result.reply).slice(0, 500) : ''),
    outcome: result && result.error ? 'error' : 'pending',
    proposed_actions: (result && result.proposed) || [],
    tokens_used: opts.tokens_used || 0,
    tier_loaded: opts.tier_loaded || 'minimal',
    human_in_loop: true,
  };
}
