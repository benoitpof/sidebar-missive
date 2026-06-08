# Spec — Recherche Folk : réconciliation manuelle + migration API REST

**Statut** : draft à valider · **Auteur** : Benoît / Claude · **Cible** : Missive Sidebar v1.13
**Composants touchés** : frontend `sidebar.js` + GAS `missive-sidebar-proxy` (Code.gs)

---

## 1. Contexte et problème

La sidebar affiche « Non trouvé » sur des contacts qui **existent pourtant dans Folk**.
Cas de référence : Yabissi Rebecca Tanoh (`rebecca.tanoh@endeavor…`), présente dans le groupe
Folk `05426e10-45b5-4784-b898-dc46a8cbc4c5`, mais invisible côté sidebar.

### Comment la recherche marche aujourd'hui

Deux couches indépendantes.

**Couche 1 — bouton « Chercher dans Folk »** (`sidebar.js:574`)
Lien statique vers `https://app.folk.app/contacts`. Ne transmet ni nom ni email. L'humain
retape la recherche à la main.

**Couche 2 — recherche de fond `lookup_folk`** (`Code.gs:1580`, `handleLookupFolk_`)
Chemin : GAS → Claude (`callClaude_`) → **MCP Zapier** (`MCP_FOLK = mcp.zapier.com/api/mcp/a/13565407`)
→ action Folk « Find a Person ». Si match, badge `Folk + Notion` ou `Folk uniquement`.

### Diagnostic (confirmé par test)

L'action Zapier « Find a Person » a trois limites structurelles, **non contournables par le prompt** :

1. **Match exact uniquement** sur full name OU email. Inversion prénom/nom, accent, espace → échec.
2. **Une recherche = un seul groupe** (défaut « All contacts », ou deviné par le LLM).
3. **Périmètre limité aux groupes partagés avec la connexion Zapier.** Test : en ciblant le groupe
   `05426e10`, Zapier ne sait pas le mapper et propose une liste fermée d'~30 groupes connus. Le
   groupe de Rebecca n'y est pas. La recherche « All contacts » remonte vide elle aussi.

**Cause racine** : le contact vit dans un groupe hors du périmètre que la connexion API peut voir.
C'est une limite de configuration Folk + une limite de l'action Zapier, pas un bug de code.

---

## 2. Partie A — Réconciliation manuelle par lien Folk

> Objectif : permettre à l'humain de coller le lien Folk d'un contact que l'API ne voit pas,
> pour réconcilier la fiche (créer/lier la fiche Notion + stocker l'ID Folk). Le navigateur
> utilise la session Folk de Benoît, donc voit TOUS les groupes même quand l'API est aveugle.

### 2.1 UX

Dans les états `Non trouvé` et `Folk uniquement` de la carte Contact, ajouter un bloc repliable :

```
┌ Lien Folk introuvable ? ─────────────┐
│ [ Coller le lien Folk du contact… ]   │
│                      [ Réconcilier ]  │
└───────────────────────────────────────┘
```

Au submit : parse l'URL, extraction `folk_id` + `networkId` + `groupId`, appel backend, feedback
visuel (badge → `Folk + Notion`, lien cliquable vers la fiche).

### 2.2 Frontend (`sidebar.js`)

- Parser d'URL Folk (tolérant aux deux formats `/groups/{g}/people/{id}` et `/people/{id}`) :

```js
function parseFolkUrl(url) {
  const net  = url.match(/network\/([0-9a-f-]{36})/i);
  const grp  = url.match(/groups\/([0-9a-f-]{36})/i);
  const pers = url.match(/people\/([0-9a-f-]{36})/i);
  if (!pers) return null;
  return { folk_id: pers[1], network_id: net?.[1] || null, group_id: grp?.[1] || null, url };
}
```

- Nouvel appel : `callProxy('reconcile_folk', { email, name, ...parsed })`.
- Au retour `{ok, notion_page_id, folk_url}` : remplacer le badge par le lien `Folk + Notion`
  (réutiliser le rendu existant lignes 588-594) et retirer `#fallback-actions`.

### 2.3 Backend (`Code.gs`) — nouvel endpoint `reconcile_folk`

Args : `{email, name, folk_id, folk_url, network_id?, group_id?, page_id?}`

Logique :
1. Si `page_id` absent → `create_person({email, name})` pour obtenir la fiche Notion.
2. Écrire les champs Folk sur la fiche (les champs existent déjà, cf. `Code.gs:341-342`) :
   - `Lien Folk` (type `url`) ← `folk_url`
   - `ID folk` (type `rich_text`) ← `folk_id`
   - Réutiliser `add_field_to_notion` / le helper d'update de propriété existant.
3. Retour `{ok:true, notion_page_id, folk_url, folk_id}`.

Routing : ajouter `case 'reconcile_folk': result = handleReconcileFolk_(body); break;` près de `Code.gs:72`.

### 2.4 Effort
Petit. Frontend ~30 lignes, backend ~25 lignes, réutilise create_person + add_field_to_notion.
Aucun nouveau secret. Livrable indépendant, déployable seul.

---

## 3. Partie B — Migration `lookup_folk` vers l'API REST Folk

> Objectif : remplacer le combo Claude + Zapier (flou, exact-match, mono-groupe, billing Zapier)
> par un appel direct à l'API publique Folk, recherche workspace en une requête, matching `like`.

### 3.1 Capacités API (vérifiées sur developer.folk.app)

- **Base** : `https://api.folk.app/v1`
- **Auth** : header `Authorization: Bearer <FOLK_API_TOKEN>`
- **Recherche people** : endpoint `/v1/people` avec filtres natifs.
  Syntaxe confirmée : `filter[emails][like]={email}&filter[fullName][like]={name}&combinator=or`
- **Opérateurs** : `eq`, `not_eq`, `like`, `not_like`, `empty`, `not_empty`.
  → `like` = match partiel (résout le problème exact-match) ; `combinator=or` = email OU nom en 1 appel.
- **Scope** : workspace-wide côté endpoint, **pagination** sur les listes.
- **Get one** : récupération par id (à confirmer chemin exact `/v1/people/{id}` via `llms.txt`).

### 3.2 Pré-requis ops (bloquants)

- [ ] **Token API Folk** provisionné dans Doppler (ex. `FOLK_API_TOKEN`), lu via `getSecret_()`
      (pattern Secrets_Proxy POF, jamais hardcodé).
- [ ] **Vérifier le scope du token** : confirmer qu'une clé API Folk voit bien TOUS les groupes
      (ou couvrir explicitement le groupe de Rebecca). Si la clé est elle aussi group-scoped,
      c'est la cause racine qui revient → étendre le périmètre à la création de la clé.

### 3.3 Backend — réécriture `handleLookupFolk_`

Remplacer l'appel `callClaude_(..., [MCP_FOLK])` par un `UrlFetchApp.fetch` direct :

```js
function handleLookupFolk_(body) {
  var email = String(body.email || ''), name = String(body.name || '');
  var token = getSecret_('FOLK_API_TOKEN');
  var qs = [];
  if (email) qs.push('filter[emails][like]='   + encodeURIComponent(email));
  if (name)  qs.push('filter[fullName][like]=' + encodeURIComponent(name));
  qs.push('combinator=or');
  var res = UrlFetchApp.fetch('https://api.folk.app/v1/people?' + qs.join('&'), {
    method: 'get',
    headers: { 'Authorization': 'Bearer ' + token },
    muteHttpExceptions: true
  });
  // … parse, prendre le 1er résultat, construire folk_url depuis l'id + networkId connu,
  //   croiser avec Notion (lookup par email) pour notion_page_id.
  // retour identique au contrat actuel : {found, folk_id, notion_page_id, name, email, folk_url}
}
```

- **Contrat de retour inchangé** (le frontend ne bouge pas) + ajout `folk_url` pour le lien direct.
- Garder `MCP_FOLK` en fallback optionnel le temps de valider, puis le retirer (et la dépendance Zapier).

### 3.4 Bénéfices
Un seul token, recherche tout-workspace, matching tolérant, plus de couche LLM ni de billing Zapier
sur chaque lookup, latence réduite.

### 3.5 Risques / points à vérifier
- Scope de la clé API (cf. 3.2) — **le risque principal** : si group-scoped, la migration ne suffit pas.
- Chemin exact get-by-id et forme exacte de la réponse `/v1/people` (champs `emails`, `id`, etc.).
- Construction de l'URL fiche : `app.folk.app/apps/contacts/network/{networkId}/people/{id}` — à
  valider (avec ou sans segment `/groups/`).
- Rate limits API Folk (non documentés ici).

---

## 4. Séquencement proposé

1. **A — réconciliation manuelle** (livrable immédiat, débloque le cas Rebecca tout de suite).
2. **B.3.2 — provisionner + vérifier le token Folk** (action ops, débloque B).
3. **B — migration REST** (remplace la couche de fond, supprime la dépendance Zapier).

A et B sont indépendants : A marche même sans B, B améliore A (enrichissement auto via get-by-id).
