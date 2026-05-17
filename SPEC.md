# POF Sidebar — Spec fonctionnelle

**Version :** 1.0 · **Date :** 17 mai 2026
**Fichiers :** `Sidebar.html` · `sidebar.css` · `sidebar.js` · `assets/pof-logo-color.svg`
**Contexte :** sidebar Missive pour Plastic Odyssey Factories — pont entre la conversation et le CRM Notion (avec fallback Folk).

---

## 1. Objectif

La sidebar a deux rôles :

1. **Identifier et enrichir** les interlocuteurs de la conversation (Notion = source de vérité, Folk = annuaire secondaire).
2. **Déclencher des actions** liées à la conversation : briefings IA, veille, signature NDA, brief de réponse, et **gestion de tâches** synchronisées avec Notion.

Tout ce qui est saisi (instructions, briefs, tâches) est destiné aux **agents** — humains ou IA — qui traitent la conversation.

---

## 2. Architecture

```
┌─────────────┐    POST text/plain     ┌────────────────┐
│  Sidebar    │ ─────────────────────▶ │  GAS Proxy     │
│  (Missive)  │ ◀───────────────────── │  (token-gated) │
└─────────────┘     JSON {success,…}   └────────────────┘
                                              │
                                  ┌───────────┼───────────┐
                                  ▼           ▼           ▼
                              Notion API   Folk API   Anthropic
```

- **Frontend** : aucune clé API ni ID Notion. Connaît uniquement `PROXY_URL` + `PROXY_TOKEN` public.
- **Proxy GAS** : centralise tous les secrets et appels tiers. Header `text/plain` côté client pour éviter le preflight CORS (que GAS ne gère pas).
- **Notion** : source de vérité (personnes, conversations, tâches, veille).
- **Folk** : annuaire secondaire (fallback).
- **Anthropic** : actions IA (enrichissement, brief, estimation, pré-remplissage).

---

## 3. Layout général

```
┌────────────────────────────────┐
│  [Tâche]  [Contact]  [Conv.]   │  ← segmented control sticky
├────────────────────────────────┤
│                                │
│         pane content           │  ← scrollable
│                                │
├────────────────────────────────┤
│        ▾ POF logo ▾            │  ← footer fixe (subtil, opacity 0.5)
└────────────────────────────────┘
```

- **Tabs** : Notion-style. Pill arrondi gris clair, onglet actif sur fond blanc avec ombre subtile. Chacun a une icône Tabler + label.
- **Footer** : logo POF en `pof-logo-color.svg`, hauteur 14 px, opacity 0.5 → 0.85 au hover.
- **Onglet par défaut** : Contact (cas le plus fréquent).

---

## 4. Onglet **Contact**

### 4.1 Contact principal

Identifié à partir de `from_field` du dernier message. Recherché par email dans Notion via `lookup_person`.

#### États

| État | Affichage |
|---|---|
| **Loading** | spinner + "Recherche dans Notion…" |
| **Trouvé Notion** | Badge teal `✓ Notion`. Bouton "Ouvrir dans Notion". Bouton "Enrichir le contact" (4.3). Textarea "Instructions personne" (4.4). |
| **Pas Notion → Folk recherché** | Spinner "Recherche dans Folk…" |
| **Folk + lien Notion** | Badge teal `✓ Folk + Notion`. Bouton Ouvrir Notion. |
| **Folk seul** | Badge amber `⚠ Folk uniquement`. CTA "Créer la fiche Notion". |
| **Introuvable** | Badge coral `✗ Non trouvé`. CTAs "Créer dans Notion" + lien Folk externe. |
| **Aucun contact** | Inbox icon + message "Aucun contact identifié". |

#### Card structure
- Avatar circulaire 36×36 (initiales blanches sur navy)
- Nom (Poppins 600, navy) + email (Raleway, gris)
- Badge à droite (statut Notion/Folk)

### 4.2 Autres participants (to + cc)

Liste compacte, chacun une ligne :
- Avatar 26×26 (initiales)
- **Pastille de statut** sur l'avatar (bottom-right) : teal `#2BA595` si trouvé Notion, gris sinon. Bordure blanche pour effet "ring".
- Nom + email tronqués
- Flèche `→` apparaît au hover

**Comportement click :**
- Si trouvé Notion → ouvre la page Notion dans un nouvel onglet
- Sinon → propose d'ouvrir Folk pour rechercher

### 4.3 Enrichir le contact

Sous la card, bouton "✨ Enrichir le contact" (chevron `>` qui pivote 90° en open).

Panneau déployé :
- Hint : *"Que cherche-t-on ? (rôle exact, mandats, intérêts publics, contexte sociétaire…)"*
- Textarea libre
- Boutons "Annuler" + "Lancer l'enrichissement"

**Comportement attendu (proxy → IA) :**
1. Lire les instructions
2. Chercher via web + MCP + sources POF
3. Mettre à jour la page Notion du contact
4. Confirmer via toast (push idéal, sinon polling)

### 4.4 Instructions personne

Textarea inline dans la card du contact trouvé Notion. Édite la propriété `person_instructions` sur la page Notion. Visible et utilisable par les agents pour adapter ton et contenu de leurs actions.

Boutons "Annuler" (reset au texte d'origine) + "Sauvegarder" (state feedback : `Sauvegarde…` → `✓ Sauvegardé` → reset après 2s).

---

## 5. Onglet **Tâche**

### 5.1 Actions rapides

5 lignes-actions, chacune avec :
- Icône teal sur fond `#E6F4F2` (24×24 rounded)
- Label Poppins 500
- Flèche `→` (one-shot) ou chevron `>` (ouvre panneau, pivote 90° en open)

| # | Action | Icône (Tabler) | Type | Comportement |
|---|---|---|---|---|
| 1 | **Briefing podcast** | `microphone` | one-shot | Flash la ligne en teal. `brief_podcast` → IA génère un brief podcast à partir de la conv. Toast "Briefing lancé". |
| 2 | **Ajouter à la veille** | `radar` (cercles concentriques) | toggle | Ouvre 3 chips : Concurrents · Stratégiques · Appels à projets. Click chip → `add_to_watch` avec category. Toast "Ajouté à la veille « X »". Chip selected (navy) 1.2s puis reset. |
| 3 | **Estimer l'opportunité** | `target` (cible) | one-shot | `estimate_opportunity`. Résultat livré async via commentaire Missive. Toast "Estimation en cours". |
| 4 | **Briefer une réponse** | `edit` (crayon dans cadre) | toggle | Textarea + bouton "Lancer". `brief_reply` envoie les instructions à l'agent qui rédige. |
| 5 | **Signer un NDA** | `shield-check` | toggle | Formulaire pré-rempli (5.1.1). |

**UX patterns :**
- One panneau ouvert à la fois dans le groupe
- En open : le bouton perd ses bords inférieurs et fusionne avec le panneau (continuité visuelle)
- Animation `slideDown` 180 ms à l'ouverture

#### 5.1.1 Formulaire NDA

Champs (tous obligatoires, point coral `•`) :
- Signataire (text, pré-rempli avec nom du contact principal)
- Email (email, pré-rempli)
- Société (text, déduite de l'email)
- Date d'effet (date, défaut = aujourd'hui)

Validation : si un champ est vide à la soumission → bordure coral + message d'erreur dans le panneau. Sinon `send_nda` → toast "NDA envoyé" + ferme le panneau.

### 5.2 Tâches liées

Section "TÂCHES LIÉES (N)" — liste des tâches Notion rattachées à la conversation.

#### Layout d'une tâche
```
[ ] Nom de la tâche                       [↗]
    [P1] 📅 Demain  👤 Humain
```

- **Checkbox circulaire** 20×20 (border 1.5px gris). Hover : border teal + bg teal très clair. Click → toggle done.
- **Nom** Poppins 500
- **Métadonnées** :
  - Pill priorité `P0` (coral) / `P1` (amber) / `P2` (teal) / `P3` (gris)
  - Deadline relative : "Aujourd'hui" / "Demain" / "Dans 3 j" / "Hier" / "Il y a 2 j" / "18 mai" — en coral si overdue
  - Assignation : 🤖 IA ou 👤 Humain (icônes Tabler `robot` / `human`)
- **Flèche externe** `↗` à droite — ouvre la tâche dans Notion

#### États
- **Done** : opacité 0.55, nom barré, checkbox remplie teal avec ✓ blanc
- **Empty list** : "Aucune tâche liée — créez-en une ci-dessous."

#### Comportement
- Charge à chaque conv via `list_tasks`
- Toggle persiste via `toggle_task`
- Update optimiste : on flip le state, on envoie en arrière-plan

### 5.3 Nouvelle tâche

Formulaire dans une card teintée. Badge teal en haut : "✨ Pré-rempli depuis la conversation".

| Champ | Type | Pré-remplissage |
|---|---|---|
| **Nom** | text | Action courte, ex. *"Répondre à Marc Castagnet sur l'entrée au capital ICS"* |
| **Description** | textarea (3 rows) | Résumé du contexte + recommandation tactique |
| **Deadline** | date | J+3 par défaut, ajusté par l'IA selon le ton (urgence détectée → plus court) |
| **Priorité** | segmented P0/P1/P2/P3 | P1 par défaut, recalibré selon enjeux |
| **Assignation** | segmented IA / Humain | IA par défaut, Humain si engagement contractuel/signature détecté |

Bouton **+ Créer la tâche** (navy, btn-block) :
1. Validation : nom non vide
2. POST `create_task` avec tous les champs
3. La tâche revient avec son `id` + `notion_url`
4. Elle est ajoutée en tête de la liste 5.2
5. Toast "Tâche créée dans Notion"
6. Reset des champs nom/description (pas les défauts prio/deadline)

**Logique de pré-remplissage** (à implémenter côté proxy) :
1. À l'ouverture d'une conv, appel `prefill_task` avec `conversation_id`
2. Le proxy récupère le contenu via Missive API
3. Demande à Claude Haiku un JSON `{name, description, deadline, prio, assignee}`
4. Le frontend hydrate les champs (éditables avant Create)

---

## 6. Onglet **Conv.**

### 6.1 Instructions conversation

Textarea (6 rows) — instructions visibles par les agents pour cette conv spécifique.

Exemple : *"Marc est en négociation avancée. Rester factuel, pas d'engagement tarifaire sans validation Benoît…"*

- Chargé via `lookup_conv` à l'ouverture
- Sauvegardé via `upsert_conv` (crée la page Notion si elle n'existe pas)
- Bouton "Annuler" restaure le texte d'origine
- Bouton "Sauvegarder" : `Sauvegarde…` → `✓ Sauvegardé` (2s) → reset

### 6.2 Missive Conversation ID

Section sous divider — affiche l'ID Missive (font mono, fond gris très clair, bord soft). Utile pour debug ou copier dans Notion manuellement.

---

## 7. Design system

### Tokens utilisés (subset de POF DS v3.3.8)

| Catégorie | Token | Valeur |
|---|---|---|
| **Couleurs** | navy | `#1C1F3B` |
| | teal-dark | `#2BA595` |
| | teal | `#80C7C2` |
| | coral | `#E8546C` |
| | error | `#DC3545` |
| | warning | `#E5A100` |
| | neutral-light | `#F9FCFF` |
| | neutral-mid | `#EAEBED` |
| | gray-400/600 | `#CED4DA` / `#6C757D` |
| **Type** | heading | Poppins (500/600/700) |
| | body | Raleway (400/500) |
| | mono | JetBrains Mono (IDs) |
| **Tailles** | sm/md | 11.5px / 12.5px |
| | labels caps | 10.5px |
| **Rayons** | sm/md/pill | 4px / 8px / 100px |
| **Espacement** | 8px grid | 4/8/12/16/24 |

### Icônes

**Source officielle :** Tabler Icons outline (cf. `docs/ICONS.md` du DS).
**Méthode :** SVG inlinés avec `stroke="currentColor"`, recolorés via cascade CSS.
**Tailles :** 11–16 px selon contexte (badge, meta, action, tab).

Pas d'emoji, pas de `<i class="fa-…">`, pas d'icônes custom. Cohérent avec la règle DS : « Mixing different icon families in the same row is forbidden ».

### Composants réutilisables

- `.btn` + `.btn-primary` / `.btn-outline` / `.btn-ghost`
- `.badge` + `.badge-found` / `.badge-folk` / `.badge-missing` / `.badge-loading`
- `.card` (bg-soft, border-soft, radius-md)
- `.segmented` + `.seg.selected` (control pill style Notion)
- `.chip` (selectable pill)
- `.action-row-btn` + `.action-panel` (collapsible action with inline panel)
- `.task-item` + `.task-check` + `.task-prio.p0..p3` + `.task-meta`
- `.spinner` (animation .65s linear)
- `.toast` (fixed bottom 60px, navy bg, pill, auto-hide 2.2s)
- `.waiting` (empty/loading state avec icône + msg)

---

## 8. Contrat API proxy

Toutes les requêtes : `POST <PROXY_URL>`, body JSON `{action, token, …args}`, header `Content-Type: text/plain;charset=utf-8`.

### Actions de lookup / écriture (existantes)

| Action | Args | Réponse |
|---|---|---|
| `lookup_person` | `{email, name}` | `{found, name, email, notion_page_id, notion_page_url, person_instructions}` |
| `lookup_folk` | `{email, name}` | `{found, notion_page_id?}` |
| `create_person` | `{email, name}` | `{success, notion_page_id, notion_page_url}` |
| `update_person_instructions` | `{page_id, text}` | `{success}` |
| `lookup_conv` | `{missive_conversation_id}` | `{instructions, notion_page_id}` |
| `upsert_conv` | `{missive_conversation_id, text, page_id?}` | `{success, notion_page_id}` |

### Actions à implémenter (UI prête, stubs mock)

| Action | Args | Réponse |
|---|---|---|
| `brief_podcast` | `{conversation_id}` | `{success}` |
| `add_to_watch` | `{conversation_id, category}` ∈ `concurrents` \| `strategiques` \| `appels-a-projets` | `{success}` |
| `estimate_opportunity` | `{conversation_id}` | `{success}` |
| `brief_reply` | `{conversation_id, instructions}` | `{success}` |
| `send_nda` | `{conversation_id, signataire, email, societe, date}` | `{success}` |
| `enrich_contact` | `{conversation_id, instructions}` | `{success}` |
| `list_tasks` | `{conversation_id}` | `{tasks: [{id, name, prio, assignee, deadline, done, notion_url}]}` |
| `create_task` | `{conversation_id, name, description, deadline, prio, assignee}` | `{success, task}` |
| `toggle_task` | `{id, done, conversation_id}` | `{success}` |
| `prefill_task` *(à ajouter)* | `{conversation_id}` | `{name, description, deadline, prio, assignee}` |

---

## 9. États & Feedback

### Loading
- **Spinner inline** dans la card / le badge / le bouton
- **Skeleton** : non utilisé dans cette version

### Confirmation
- **Toast** bottom-center, pill navy, auto-hide 2.2s
- **State button** : `Sauvegarde…` → `✓ Sauvegardé` → reset après 2s

### Erreur
- **Champs** : bordure coral + halo rouge + message field-error
- **Bouton** : `✗ Erreur` rouge, redevient cliquable pour retry
- **Network** : `{error: 'proxy 500'}` propagé, toast d'erreur

### Empty states
- **Pas de contact** : icône inbox + message centré
- **Pas de participants** : section masquée
- **Pas de tâches** : message texte discret

---

## 10. Mode preview / mock

`Sidebar.html` détecte l'absence du SDK Missive (preview hors prod) et bascule en **mock mode** :

- **Mock SDK Missive** : simule une conv avec Marc Castagnet (`from_field`) + Esther Wong + Thibault Kheres + Benoît Blancher (cc).
- **Mock proxy** `__pofMock` : répond à toutes les actions avec des fixtures cohérentes.
  - Lookups : 700 ms de délai
  - Writes : 300 ms
  - Marc → trouvé Notion avec `person_instructions`
  - 2 autres "POF" → trouvés Notion
  - Esther → pas trouvée
  - 2 tâches mock dans `list_tasks` (une P1 Humain en cours, une P2 IA done)
- **State switch** : `window.__POF_DEMO_STATE = 'found' | 'folk' | 'missing' | 'loading' | 'empty'`

Permet de :
- Reviewer le design sans déployer
- Démo à des collègues
- Tester chaque état de la lookup chain sans toucher à Notion

Le SDK Missive prod n'est chargé que si `__POF_MOCK` est `false`.

---

## 11. Cohérence visuelle

Inspirations explicites :

- **Missive** : compacité, sidebar étroite, hierarchy verticale, badges discrets, sticky tabs.
- **Notion** : segmented control en pill, labels small caps gris très clair, hairlines plutôt que box shadows, cards `bg-soft`, focus rings teal subtils.
- **POF DS** : Poppins/Raleway, navy primary, teal accents (succès, info), coral pour urgence, 8px grid, pas de gradients sur les composants UI.

---

## 12. Fichiers

```
Sidebar.html         markup + mock + boot
sidebar.css          tokens + composants (tabs, cards, badges, segmented, task)
sidebar.js           SDK Missive, proxy calls, render, task backlog, enrich
assets/
  pof-logo-color.svg  logo footer
SPEC.md              ce document
```

Cache-busting : `?v=N` sur les imports de `sidebar.css` et `sidebar.js` pour forcer le rechargement après chaque release.

---

## 13. Décisions ouvertes / Next

1. **Pré-remplissage tâche** : sync (block) ou async (placeholder + hydratation) ? → recommandation : **async** avec un placeholder neutre + hydratation quand prêt (max 2s d'attente).
2. **Catégories de veille** : 3 suffisent-elles, ou ajouter *Partenaires*, *Clients*, *Fournisseurs* ?
3. **Modèles NDA** : un seul template, ou plusieurs (one-way, mutual, investisseur) ?
4. **Filtres tâches** : afficher toutes les done indéfiniment, ou auto-archive après N jours, ou toggle Open/Done/All ?
5. **Toggle replier les actions rapides** : demandé mais pas encore implémenté. À ajouter via un petit chevron à côté du label "ACTIONS RAPIDES".
6. **Notifications de complétion** : toast suffit pour les writes immédiats, mais pour les jobs async (enrichissement, estimation), faut-il un système de "résultats en attente" persistant ?
7. **Onglet par défaut** : reste Contact, ou bascule sur Tâche si des tâches existent déjà sur la conv ?
8. **Bouton Enrichir hors Notion** : actuellement seulement quand le contact EST dans Notion. À étendre pour pré-créer une fiche enrichie ?
9. **Permissions** : tous les utilisateurs Missive peuvent-ils déclencher tous les briefs ? Filtrage par rôle ?
10. **Audit** : qui a déclenché quelle action, quand ? Log dans Notion ?
