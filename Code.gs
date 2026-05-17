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
      case 'ping':                       result = { ok: true, version: '1.3' };       break;
      case 'lookup_person':              result = handleLookupPerson_(body);          break;
      case 'create_person':              result = handleCreatePerson_(body);          break;
      case 'update_person_instructions': result = handleUpdatePersonInstr_(body);     break;
      case 'lookup_conv':                result = handleLookupConv_(body);            break;
      case 'upsert_conv':                result = handleUpsertConv_(body);            break;
      case 'lookup_folk':                result = handleLookupFolk_(body);            break;
      default:                           return json_({ error: 'unknown action: ' + action });
    }
    return json_(result);
  } catch (err) {
    return json_({ error: String((err && err.message) || err), stack: String((err && err.stack) || '').slice(0, 500) });
  }
}

function doGet(_e) {
  return json_({ ok: true, service: 'missive-sidebar-proxy', version: '1.3' });
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
