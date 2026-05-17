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
      case 'ping':                       result = { ok: true, version: '1.5' };       break;
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
      case 'brief_podcast':              result = handleQueueAgentTask_(body, 'brief_podcast');        break;
      case 'add_to_watch':               result = handleQueueAgentTask_(body, 'add_to_watch');         break;
      case 'estimate_opportunity':       result = handleQueueAgentTask_(body, 'estimate_opportunity'); break;
      case 'brief_reply':                result = handleQueueAgentTask_(body, 'brief_reply');          break;
      case 'send_nda':                   result = handleQueueAgentTask_(body, 'send_nda');             break;
      case 'enrich_contact':             result = handleQueueAgentTask_(body, 'enrich_contact');       break;
      case 'lookup_folk':                result = handleLookupFolk_(body);            break;
      default:                           return json_({ error: 'unknown action: ' + action });
    }
    return json_(result);
  } catch (err) {
    return json_({ error: String((err && err.message) || err), stack: String((err && err.stack) || '').slice(0, 500) });
  }
}

function doGet(_e) {
  return json_({ ok: true, service: 'missive-sidebar-proxy', version: '1.5' });
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
  var emailProp = cfg_('PERSON_EMAIL_PROP') || 'E-mail';
  var instrProp = cfg_('PERSON_INSTRUCTIONS_PROP') || 'Instruction traitement des mails';
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
      var page = results[i];
      var props = page.properties || {};
      var title = (props['Nom'] && props['Nom'].title) || [];
      var emailVal = (props[emailProp] && props[emailProp].email) || '';
      var instrVal = (props[instrProp] && props[instrProp].rich_text) || [];
      all.push({
        page_id: page.id,
        page_url: page.url || notionPageUrl_(page.id),
        name: richTextValue_(title),
        email: String(emailVal || '').toLowerCase(),
        instructions: richTextValue_(instrVal)
      });
    }
    cursor = resp.has_more ? resp.next_cursor : null;
    pageCount++;
    if (pageCount > 50) break; // safety : max 5000 entries
  } while (cursor);

  return { count: all.length, persons: all, ts: Date.now() };
}

/* ─── Lookup person ─────────────────────────────────────────── */

function handleLookupPerson_(body) {
  var email = String(body.email || '').toLowerCase();
  var name  = String(body.name || '');
  var dbId  = cfg_('NOTION_PERSONS_DB');
  var emailProp = cfg_('PERSON_EMAIL_PROP') || 'E-mail';
  var instrProp = cfg_('PERSON_INSTRUCTIONS_PROP') || 'Instruction traitement des mails';

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
      filter: { property: 'Nom', title: { contains: name } },
      page_size: 1
    });
    if (resp2.results && resp2.results.length) page = resp2.results[0];
  }

  if (!page) {
    return {
      found: false, notion_page_id: null, notion_page_url: null,
      name: null, email: null, person_instructions: null
    };
  }

  var props = page.properties || {};
  var title = (props['Nom'] && props['Nom'].title) || [];
  var emailVal = (props[emailProp] && props[emailProp].email) || '';
  var instrVal = (props[instrProp] && props[instrProp].rich_text) || [];

  return {
    found: true,
    notion_page_id: page.id,
    notion_page_url: page.url || notionPageUrl_(page.id),
    name: richTextValue_(title),
    email: emailVal,
    person_instructions: richTextValue_(instrVal)
  };
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
