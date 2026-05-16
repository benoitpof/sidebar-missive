/**
 * missive-sidebar-proxy
 *
 * Proxy GAS pour la sidebar Missive Notion (HTML statique déployé sur GitHub Pages
 * ou équivalent). Masque la clé Anthropic, suit le pattern Secrets_Proxy POF.
 *
 * Le frontend appelle ce GAS en POST avec {action, token, ...args}.
 * Le GAS valide le PUBLIC_TOKEN, récupère ANTROPIC_API_TOKEN via getSecret_,
 * appelle l'API Anthropic avec MCP Notion/Folk, et retourne le JSON parsé.
 *
 * Actions exposées :
 *   ping
 *   lookup_person                {email, name}
 *   create_person                {email, name}
 *   update_person_instructions   {page_id, text}
 *   lookup_conv                  {missive_conversation_id}
 *   upsert_conv                  {missive_conversation_id, text, page_id?}
 *   lookup_folk                  {email, name}
 */

/* ─── Script Properties attendues (toutes non-secrets) ─────────────
   Injectées par gas-deploy :  SECRETS_PROXY_URL, SECRETS_PROXY_TOKEN
   À configurer manuellement après premier déploiement :
     PUBLIC_TOKEN                 (random, partagé avec le frontend)
     NOTION_PERSONS_DB            (UUID base Notion Personnes)
     NOTION_CONVS_DB              (UUID base Notion Instructions Conversations)
     PERSON_EMAIL_PROP            (défaut: "Email")
     PERSON_INSTRUCTIONS_PROP     (défaut: "Instructions spécifiques")
     CONV_MISSIVE_ID_PROP         (défaut: "Missive ID")
     CONV_INSTRUCTIONS_PROP       (défaut: "Instructions")
   ──────────────────────────────────────────────────────────────── */

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 800;
const MCP_NOTION = 'https://mcp.notion.com/mcp';
const MCP_FOLK   = 'https://mcp.zapier.com/api/mcp/a/13565407/mcp';

/* ═══════════════════════════════════════════════════════════════
   ENTRY POINTS
   ═══════════════════════════════════════════════════════════════ */

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const auth = checkAuth_(body.token);
    if (!auth.ok) return json_({ error: auth.error });

    const action = body.action;
    let result;
    switch (action) {
      case 'ping':                       result = { ok: true, version: '1.0' };       break;
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
    return json_({ error: String((err && err.message) || err) });
  }
}

function doGet(_e) {
  return json_({ ok: true, service: 'missive-sidebar-proxy', version: '1.0' });
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
  // GAS Web App n'autorise pas la définition du status code via ContentService.
  // Les erreurs voyagent dans le payload {error: "..."}.
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function cfg_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/* ═══════════════════════════════════════════════════════════════
   ACTION HANDLERS
   ═══════════════════════════════════════════════════════════════ */

function handleLookupPerson_(body) {
  const email = String(body.email || '');
  const name  = String(body.name  || '');
  const dbId  = cfg_('NOTION_PERSONS_DB');
  const instrProp = cfg_('PERSON_INSTRUCTIONS_PROP') || 'Instructions spécifiques';

  if (!dbId) throw new Error('NOTION_PERSONS_DB not configured');

  const prompt =
    'Cherche dans la base Notion "' + dbId + '" une personne avec:\n' +
    '- email: ' + JSON.stringify(email) + '\n' +
    '- ou nom: ' + JSON.stringify(name) + '\n\n' +
    'Utilise notion_query_database ou notion_search.\n\n' +
    'Retourne EXACTEMENT ce JSON, sans markdown:\n' +
    '{"found": boolean, "notion_page_id": string|null, "notion_page_url": string|null, ' +
    '"name": string|null, "email": string|null, ' +
    '"person_instructions": "valeur du champ \\"' + instrProp + '\\" ou null"}';

  return callClaude_(
    'Tu es un assistant de recherche Notion. Réponds UNIQUEMENT en JSON valide, sans markdown ni explication.',
    prompt,
    [MCP_NOTION]
  );
}

function handleCreatePerson_(body) {
  const email = String(body.email || '');
  const name  = String(body.name  || '');
  const dbId  = cfg_('NOTION_PERSONS_DB');
  const emailProp = cfg_('PERSON_EMAIL_PROP') || 'Email';

  if (!dbId) throw new Error('NOTION_PERSONS_DB not configured');

  const prompt =
    'Crée une page dans la base Notion "' + dbId + '" avec:\n' +
    '- Titre (Name): ' + JSON.stringify(name) + '\n' +
    '- Propriété "' + emailProp + '": ' + JSON.stringify(email) + '\n\n' +
    'Retourne, sans markdown: {"success": boolean, "notion_page_id": string, "notion_page_url": string}';

  return callClaude_(
    'Tu es un assistant Notion. Réponds UNIQUEMENT en JSON valide.',
    prompt,
    [MCP_NOTION]
  );
}

function handleUpdatePersonInstr_(body) {
  const pageId = String(body.page_id || '');
  const text   = String(body.text    || '');
  const prop   = cfg_('PERSON_INSTRUCTIONS_PROP') || 'Instructions spécifiques';

  if (!pageId) throw new Error('page_id required');

  const prompt =
    'Mets à jour la page Notion avec ID "' + pageId + '".\n' +
    'Définis la propriété rich text "' + prop + '" avec le contenu suivant :\n' +
    JSON.stringify(text) + '\n\n' +
    'Retourne, sans markdown: {"success": boolean}';

  return callClaude_(
    'Tu es un assistant Notion. Réponds UNIQUEMENT en JSON valide.',
    prompt,
    [MCP_NOTION]
  );
}

function handleLookupConv_(body) {
  const convId = String(body.missive_conversation_id || '');
  const dbId   = cfg_('NOTION_CONVS_DB');
  const idProp = cfg_('CONV_MISSIVE_ID_PROP') || 'Missive ID';
  const instrProp = cfg_('CONV_INSTRUCTIONS_PROP') || 'Instructions';

  if (!dbId)   throw new Error('NOTION_CONVS_DB not configured');
  if (!convId) throw new Error('missive_conversation_id required');

  const prompt =
    'Cherche dans la base Notion "' + dbId + '" une page où la propriété "' + idProp +
    '" vaut exactement ' + JSON.stringify(convId) + '.\n\n' +
    'Retourne, sans markdown: ' +
    '{"found": boolean, "notion_page_id": string|null, "instructions": "valeur de \\"' +
    instrProp + '\\" ou null"}';

  return callClaude_(
    'Tu es un assistant Notion. Réponds UNIQUEMENT en JSON valide.',
    prompt,
    [MCP_NOTION]
  );
}

function handleUpsertConv_(body) {
  const convId = String(body.missive_conversation_id || '');
  const text   = String(body.text || '');
  const dbId   = cfg_('NOTION_CONVS_DB');
  const idProp = cfg_('CONV_MISSIVE_ID_PROP') || 'Missive ID';
  const instrProp = cfg_('CONV_INSTRUCTIONS_PROP') || 'Instructions';

  if (!dbId)   throw new Error('NOTION_CONVS_DB not configured');
  if (!convId) throw new Error('missive_conversation_id required');

  if (body.page_id) {
    // Mise à jour directe si on a déjà la page_id
    const prompt =
      'Mets à jour la page Notion "' + String(body.page_id) + '".\n' +
      'Définis la propriété rich text "' + instrProp + '" avec :\n' +
      JSON.stringify(text) + '\n\n' +
      'Retourne, sans markdown: {"success": boolean, "notion_page_id": "' + String(body.page_id) + '"}';
    return callClaude_(
      'Tu es un assistant Notion. Réponds UNIQUEMENT en JSON valide.',
      prompt,
      [MCP_NOTION]
    );
  }

  // Upsert : cherche d'abord, met à jour si trouvé, crée sinon
  const prompt =
    'Cherche dans la base Notion "' + dbId + '" une page où la propriété "' + idProp +
    '" vaut ' + JSON.stringify(convId) + '.\n' +
    'Si elle existe : mets à jour sa propriété rich text "' + instrProp + '" avec :\n' +
    JSON.stringify(text) + '\n' +
    'Sinon : crée une nouvelle page avec "' + idProp + '" = ' + JSON.stringify(convId) +
    ' et "' + instrProp + '" = ' + JSON.stringify(text) + '\n\n' +
    'Retourne, sans markdown: {"success": boolean, "notion_page_id": string, "created": boolean}';

  return callClaude_(
    'Tu es un assistant Notion. Réponds UNIQUEMENT en JSON valide.',
    prompt,
    [MCP_NOTION]
  );
}

function handleLookupFolk_(body) {
  const email = String(body.email || '');
  const name  = String(body.name  || '');

  const prompt =
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
   ANTHROPIC API CALL
   ═══════════════════════════════════════════════════════════════ */

function callClaude_(system, userPrompt, mcpServers) {
  const apiKey = getSecret_('ANTROPIC_API_TOKEN'); // typo intentionnelle Doppler

  const payload = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: system,
    messages: [{ role: 'user', content: userPrompt }]
  };
  if (mcpServers && mcpServers.length) {
    payload.mcp_servers = mcpServers.map(function (u) {
      return { type: 'url', url: u, name: u.split('/')[2] };
    });
  }

  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
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

  const code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('Anthropic API ' + code + ': ' + res.getContentText().slice(0, 500));
  }

  const data = JSON.parse(res.getContentText());
  const textBlock = (data.content || []).filter(function (b) { return b.type === 'text'; })[0];
  const text = textBlock ? textBlock.text : '';
  return parseJsonLoose_(text);
}

function parseJsonLoose_(s) {
  if (!s) return null;
  const clean = s.replace(/```json\n?|```\n?/g, '').trim();
  try { return JSON.parse(clean); }
  catch (_e) { return { error: 'invalid json from model', raw: clean.slice(0, 300) }; }
}

/* ═══════════════════════════════════════════════════════════════
   getSecret_ — pattern Secrets_Proxy POF
   Injecté automatiquement par gas-deploy. Ne pas modifier.
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
