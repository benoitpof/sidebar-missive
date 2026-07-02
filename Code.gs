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
      case 'ping':                       result = { ok: true, version: '1.26.0', agents: Object.keys(AGENTS) }; break;
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
      case 'enrich_and_sync':            result = handleEnrichAndSync_(body);         break;
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
  return json_({ ok: true, service: 'missive-sidebar-proxy', version: '1.26.0', agents: Object.keys(AGENTS) });
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
    // database_id (et non data_source_id) : data_source_id n'existe qu'à partir de
    // l'API Notion 2025+, or on envoie Notion-Version 2022-06-28 → 400 sinon. (audit C5)
    parent: { database_id: FEEDBACK_DB_ID }, properties: properties
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
  // La description d'une tâche est stockée dans la propriété 'Prompt' (cf. handleCreateTask_). (audit C5)
  if (body.description) properties['Prompt'] = { rich_text: [{ text: { content: String(body.description) } }] };
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
  // Le frontend (bloc éditable de la synthèse) envoie `html`. Accepter aussi ce champ
  // et le convertir en texte : sans ça, toute édition manuelle échouait en 'text required'. (audit C4)
  if (!text && body.html) text = htmlToText_(String(body.html)).trim();
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

    if (!items.length) {
      return { success: false, error: 'Aucune demande en attente de ta signature.' };
    }

    // Ne garder que les sign.request réellement actives (state = sent ; on écarte expired/canceled/completed).
    // Un seul read() ORM sur TOUS les reqIds au lieu d'un read() par item : c'était le principal
    // goulet du bouton "Signer maintenant" (N allers-retours Odoo séquentiels quand N documents
    // sont en attente de signature).
    var reqIds = [];
    for (var i = 0; i < items.length; i++) {
      var rid = items[i].sign_request_id && items[i].sign_request_id[0];
      if (rid && reqIds.indexOf(rid) === -1) reqIds.push(rid);
    }
    var reqById = {};
    if (reqIds.length) {
      var reqs = odooCall_(uid, apiKey, 'sign.request', 'read',
        [reqIds],
        { fields: ['id', 'reference', 'state', 'create_uid', 'template_id'] }
      );
      for (var r = 0; r < reqs.length; r++) reqById[reqs[r].id] = reqs[r];
    }
    var candidates = [];
    for (var i2 = 0; i2 < items.length; i2++) {
      var rid2 = items[i2].sign_request_id && items[i2].sign_request_id[0];
      var req2 = rid2 && reqById[rid2];
      if (req2 && req2.state === 'sent') {
        candidates.push({ item: items[i2], req: req2 });
      }
    }

    if (!candidates.length) {
      return { success: false, error: 'Aucune demande active en attente de ta signature (déjà signées ou expirées).' };
    }

    // Sélection robuste : matcher sur le nom du document ouvert dans Missive.
    // À défaut de match : un seul candidat → on le prend ; plusieurs → on refuse (jamais signer au hasard).
    var norm = function (s) { return String(s || '').toLowerCase().replace(/\.pdf$/, '').replace(/[^a-z0-9]/g, ''); };
    var target = null;
    if (docName) {
      var want = norm(docName);
      for (var k = 0; k < candidates.length; k++) {
        var ref = norm(candidates[k].req.reference);
        if (ref && (ref === want || ref.indexOf(want) !== -1 || want.indexOf(ref) !== -1)) {
          target = candidates[k];
          break;
        }
      }
    }
    if (!target) {
      if (candidates.length === 1) {
        target = candidates[0];
      } else {
        var list = candidates.map(function (c) {
          var sender = c.req.create_uid && c.req.create_uid[1] ? ' (de ' + c.req.create_uid[1] + ')' : '';
          return '• ' + c.req.reference + sender;
        }).join('\n');
        return { success: false, error: 'Plusieurs demandes en attente, choix ambigu. Ouvre la conversation du bon document.\n' + list };
      }
    }

    var itemId     = target.item.id;
    var roleId     = target.item.role_id && target.item.role_id[0];
    var templateId = target.req.template_id && target.req.template_id[0];

    // ── 3-4. Champs du template pour ce rôle + signature enregistrée sur le compte Benoît ──
    //   page/posX servent à écarter les champs fantômes non placés sur le PDF (page=-1).
    //   Les deux lectures sont indépendantes : un seul aller-retour réseau via fetchAll
    //   au lieu de deux appels séquentiels.
    var batch2 = odooCallBatch_(uid, apiKey, [
      { model: 'sign.item', method: 'search_read',
        args: [[['template_id', '=', templateId], ['responsible_id', '=', roleId]]],
        kwargs: { fields: ['id', 'type_id', 'name', 'required', 'page', 'posX'] } },
      { model: 'res.users', method: 'read',
        args: [[uid]],
        kwargs: { fields: ['sign_signature', 'sign_initials'] } },
    ]);
    var signItems = batch2[0];
    var users     = batch2[1];
    var userData = users && users[0];
    if (!userData || !userData.sign_signature) {
      return { success: false, error: 'Aucune signature enregistrée dans Odoo. Va dans Préférences > Signature pour en déposer une.' };
    }
    // Le contrôleur /sign/sign attend des data URLs PNG ; res.users stocke du base64 brut.
    var sigBlob  = asPngDataUrl_(userData.sign_signature);
    var initBlob = asPngDataUrl_(userData.sign_initials || userData.sign_signature);

    // ── 5. Construire le payload { sign_item_id: valeur } ──
    var payload = {};
    for (var j = 0; j < signItems.length; j++) {
      var si       = signItems[j];
      // Ignorer les champs non posés sur le document (page/posX = -1) : artefacts de template,
      // rejetés par Odoo avec "Some unauthorised items are filled".
      if (Number(si.page) < 0 || Number(si.posX) < 0) continue;
      var typeSlug = (si.type_id && si.type_id[1] ? si.type_id[1] : '').toLowerCase();
      if (typeSlug === 'signature')                           { payload[String(si.id)] = sigBlob;    }
      else if (typeSlug === 'initials' || typeSlug === 'initial') { payload[String(si.id)] = initBlob;   }
      else if (typeSlug === 'name'   || si.name === 'Nom')   { payload[String(si.id)] = signerName; }
      else if (typeSlug === 'date')                          { payload[String(si.id)] = today;       }
      else if (typeSlug === 'text')                          { payload[String(si.id)] = lieu;        }
      // Autres types (checkbox, radio…) : skippés en V1
    }

    // ── 6. Signer via le contrôleur web public Odoo /sign/sign/<request_id>/<access_token> ──
    //   sign.request.item.sign() exige sudo → impossible en JSON-RPC direct.
    //   Cette route (type=json, auth=public) gère le sudo côté serveur. Vérifiée prod Odoo 19.
    var accessToken = target.item.access_token;
    if (!accessToken) throw new Error('access_token absent sur sign.request.item ' + itemId);
    if (!payload || Object.keys(payload).length === 0) {
      throw new Error('Aucun champ à signer trouvé pour le rôle ' + roleId + ' (template ' + templateId + ').');
    }
    var signUrl = ODOO_URL + '/sign/sign/' + target.req.id + '/' + accessToken;
    var signResp = UrlFetchApp.fetch(signUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: 1, params: { signature: payload } }),
      muteHttpExceptions: true,
      followRedirects: false,
    });
    var signStatus = signResp.getResponseCode();
    var signBody   = signResp.getContentText();
    if (signStatus !== 200) {
      var location = signResp.getHeaders()['Location'] || '';
      throw new Error('[Sign HTTP ' + signStatus + (location ? ' → ' + location : '') + '] ' + signBody.slice(0, 200));
    }
    if (signBody.trim().charAt(0) === '<') {
      throw new Error('[Sign HTML inattendu] ' + signBody.slice(0, 200));
    }
    var signData = JSON.parse(signBody);
    if (signData.error) {
      throw new Error('Odoo Sign error: ' + JSON.stringify(signData.error.data || signData.error).slice(0, 300));
    }
    var signResult = signData.result || {};
    if (!signResult.success) {
      throw new Error('Signature refusée par Odoo (success=false). Réponse: ' +
        JSON.stringify(signResult).slice(0, 250) + ' | champs envoyés: ' + Object.keys(payload).join(','));
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

// res.users stocke les signatures en base64 brut ; le contrôleur /sign/sign
// attend un data URL PNG (comme le widget de signature Odoo). Conversion idempotente.
function asPngDataUrl_(b64) {
  if (!b64) return b64;
  return String(b64).indexOf('data:') === 0 ? b64 : 'data:image/png;base64,' + b64;
}

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

// Exécute plusieurs execute_kw indépendants en un seul aller-retour réseau (UrlFetchApp.fetchAll)
// au lieu d'un fetch() séquentiel par appel. calls: [{model, method, args, kwargs}, ...].
// Retourne les résultats dans le même ordre. Lève sur la première erreur RPC rencontrée.
function odooCallBatch_(uid, apiKey, calls) {
  var requests = calls.map(function (c) {
    return {
      url: ODOO_URL + '/jsonrpc',
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        jsonrpc: '2.0', method: 'call', id: 1,
        params: {
          service: 'object', method: 'execute_kw',
          args: [ODOO_DB, uid, apiKey, c.model, c.method, c.args, c.kwargs || {}],
        },
      }),
      muteHttpExceptions: true,
    };
  });
  var responses = UrlFetchApp.fetchAll(requests);
  return responses.map(function (resp, idx) {
    var data = JSON.parse(resp.getContentText());
    if (data.error) {
      throw new Error('Odoo RPC error (' + calls[idx].model + '.' + calls[idx].method + '): ' +
        JSON.stringify(data.error).slice(0, 300));
    }
    return data.result;
  });
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

/* ─── legal_analysis : délégation au POF Agent Registry (cerveau unique) + repli inline ─── */

/**
 * REG-E (2026-06-22) : délègue l'analyse juridique de la sidebar au cerveau contrat
 * unifié du Registry, EN INTERNE (le GAS s'appelle lui-même via invokeAgent_, aucun
 * appel HTTP sortant). Choisit lawyer/legal-orchestrator en mode 'deep' si le document
 * est long (revue clause-par-clause), sinon lawyer/legal-analyzer (analyse one-shot).
 *
 * Mappe le contrat JSON normalisé du Registry (verdict GO|SOUS_CONDITIONS|NO_GO|ESCALADE,
 * findings 🚫|⚠️|💡, escalade...) vers le format legacy attendu par la sidebar
 * (verdict OK|ALERT|BLOCK, score_anomalie, red_flags, points_cles, recommandation,
 * signature_requise, juridiction_detectee).
 *
 * Fail-open : retourne null sur toute erreur (Registry KO, sortie inexploitable) ->
 * l'appelant retombe sur l'ancien chemin Anthropic inline. ADDITIF, ne casse rien.
 *
 * Seuil 'deep' : document + contexte > 1500 caractères -> revue profonde.
 */
var LEGAL_ANALYSIS_DEEP_THRESHOLD = 1500;

function legalAnalysisViaRegistry_(contextDoc, subject, mainName, personInstr) {
  try {
    var docLen = String(contextDoc || '').length;
    var deep = docLen > LEGAL_ANALYSIS_DEEP_THRESHOLD;
    var agentId = deep ? 'lawyer/legal-orchestrator' : 'lawyer/legal-analyzer';
    var mode = deep ? 'deep' : 'fast';

    var ctx = {
      subject: subject || '',
      contact: mainName ? { name: mainName } : undefined,
      person_instructions: personInstr || '',
      document_text: contextDoc || ''
    };
    var query = 'Analyse ce document juridique reçu par mail (sidebar Missive) : détecte le type, ' +
      'confronte-le aux grilles de contrôle POF et aux positions canoniques, et rends ton avis structuré.';

    var res = invokeAgent_(agentId, ctx, query, mode);
    if (!res || res.ok !== true) {
      Logger.log('legalAnalysisViaRegistry_ : invokeAgent ok!=true (' + agentId + ') -> repli inline');
      return null;
    }
    var out = res.output;
    if (!out || typeof out !== 'object') {
      Logger.log('legalAnalysisViaRegistry_ : output non exploitable (' + agentId + ') -> repli inline');
      return null;
    }

    var report = out.review === true
      ? mapDeepReviewToLegacyReport_(out)
      : mapAnalyzerOutputToLegacyReport_(out);
    if (!report) {
      Logger.log('legalAnalysisViaRegistry_ : mapping vide -> repli inline');
      return null;
    }
    // Traçabilité : d'où vient le rapport (utile pour le smoke test / debug).
    report._engine = 'registry';
    report._agent = agentId;
    report._mode = mode;
    return report;
  } catch (e) {
    Logger.log('legalAnalysisViaRegistry_ exception -> repli inline : ' + (e && e.message));
    return null;
  }
}

/** Traduit un verdict normalisé Registry vers le verdict legacy OK|ALERT|BLOCK. */
function mapVerdictToLegacy_(v) {
  switch (String(v || '').toUpperCase()) {
    case 'GO': return 'OK';
    case 'SOUS_CONDITIONS': return 'ALERT';
    case 'NO_GO': return 'BLOCK';
    case 'ESCALADE': return 'BLOCK';
    default: return 'ALERT'; // inconnu -> prudence
  }
}

/** Mappe la sortie fast (lawyer/legal-analyzer, contrat LAWYER_JSON_CONTRACT) vers le format legacy sidebar. */
function mapAnalyzerOutputToLegacyReport_(out) {
  var findings = Array.isArray(out.findings) ? out.findings : [];
  var redFlags = [];
  var pointsCles = [];
  for (var i = 0; i < findings.length; i++) {
    var f = findings[i] || {};
    var label = (f.objet ? f.objet + ' : ' : '') + (f.detail || '');
    label = String(label).trim();
    if (!label) continue;
    if (f.severite === '🚫' || f.severite === '⚠️') redFlags.push(label);
    else pointsCles.push(label);
  }
  // points_cles : findings 💡 + faits saillants (les faits cadrent l'analyse pour l'humain).
  if (Array.isArray(out.faits)) {
    out.faits.forEach(function (x) { if (x) pointsCles.push(String(x)); });
  }
  var score = typeof out.score === 'number' ? out.score : 0;
  // Contrat Registry : score 0-10. Legacy score_anomalie : 0-100.
  var scoreAnomalie = Math.max(0, Math.min(100, Math.round(score * 10)));
  var escaladeRequise = !!(out.escalade && out.escalade.requise);
  var verdictLegacy = mapVerdictToLegacy_(out.verdict);
  // Recommandation : conseils joints, sinon disclaimer.
  var reco = Array.isArray(out.conseils) && out.conseils.length
    ? out.conseils.join(' ')
    : (escaladeRequise && out.escalade && out.escalade.motif ? out.escalade.motif : (out.disclaimer || '—'));

  return {
    type: out.type_objet || 'Document',
    verdict: verdictLegacy,
    score_anomalie: scoreAnomalie,
    red_flags: redFlags,
    points_cles: pointsCles,
    recommandation: reco,
    // signature_requise legacy = signal "à router vers signature". On le pose si avis favorable
    // (GO) ET pas d'escalade humaine bloquante. SOUS_CONDITIONS/NO_GO/ESCALADE -> pas de signature directe.
    signature_requise: (verdictLegacy === 'OK') && !escaladeRequise,
    juridiction_detectee: out.juridiction_detectee || 'Inconnue',
    escalade_humaine: escaladeRequise
  };
}

/** Mappe la sortie deep (lawyer/legal-orchestrator, revue clause-par-clause) vers le format legacy sidebar. */
function mapDeepReviewToLegacyReport_(out) {
  var perQ = Array.isArray(out.par_question) ? out.par_question : [];
  var redFlags = [];
  var pointsCles = [];
  for (var i = 0; i < perQ.length; i++) {
    var q = perQ[i] || {};
    var fs = Array.isArray(q.findings) ? q.findings : [];
    for (var j = 0; j < fs.length; j++) {
      var f = fs[j] || {};
      var label = (f.objet ? f.objet + ' : ' : '') + (f.detail || '');
      label = String(label).trim();
      if (!label) continue;
      if (f.severite === '🚫' || f.severite === '⚠️') redFlags.push(label);
      else pointsCles.push(label);
    }
    // Si une question n'a pas de findings, on garde sa synthèse comme point clé.
    if (!fs.length && q.question) pointsCles.push(String(q.question) + ' (verdict : ' + (q.verdict || '?') + ')');
  }
  var verdictLegacy = mapVerdictToLegacy_(out.verdict_global);
  var escaladeRequise = !!(out.escalade && out.escalade.requise);
  var reco = Array.isArray(out.conseils) && out.conseils.length
    ? out.conseils.join(' ')
    : (escaladeRequise && out.escalade && out.escalade.motif ? out.escalade.motif : (out.disclaimer || '—'));
  // Score legacy approximé depuis le verdict global (la revue deep ne porte pas un score 0-10 unique).
  var scoreMap = { 'OK': 0, 'ALERT': 50, 'BLOCK': 90 };
  return {
    type: 'Document (revue clause-par-clause)',
    verdict: verdictLegacy,
    score_anomalie: scoreMap[verdictLegacy] != null ? scoreMap[verdictLegacy] : 50,
    red_flags: redFlags,
    points_cles: pointsCles,
    recommandation: reco + (out.partial ? ' [Revue partielle : ' + (out.partial_reason || '') + ']' : ''),
    signature_requise: (verdictLegacy === 'OK') && !escaladeRequise,
    juridiction_detectee: 'Inconnue',
    escalade_humaine: escaladeRequise
  };
}

function handleLegalAnalysis_(body) {
  var convId = String(body.conversation_id || '');
  var mainName = (body.main && body.main.name) || '';
  var subject = String(body.subject || '');
  var personInstr = String(body.person_instructions || '');

  // 1. Extraire le contenu pertinent depuis Missive API (PJ si fournies, sinon body du dernier message)
  // GARDE-FOU (incident smoke-regE-cible1, 2026-06-22) : une analyse juridique ne se lance JAMAIS
  // sans document réellement récupéré. Un échec d'accès (id non-UUID, conversation inexistante,
  // token KO) ou une conversation vide doit court-circuiter ICI — sans verdict, sans commentaire
  // Missive, sans alerte Slack. Sinon une panne technique se déguise en BLOCK juridique.
  var contextDoc = '';
  var attachmentIds = body.attachment_ids || [];
  var docTitle = '(document Missive)';

  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(convId)) {
    return { success: false, error: 'invalid_conversation_id', conversation_id: convId,
             message: 'conversation_id doit être un UUID Missive valide. Aucune analyse lancée.' };
  }

  var msgs;
  try {
    msgs = missiveListMessages_(convId, 5);
  } catch (e) {
    return { success: false, error: 'missive_fetch_failed', detail: e.message, conversation_id: convId,
             message: 'Conversation Missive inaccessible. Aucune analyse lancée, aucune alerte envoyée.' };
  }
  var lastMsg = (msgs.messages || [])[0] || null;
  var bodyText = lastMsg ? (lastMsg.body || lastMsg.preview || '') : '';
  var atts = (lastMsg && lastMsg.attachments) || [];
  if (!lastMsg || (!String(bodyText).trim() && !atts.length)) {
    return { success: false, error: 'no_document_content', conversation_id: convId,
             message: 'Aucun contenu de document trouvé dans la conversation. Aucune analyse lancée.' };
  }

  contextDoc += 'Message expéditeur : ' + ((lastMsg.from_field && lastMsg.from_field.name) || '') + '\n';
  contextDoc += 'Date : ' + (lastMsg.delivered_at || '') + '\n';
  contextDoc += 'Subject : ' + (lastMsg.subject || subject) + '\n\n';
  contextDoc += 'Corps du dernier message :\n' + String(bodyText).slice(0, 4000) + '\n';
  if (atts.length) {
    contextDoc += '\nPièces jointes détectées (' + atts.length + ') :\n';
    atts.forEach(function (a) { contextDoc += '  - ' + (a.filename || a.name || a.id) + ' (' + (a.media_type || '') + ')\n'; });
    docTitle = atts[0].filename || docTitle;
  }

  // 2. Analyse : délégation au cerveau unique (POF Agent Registry) en priorité,
  //    repli sur l'ancien chemin Anthropic inline si le Registry échoue.
  var report = null;
  var analysisEngine = 'inline';
  var registryReport = legalAnalysisViaRegistry_(contextDoc, subject, mainName, personInstr);
  if (registryReport) {
    report = registryReport;
    analysisEngine = 'registry';
  }

  if (!report) {
  // 2bis. REPLI — Analyse via Claude Sonnet inline (ancien chemin, schéma legacy)
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
  report = parseJsonLoose_(anaTextBlock ? anaTextBlock.text : '');
  if (!report) return { success: false, error: 'invalid_analysis_json' };
  } // fin du repli inline (if (!report))

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
    engine: analysisEngine, // 'registry' (cerveau unique) ou 'inline' (repli)
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
  // Les participants secondaires n'ont pas de page_id côté front : résoudre par email/nom. (audit C4)
  if (!pageId && (body.email || body.contact_email || body.name)) {
    pageId = resolveContactPageId_({ contact_email: body.email || body.contact_email, contact_name: body.name }) || '';
  }
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

  // On ignore volontairement body.page_id : lors d'un changement rapide de conversation,
  // le frontend peut transmettre le page_id d'une AUTRE conversation (race), ce qui
  // écrirait les instructions sur la mauvaise page. On résout toujours la page côté
  // serveur à partir du conversation_id, seule source fiable. (audit C6)
  var pageId = '';
  var search = notionFetch_('POST', '/databases/' + dbId + '/query', {
    filter: { property: idProp, rich_text: { equals: convId } },
    page_size: 1
  });
  if (search.results && search.results.length) pageId = search.results[0].id;

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
  // Le frontend envoie `prompt` (dock agent) ; on accepte aussi `query` (contrat back
  // historique). Sans ce fallback, chaque message du dock échouait en 'query required'. (audit C1)
  var query  = String(body.query || body.prompt || '').trim();
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

  // Ne jamais persister une synthèse vide : elle écraserait une synthèse existante
  // (ex. réponse modèle non-JSON, désormais neutralisée par parseJsonLoose_ → null). (audit C7)
  if (!out.summary && !out.bullets.length && !out.risks.length) {
    out.skipped_persist = 'empty';
    return out;
  }

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
  catch (_e) {
    // Retour null (et non un objet {error} truthy). Un objet truthy passait les gardes
    // `typeof parsed === 'object'` en aval et faisait écraser une synthèse persistée par
    // des champs vides. On loggue le brut pour investigation. (audit C7)
    Logger.log('parseJsonLoose_ échec JSON : ' + clean.slice(0, 300));
    return null;
  }
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

/* Contrat JSON normalisé partagé par les agents lawyer/* v2 (config Notion).
   Réf : https://www.notion.so/387c2ce245e881a59e6ffe0f1e4ffbf0 */
const LAWYER_JSON_CONTRACT =
  'SORTIE OBLIGATOIRE : un seul objet JSON STRICT, sans markdown autour, sans texte avant ni apres. Schema : ' +
  '{"agent":"<id>","verdict":"GO|SOUS_CONDITIONS|NO_GO|ESCALADE","score":0,' +
  '"type_objet":"NDA|MOU|pacte|contrat de travail|corporate|contrat de marque|structure|norme|fiscal|question",' +
  '"conseils":["..."],' +
  '"findings":[{"objet":"...","severite":"🚫|⚠️|💡","fait_ou_hypothese":"FAIT|HYPOTHESE","detail":"...","source_ref":"id + date"}],' +
  '"faits":["..."],"hypotheses":["..."],' +
  '"sources":[{"ref":"...","date_donnee":"YYYY-MM-DD","verifiee":true}],' +
  '"escalade":{"requise":false,"motif":"","cible":"juriste humain"},' +
  '"disclaimer":"Avis assiste par IA. Ne certifie pas, ne remplace pas un avis juridique."}. ' +
  'Score depuis findings : >=3 🚫 -> 10 ; 2 🚫 -> 8 ; 1 🚫 -> 7 ; 0 🚫 et >=2 ⚠️ -> 5 ; 0 🚫 et 1 ⚠️ -> 4 ; sinon 0. ' +
  'Verdict : 0-3 GO ; 4-6 SOUS_CONDITIONS ; 7-8 NO_GO ; 9-10 NO_GO + escalade. ' +
  'Separe toujours FAIT et HYPOTHESE. Source et date chaque donnee. Aucune affirmation de droit positif sans source primaire datee. ' +
  'Tu juges et tu conseilles ; tu ne certifies pas, ne rediges pas de substance legale, ne remplaces jamais un juriste. Reponds en francais.';

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
    role: "Cerveau contrat unifié : analyse d'un document juridique (NDA / contrat de travail / corporate / MOU / pacte / marque) contre les grilles de contrôle POF",
    model: ANTHROPIC_MODEL,
    max_tokens: 6000,
    output_format: 'json',
    // PORT MOTEUR v3 (2026-06-22) : legal-analyzer rejoint le standard lawyer/* v2.
    // - deterministic:true -> injection KB runtime (getKbContent_) + scoring/verdict déterministe (applyDeterministicVerdict_)
    // - contrat de sortie normalisé LAWYER_JSON_CONTRACT (findings 🚫/⚠️/💡, faits/hypotheses, sources, escalade, disclaimer)
    // L'ancien schéma OK|ALERT|BLOCK + score_anomalie/red_flags/points_cles est abandonné ICI.
    // Le handler legacy handleLegalAnalysis_ (action 'legal_analysis') n'invoque PAS cet agent :
    // il porte sa propre requête Anthropic + son propre parsing de l'ancien schéma -> non régressé.
    system: 'Tu es lawyer/legal-analyzer, le cerveau contrat unifié de Plastic Odyssey Factories (POF, SAS française). ' +
      "Tu analyses un document juridique (NDA, contrat de travail, contrat corporate, MOU, pacte, contrat de marque, autre) extrait d'un mail ou fourni en contexte, et tu produis un avis structuré. " +
      'Méthode : détecte le type d\'objet, puis confronte le document à la grille de contrôle POF correspondante injectée dans SOURCES DE FOND POF (NDA, contrat de travail, corporate, MOU, pacte, compliance, contrat de marque, for/non-profit) et aux Positions juridiques canoniques POF. ' +
      'Un finding par écart vs la grille ou les positions canoniques, avec source_ref citant la grille heurtée (nom + id). Sévérité : 🚫 clause inacceptable / rédhibitoire ; ⚠️ à renégocier ou vérifier avant signature ; 💡 amélioration ou point d\'attention mineur. ' +
      'Sépare strictement FAIT (présent dans le document ou la grille) et HYPOTHESE (déduction). Aucune affirmation de droit positif sans source. Si une grille pertinente est absente des sources injectées, marque-le en HYPOTHESE et escalade. ' +
      'Escalade : tout document de type pacte (associés / actionnaires) ou contrat de marque PO×POF -> escalade humaine requise, jamais de GO autonome (forçage déterministe côté serveur). ' +
      LAWYER_JSON_CONTRACT,
    permissions: { post_missive_comment: true, send_slack: true, write_notion: true },
    slack_channel: '#ai-assistan-legal',
    deterministic: true,
    // Pack grilles de contrôle (contenu réel sur les pages Templates 352c, atteintes par ID direct ;
    // les stubs 382c ne portent qu'un pointeur "Source:" textuel non résoluble par extractNotionPointer_)
    // + Positions juridiques canoniques POF.
    kb_pages: [
      '372c2ce245e881bab739f5218d2df3ff', // Positions juridiques canoniques POF
      '352c2ce245e88188ada2fc7fbf9ce98b', // [Contrôle] NDA
      '352c2ce245e881219299dcac498c87c9', // [Contrôle] Contrat de travail
      '352c2ce245e881d5b2bccdc6fd1d1264', // [Contrôle] MOU
      '352c2ce245e881c3a486d1ce37a85791', // [Contrôle] Contrat corporate
      '352c2ce245e881f39a11cdf33966b2e9', // [Contrôle] Pacte d'associés
      '352c2ce245e881868d32ec6520bf2eac', // [Contrôle] Compliance et éthique POF
      '352c2ce245e881c088ceed4b003dea15', // [Contrôle] Contrat de marque PO×POF
      '352c2ce245e881a39916e9fc9e3433e9'  // [Contrôle] Spécificités for-profit / non-profit
    ],
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

  /* ──────────────── lawyer/ v2 (config Notion runtime, AVIS SEULEMENT) ────────────────
     Ajout additif POF Agent Registry. system inline = repli ; quand notion_config_id
     est présent, le system effectif est lu en live sur la page Notion (cache 1h).
     permissions toutes false : zéro effet de bord pour cette première mise en prod. */

  'lawyer/coherence-gouvernance': {
    fn: 'lawyer',
    role: 'Vérifie la non-contradiction d\'un contrat/clause/structure avec le socle de gouvernance POF',
    model: ANTHROPIC_MODEL,
    max_tokens: 6000,
    output_format: 'json',
    system: 'Tu es lawyer/coherence-gouvernance, gardien de cohérence de gouvernance pour Plastic Odyssey Factories (POF, SAS française). ' +
      'Ta mission : vérifier qu\'un contrat, une clause ou une structure ne CONTREDIT pas le socle de gouvernance POF existant. Tu ne juges pas le droit dans l\'absolu, tu juges la non-contradiction avec nos engagements. ' +
      'Pour chaque élément : compatible avec le pacte d\'associés ? avec le contrat de marque PO×POF ? avec les statuts ? avec les positions canoniques ? avec les contrats actifs ? Un finding par conflit, avec citation de la source heurtée. ' +
      'Sources lues par ID (jamais de mémoire) : Positions juridiques canoniques POF 372c2ce2-45e8-81ba-b739-f5218d2df3ff ; Pacte d\'associés 352c2ce2-45e8-81f3-9a11-cdf33966b2e9 ; Contrat de marque PO×POF 352c2ce2-45e8-81c0-88ce-ed4b003dea15 ; Inventaire MOUs actifs (data source) db667ae8-96a6-4e98-96be-306ab6a762d4 ; Statuts POF (page de fond, si indisponible -> finding HYPOTHESE + escalade). ' +
      'Connecteurs : Notion API (lecture sources), Pappers.fr (entités FR : Kbis, bénéficiaires effectifs). ' +
      'Escalade dure : tout ce qui touche le contrat de marque -> escalade requise, cible "Benoît + Simon (PO)", jamais de GO autonome ; conflit avec une clause du pacte (préemption, agrément, tag/drag-along, unanimité) -> NO_GO + escalade ; statuts indisponibles -> HYPOTHESE + escalade. ' +
      LAWYER_JSON_CONTRACT,
    permissions: { post_missive_comment: false, send_slack: false, write_notion: false },
    slack_channel: '#ai-assistan-legal',
    notion_config_id: '387c2ce245e881b7bb06ce202ed594e6',
    deterministic: true,
    country_kb: true, // ADDITIF v1.25.0 : injecte les champs réglementaires de la fiche pays en contexte
    kb_pages: ['372c2ce245e881bab739f5218d2df3ff','352c2ce245e881f39a11cdf33966b2e9','352c2ce245e881c088ceed4b003dea15','387c2ce245e8816bb010d9665af20a3f'],
  },

  'lawyer/synthese': {
    fn: 'lawyer',
    role: 'Réconcilie deux avis indépendants sur un sujet critique et tranche les désaccords',
    model: ANTHROPIC_MODEL,
    max_tokens: 6000,
    output_format: 'json',
    system: 'Tu es lawyer/synthese, agent de fiabilisation pour Plastic Odyssey Factories. Tu réconcilies deux avis INDÉPENDANTS produits sur un sujet critique et tu tranches les désaccords. Tu n\'apportes aucun savoir métier propre : tu arbitres. ' +
      'Entrée : deux objets JSON normalisés issus de deux agents à perspectives différentes (A = défense des intérêts POF ; B = faisabilité / contrepartie, anti sur-restriction). ' +
      'Logique : findings concordants -> consolidés dans le verdict ; désaccord sur un finding -> ce point passe SOUS_CONDITIONS + escalade, jamais de désaccord masqué ; verdict global = le plus sévère des deux, sauf si la divergence elle-même justifie l\'escalade. ' +
      'Sortie : un seul objet JSON normalisé consolidé. Liste explicitement chaque point de divergence et la décision dans conseils[] (préfixe "DÉSACCORD ARBITRÉ : "). ' +
      'Tu n\'es activé qu\'en criticité haute. ' +
      LAWYER_JSON_CONTRACT,
    permissions: { post_missive_comment: false, send_slack: false, write_notion: false },
    slack_channel: '#ai-assistan-legal',
    notion_config_id: '387c2ce245e8813ead1bf005d1977ee0',
    deterministic: true,
    kb_pages: [],
  },

  'lawyer/structure-expert': {
    fn: 'lawyer',
    role: 'Expert structures for-profit / non-profit et montages hybrides (conformité en amont)',
    model: ANTHROPIC_MODEL,
    max_tokens: 6000,
    output_format: 'json',
    system: 'Tu es lawyer/structure-expert pour Plastic Odyssey Factories. Tu es expert structures for-profit / non-profit et montages hybrides (fonds de dotation, association, fondation, rescrit fiscal, lucrativité) en droit FR et dans les pays d\'opération. Tu agis EN AMONT, sur le design structurel, distinct de l\'analyse de contrat et du KYC. ' +
      'Sources de fond par ID : grille [Contrôle] Spécificités for/non-profit 382c2ce2-45e8-81f6-8a77-f9dd8496f4bb ; Positions canoniques POF 372c2ce2-45e8-81ba-b739-f5218d2df3ff ; DB Pays 2a6c2ce2-45e8-8057-a366-000b0db2ffb9. Cadrage juridique 2d9c2ce2-45e8-80f6-949b-c5177fa281e9 est PÉRIMÉ : ne l\'utilise pas sans requalification (sinon finding HYPOTHESE + escalade). ' +
      'Connecteurs : Légifrance / BOFiP (droit FR non-profit), UNCTAD Investment Laws Navigator, OHADA (17 pays), Pappers.fr. ' +
      'Sortie : avis de conformité + distinction fait vs hypothèse par pays et type de structure. Escalade systématique sur l\'incertitude. Tu ne valides jamais seul une structure : tu prépares, l\'humain tranche. ' +
      LAWYER_JSON_CONTRACT,
    permissions: { post_missive_comment: false, send_slack: false, write_notion: false },
    slack_channel: '#ai-assistan-legal',
    notion_config_id: '387c2ce245e881be929dd60ba1e78a93',
    deterministic: true,
    country_kb: true, // ADDITIF v1.25.0 : injecte les champs réglementaires de la fiche pays en contexte
    kb_pages: ['382c2ce245e881f68a77f9dd8496f4bb','2d9c2ce245e880f6949bc5177fa281e9','372c2ce245e881bab739f5218d2df3ff'],
  },

  'lawyer/tax-expert': {
    fn: 'lawyer',
    role: 'Expert fiscalité et structuration internationale (conventions, douanes, IS, BEPS)',
    model: ANTHROPIC_MODEL,
    max_tokens: 6000,
    output_format: 'json',
    system: 'Tu es lawyer/tax-expert pour Plastic Odyssey Factories. Tu es expert fiscalité et structuration internationale : conventions fiscales, accords douaniers, IS, substance réelle / BEPS, climat des affaires. Tu conseilles et tu challenges (ex. convention Sénégal-Maurice dénoncée, substance requise depuis 2019). ' +
      'Règle absolue : vérifie le statut "en vigueur / dénoncée" avant tout usage d\'une convention ; tout chiffre est daté et sourcé ; séparation stricte FAIT / HYPOTHESE ; escalade par défaut sur toute décision de structuration. ' +
      'Sources de fond par ID : grille [Contrôle] Fiscalité internationale (à créer, si absente -> HYPOTHESE) ; DB Pays 2a6c2ce2-45e8-8057-a366-000b0db2ffb9 ; doc POF Suivi_dispositifs_fiscaux_POFSN_v2 (dispositifs Sénégal). ' +
      'Connecteurs : PwC Worldwide Tax Summaries, OECD CIT, Tax Foundation, Trading Economics, KPMG / Deloitte DITS (recoupement), UNCTAD Investment Laws, APIX Sénégal. ' +
      'Sortie : avis structuration + risques fiscaux, statut de chaque source (en vigueur, date). ' +
      LAWYER_JSON_CONTRACT,
    permissions: { post_missive_comment: false, send_slack: false, write_notion: false },
    slack_channel: '#ai-assistan-legal',
    notion_config_id: '387c2ce245e881178122e96d085469ca',
    deterministic: true,
    country_kb: true, // ADDITIF v1.25.0 : injecte les champs réglementaires de la fiche pays en contexte
    kb_pages: ['387c2ce245e881efaa0ffd6ca1d8b1c6'],
  },

  'lawyer/norms-expert': {
    fn: 'lawyer',
    role: 'Consultant normes et conformité organisationnelle (ISO, donneurs d\'ordre)',
    model: ANTHROPIC_MODEL,
    max_tokens: 6000,
    output_format: 'json',
    system: 'Tu es lawyer/norms-expert pour Plastic Odyssey Factories. Tu es consultant normes et conformité organisationnelle. Tu fais passer un process, un produit ou un workflow au crible des normes (ISO 9001/14001/45001/27001) et des bonnes pratiques POF, pour contracter avec des donneurs d\'ordre (Eiffage, AGL, Damen). Tu es conversationnel, pas un scanner statique : grille adaptative selon le type d\'objet (on n\'applique pas la sécurité au travail à un script). ' +
      'Tu es complémentaire de la skill security-scanner (PII/secrets) : tu peux recommander "lance le security-scanner" comme quick-win, sans la remplacer. ' +
      'Sources de fond par ID : grille [Contrôle] Normes ISO & conformité orga (à créer, si absente -> HYPOTHESE) ; DB Pays 2a6c2ce2-45e8-8057-a366-000b0db2ffb9 (normes nationales applicables). ' +
      'Connecteurs : ISO OBP, ARSO (normes africaines harmonisées), ASTM, CEN/EN, BIS (Inde), BSN/SNI (Indonésie), SON/SONCAP (Nigeria), ePing (veille TBT OMC). ' +
      'Sortie : 3 à 5 quick-wins priorisés par impact × effort dans conseils[]. ' +
      LAWYER_JSON_CONTRACT,
    permissions: { post_missive_comment: false, send_slack: false, write_notion: false },
    slack_channel: '#ai-assistan-legal',
    notion_config_id: '387c2ce245e881d38090f09dc05e3413',
    deterministic: true,
    kb_pages: ['387c2ce245e881609250d3d5520ee16d'],
  },

  'lawyer/legal-generic': {
    fn: 'lawyer',
    role: 'Droit général multi-pays sans grille fixe (préparateur de dossier sourcé)',
    model: ANTHROPIC_MODEL,
    max_tokens: 6000,
    output_format: 'json',
    system: 'Tu es lawyer/legal-generic pour Plastic Odyssey Factories. Tu traites le droit général multi-pays, sans grille fixe. Tu es un préparateur de dossier juridique sourcé pour les questions hors périmètre des experts dédiés, appelé en complément ou en dernier recours. ' +
      'Posture renforcée anti-hallucination : aucune affirmation de droit positif (taux, convention, obligation) sans source primaire datée (URL + date de consultation) ; trois blocs distincts JAMAIS mélangés -> FAITS SOURCÉS (faits[]) / HYPOTHESES DE TRAVAIL (hypotheses[]) / À VÉRIFIER PAR JURISTE (escalade + conseils[]) ; pas de source primaire -> donnée marquée "non vérifié", jamais présentée comme fait ; escalade par défaut. ' +
      'Sources de fond par ID : DB Pays 2a6c2ce2-45e8-8057-a366-000b0db2ffb9 (fiches validées). ' +
      'Connecteurs recherche live : Legal Data Hunter (REST primaire, 35M docs / 160 juridictions), repli Tavily web. Toute donnée live est marquée "à vérifier". ' +
      'TRAITEMENT DU BLOC "## RECHERCHE LIVE (NON VÉRIFIÉE — à confirmer juriste)" si présent dans la demande : chaque élément (titre + URL source + date) sert UNIQUEMENT de piste. Tout fait que tu en tires va dans hypotheses[] (jamais faits[]), avec dans sources[] la mention {verifiee:false, url, date_consultation}, et escalade.requise=true. Ne JAMAIS présenter un résultat de recherche live comme droit positif vérifié. Si le bloc indique que la recherche live est indisponible, dis-le explicitement et escalade : n\'invente rien. ' +
      'Tu ne valides jamais une structure : tu prépares le dossier, le juriste tranche. ' +
      LAWYER_JSON_CONTRACT,
    permissions: { post_missive_comment: false, send_slack: false, write_notion: false },
    slack_channel: '#ai-assistan-legal',
    notion_config_id: '387c2ce245e8816bbb2bd80d54b0400e',
    deterministic: true,
    country_kb: true, // ADDITIF v1.25.0 : injecte les champs réglementaires de la fiche pays en contexte
    kb_pages: [],
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

/**
 * Lit le system prompt d'un agent depuis sa page Notion de config (texte des blocs).
 * Cache CacheService ~1h, clé par pageId. Fail-open : toute erreur -> null (repli inline).
 * Additif : appelé UNIQUEMENT pour les agents qui portent un notion_config_id.
 * Rend les pages Notion éditables sans redéploiement, sans toucher aux agents existants.
 */
function getAgentSystemFromNotion_(pageId) {
  if (!pageId) return null;
  var cleanId = String(pageId).replace(/-/g, '');
  var cacheKey = 'agent_system_notion_' + cleanId;
  var cache = CacheService.getScriptCache();
  try {
    var cached = cache.get(cacheKey);
    if (cached) return cached;
  } catch (_e) { /* fall through */ }

  try {
    var token = getSecret_('NOTION_API_TOKEN');
    var url = 'https://api.notion.com/v1/blocks/' + cleanId + '/children?page_size=100';
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + token, 'Notion-Version': NOTION_API_VERSION },
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) {
      Logger.log('getAgentSystemFromNotion_ http ' + res.getResponseCode() + ' for ' + cleanId);
      return null;
    }
    var data = JSON.parse(res.getContentText());
    var blocks = data.results || [];
    var lines = [];
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      var t = b.type;
      var node = b[t];
      if (!node || !node.rich_text) continue;
      var txt = richTextValue_(node.rich_text);
      if (!txt) continue;
      if (t === 'heading_1' || t === 'heading_2' || t === 'heading_3') {
        lines.push('## ' + txt);
      } else if (t === 'bulleted_list_item' || t === 'numbered_list_item') {
        lines.push('- ' + txt);
      } else {
        lines.push(txt);
      }
    }
    var sys = lines.join('\n').trim();
    if (!sys) return null;
    // Le contrat JSON de sortie n'est pas répété dans la page Notion : on l'ajoute toujours.
    sys = sys + '\n\n' + LAWYER_JSON_CONTRACT;
    try { cache.put(cacheKey, sys, 3600); } catch (_e2) { /* ignore */ }
    return sys;
  } catch (e) {
    Logger.log('getAgentSystemFromNotion_ error: ' + (e && e.message));
    return null;
  }
}

/**
 * Lit le CONTENU TEXTE des pages Notion "sources de fond" d'un agent (injection KB).
 * - Pour chaque pageId : fetch des blocs enfants via l'API Notion (NOTION_API_TOKEN).
 * - Si le contenu contient un pointeur "Source :" vers une autre page Notion, on suit
 *   ce pointeur UNE seule fois et on lit la page cible (cas grilles 382c... -> Templates 352c...).
 * - CacheService 3600s par pageId. try/catch fail-open : si une source échoue, on l'ignore
 *   (on ne plante jamais l'invocation).
 * - Retour : bloc "## SOURCES DE FOND POF ..." prêt à injecter, ou '' si rien d'exploitable.
 * ADDITIF : appelé UNIQUEMENT depuis handleAgentInvoke_ pour les agents deterministic
 * ayant des kb_pages. N'altère aucun agent existant.
 */
function getKbContent_(pageIds) {
  if (!Array.isArray(pageIds) || !pageIds.length) return '';
  var blocksOut = [];
  for (var i = 0; i < pageIds.length; i++) {
    try {
      var txt = fetchNotionPageText_(pageIds[i], true);
      if (txt) blocksOut.push(txt);
    } catch (e) {
      Logger.log('getKbContent_ source skip ' + pageIds[i] + ' : ' + (e && e.message));
      // fail-open : on ignore cette source
    }
  }
  if (!blocksOut.length) return '';
  return '## SOURCES DE FOND POF (autorité, à citer, ne pas inventer)\n' + blocksOut.join('\n\n');
}

/**
 * Récupère le texte d'une page Notion (blocs), avec cache 3600s par pageId.
 * Si followPointer=true et que le texte référence "Source :" + un id/URL Notion,
 * suit ce pointeur UNE fois et appelle le contenu de la page cible (sans re-suivre).
 * Fail-open géré par l'appelant.
 */
function fetchNotionPageText_(pageId, followPointer) {
  if (!pageId) return '';
  var cleanId = String(pageId).replace(/^https?:\/\/[^\/]+\//, '').replace(/[?#].*$/, '').replace(/-/g, '');
  var cacheKey = 'agent_kb_content_' + cleanId;
  var cache = CacheService.getScriptCache();
  try {
    var cached = cache.get(cacheKey);
    if (cached !== null && cached !== undefined) return cached;
  } catch (_e) { /* fall through */ }

  var token = getSecret_('NOTION_API_TOKEN');
  var url = 'https://api.notion.com/v1/blocks/' + cleanId + '/children?page_size=100';
  var res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'Authorization': 'Bearer ' + token, 'Notion-Version': NOTION_API_VERSION },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    Logger.log('fetchNotionPageText_ http ' + res.getResponseCode() + ' for ' + cleanId);
    try { cache.put(cacheKey, '', 600); } catch (_e2) { /* ignore */ }
    return '';
  }
  var data = JSON.parse(res.getContentText());
  var blocks = data.results || [];
  var lines = [];
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    var t = b.type;
    var node = b[t];
    if (!node || !node.rich_text) continue;
    var line = richTextValue_(node.rich_text);
    if (!line) continue;
    if (t === 'heading_1' || t === 'heading_2' || t === 'heading_3') {
      lines.push('## ' + line);
    } else if (t === 'bulleted_list_item' || t === 'numbered_list_item') {
      lines.push('- ' + line);
    } else {
      lines.push(line);
    }
  }
  var txt = lines.join('\n').trim();

  // Suivi d'un pointeur "Source :" vers une autre page Notion (UNE seule fois).
  if (followPointer && txt) {
    var ptr = extractNotionPointer_(txt);
    if (ptr && ptr !== cleanId) {
      try {
        var target = fetchNotionPageText_(ptr, false);
        if (target) txt = txt + '\n\n[Source liée]\n' + target;
      } catch (_e3) { /* fail-open : on garde le texte de la grille seule */ }
    }
  }

  try { cache.put(cacheKey, txt, 3600); } catch (_e4) { /* ignore */ }
  return txt;
}

/**
 * Cherche un pointeur "Source :" suivi d'un id ou d'une URL Notion dans un texte.
 * Retourne l'id 32-hex nettoyé, ou null. Tolérant : "Source", "Source :", "Source -".
 */
function extractNotionPointer_(txt) {
  if (!txt) return null;
  var m = txt.match(/Source\s*[:\-–]?\s*(?:https?:\/\/[^\s)]*?)?([0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
  if (!m) return null;
  return m[1].replace(/-/g, '');
}

/**
 * Scoring/verdict DÉTERMINISTE pour les agents lawyer/* v2 (deterministic:true).
 * Recalcule score + verdict depuis le tableau findings[] selon le contrat LAWYER_JSON_CONTRACT,
 * indépendamment de ce que le modèle a renvoyé. Forçage escalade pour pacte / marque.
 * ADDITIF : appelé pour tout agent deterministic:true. Depuis le port moteur v3 (2026-06-22),
 * legal-analyzer est deterministic et passe donc ici (contrat findings[] normalisé).
 * nda-expert / corporate-governance-expert restent sur leur schéma OK|ALERT|BLOCK (pas deterministic) — ne pas régresser.
 * Mutation in-place + retour de l'objet. Fail-soft : si pas un objet exploitable, renvoie tel quel.
 */
function applyDeterministicVerdict_(parsedOutput) {
  if (!parsedOutput || typeof parsedOutput !== 'object' || Array.isArray(parsedOutput)) return parsedOutput;
  var findings = parsedOutput.findings;
  if (!Array.isArray(findings)) return parsedOutput;

  var nBlock = 0, nWarn = 0;
  for (var i = 0; i < findings.length; i++) {
    var s = findings[i] && findings[i].severite;
    if (s === '🚫') nBlock++;
    else if (s === '⚠️') nWarn++;
  }

  var score;
  if (nBlock >= 3) score = 10;
  else if (nBlock === 2) score = 8;
  else if (nBlock === 1) score = 7;
  else if (nWarn >= 2) score = 5;
  else if (nWarn === 1) score = 4;
  else score = 0;

  var verdict;
  if (score <= 3) verdict = 'GO';
  else if (score <= 6) verdict = 'SOUS_CONDITIONS';
  else verdict = 'NO_GO';

  parsedOutput.score = score;
  parsedOutput.verdict = verdict;

  // Escalade : structurellement requise si score 9-10.
  if (!parsedOutput.escalade || typeof parsedOutput.escalade !== 'object') {
    parsedOutput.escalade = { requise: false, motif: '', cible: 'juriste humain' };
  }
  if (score >= 9) {
    parsedOutput.escalade.requise = true;
    if (!parsedOutput.escalade.motif) parsedOutput.escalade.motif = 'Score critique (>=9) : escalade structurelle.';
  }

  // Forçage métier : pacte ou marque -> escalade requise quel que soit le score.
  var typeObj = String(parsedOutput.type_objet || '').toLowerCase();
  if (typeObj.indexOf('pacte') !== -1 || typeObj.indexOf('marque') !== -1) {
    parsedOutput.escalade.requise = true;
    if (!parsedOutput.escalade.motif) {
      parsedOutput.escalade.motif = 'Objet sensible (pacte / contrat de marque) : escalade humaine systématique.';
    }
  }

  return parsedOutput;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ▼▼▼  DEEP LEGAL REVIEW (orchestrateur clause-par-clause)  ▼▼▼
   ADDITIF strict. Ne s'active que pour lawyer/legal-orchestrator sur signal explicite.
   Le routeur simple historique reste le défaut. Réutilise handleAgentInvoke_ en interne
   (le GAS s'appelle lui-même logiquement, aucun appel HTTP). Garde-fous timeout/cap.
   Réf spec P1.2 : revue par clause/thème + fiabilisation par criticité.
   ═══════════════════════════════════════════════════════════════════════════════ */

// Cap DUR du nombre total d'appels Claude dans une revue (décompo + experts + synthèses).
var MAX_REVIEW_CALLS = 6;
// Budget temps : GAS coupe à ~6 min ; on stoppe proprement bien avant.
var REVIEW_TIME_BUDGET_MS = 280000;
// Seuil de longueur déclenchant la revue profonde même sans mode/flag explicite.
var DEEP_REVIEW_QUERY_THRESHOLD = 600;

/** Détecte une demande de revue profonde. Signaux : mode 'deep', flag review:true,
 *  ou volume de texte (query + document) au-delà du seuil. */
function isDeepReviewRequested_(body, query, ctx) {
  if (body && (body.mode === 'deep' || body.review === true)) return true;
  var docLen = (ctx && ctx.document_text) ? String(ctx.document_text).length : 0;
  var total = (query ? query.length : 0) + docLen;
  return total >= DEEP_REVIEW_QUERY_THRESHOLD;
}

/** Map domaine -> agent expert idoine. Hook 'kyc' laissé optionnel (pas d'agent KYC
 *  dans ce GAS) : routé vers coherence-gouvernance avec note de contrepartie. */
function routeDomaineToExpert_(domaine) {
  var d = String(domaine || '').toLowerCase();
  if (d.indexOf('fiscal') !== -1 || d.indexOf('tax') !== -1 || d.indexOf('montage') !== -1) return 'lawyer/tax-expert';
  if (d.indexOf('structure') !== -1 || d.indexOf('for-profit') !== -1 || d.indexOf('non-profit') !== -1) return 'lawyer/structure-expert';
  if (d.indexOf('gouvernance') !== -1 || d.indexOf('preempt') !== -1 || d.indexOf('préempt') !== -1 ||
      d.indexOf('pacte') !== -1 || d.indexOf('marque') !== -1 || d.indexOf('conflit') !== -1 || d.indexOf('interne') !== -1) return 'lawyer/coherence-gouvernance';
  if (d.indexOf('norme') !== -1 || d.indexOf('iso') !== -1 || d.indexOf('conformit') !== -1) return 'lawyer/norms-expert';
  if (d.indexOf('contrepartie') !== -1 || d.indexOf('kyc') !== -1) return 'lawyer/coherence-gouvernance'; // hook KYC optionnel
  if (d.indexOf('clause') !== -1 || d.indexOf('juridiction') !== -1 || d.indexOf('droit applicable') !== -1 ||
      d.indexOf('contrat') !== -1 || d.indexOf('nda') !== -1 || d.indexOf('mou') !== -1) return 'lawyer/legal-analyzer';
  return 'lawyer/legal-generic'; // hors périmètre / dernier recours
}

/** Criticité haute = pacte, marque, structure, fiscalité, gouvernance, montant élevé. */
function isHighCriticality_(question, domaine) {
  var t = (String(question || '') + ' ' + String(domaine || '')).toLowerCase();
  var kw = ['pacte', 'marque', 'structure', 'fiscal', 'tax', 'gouvernance', 'préempt', 'preempt',
            'actionnaire', 'capital', 'cession', 'montant élevé', 'montant eleve', 'm€', 'millions'];
  for (var i = 0; i < kw.length; i++) { if (t.indexOf(kw[i]) !== -1) return true; }
  return false;
}

/** Rang de sévérité d'un verdict normalisé (plus haut = plus sévère). */
function verdictSeverityRank_(v) {
  switch (String(v || '').toUpperCase()) {
    case 'GO': return 0;
    case 'SOUS_CONDITIONS': return 1;
    case 'ESCALADE': return 2;
    case 'NO_GO': return 3;
    default: return 1; // inconnu -> prudence
  }
}

/** Verdict global = le plus sévère de la liste. */
function mostSevereVerdict_(verdicts) {
  var best = 'GO', bestRank = -1;
  for (var i = 0; i < verdicts.length; i++) {
    var r = verdictSeverityRank_(verdicts[i]);
    if (r > bestRank) { bestRank = r; best = String(verdicts[i] || '').toUpperCase() || 'GO'; }
  }
  return best;
}

/** Appel Claude brut pour la seule étape de décomposition (pas un agent du Registry). */
function callAnthropicRaw_(model, system, prompt, maxTokens) {
  var apiKey = getSecret_('ANTROPIC_API_TOKEN');
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: model, max_tokens: maxTokens || 1500, system: system,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('Anthropic ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300));
  }
  var data = JSON.parse(res.getContentText());
  var tb = (data.content || []).filter(function (b) { return b.type === 'text'; })[0];
  return { parsed: parseJsonLoose_(tb ? tb.text : ''), tokens: (data.usage && (data.usage.input_tokens + data.usage.output_tokens)) || 0 };
}

/** Étape (a) : décompose l'entrée en questions par clause/thème (1 appel Haiku). */
function decomposeLegalQuestions_(query, ctx) {
  var docText = (ctx && ctx.document_text) ? String(ctx.document_text).slice(0, 6000) : '';
  var system = 'Tu es le décomposeur d\'une revue juridique POF. Tu reçois un document ou une requête et tu produis ' +
    'la LISTE des questions à instruire, une par clause ou par thème juridique distinct. Tu ne réponds pas aux questions, tu les listes. ' +
    'SORTIE STRICT JSON, sans markdown : {"questions":[{"question":"...","domaine":"clause|juridiction|fiscal|structure|gouvernance|norme|contrepartie|autre"}]}. ' +
    'Domaines : clause/juridiction -> analyse de clause et droit applicable ; fiscal -> montage fiscal ; structure -> for/non-profit ; ' +
    'gouvernance -> conflit interne, pacte, préemption, marque ; norme -> ISO/conformité ; contrepartie -> KYC/tiers ; autre -> hors périmètre. ' +
    'Maximum 5 questions, regroupe les clauses voisines. Réponds en français.';
  var prompt = (docText ? ('--- DOCUMENT ---\n' + docText + '\n\n') : '') + '--- REQUÊTE ---\n' + query;
  var r = callAnthropicRaw_('claude-haiku-4-5', system, prompt, 1200);
  var qs = (r.parsed && Array.isArray(r.parsed.questions)) ? r.parsed.questions : [];
  // Repli : si décompo vide/échouée, traite la requête entière comme une seule question gouvernance.
  if (!qs.length) qs = [{ question: query, domaine: 'autre' }];
  return { questions: qs, tokens: r.tokens };
}

/** Orchestre la revue clause-par-clause. Réutilise handleAgentInvoke_ en interne. */
function runLegalReview_(body, startMs) {
  var query = String(body.query || '').trim();
  var ctx   = body.context || {};
  var calls = 0;
  var partial = false, partialReason = '';

  function budgetLeft_() { return (Date.now() - startMs) < REVIEW_TIME_BUDGET_MS; }

  // (a) Décomposition (1 appel Haiku).
  var decomp = decomposeLegalQuestions_(query, ctx);
  calls += 1;
  var questions = decomp.questions;

  var perQuestion = [];
  var globalVerdicts = [];
  var allConseils = [];
  var totalTokens = decomp.tokens;

  for (var i = 0; i < questions.length; i++) {
    // Garde-fous : cap d'appels et budget temps. On réserve 1 appel pour ne pas couper net.
    if (calls >= MAX_REVIEW_CALLS) { partial = true; partialReason = 'cap atteint (' + MAX_REVIEW_CALLS + ' appels)'; break; }
    if (!budgetLeft_()) { partial = true; partialReason = 'budget temps atteint'; break; }

    var q = questions[i] || {};
    var question = String(q.question || '').trim();
    if (!question) continue;
    var domaine = q.domaine || 'autre';
    var expertId = routeDomaineToExpert_(domaine);
    var critical = isHighCriticality_(question, domaine);

    // Contexte transmis à l'expert : on conserve le document, on cible la question.
    var qCtx = { document_text: ctx.document_text || question, subject: ctx.subject };

    if (critical && (calls + 2) <= MAX_REVIEW_CALLS && budgetLeft_()) {
      // (c) Criticité haute : 2 perspectives décorrélées (Sonnet) + synthèse.
      var qA = 'POSTURE A (défense des intérêts POF, anti-risque) : ' + question;
      var qB = 'POSTURE B (faisabilité / contrepartie, anti sur-restriction) : ' + question;
      var rA = invokeAgent_(expertId, qCtx, qA, 'deep'); calls += 1;
      var rB = invokeAgent_(expertId, qCtx, qB, 'deep'); calls += 1;
      var outA = (rA && rA.output) || {};
      var outB = (rB && rB.output) || {};
      totalTokens += (rA && rA.tokens_used) || 0;
      totalTokens += (rB && rB.tokens_used) || 0;

      var consolidated = outA, synthTokens = 0, synthUsed = false;
      if ((calls + 1) <= MAX_REVIEW_CALLS && budgetLeft_()) {
        var synthQuery = 'Réconcilie ces deux avis indépendants sur la même question.\n\nQUESTION : ' + question +
          '\n\nAVIS A (défense POF) :\n' + JSON.stringify(outA) +
          '\n\nAVIS B (faisabilité / contrepartie) :\n' + JSON.stringify(outB);
        var rS = invokeAgent_('lawyer/synthese', qCtx, synthQuery, 'deep'); calls += 1;
        synthTokens = (rS && rS.tokens_used) || 0;
        totalTokens += synthTokens;
        if (rS && rS.output && !rS.output.error) { consolidated = rS.output; synthUsed = true; }
      }
      var vCons = (consolidated && consolidated.verdict) || mostSevereVerdict_([outA.verdict, outB.verdict]);
      globalVerdicts.push(vCons);
      if (consolidated && Array.isArray(consolidated.conseils)) allConseils = allConseils.concat(consolidated.conseils);
      perQuestion.push({
        question: question, domaine: domaine, criticite: 'haute',
        experts: [expertId + ' (A)', expertId + ' (B)'].concat(synthUsed ? ['lawyer/synthese'] : []),
        verdict: vCons,
        verdict_A: outA.verdict || null, verdict_B: outB.verdict || null,
        findings: (consolidated && consolidated.findings) || [],
        escalade: (consolidated && consolidated.escalade) || null,
        source_refs: (consolidated && consolidated.sources) || []
      });
    } else {
      // (b) Criticité faible : 1 expert (Haiku via mode fast).
      var r1 = invokeAgent_(expertId, qCtx, question, 'fast'); calls += 1;
      var out1 = (r1 && r1.output) || {};
      totalTokens += (r1 && r1.tokens_used) || 0;
      var v1 = out1.verdict || 'SOUS_CONDITIONS';
      globalVerdicts.push(v1);
      if (Array.isArray(out1.conseils)) allConseils = allConseils.concat(out1.conseils);
      perQuestion.push({
        question: question, domaine: domaine, criticite: critical ? 'haute (dégradée: cap/budget)' : 'faible',
        experts: [expertId],
        verdict: v1,
        findings: out1.findings || [],
        escalade: out1.escalade || null,
        source_refs: out1.sources || []
      });
    }
  }

  // S'il reste des questions non traitées (cap/budget), marque la revue partielle.
  if (perQuestion.length < questions.length) {
    partial = true;
    if (!partialReason) partialReason = 'revue tronquée';
  }

  // (d) Agrégation : verdict global = le plus sévère ; escalade si un seul l'exige.
  var globalVerdict = mostSevereVerdict_(globalVerdicts);
  var escaladeRequise = false, escaladeMotifs = [];
  for (var j = 0; j < perQuestion.length; j++) {
    var e = perQuestion[j].escalade;
    if (e && e.requise) { escaladeRequise = true; if (e.motif) escaladeMotifs.push(e.motif); }
    if (verdictSeverityRank_(perQuestion[j].verdict) >= 3) escaladeRequise = true; // NO_GO -> escalade
  }

  Logger.log('runLegalReview_ : ' + calls + ' appels Claude, ' + perQuestion.length + '/' + questions.length +
             ' questions, verdict ' + globalVerdict + (partial ? ' [PARTIEL: ' + partialReason + ']' : ''));

  return {
    ok: true,
    agent: 'lawyer/legal-orchestrator',
    mode: 'deep',
    model: ANTHROPIC_MODEL,
    output: {
      review: true,
      verdict_global: globalVerdict,
      escalade: { requise: escaladeRequise, motif: escaladeMotifs.join(' | '), cible: 'juriste humain' },
      questions_count: questions.length,
      questions_traitees: perQuestion.length,
      partial: partial,
      partial_reason: partial ? partialReason : '',
      conseils: allConseils,
      par_question: perQuestion,
      disclaimer: 'Avis assiste par IA. Ne certifie pas, ne remplace pas un avis juridique.'
    },
    calls_made: calls,
    cap: MAX_REVIEW_CALLS,
    tokens_used: totalTokens,
    duration_ms: Date.now() - startMs
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ▲▲▲  DEEP LEGAL REVIEW  ▲▲▲
   ═══════════════════════════════════════════════════════════════════════════════ */

function handleAgentInvoke_(body) {
  var startMs = Date.now();
  var agentId = String(body.agent || '');
  var query   = String(body.query || '').trim();
  var ctx     = body.context || {};
  var mode    = body.mode || 'fast';

  if (!agentId) return { ok: false, error: 'agent required (ex: "marketing-comms/drafter-short")' };
  if (!query)   return { ok: false, error: 'query required' };
  if (!AGENTS[agentId]) return { ok: false, error: 'unknown agent: ' + agentId, available: Object.keys(AGENTS) };

  // ADDITIF (DEEP-PATH, NEW-BEHAVIOR-ONLY) : revue clause-par-clause de l'orchestrateur.
  // Strictement gardé : ne se déclenche QUE pour lawyer/legal-orchestrator ET un signal
  // explicite (mode 'deep', flag review:true, ou document/requête longue). Sinon, le
  // routeur simple historique s'exécute inchangé en aval. Aucun autre agent n'est touché.
  if (agentId === 'lawyer/legal-orchestrator' && isDeepReviewRequested_(body, query, ctx)) {
    try {
      return runLegalReview_(body, startMs);
    } catch (eDeep) {
      // Fail-open : si la revue profonde casse, on retombe sur le routeur simple ci-dessous.
      Logger.log('runLegalReview_ failed, fallback to simple router : ' + (eDeep && eDeep.message));
    }
  }

  var agent = AGENTS[agentId];
  var model = agent.model;
  // mode=deep upgrade Haiku → Sonnet si applicable
  if (mode === 'deep' && model === 'claude-haiku-4-5') model = ANTHROPIC_MODEL;

  var prompt = buildAgentPrompt_(agent, ctx, query);

  // ADDITIF : injection KB runtime. Strictement gardé par le flag deterministic.
  // Porté par les agents lawyer/* v2 ET, depuis le port moteur v3 (2026-06-22), par
  // lawyer/legal-analyzer. nda-expert / corporate-governance-expert portent un champ
  // kb_pages mais PAS deterministic:true -> non touchés (pas d'injection runtime).
  if (agent.deterministic && Array.isArray(agent.kb_pages) && agent.kb_pages.length) {
    try {
      var kbBlock = getKbContent_(agent.kb_pages);
      if (kbBlock) prompt = prompt + '\n\n' + kbBlock;
    } catch (eKb) {
      Logger.log('KB injection skipped for ' + agentId + ' : ' + (eKb && eKb.message));
    }
  }

  // ADDITIF (COUCHE PAYS, v1.25.0) : injection des champs réglementaires de la fiche pays.
  // Strictement gardé par le flag country_kb:true (4 agents lawyer/* concernés). Pour les
  // autres agents, ce bloc ne s'exécute jamais. Fail-open : toute erreur -> pas de bloc.
  if (agent.country_kb === true) {
    try {
      var countryTitle = resolveCountryFromContext_(ctx, query);
      if (countryTitle) {
        var regBlock = getCountryRegFields_(countryTitle);
        if (regBlock) prompt = prompt + '\n\n' + regBlock;
      }
    } catch (eReg) {
      Logger.log('country reg-fields injection skipped for ' + agentId + ' : ' + (eReg && eReg.message));
    }
  }

  // ADDITIF (COUCHE 2, NEW-AGENT-ONLY) : recherche juridique LIVE multi-pays.
  // Strictement gardé : UNIQUEMENT lawyer/legal-generic. Aucun autre agent n'est touché.
  // fail-open : si la recherche live casse ou expire, l'invocation continue sans bloc live.
  if (agentId === 'lawyer/legal-generic') {
    try {
      var paysLive = String((ctx && (ctx.pays || ctx.country)) || '').trim();
      var liveBlock = liveLegalResearch_(query, paysLive);
      if (liveBlock && liveBlock.promptBlock) {
        prompt = prompt + '\n\n' + liveBlock.promptBlock;
        // CACHE additif et non intrusif dans la DB Pays (jamais de création de fiche auto).
        try {
          cacheLiveResearchToPays_(paysLive, liveBlock);
        } catch (eCache) {
          Logger.log('cacheLiveResearchToPays_ skipped : ' + (eCache && eCache.message));
        }
      }
    } catch (eLive) {
      Logger.log('liveLegalResearch_ skipped for legal-generic : ' + (eLive && eLive.message));
    }
  }

  // System effectif. ADDITIF : si l'agent porte un notion_config_id, on lit le system
  // en live sur Notion (cache 1h). Toute erreur -> repli sur agent.system inline.
  // Les agents SANS notion_config_id restent strictement inchangés.
  var systemPrompt = agent.system;
  if (agent.notion_config_id) {
    var notionSystem = getAgentSystemFromNotion_(agent.notion_config_id);
    if (notionSystem) systemPrompt = notionSystem;
  }

  var apiKey = getSecret_('ANTROPIC_API_TOKEN');
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: model,
      max_tokens: agent.max_tokens || 1000,
      system: systemPrompt,
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
    // ADDITIF (NEW-AGENTS-ONLY) : scoring/verdict déterministe pour les 6 agents lawyer/* v2.
    // Gardé par deterministic:true ; jamais appliqué aux agents legacy (schéma différent).
    if (agent.deterministic && parsedOutput && !parsedOutput.error) {
      try {
        parsedOutput = applyDeterministicVerdict_(parsedOutput);
      } catch (eDet) {
        Logger.log('deterministic verdict skipped for ' + agentId + ' : ' + (eDet && eDet.message));
      }
    }
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

/* ═══════════════════════════════════════════════════════════════════════════════
   COUCHE 2 — RECHERCHE JURIDIQUE LIVE (ADDITIF, lawyer/legal-generic UNIQUEMENT)
   Câblage Reg-C : source primaire Legal Data Hunter (REST), repli web Tavily.
   Sourcing obligatoire + escalade. Aucune donnée présentée comme fait vérifié.
   Tout est fail-open : jamais bloquant pour l'invocation de l'agent.
   ═══════════════════════════════════════════════════════════════════════════════ */

const LIVE_LEGAL_TIMEOUT_MS = 25000; // budget court, fail-open au-delà
const LDH_SEARCH_URL = 'https://legaldatahunter.com/v1/search';
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';
const ISO_BY_COUNTRY = {
  'senegal': 'SN', 'sénégal': 'SN', 'france': 'FR', 'côte d\'ivoire': 'CI',
  'cote d\'ivoire': 'CI', 'mali': 'ML', 'maroc': 'MA', 'morocco': 'MA',
  'tunisie': 'TN', 'algerie': 'DZ', 'algérie': 'DZ', 'cameroun': 'CM',
  'allemagne': 'DE', 'germany': 'DE', 'espagne': 'ES', 'spain': 'ES',
  'kenya': 'KE', 'nigeria': 'NG', 'ghana': 'GH', 'rwanda': 'RW',
  'belgique': 'BE', 'belgium': 'BE', 'portugal': 'PT', 'italie': 'IT'
};

/**
 * Recherche juridique live multi-pays. LDH REST en primaire, Tavily en repli.
 * Retour : { source, available, items:[{title,url,date,snippet,jurisdiction}], promptBlock } ou null.
 * promptBlock est TOUJOURS marqué "NON VÉRIFIÉE". Si aucune source dispo, promptBlock
 * indique explicitement l'indisponibilité (l'agent doit le dire + escalader, pas inventer).
 */
function liveLegalResearch_(query, pays) {
  var today = new Date().toISOString().slice(0, 10);
  var result = { source: null, available: false, items: [], promptBlock: '', pays: pays || '', date: today };

  // 1) Legal Data Hunter (REST primaire)
  try {
    var ldh = ldhSearch_(query, pays);
    if (ldh && ldh.length) {
      result.source = 'Legal Data Hunter (REST)';
      result.available = true;
      result.items = ldh;
      result.promptBlock = buildLiveResearchBlock_(ldh, result.source, today);
      return result;
    }
  } catch (eLdh) {
    Logger.log('ldhSearch_ failed : ' + (eLdh && eLdh.message));
  }

  // 2) Repli web Tavily
  try {
    var tav = legalTavilySearch_(query, pays);
    if (tav && tav.length) {
      result.source = 'Tavily (recherche web)';
      result.available = true;
      result.items = tav;
      result.promptBlock = buildLiveResearchBlock_(tav, result.source, today);
      return result;
    }
  } catch (eTav) {
    Logger.log('tavilySearch_ failed : ' + (eTav && eTav.message));
  }

  // 3) Aucune source dispo : bloc d'indisponibilité honnête (pas d'invention).
  result.promptBlock =
    '## RECHERCHE LIVE (NON VÉRIFIÉE — à confirmer juriste)\n' +
    'INDISPONIBLE : aucune source live n\'a répondu (Legal Data Hunter et repli web inaccessibles) le ' + today + '. ' +
    'Tu DOIS le signaler explicitement dans À VÉRIFIER PAR JURISTE, ne rien inventer, et mettre escalade.requise=true.';
  return result;
}

/** Appel REST Legal Data Hunter. POST /v1/search, auth Bearer sk-... . */
function ldhSearch_(query, pays) {
  var apiKey = getSecret_('LEGALDATAHUNTER_API_KEY');
  var iso = countryToIso_(pays);
  var payload = { q: query, namespace: 'legislation', top_k: 5, alpha: 0.7 };
  if (iso) payload.country = [iso];
  var res = UrlFetchApp.fetch(LDH_SEARCH_URL, {
    method: 'post', contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    timeoutSeconds: Math.round(LIVE_LEGAL_TIMEOUT_MS / 1000)
  });
  var code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('LDH http ' + code + ' : ' + res.getContentText().slice(0, 200));
  }
  var data = JSON.parse(res.getContentText());
  var hits = data.hits || [];
  return hits.map(function (h) {
    return {
      title: h.title || h.case_number || h.ecli || '(sans titre)',
      url: h.url || '',
      date: h.date || '',
      snippet: (h.snippet || '').slice(0, 400),
      jurisdiction: h.jurisdiction || h.country || ''
    };
  }).filter(function (it) { return it.url; });
}

/** Repli recherche web Tavily (couche 2 juridique). POST /search, clé dans le body.
 *  Nom dédié pour ne PAS entrer en collision avec tavilySearch_(query) (enrichissement contact). */
function legalTavilySearch_(query, pays) {
  var apiKey = getSecret_('TAVILY_API_KEY');
  var q = pays ? (query + ' (droit ' + pays + ')') : query;
  var res = UrlFetchApp.fetch(TAVILY_SEARCH_URL, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({
      api_key: apiKey,
      query: q,
      search_depth: 'basic',
      max_results: 5,
      include_answer: false
    }),
    muteHttpExceptions: true,
    timeoutSeconds: Math.round(LIVE_LEGAL_TIMEOUT_MS / 1000)
  });
  var code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('Tavily http ' + code + ' : ' + res.getContentText().slice(0, 200));
  }
  var data = JSON.parse(res.getContentText());
  var results = data.results || [];
  return results.map(function (r) {
    return {
      title: r.title || '(sans titre)',
      url: r.url || '',
      date: r.published_date || '',
      snippet: (r.content || '').slice(0, 400),
      jurisdiction: pays || ''
    };
  }).filter(function (it) { return it.url; });
}

/** Construit le bloc prompt "RECHERCHE LIVE" marqué non vérifié, sources datées. */
function buildLiveResearchBlock_(items, sourceLabel, today) {
  var lines = [
    '## RECHERCHE LIVE (NON VÉRIFIÉE — à confirmer juriste)',
    'Source : ' + sourceLabel + ' — consultée le ' + today + '. ' +
    'Ces éléments sont des PISTES, pas du droit positif vérifié. ' +
    'Tout fait qui en découle va en HYPOTHESE (jamais en FAIT SOURCÉ), ' +
    'avec sources[].verifiee=false et escalade.requise=true.'
  ];
  items.forEach(function (it, i) {
    lines.push(
      (i + 1) + '. ' + it.title +
      (it.jurisdiction ? ' [' + it.jurisdiction + ']' : '') +
      (it.date ? ' (' + it.date + ')' : '') +
      '\n   URL : ' + it.url +
      (it.snippet ? '\n   Extrait : ' + it.snippet : '')
    );
  });
  return lines.join('\n');
}

/** Normalise un nom de pays FR/EN vers code ISO-2 pour le filtre LDH. */
function countryToIso_(pays) {
  if (!pays) return '';
  var key = String(pays).trim().toLowerCase();
  return ISO_BY_COUNTRY[key] || '';
}

/**
 * CACHE additif dans la DB Pays. Si une fiche dont le titre (Nom) == pays existe,
 * on AJOUTE un bloc daté "Recherche live (à vérifier)" en bas de la page.
 * Si aucune fiche ne correspond : on LOG seulement (jamais de création auto), pour
 * rester additif et non intrusif. fail-open intégral.
 */
function cacheLiveResearchToPays_(pays, liveBlock) {
  if (!pays || !liveBlock || !liveBlock.available || !liveBlock.items.length) {
    Logger.log('cacheLiveResearchToPays_ : rien à cacher (pays/items absents)');
    return { cached: false, reason: 'no_data' };
  }
  var PAYS_DB_ID = '2a6c2ce245e880d29006f370c273db10';
  var search = notionFetch_('POST', '/databases/' + PAYS_DB_ID + '/query', {
    filter: { property: 'Nom', title: { equals: String(pays).trim() } },
    page_size: 1
  });
  if (!search.results || !search.results.length) {
    Logger.log('cacheLiveResearchToPays_ : aucune fiche Pays "' + pays + '", pas de création auto (log only).');
    return { cached: false, reason: 'no_country_page' };
  }
  var pageId = search.results[0].id;
  var today = liveBlock.date;

  var children = [{
    object: 'block', type: 'heading_3',
    heading_3: { rich_text: [{ type: 'text', text: { content: '🔎 Recherche live (à vérifier) — ' + today } }] }
  }, {
    object: 'block', type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: {
      content: 'Source : ' + liveBlock.source + '. Données NON vérifiées, à confirmer par un juriste avant tout usage.'
    } }] }
  }];
  liveBlock.items.slice(0, 5).forEach(function (it) {
    var label = it.title + (it.date ? ' (' + it.date + ')' : '');
    children.push({
      object: 'block', type: 'bulleted_list_item',
      bulleted_list_item: { rich_text: [
        { type: 'text', text: { content: label + ' — ' }, annotations: {} },
        { type: 'text', text: { content: it.url, link: it.url ? { url: it.url } : null } }
      ] }
    });
  });

  notionFetch_('PATCH', '/blocks/' + pageId + '/children', { children: children });
  Logger.log('cacheLiveResearchToPays_ : bloc daté ajouté à la fiche Pays ' + pays);
  return { cached: true, page_id: pageId };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   COUCHE PAYS — INJECTION CHAMPS RÉGLEMENTAIRES DB PAYS (ADDITIF, v1.25.0)
   Strictement gardé : appelé UNIQUEMENT depuis handleAgentInvoke_ pour les agents
   portant le flag country_kb:true (lawyer/tax-expert, lawyer/structure-expert,
   lawyer/legal-generic, lawyer/coherence-gouvernance). Aucun autre agent touché.
   Fail-open partout : toute erreur -> '' (l'invocation continue sans le bloc).
   ═══════════════════════════════════════════════════════════════════════════════ */

const COUNTRY_REG_DB_ID = '2a6c2ce245e880d29006f370c273db10';
// Champs réglementaires lus sur une fiche pays (ordre d'affichage dans le bloc injecté).
const COUNTRY_REG_FIELDS = [
  'Fiscalité & conventions',
  'Structures juridiques & non-profit',
  'Douanes, commerce & investissement',
  'Réglementation plastique & déchets (REP)',
  'Normes & certifications',
  'Risques & conformité (AML/sanctions)'
];
// Table d'alias -> titre canonique DB Pays. Clés normalisées (sans accent, lowercase).
// Le matching se fait par substring sur la query normalisée.
const COUNTRY_ALIASES = [
  { aliases: ['maurice', 'mauritius'], title: 'Maurice' },
  { aliases: ['philippines'], title: 'Strat. Philippines' },
  { aliases: ['indonesie', 'indonesia'], title: 'Strat. Indonésie' },
  { aliases: ['senegal'], title: 'Strat. Sénégal' },
  { aliases: ["cote d'ivoire", 'ivory coast', 'rci'], title: "Côte d'Ivoire" },
  { aliases: ['kenya'], title: 'Kenya' },
  { aliases: ['cameroun', 'cameroon'], title: 'Cameroun' },
  { aliases: ['maroc', 'morocco'], title: 'Strat. Maroc' },
  { aliases: ['singapore', 'singapour'], title: 'Singapore' },
  { aliases: ['france'], title: 'France' }
];

/** Normalise une chaîne : minuscules, sans accents, sans préfixe "Strat.", espaces compactés. */
function normalizeCountryStr_(s) {
  if (!s) return '';
  var t = String(s).toLowerCase();
  // retire le préfixe stratégique éventuel ("strat. " / "strat ")
  t = t.replace(/^strat\.?\s+/, '');
  // décompose les accents puis les supprime
  if (t.normalize) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

/**
 * Résout un pays canonique depuis le contexte ou la query.
 * Source 1 (prioritaire) : ctx.pays (ou ctx.country).
 * Source 2 : scan de la query contre COUNTRY_ALIASES (substring normalisé).
 * Retourne le TITRE canonique d'alias ou null. Fail-open : toute erreur -> null.
 */
function resolveCountryFromContext_(ctx, query) {
  try {
    // Source 1 : contexte explicite
    var ctxPays = ctx && (ctx.pays || ctx.country);
    if (ctxPays) {
      var nctx = normalizeCountryStr_(ctxPays);
      if (nctx) {
        for (var i = 0; i < COUNTRY_ALIASES.length; i++) {
          var entry = COUNTRY_ALIASES[i];
          if (entry.aliases.indexOf(nctx) !== -1 || normalizeCountryStr_(entry.title) === nctx) {
            return entry.title;
          }
        }
        // ctx.pays fourni mais hors table : renvoyé tel quel (le matcher DB normalise,
        // ex. "Sénégal" -> matchera la fiche "Strat. Sénégal").
        return String(ctxPays).trim();
      }
    }
    // Source 2 : scan de la query
    var nq = normalizeCountryStr_(query);
    if (nq) {
      for (var j = 0; j < COUNTRY_ALIASES.length; j++) {
        var e = COUNTRY_ALIASES[j];
        for (var k = 0; k < e.aliases.length; k++) {
          if (nq.indexOf(e.aliases[k]) !== -1) return e.title;
        }
      }
    }
    return null;
  } catch (err) {
    Logger.log('resolveCountryFromContext_ error: ' + (err && err.message));
    return null;
  }
}

/**
 * Lit les champs réglementaires de la fiche pays correspondante (DB Pays) et
 * formate un bloc prêt à injecter. Cache 3600s par pays.
 * - Récupère TOUTES les fiches pays (≤ ~12), normalise les titres (retire "Strat. ",
 *   accents, casse), matche le pays demandé.
 * - Lit les 6 champs de fond + statut + date + sources de la page trouvée.
 * - Si statut != "Validé juriste" -> préfixe un avertissement non-validé + escalade.
 * Fail-open : toute erreur ou absence -> ''.
 */
function getCountryRegFields_(countryTitle) {
  if (!countryTitle) return '';
  var wanted = normalizeCountryStr_(countryTitle);
  if (!wanted) return '';

  var cache = CacheService.getScriptCache();
  var cacheKey = 'country_reg_fields_' + wanted.replace(/[^a-z0-9]/g, '_');
  try {
    var cached = cache.get(cacheKey);
    if (cached !== null && cached !== undefined) return cached;
  } catch (_eC) { /* fall through */ }

  try {
    // Récupère toutes les fiches pays (base petite : pagination simple, garde-fou 5).
    var allPages = [];
    var cursor = null;
    var guard = 0;
    do {
      var payload = { page_size: 100 };
      if (cursor) payload.start_cursor = cursor;
      var resp = notionFetch_('POST', '/databases/' + COUNTRY_REG_DB_ID + '/query', payload);
      allPages = allPages.concat(resp.results || []);
      cursor = resp.has_more ? resp.next_cursor : null;
      guard++;
    } while (cursor && guard < 5);

    // Matche le pays par titre normalisé.
    var match = null;
    for (var i = 0; i < allPages.length; i++) {
      var props = allPages[i].properties || {};
      var titleProp = props['Nom'] && props['Nom'].title ? props['Nom'].title : [];
      var nom = richTextValue_(titleProp);
      if (normalizeCountryStr_(nom) === wanted) { match = allPages[i]; break; }
    }
    if (!match) {
      try { cache.put(cacheKey, '', 600); } catch (_e1) { /* ignore */ }
      return '';
    }

    var mProps = match.properties || {};
    function readText_(name) {
      var p = mProps[name];
      if (!p) return '';
      if (p.rich_text) return richTextValue_(p.rich_text).trim();
      if (p.select && p.select.name) return String(p.select.name).trim();
      if (p.date && p.date.start) return String(p.date.start).trim();
      return '';
    }

    var nomCanon = richTextValue_((mProps['Nom'] && mProps['Nom'].title) || []).trim();
    var statut = readText_('Statut validation réglementaire');
    var dateVerif = readText_('Date vérif réglementaire');
    var sources = readText_('Sources réglementaires');

    var lines = [];
    lines.push('## FICHE PAYS — ' + nomCanon +
      ' (réglementaire, source DB Pays, statut ' + (statut || 'inconnu') +
      ', vérif ' + (dateVerif || 'non datée') + ')');

    // Avertissement non-validé juriste.
    if (statut !== 'Validé juriste') {
      lines.push('⚠️ Données NON validées juriste — traiter comme à vérifier + escalade.');
    }

    var hasContent = false;
    for (var f = 0; f < COUNTRY_REG_FIELDS.length; f++) {
      var fieldName = COUNTRY_REG_FIELDS[f];
      var val = readText_(fieldName);
      if (!val) continue;
      hasContent = true;
      // Cap par champ pour borner la taille du prompt.
      if (val.length > 1500) val = val.slice(0, 1500) + ' […]';
      lines.push('\n### ' + fieldName + '\n' + val);
    }

    if (!hasContent) {
      // Aucun champ réglementaire renseigné : pas d'injection utile.
      try { cache.put(cacheKey, '', 600); } catch (_e2) { /* ignore */ }
      return '';
    }

    if (sources) {
      if (sources.length > 800) sources = sources.slice(0, 800) + ' […]';
      lines.push('\nSources: ' + sources);
    }

    var block = lines.join('\n').trim();
    try { cache.put(cacheKey, block, 3600); } catch (_e3) { /* ignore */ }
    return block;
  } catch (err) {
    Logger.log('getCountryRegFields_ error for "' + countryTitle + '": ' + (err && err.message));
    return '';
  }
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
        // Noms/types alignés sur le schéma réel de Feedback Atomic (title='Titre',
        // Status=type status, Domain=select ; pas de 'Source'/'Description'). (audit C5)
        properties: {
          'Titre': { title: [{ text: { content: title.slice(0, 200) } }] },
          'Type': { select: { name: 'improvement' } },
          'Domain': { select: { name: 'Workflow' } },
          'Severity': { select: { name: 'low' } },
          'Status': { status: { name: 'Pas commencé' } },
          'Demande utilisateur': { rich_text: [{ text: { content: description.slice(0, 1900) } }] },
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

  // NE JAMAIS écrire dans la propriété qui sert de clé de lookup des Conversations.
  // Par défaut « Agent session ID » = CONV_MISSIVE_ID_PROP, la clé où ensureConvPage_
  // stocke le conversation_id Missive (lookup_conv, list_tasks, readConvSituation_...).
  // Y écrire le session_id « sb_xxx » orphelinait la page (synthèse, tâches, instructions
  // introuvables) et provoquait des doublons. Le session_id est déjà loggué dans
  // sidebar_interactions via logSidebarInteraction_. (audit C1)
  try {
    var lookupKeyProp = cfg_('CONV_MISSIVE_ID_PROP') || 'Agent session ID';
    var convPageId = ensureConvPage_(body.conversation_id);
    if (convPageId) {
      var convProps = { 'Last agent': { rich_text: [{ text: { content: SIDEBAR_AGENT_ID + ' · ' + intentReported } }] } };
      // On ne stocke le session_id sur la Conv que si la clé de lookup est configurée
      // sur une AUTRE propriété (jamais sur « Agent session ID » elle-même).
      if (lookupKeyProp !== 'Agent session ID') {
        convProps['Agent session ID'] = { rich_text: [{ text: { content: sessionId } }] };
      }
      UrlFetchApp.fetch('https://api.notion.com/v1/pages/' + convPageId, {
        method: 'patch', contentType: 'application/json',
        headers: { 'Authorization': 'Bearer ' + getSecret_('NOTION_API_TOKEN'), 'Notion-Version': NOTION_API_VERSION },
        payload: JSON.stringify({ properties: convProps }),
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

/* ══════════════════════════════════════════════════════════════════════════
   ENRICH_AND_SYNC — Pipeline complet contact entrant
   signature Missive → Tavily → GLEIF → Claude → Folk → Notion
   ══════════════════════════════════════════════════════════════════════════ */

function handleEnrichAndSync_(body) {
  var convId    = String(body.conversation_id || '');
  var seedEmail = String(body.email || '').toLowerCase().trim();
  var seedName  = String(body.name  || '').trim();
  if (!seedEmail && !seedName) return { ok: false, error: 'email ou name requis' };

  var log = [];

  // ── 1. Dédoublonnage avant toute écriture ──────────────────────────────
  var notionEx = seedEmail ? handleLookupPerson_({ email: seedEmail }) : { found: false };
  var folkEx   = seedEmail ? handleLookupFolk_({ email: seedEmail })   : { found: false };
  if (notionEx.found && folkEx.found) {
    return {
      ok: true, dedup: 'both_exist',
      notion: { action: 'exists', notion_page_id: notionEx.notion_page_id, notion_page_url: notionEx.notion_page_url },
      folk:   { action: 'exists', folk_url: folkEx.folk_url }
    };
  }

  // ── 2. Parse signature Missive ─────────────────────────────────────────
  var sig = {};
  if (convId) {
    try { sig = parseEmailSignature_(convId, seedEmail); log.push('sig:' + (sig.phone||sig.title||sig.company ? 'found' : 'empty')); }
    catch (e) { log.push('sig:err'); }
  }
  if (sig.name && !seedName) seedName = sig.name;

  // ── 3. Tavily web search ───────────────────────────────────────────────
  var tavilyData = null;
  try {
    var q = [seedName, sig.company].filter(Boolean).join(' ');
    if (q) { tavilyData = tavilySearch_(q); log.push('tavily:ok'); }
  } catch (e) { log.push('tavily:err:' + String(e.message || e).slice(0, 60)); }

  // ── 4. GLEIF (gratuit, sans clé) ──────────────────────────────────────
  var gleif = {};
  var coName = sig.company || (tavilyData && extractCompanyFromTavily_(tavilyData)) || '';
  if (coName) {
    try { gleif = gleifSearch_(coName); log.push('gleif:' + (gleif.lei ? 'found' : 'not_found')); }
    catch (e) { log.push('gleif:skip'); }
  }

  // ── 5. Synthèse Claude ────────────────────────────────────────────────
  var record = synthesizeContact_({ email: seedEmail, name: seedName }, sig, tavilyData, gleif);
  record.email = record.email || seedEmail;
  record.name  = record.name  || seedName;
  log.push('synth:ok');

  // ── 6. Folk : créer si absent ─────────────────────────────────────────
  var folkId = null, folkUrl = null, folkAction = 'skipped';
  if (folkEx.found) {
    folkId = folkEx.folk_id; folkUrl = folkEx.folk_url; folkAction = 'exists';
    log.push('folk:already_exists');
  } else {
    try {
      var fc = folkApiCreate_(record);
      folkId = fc.folk_id || null; folkUrl = fc.folk_url || null;
      folkAction = folkId ? 'created' : 'failed';
      log.push('folk:' + folkAction);
    } catch (e) { log.push('folk:err:' + String(e.message || e).slice(0, 60)); folkAction = 'error'; }
  }

  // ── 7. Notion : créer ou enrichir ─────────────────────────────────────
  var notionPageId = null, notionPageUrl = null, notionAction = 'none';
  if (notionEx.found) {
    notionPageId  = notionEx.notion_page_id;
    notionPageUrl = notionEx.notion_page_url;
    try { notionUpdatePersonEnriched_(notionPageId, record, folkId, folkUrl); notionAction = 'updated'; log.push('notion:updated'); }
    catch (e) { log.push('notion:update_err:' + String(e.message||e).slice(0,60)); notionAction = 'update_failed'; }
  } else {
    try {
      var nr = notionCreatePersonEnriched_(record, folkId, folkUrl);
      notionPageId = nr.notion_page_id; notionPageUrl = nr.notion_page_url; notionAction = 'created';
      log.push('notion:created');
    } catch (e) { log.push('notion:err:' + String(e.message||e).slice(0,60)); notionAction = 'error'; }
  }

  return {
    ok: true, record: record,
    folk:   { action: folkAction, folk_id: folkId, folk_url: folkUrl },
    notion: { action: notionAction, notion_page_id: notionPageId, notion_page_url: notionPageUrl },
    log: log
  };
}

/* ── Parse la signature du dernier mail entrant depuis Missive ──────────── */
function parseEmailSignature_(convId, senderEmail) {
  var out = { phone: null, title: null, company: null, website: null, linkedin: null, name: null };
  try {
    var resp = missiveListMessages_(convId, 5);
    var messages = (resp.messages || []);
    var msg = null;
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      var fromAddr = ((m.from_field && m.from_field.address) || '').toLowerCase();
      if (fromAddr.includes('plasticodyssey') || fromAddr.includes('benoit@')) continue;
      if (senderEmail && fromAddr && fromAddr !== senderEmail) continue;
      msg = m; break;
    }
    if (!msg) return out;

    // Tente de lire le corps complet du message
    var body = msg.preview || '';
    try {
      var fullMsg = missiveApi_('GET', '/messages/' + msg.id);
      var fm = (fullMsg.messages || [])[0] || {};
      body = fm.body || fm.preview || body;
    } catch (_) {}

    // Strip HTML
    body = body.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')
               .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    // Repère le bloc signature
    var sigText = body;
    var markers = [/\r?\n--\s*\r?\n/, /\n_{4,}/, /\nCordialement[\s,]/, /\nBien cordialement/,
                   /\nBest regards/i, /\nKind regards/i, /\nSent from my/i];
    for (var d = 0; d < markers.length; d++) {
      var idx = body.search(markers[d]);
      if (idx > 50) { sigText = body.slice(idx); break; }
    }

    // Lignes non vides
    var lines = sigText.split(/\r?\n/).map(function(l) { return l.trim(); })
                       .filter(function(l) { return l.length > 0; });

    // LinkedIn
    var liMatch = sigText.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_%]+)/i);
    if (liMatch) out.linkedin = 'https://www.linkedin.com/in/' + liMatch[1];

    // Téléphone (formats internationaux et français)
    var phoneMatch = sigText.match(/(\+?[\d][\d\s\.\-\(\)]{7,17}\d)/);
    if (phoneMatch) { var rawPhone = phoneMatch[1].replace(/[\s\.\-]/g, ''); if (rawPhone.length >= 8) out.phone = phoneMatch[1].trim(); }

    // Site web (hors LinkedIn)
    var webMatch = sigText.match(/https?:\/\/(?!(?:www\.)?linkedin)[a-zA-Z0-9\-\.]+\.[a-z]{2,}/i);
    if (webMatch) out.website = webMatch[0].split(/[\s,<>]/)[0];

    // Nom, titre, société (lignes 1-3 après le délimiteur)
    for (var li = 0; li < Math.min(lines.length, 6); li++) {
      var line = lines[li].replace(/^-+\s*/, '').trim();
      if (!line || line.length < 2 || line.length > 80) continue;
      if (/^(http|www\.|mailto:|tel:|\+|\d)/.test(line)) continue;
      if (!out.name)    { out.name    = line; continue; }
      if (!out.title)   { out.title   = line; continue; }
      if (!out.company) { out.company = line; break; }
    }
    return out;
  } catch (e) { return out; }
}

/* ── Tavily search (TAVILY_API_KEY in Doppler) ──────────────────────────── */
function tavilySearch_(query) {
  var key = getSecret_('TAVILY_API_KEY');
  var res = UrlFetchApp.fetch('https://api.tavily.com/search', {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ api_key: key, query: query, max_results: 5,
                              include_answer: true, search_depth: 'basic' }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('Tavily ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
  return JSON.parse(res.getContentText());
}

/* ── Extrait le nom de société des résultats Tavily ────────────────────── */
function extractCompanyFromTavily_(tavilyData) {
  if (!tavilyData) return '';
  var answer = String(tavilyData.answer || '');
  // Cherche des patterns courants "travaille chez X", "CEO of X", "fondateur de X"
  var m = answer.match(/(?:chez|at|of|pour|de|founder of|CEO of)\s+([A-Z][A-Za-z\s&\.]{2,40})/);
  return m ? m[1].trim() : '';
}

/* ── GLEIF LEI Registry (gratuit, sans clé) ─────────────────────────────── */
function gleifSearch_(companyName) {
  var url = 'https://api.gleif.org/api/v1/lei-records?filter%5Bentity.legalName%5D=' +
            encodeURIComponent(companyName) + '&page%5Bsize%5D=1';
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return {};
  var data = JSON.parse(res.getContentText());
  var items = (data.data || []);
  if (!items.length) return {};
  var attr  = (items[0].attributes && items[0].attributes.entity) || {};
  return {
    lei:           items[0].id,
    official_name: (attr.legalName && attr.legalName.name) || companyName,
    jurisdiction:  attr.jurisdiction || '',
    status:        attr.status || ''
  };
}

/* ── Synthèse Claude : consolide seed + sig + tavily + gleif ───────────── */
function synthesizeContact_(seed, sig, tavilyData, gleif) {
  var apiKey; try { apiKey = getSecret_('ANTROPIC_API_TOKEN'); } catch (e) { return { name: seed.name, email: seed.email }; }

  var ctx = 'Contact seed: ' + JSON.stringify(seed) + '\n';
  if (sig && Object.keys(sig).some(function(k){ return sig[k]; }))
    ctx += 'Signature email: ' + JSON.stringify(sig) + '\n';
  if (tavilyData && tavilyData.answer)
    ctx += 'Recherche web (Tavily answer): ' + String(tavilyData.answer).slice(0, 800) + '\n';
  if (tavilyData && tavilyData.results && tavilyData.results.length)
    ctx += 'Résultats: ' + JSON.stringify(tavilyData.results.slice(0,3).map(function(r){
      return { title: r.title, url: r.url, snippet: (r.content||'').slice(0,200) };
    })) + '\n';
  if (gleif && gleif.lei)
    ctx += 'GLEIF: ' + JSON.stringify(gleif) + '\n';

  var system = 'Tu es un assistant CRM pour Plastic Odyssey Factories (POF), entreprise qui déploie des usines de recyclage plastique. Réponds UNIQUEMENT en JSON valide, sans markdown ni commentaire.';
  var prompt = ctx + '\nConsolide en une fiche propre. Omets les champs inconnus. Ne remplis rien si incertain.\n\n' +
    '{"name":"...","email":"...","phone":"...","title":"...","company":"...","domain":"...","linkedin":"...","country":"...","context_note":"2-3 phrases : ce que fait la société/personne, pertinence POF (recyclage, industriel, bailleurs, franchise), signal secteur clé.","field_sources":{"phone":"sig|web|unknown","title":"sig|web|unknown","company":"sig|web|gleif|unknown"}}';

  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 700, system: system,
                              messages: [{ role: 'user', content: prompt }] }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return { name: seed.name, email: seed.email };
  var data = JSON.parse(res.getContentText());
  var textBlock = (data.content||[]).filter(function(b){return b.type==='text';})[0];
  return parseJsonLoose_(textBlock ? textBlock.text : '') || { name: seed.name, email: seed.email };
}

/* ── Crée un contact dans Folk (API v1 directe) ─────────────────────────── */
function folkApiCreate_(record) {
  var token = getSecret_('FOLK_API_KEY');
  var payload = { fullName: record.name || record.email || '' };
  if (record.email)   payload.emails    = [{ email: record.email }];
  if (record.phone)   payload.phones    = [{ phone: record.phone }];
  if (record.company) payload.company   = { name: record.company };
  if (record.title)   payload.jobTitle  = record.title;

  var res = UrlFetchApp.fetch(FOLK_API_BASE + '/people', {
    method: 'post', contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + token },
    payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) throw new Error('Folk create ' + code + ': ' + res.getContentText().slice(0,300));

  var data = JSON.parse(res.getContentText());
  var person = (data.data && data.data.id !== undefined) ? data.data : data;
  var rawId  = String(person.id || '').replace(/^per_/, '');
  var grp    = (person.groups && person.groups.length) ? String(person.groups[0].id||'').replace(/^grp_/,'') : '';
  var folkUrl = rawId ? 'https://app.folk.app/apps/contacts/network/' + FOLK_NETWORK_ID +
                        (grp ? '/groups/' + grp : '') + '/people/' + rawId : null;
  return { folk_id: rawId || null, folk_url: folkUrl };
}

/* ── Crée une fiche Notion avec tous les champs enrichis ────────────────── */
function notionCreatePersonEnriched_(record, folkId, folkUrl) {
  var dbId      = cfg_('NOTION_PERSONS_DB');
  var emailProp = cfg_('PERSON_EMAIL_PROP') || 'E-mail';
  if (!dbId) throw new Error('NOTION_PERSONS_DB not configured');

  var props = {};
  props['Nom']      = { title: [{ text: { content: record.name || record.email || 'Sans nom' } }] };
  if (record.email)   props[emailProp]        = { email: record.email };
  if (record.phone)   props['Téléphone']      = { phone_number: record.phone };
  if (record.company) props['Société']        = { rich_text: [{ text: { content: record.company } }] };
  if (record.domain)  props['Nom de domaine'] = { rich_text: [{ text: { content: record.domain } }] };
  if (folkUrl)        props['Lien Folk']       = { url: folkUrl };
  if (folkId)         props['ID folk']         = { rich_text: [{ text: { content: folkId } }] };
  props['Type'] = { multi_select: [{ name: 'source:sidebar' }] };

  var descLines = [];
  if (record.title)        descLines.push(record.title);
  if (record.context_note) descLines.push(record.context_note);
  if (record.linkedin)     descLines.push('LinkedIn: ' + record.linkedin);
  if (record.country)      descLines.push('Pays: ' + record.country);
  if (descLines.length)    props['Description'] = { rich_text: [{ text: { content: descLines.join('\n') } }] };

  var resp = notionFetch_('POST', '/pages', { parent: { database_id: dbId }, properties: props });
  return { notion_page_id: resp.id, notion_page_url: resp.url || notionPageUrl_(resp.id) };
}

/* ── Met à jour une fiche Notion existante avec les données enrichies ───── */
function notionUpdatePersonEnriched_(pageId, record, folkId, folkUrl) {
  var props = {};
  if (record.phone)   props['Téléphone']      = { phone_number: record.phone };
  if (record.company) props['Société']        = { rich_text: [{ text: { content: record.company } }] };
  if (record.domain)  props['Nom de domaine'] = { rich_text: [{ text: { content: record.domain } }] };
  if (folkUrl)        props['Lien Folk']       = { url: folkUrl };
  if (folkId)         props['ID folk']         = { rich_text: [{ text: { content: folkId } }] };

  var descLines = [];
  if (record.title)        descLines.push(record.title);
  if (record.context_note) descLines.push(record.context_note);
  if (record.linkedin)     descLines.push('LinkedIn: ' + record.linkedin);
  if (record.country)      descLines.push('Pays: ' + record.country);
  if (descLines.length)    props['Description'] = { rich_text: [{ text: { content: descLines.join('\n') } }] };

  if (Object.keys(props).length) notionFetch_('PATCH', '/pages/' + pageId, { properties: props });
}