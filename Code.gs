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
 *   setup_config                 {config} — one-shot, locked after first call
 */

const NOTION_API_VERSION = '2022-06-28';
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_MAX_TOKENS = 800;
const MCP_FOLK = 'https://mcp.zapier.com/api/mcp/a/13565407/mcp';

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
      case 'ping':                       result = { ok: true, version: '1.9' };       break;
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
      // v1.8 — nouveaux endpoints sidebar v4
      case 'analyze_content':            result = handleAnalyzeContent_(body);        break;
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
      case 'ask_agent':                  result = handleAskAgent_(body);              break;
      case 'signature_action':           result = handleSignatureAction_(body);       break;
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
  return json_({ ok: true, service: 'missive-sidebar-proxy', version: '1.8' });
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

  var subject = String(body.subject || '');
  var mainName = (body.main && body.main.name) || '';
  var mainEmail = (body.main && body.main.email) || '';
  var personInstr = String(body.person_instructions || '');
  var convInstr   = String(body.conv_instructions || '');

  // Pas d'info → réponse vide rapide, pas d'appel IA
  if (!subject && !personInstr && !convInstr) {
    return { summary: '', attachments: [], sources: [] };
  }

  var apiKey;
  try { apiKey = getSecret_('ANTROPIC_API_TOKEN'); }
  catch (_e) { return { summary: '', attachments: [], sources: [], error: 'no_anthropic_key' }; }

  var system = 'Tu es un assistant qui résume une conversation Missive pour Benoit (CEO POF). ' +
    'Réponds UNIQUEMENT en JSON valide, sans markdown : ' +
    '{"summary":"résumé 2-3 phrases", "sources":[{"type":"linkedin|web|other", "url":"...", "label":"..."}]}. ' +
    'Si tu n as pas d url évidente, sources = []. Le résumé doit pointer ce qui est actionnable.';

  var prompt = 'Contact principal : ' + mainName + ' (' + mainEmail + ')\n' +
    (subject ? 'Sujet : ' + subject + '\n' : '') +
    (personInstr ? '\nInstructions Notion personne :\n' + personInstr + '\n' : '') +
    (convInstr ? '\nInstructions Notion conv :\n' + convInstr + '\n' : '');

  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: ANTHROPIC_MODEL, max_tokens: 400, system: system,
      messages: [{ role: 'user', content: prompt }]
    }), muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    return { summary: '', attachments: [], sources: [], error: 'anthropic_' + res.getResponseCode() };
  }
  var data = JSON.parse(res.getContentText());
  var textBlock = (data.content || []).filter(function (b) { return b.type === 'text'; })[0];
  var parsed = parseJsonLoose_(textBlock ? textBlock.text : '');
  return {
    summary: (parsed && parsed.summary) || '',
    attachments: [], // pas de Missive API ici
    sources: (parsed && Array.isArray(parsed.sources)) ? parsed.sources : []
  };
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

/* ─── list_timeline : Notes + MOUs liés au contact ─────────── */
function handleListTimeline_(body) {
  var contactPageId = String(body.contact_page_id || '');
  if (!contactPageId) return { situation: null, upcoming: [], interactions: [] };

  var interactions = [];

  // Fetch la page contact pour récupérer les relations Notes + MOUs
  var page;
  try { page = notionFetch_('GET', '/pages/' + contactPageId, null); }
  catch (e) { return { situation: null, upcoming: [], interactions: [], error: String(e) }; }
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
    situation: null,  // alimenté par update_situation
    upcoming: [],     // v2 : à wirer plus tard
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

/* ─── brief_podcast : appel direct webhook (avec génération IA) ── */

function handleBriefPodcast_(body) {
  var convId = String(body.conversation_id || '');
  if (!convId) return { success: false, error: 'conversation_id required' };

  // Construit le contexte à partir de ce que le frontend passe
  var subject = String(body.subject || '');
  var mainName = (body.main && body.main.name) || '';
  var mainEmail = (body.main && body.main.email) || '';
  var othersList = (body.others || []).map(function (p) { return p.name || p.email; }).join(', ');
  var personInstr = String(body.person_instructions || '');
  var convInstr   = String(body.conv_instructions || '');

  var apiKey = getSecret_('ANTROPIC_API_TOKEN');

  var system = 'Tu es un assistant exécutif POF qui rédige des briefings audio. Voix : Impact Realist - assertif, pragmatique, technique sans jargon, sans filler. Pas d em-dashes. Démarre direct sur l enjeu, sans préambule. Adresse Benoit en "tu". Chiffres en toutes lettres. 400 à 600 mots. Format briefing exécutif.';

  var prompt = 'Génère un briefing audio sur cette conversation Missive pour que Benoit comprenne où ça en est sur son trajet vélo.\n\n' +
    'Contact principal : ' + mainName + ' (' + mainEmail + ')\n' +
    (subject ? 'Sujet : ' + subject + '\n' : '') +
    (othersList ? 'Autres participants : ' + othersList + '\n' : '') +
    (personInstr ? '\nInstructions personne (Notion) :\n' + personInstr + '\n' : '') +
    (convInstr ? '\nInstructions conversation (Notion) :\n' + convInstr + '\n' : '') +
    '\nConversation Missive ID : ' + convId + '\n' +
    '\nSi tu n as pas le contenu exact des derniers échanges, contextualise à partir des instructions Notion ci-dessus et indique clairement à Benoit quels points lui restent à confirmer. Évite d inventer des chiffres ou des dates non fournis.';

  var claudeRes = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      system: system,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });
  if (claudeRes.getResponseCode() !== 200) {
    return { success: false, error: 'Anthropic ' + claudeRes.getResponseCode() };
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

  return { success: true, preview: text.slice(0, 300) };
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
   FOLK via Anthropic + MCP Zapier
   ═══════════════════════════════════════════════════════════════ */

function handleLookupFolk_(body) {
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
   ASK AGENT (Spec 2)
   Détection d'intent LARGE + délégation Drafter A/B + chat libre.
   Création de brouillon Missive DIRECTE (pas de validation, par décision Benoit).
   ═══════════════════════════════════════════════════════════════ */

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
    conv_instructions: convInstr
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
      var sit = handleRegenSituation_({ conversation_id: convId, main: body.main, others: body.others, subject: body.subject, person_instructions: body.person_instructions, conv_instructions: body.conv_instructions, return_only: true });
      return {
        reply: sit.summary || 'Synthèse indisponible.',
        bullets: sit.bullets || [],
        risks: sit.risks || [],
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

  var out = {
    summary: parsed.summary || '',
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 7) : [],
    risks:   Array.isArray(parsed.risks)   ? parsed.risks.slice(0, 3)   : [],
    updated_at: new Date().toISOString()
  };

  // Si return_only, ne persiste pas (utilisé en délégation ask_agent)
  if (body.return_only) return out;

  // Persistance : append à Instruction spécifique de la Conv avec marqueur Situation
  try {
    var convPageId = ensureConvPage_(convId);
    var instrProp = cfg_('CONV_INSTRUCTIONS_PROP') || 'Instruction spécifique';
    var stamped = '— Situation (regen ' + out.updated_at.slice(0, 16) + ') —\n' +
      out.summary + '\n\n' +
      out.bullets.map(function (b) { return '• ' + b; }).join('\n') +
      (out.risks.length ? '\n\nRisques :\n' + out.risks.map(function (r) { return '⚠ ' + r; }).join('\n') : '');
    appendToRichText_(convPageId, instrProp, stamped);
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
