// ============================================================
//  POF Missive Sidebar â Code.gs  v3
//  Backend GAS : API JSON pour sidebar GitHub Pages
//
//  SETUP â Script Properties (Project Settings > Script Properties) :
//    MISSIVE_API_KEY   â Missive Settings > API > Create API key
//    NOTION_API_KEY    â Notion Settings > Integrations > Internal token
//    NOTION_TASKS_DB   â 332c2ce245e8807ea247f8a7c403c53d
//    NOTION_PEOPLE_DB  â 25ac2ce245e880bbb104e3c534ec704b
//
//  DÃPLOIEMENT :
//    Deploy > New deployment > Type: Web App
//    Execute as: Me | Who has access: Anyone
// ============================================================

// âââ CONFIG ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const CFG = {
  missiveKey: () => PropertiesService.getScriptProperties().getProperty('MISSIVE_API_KEY'),
  notionKey:  () => PropertiesService.getScriptProperties().getProperty('NOTION_API_KEY'),
  tasksDb:    () => PropertiesService.getScriptProperties().getProperty('NOTION_TASKS_DB')  || '332c2ce245e8807ea247f8a7c403c53d',
  peopleDb:   () => PropertiesService.getScriptProperties().getProperty('NOTION_PEOPLE_DB') || '25ac2ce245e880bbb104e3c534ec704b',
};

// SchÃ©ma rÃ©el des bases Notion (vÃ©rifiÃ© le 2026-04-11)
const SCHEMA = {
  tasks: {
    title:      'Nom de la tÃ¢che',
    prompt:     'Prompt',
    execution:  'Execution',
    typeAction: "Type d'action",
    section:    'Section',
    etat:       'Etat',
    source:     'Source',
    priorite:   'PrioritÃ©',
  },
  people: {
    title:   'Nom prÃ©nom',
    email:   'E-mail',
    company: 'SociÃ©tÃ©',
    type:    'Type',
    desc:    'Description',
  },
};

// âââ ENTRY POINTS ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

/**
 * doGet : sanity check / accÃ¨s direct navigateur.
 * La sidebar est maintenant servie par GitHub Pages.
 */
function doGet(e) {
  Logger.log('[doGet] params=' + JSON.stringify(e && e.parameter));
  return HtmlService.createHtmlOutput(
    '<html><body style="font-family:sans-serif;padding:20px">'
    + '<h3 style="color:#0066FF">POF GAS API v3</h3>'
    + '<p>Backend opÃ©rationnel. La sidebar est sur GitHub Pages.</p>'
    + '</body></html>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * doPost : point d'entrÃ©e unique pour toutes les actions.
 * Body attendu (JSON, Content-Type: text/plain) :
 *   { action: 'getConv'|'createTask'|'searchPeople'|'createPerson', ...payload }
 */
function doPost(e) {
  Logger.log('[doPost] raw=' + (e.postData ? e.postData.contents.substring(0, 200) : 'null'));

  let result;
  try {
    const body = JSON.parse(e.postData.contents);
    Logger.log('[doPost] action=' + body.action);

    switch (body.action) {

      case 'getConv':
        const conv = _fetchMissiveConversation(body.convId);
        result = conv || { error: 'Conversation introuvable' };
        break;

      case 'searchPeople':
        result = _searchPersonnes((body.query || '').trim());
        break;

      case 'createTask':
        result = _createNotionTask(body.task);
        break;

      case 'createPerson':
        result = _createNotionPerson(body.person);
        break;

      default:
        result = { error: 'Action inconnue : ' + body.action };
    }

  } catch (err) {
    Logger.log('[doPost] ERR: ' + err);
    result = { error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// âââ MISSIVE API âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function _fetchMissiveConversation(convId) {
  if (!convId) return null;
  Logger.log('[_fetchMissiveConversation] id=' + convId);

  const resp = UrlFetchApp.fetch(
    'https://public.missiveapp.com/v1/conversations/' + convId,
    {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + CFG.missiveKey(),
        'Content-Type':  'application/json',
      },
      muteHttpExceptions: true,
    }
  );

  const code = resp.getResponseCode();
  Logger.log('[_fetchMissiveConversation] HTTP ' + code);
  if (code !== 200) return null;

  const data = JSON.parse(resp.getContentText());
  const conv = data.conversations;
  if (!conv) return null;

  const from    = conv.from_field || {};
  const snippet = (conv.messages && conv.messages[0]) ? (conv.messages[0].preview || '') : '';
  const convUrl = 'https://mail.missiveapp.com/#conversations/' + convId;

  return {
    id:        convId,
    subject:   conv.subject || conv.latest_message_subject || '',
    fromName:  from.name    || '',
    fromEmail: from.address || '',
    url:       convUrl,
    snippet:   snippet,
  };
}

// âââ NOTION HELPERS ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function _notionReq(path, method, body) {
  const opts = {
    method:  method || 'GET',
    headers: {
      'Authorization':  'Bearer ' + CFG.notionKey(),
      'Notion-Version': '2022-06-28',
      'Content-Type':   'application/json',
    },
    muteHttpExceptions: true,
  };
  if (body) opts.payload = JSON.stringify(body);

  const resp = UrlFetchApp.fetch('https://api.notion.com/v1' + path, opts);
  const code = resp.getResponseCode();
  const data = JSON.parse(resp.getContentText());

  if (code >= 400) {
    throw new Error('Notion ' + code + ': ' + (data.message || JSON.stringify(data)));
  }
  return data;
}

// âââ PERSONNES âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function _searchPersonnes(query) {
  Logger.log('[_searchPersonnes] q=' + query);
  const S  = SCHEMA.people;
  const db = CFG.peopleDb();

  const filter = {
    or: [
      { property: S.title, title: { contains: query } },
      { property: S.email, email: { equals:   query } },
    ],
  };
  if (query.includes('@')) {
    filter.or.push({ property: S.email, email: { contains: query } });
  }

  const data = _notionReq('/databases/' + db + '/query', 'POST', {
    filter,
    page_size: 7,
    sorts: [{ property: S.title, direction: 'ascending' }],
  });

  const results = (data.results || []).map(p => {
    const props = p.properties;
    const title = props[S.title] && props[S.title].title && props[S.title].title[0]
      ? props[S.title].title[0].plain_text : '';
    const email = props[S.email] && props[S.email].email ? props[S.email].email : '';
    const soc   = props[S.company] && props[S.company].rich_text && props[S.company].rich_text[0]
      ? props[S.company].rich_text[0].plain_text : '';
    const types = props[S.type] && props[S.type].multi_select
      ? props[S.type].multi_select.map(t => t.name) : [];

    return { id: p.id, url: p.url, name: title, email, company: soc, types };
  });

  return { results };
}

function _createNotionPerson(person) {
  Logger.log('[_createNotionPerson] name=' + (person && person.name));
  const S  = SCHEMA.people;
  const db = CFG.peopleDb();

  const properties = {};
  properties[S.title] = { title: [{ text: { content: person.name || '' } }] };
  if (person.email)   properties[S.email]   = { email: person.email };
  if (person.company) properties[S.company] = { rich_text: [{ text: { content: person.company } }] };
  if (person.type)    properties[S.type]    = { multi_select: [{ name: person.type }] };
  if (person.notes)   properties[S.desc]    = { rich_text: [{ text: { content: person.notes } }] };

  const page = _notionReq('/pages', 'POST', {
    parent:     { database_id: db },
    properties: properties,
  });

  Logger.log('[_createNotionPerson] created=' + page.id);
  return { success: true, pageId: page.id, pageUrl: page.url };
}

// âââ TASKS BACKLOG ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function _createNotionTask(task) {
  Logger.log('[_createNotionTask] name=' + (task && task.name) + ' exec=' + (task && task.execution));
  const S  = SCHEMA.tasks;
  const db = CFG.tasksDb();

  // Prompt : lien Missive + description
  const promptParts = [];
  if (task.url)         promptParts.push('ð ' + task.url);
  if (task.description) promptParts.push(task.description);
  const promptText = promptParts.join('\n\n');

  // Execution : "Autonome" = IA, "Normale" = Humaine
  const execution  = (task.execution === 'IA') ? 'Autonome' : 'Normale';
  const etatValue  = (execution === 'Autonome') ? 'Brouillon' : 'A faire';

  const properties = {};
  properties[S.title]      = { title: [{ text: { content: task.name || '' } }] };
  if (promptText) {
    properties[S.prompt]   = { rich_text: [{ text: { content: promptText } }] };
  }
  properties[S.execution]  = { select: { name: execution } };
  properties[S.typeAction] = { select: { name: 'Mail' } };
  properties[S.section]    = { select: { name: 'Inbox' } };
  properties[S.source]     = { select: { name: 'Missive' } };
  properties[S.etat]       = { status: { name: etatValue } };
  if (task.priority) {
    properties[S.priorite] = { select: { name: task.priority } };
  }

  const page = _notionReq('/pages', 'POST', {
    parent:     { database_id: db },
    properties: properties,
  });

  Logger.log('[_createNotionTask] created=' + page.id + ' etat=' + etatValue);
  return { success: true, pageId: page.id, pageUrl: page.url };
}
