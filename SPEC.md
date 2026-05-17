# POF Sidebar — Spec fonctionnelle

**Version :** 3.0 · **Date :** 17 mai 2026
**Fichiers :** `Sidebar.html` · `Sidebar v3.html` · `sidebar.css` · `sidebar.js` · `assets/pof-logo-color.svg` · `assets/pof-logo-variant-1.svg`
**Contexte :** sidebar Missive pour Plastic Odyssey Factories — pont entre la conversation et le CRM Notion (avec fallback Folk), couche d'agents IA pour enrichissement, synthèse, briefing podcast, brouillon de réponse, signature de documents et gestion de tâches.

---

## 1. Objectif

La sidebar a trois rôles :

1. **Identifier et enrichir** les interlocuteurs de la conversation (Notion = source de vérité, Folk = annuaire secondaire, IA = enrichissement signature).
2. **Synthétiser** le contenu : résumé du mail, pièces jointes commentées, sources mentionnées, note de situation éditable, timeline unifiée (passé + futur).
3. **Déclencher des actions** : briefing podcast (multi-scope), estimation d'opportunité, brouillon de réponse, suite signature (analyse juridique / signature DocuSign / génération NDA), feedback agent, gestion de tâches Notion.

Tout ce qui est saisi ou capturé (instructions, briefs, tâches, statut) est destiné aux **agents** — humains ou IA — qui traitent la conversation.

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
- **Proxy GAS** : centralise tous les secrets et appels tiers. Header `text/plain` côté client pour éviter le preflight CORS.
- **Notion** : source de vérité (personnes, conversations, tâches, veille, rapports de triage, situations).
- **Folk** : annuaire secondaire (fallback).
- **Anthropic** : actions IA — enrichissement, synthèse, analyse contenu, briefing podcast, brief réponse, estimation, ask-agent, feedback.

### Cache local Notion (`dump_persons`)
Au boot, le frontend appelle `dump_persons` une fois, met l'index personnes en cache (sessionStorage, TTL court), puis sert les `lookup_person` localement quand possible. Fallback proxy sinon. Permet une UX quasi-instantanée sur les contacts déjà connus.

---

## 3. Deux variantes packagées

### `Sidebar.html` — 4 onglets
`Contenu` · **`Contact`** *(actif par défaut)* · `Conv.` · `Actions`
Variante 4-onglets : onglet `Contenu` dédié à l'analyse du mail courant (résumé, PJ, sources), onglet `Conv.` réservé aux instructions conversation. Empty shell (§5) intégré dans le markup.

### `Sidebar v3.html` — 3 onglets, Conv. fusionné
`Contact` · **`Conv.`** *(actif par défaut)* · `Actions`
Variante en cours de prod : l'onglet `Conv.` absorbe le contenu du mail (instructions + résumé éditable + PJ + sources + bouton briefing podcast unique). Onglet `Contenu` supprimé. **Pas d'empty-shell** dans cette variante.

**Les deux variantes partagent** :
- `sidebar.css` et `sidebar.js`
- Le **footer 5 boutons** identique : Podcast · Estimer · Réponse · Signature · Feedback
- Le **agent dock** (§10)
- L'onglet `Actions` (situation note + timeline unifiée)
- L'onglet `Contact`

Le JS détecte la variante via la présence des nœuds DOM (`#summary-edit`, `#podcast-launch-btn`, `#empty-shell`, etc.).

---

## 4. Layout général

```
┌────────────────────────────────┐
│  [Contact] [Conv.] [Actions]   │  ← segmented control sticky
├────────────────────────────────┤
│                                │
│         pane content           │  ← scrollable
│                                │
├────────────────────────────────┤
│  ▾ Agent toggle (collapsé) ▾   │  ← agent chat dock (§10)
├────────────────────────────────┤
│  🎙  💰  ✏️  ✍️  💬           │  ← footer 5 actions (icônes Tabler)
└────────────────────────────────┘
```

- **Tabs** : Notion-style, pill arrondi gris clair, onglet actif fond blanc + ombre subtile.
- **Agent dock** : repliable, attaché en bas (cf. §10).
- **Footer actions** : 5 boutons fixes. Ouvrent une *footer-sheet* slide-up pour les flows requérant un formulaire (cf. §9.4 / §11).

---

## 5. Empty shell *(Sidebar.html uniquement)*

État affiché quand `body.no-conversation` (aucune conversation sélectionnée). Remplace tabs + scroll + footer.

```
┌────────────────────────────────┐
│       [icône inbox]            │
│                                │
│  Sélectionner une conversation │
│  Choisis un mail à gauche…     │
│                                │
│  ┌──────────────────────────┐  │
│  │ ✨ Lancer le triage auto │  │ ← CTA navy
│  │   Analyse, archive…   → │  │
│  └──────────────────────────┘  │
│  ⓘ L'agent ne traite que…       │
│                                │
│  Dernier triage    via Notion  │
│  ┌──────────────────────────┐  │
│  │ Rapport — 17 mai     ↗  │  │
│  │ Aujourd'hui · 08:42      │  │
│  │ ─────────────────────    │  │
│  │ 47 triés │ 32 arch. │ 8 P1│ │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

- **CTA triage** : `run_triage`, états loading → done (teal-deep). Affiche un spinner sur la flèche pendant l'exécution.
- **Card rapport** : appelle `last_triage_report` au montage. Stats `triaged` / `archived` / `priority_1`. Lien direct vers la page Notion du rapport.

Sidebar v3 ne porte pas l'empty shell — la variante est conçue pour être affichée systématiquement (l'agent dock + situation note restent utiles même sans conv active).

---

## 6. Onglet **Contact**

### 6.1 Contact principal

Identifié à partir de `from_field` du dernier message. Recherché via index local, puis `lookup_person` (proxy).

#### États

| État | Affichage |
|---|---|
| **Loading** | spinner + "Recherche dans Notion…" |
| **Trouvé Notion** | Badge teal `✓ Notion`, étoile VIP, fiche enrichie (6.2) |
| **Pas Notion → Folk recherché** | Spinner "Recherche dans Folk…" |
| **Folk + lien Notion** | Badge teal `✓ Folk + Notion` |
| **Folk seul** | Badge amber `⚠ Folk uniquement` + CTA "Créer la fiche Notion" |
| **Introuvable** | Badge coral `✗ Non trouvé` + CTAs "Créer dans Notion" / Folk externe |
| **Aucun contact** | Icône inbox + message centré |

#### Card header
- Avatar 36×36 (initiales blanches sur navy)
- Nom (Poppins 600, navy) + email tronqué
- **Étoile VIP** (cliquable, `toggle_vip`) — gris si non-VIP, gold `#F2B400` si VIP, animation `vipPop` au toggle
- Badge statut Notion (lien externe vers la page)

### 6.2 Fiche enrichie (champs Notion + IA)

Sous la card, série de `contact-field` (icône + label small caps + valeur) :

| Champ | Source | Affichage |
|---|---|---|
| **Société** | Notion ou IA (signature) | Texte. Si IA → italique préfixé `~` + badge violet `IA détectée` (`.ai-found-badge`) + bouton "Ajouter à Notion" pointillé |
| **Titre / Rôle** | Notion ou IA | Idem |
| **Tags** | Notion uniquement | Pills `.cf-tag` (steel sur neutral-mid) |
| **Téléphone** | Notion ou IA | Police mono. Bouton WhatsApp circulaire (vert `#25D366`) à droite. Si IA → `~` + badge IA détectée + "Ajouter à Notion" |
| **Réunions** | Notion (relation) | Liste compacte (titre + date mono + arrow au hover, ouvre Notion) |

#### Logique AI-detected
Le proxy renvoie `phone_source` / `title_source` / `company_source` à `'email_signature'` ou `'notion'`. Si `_source !== 'notion'`, l'UI ajoute le visuel "détectée" et le bouton de confirmation `add_phone_to_notion` / `add_field_to_notion`. Le bouton sauve la valeur sur la page Notion et retire l'état "détectée".

### 6.3 Enrichir le contact

Bouton "✨ Enrichir le contact" sous la card (icône sparkles seule — pas d'icône supplémentaire à droite). Panneau déployé :
- Textarea libre : *"Que cherche-t-on ? (rôle exact, mandats, intérêts publics…)"*
- Boutons Annuler / Lancer
- `enrich_contact` → l'IA cherche (web + sources internes) et met à jour la page Notion. Toast de confirmation.

### 6.4 Instructions personne

Textarea inline éditant la propriété `person_instructions` Notion via `update_person_instructions`. Pattern Sauvegarde… / ✓ Sauvegardé / reset 2s. Si contenu suggéré par l'IA (`suggested: true`), affichage italique muted ; au focus, reset au-prêt-à-écrire.

### 6.5 Autres participants

Liste compacte des `to_fields` + `cc_fields` du dernier message. Chacun :
- Avatar 26×26 + **pastille de statut** (teal trouvé Notion / gris sinon) avec ring blanc
- Nom + email tronqués
- Mini étoile VIP (apparaît si trouvé Notion, `toggle_vip`)
- Flèche `→` au hover

**Click :** promeut le participant comme nouveau contact principal (`promoteParticipant`) — l'ancien main retombe dans la liste.

**Mode étroit** : full layout 1 col, divider visible.
**Mode large (≥ 460px)** : 2 col `2fr 1fr`, participants en aside sticky, avatars compacts 22×22, email/arrow masqués.

---

## 7. Onglet **Contenu** *(Sidebar.html uniquement)*

### 7.1 Résumé du mail
Bloc `.mail-summary` (bg-soft, border-soft, radius-md). Caption `via IA` (purple — `--pof-ai`).
Bouton compact `Briefing podcast` à droite du label (mini-podcast-btn pill teal).
Chargé via `analyze_content`. Spinner pendant le calcul.

### 7.2 Pièces jointes
Liste `.attachment` (icône type colorée, nom, taille, summary 2 lignes max). Footer ligne :
- Bouton `Briefing podcast` (att-podcast) — déclenche `brief_attachment`
- Pill Notion (ouvre le document)

Couleurs de file-type :
- PDF : `#FCE6EA` / `#A02333`
- DOC : `#EAF1FB` / `#3B6FB6`
- XLS : `#E8F6EE` / `#1E9D52`
- PPT : `#FFF4DC` / `#8A6300`
- IMG : `--pof-neutral-mid` / `--pof-steel`
- Other : neutral-mid / text-muted

### 7.3 Sources identifiées
Liste `.source-item` (LinkedIn ou web). Pour chaque source :
- Icône ronde teintée selon type (`#0A66C2` LinkedIn, steel pour web)
- Nom (lien) + sous-titre + meta
- Bouton **Suivre** (LinkedIn) / **Ajouter à la veille** (web) — `follow_source`. État *watched* (teal).
- Bouton `↗` toujours visible — ouvre l'URL directement sans toggle veille.

---

## 8. Onglet **Conv.**

### Variante Sidebar.html *(simple)*
- Textarea instructions conversation (6 rows)
- Boutons Annuler / Sauvegarder
- Section ID Missive (mono, fond gris)

### Variante Sidebar v3.html *(fusion complète)*
1. **Instructions conversation** (textarea 5 rows + save bar)
2. **Résumé de la conversation** — éditable inline (`#summary-edit textarea`), avec **checkbox `Podcast`** (`#pod-incl-summary`, checked par défaut) pour l'inclure dans le briefing. Hint en italique muted : *"Tu peux éditer ce résumé pour briefer le podcast…"*
3. **Pièces jointes** — chaque ligne porte une checkbox `Podcast` (`.att-pod-toggle`, identique visuellement à `.pod-include`)
4. **Bouton "Lancer le briefing podcast"** — gros bouton plein navy gradient (`.btn-podcast-big`), sous-titre dynamique `Résumé + N pièce(s) jointe(s)` (`updatePodcastLaunchSub`)
5. **Sources identifiées** (idem §7.3)
6. **ID Missive**

Pattern instructions (chargement / save) : identique dans les deux variantes, via `lookup_conv` / `upsert_conv`.

---

## 9. Onglet **Actions**

Layout 2-col (≥ 540px) : situation note à gauche (sticky), timeline unifiée à droite. 1-col en étroit.

### 9.1 Note de situation pinned (`.pinned-note`)

Card en haut à gauche. Régénérable.

#### Header
- Icône target teal + titre `SITUATION`
- Bouton 🎙 mini-podcast (déclenche `brief_podcast` scope=`situation`)
- Stamp `Maj il y a Xh`
- Bouton 🔄 régénération (`regen_situation`, animation rotation)
- Bouton **`ASK`** (navy pill) → ouvre/focus l'agent dock (§10) — n'ouvre plus de sheet modal

#### Status éditable (rich-text)
Block `contenteditable` (`#pn-status-editable`) avec formatage clavier :
- ⌘B → gras
- ⌘I → italique
- ⌘L → toggle liste à puces

Au focus, hint footer apparaît : `⌘B gras · ⌘I italique · ⌘L liste`.
Sauvegardé via `update_situation` (debounced).

Rendu structuré côté serveur :
- Headline (Poppins 600, balance)
- Bullets `label: value` (label gras + valeur prose)

#### Section RISQUES
Liste compacte. Chaque risque : icône (cible/calendar/user/shield) + texte. Couleur de l'icône selon sévérité :
- `high` → coral
- `medium` → amber `#B07A1E`
- `low` → muted

#### Section À FAIRE (todos)
Liste mixte de tâches **planifiées** (`TaskState.tasks`, déjà en Notion) et **proposées** (`TaskState.proposed`, suggérées par l'IA, case grise pointillée).

Chaque todo :
- Row pliable `.pn-todo` (style dashed si `.proposed`)
- Ligne : checkbox 14px + texte + (priority pill optionnelle) + actions + chevron + lien Notion `↗`
- **Actions row** :
  - Pour planifiée : `↗` lien Notion (pill grise, flèche toujours visible — pas d'icône Notion redondante)
  - Pour proposée : `✓` accepter (création réelle via `create_task`) / `✕` ignorer (`dismissProposed`)
- **Expand** → édition inline complète :
  - Description (si fournie par l'IA)
  - Échéance (date input)
  - Priorité (segmented P0/P1/P2/P3)
  - Assignation (segmented 🤖 IA / 👤 Humain)
  - Tous les champs envoient `update_task` débouncé. Toast confirmation par champ.

Bouton `+ Ajouter une tâche` en bas → form inline minimal (titre + prio + save). Édition inline du nom de tâche au clic (contenteditable, Enter pour valider, Escape pour annuler).

### 9.2 Aside : Timeline unifiée

**Une seule liste `#timeline-list`** contenant futur + passé (les dates clés ne sont plus dans un bloc séparé).

#### Ordre de rendu
1. **Header `À venir`** (`.tl-day-sep-future`) si événements futurs présents
2. **Items futurs** triés ascendant (le plus proche en premier) — style visuel distinct : meta `Dans X j · time`, accent teal
3. **Headers de bucket relatif** pour le passé : *Aujourd'hui · Hier · Cette semaine · Ce mois-ci · `Mois Année`*
4. **Items passés** triés descendant (le plus récent en premier)

Caption `via Notion` (timeline-source, neutre muted — distinct de `via IA`).

#### Types d'événements et couleurs des nodes

| Type | Couleur | Background ring | Label |
|---|---|---|---|
| `email` | `#3B6FB6` | `#EAF1FB` / `#C5D8EF` | Email |
| `whatsapp` | `#1E9D52` | `#E8F6EE` / `#BDE5CC` | WhatsApp |
| `linkedin` | `#0A66C2` | `#E7F1F9` / `#C5D8EF` | LinkedIn |
| `visio` | `--pof-teal-deep` | `#E6F4F2` / `#BCDED9` | Note de réunion |
| `meeting` | `--pof-teal-deep` | `#E6F4F2` / `#BCDED9` | Réunion *(futur)* |
| `note` | `--pof-steel` | `--bg-soft` / `--pof-neutral-mid` | Note Notion |
| `nda` | `--pof-navy` | `--bg-soft` / `--pof-gray-400` | NDA signé |
| `mou` | `#A35A1F` | `#FAEEDF` / `#ECC8A4` | MOU |
| `contrat` | `#8A6300` | `#FFF4DC` / `#ECD9A7` | Contrat |
| `task` | `--text-muted` | `--bg-soft` / `--border` | À faire *(futur)* |

**Item passé** : node + title + time + summary (clamp 2 lignes ; 3 pour visio ; ~6 pour note Notion qui s'affiche avec un encadré bg-soft + border-left gray).
**Item futur** : node + title + meta `Dans X j · time · description`, body sans fond, pas de summary.

Liens : chaque item porte une pill `Notion` (label seul, **sans logo**, flèche toujours visible — voir §13 composant `.notion-pill`).

---

## 10. Agent chat dock

Composant collapsible attaché en bas (entre scroll et footer). Toujours visible — c'est l'interface principale d'interrogation de l'agent.

### États
- **Collapsed** (défaut) : seul le toggle pill visible (dot purple + `AGENT` + preview + chevron). Click → expand.
- **Open** : thread visible (`max-height: 260px`) + composer (textarea + mic + send).

### Thread
- Empty state : *"L'agent a accès à la conversation, au contact et à la situation…"*
- Messages : bubbles user (navy aligné droite) / agent (bg-soft + border, avatar dégradé violet). Animation `agentFade` à l'arrivée.
- Thinking : trois dots animés (`agentBounce`) pendant que l'agent répond

### Composer
- **Textarea** auto-resize (max 100px). Submit sur Enter ; Shift+Enter = saut de ligne.
- **Bouton mic** (`agent-mic`) — actuellement **démo simulée** (pas de WebSpeech réel câblé) : déclenche un état `listening` (coral + halo pulsant), remplit un prompt d'exemple après 1.5s.
- **Bouton send** (`agent-send`) navy — `ask_agent` → réponse texte + éventuelles `proposed` tâches qui s'injectent dans la situation note.

### Preview ligne
- Mise à jour avec le dernier message agent (extrait tronqué à 70 chars)
- Compteur de messages non lus (pill coral) en mode collapsed

### Entrées
- Bouton **ASK** dans la situation note → ouvre + focus le dock
- Click direct sur le toggle pill → ouvre / ferme

---

## 11. Footer actions (5 boutons)

Les deux variantes partagent le **même footer 5 boutons** :

🎙 **Podcast** · 🎯 **Estimer** · ✏️ **Réponse** · ✍️ **Signature** · 💬 **Feedback**

Layout : `display: grid` 5 colonnes équilibrées, icône Tabler 17px + label uppercase 9px. États `hover` (bg-soft), `active` (teal-deep tint), `done` (teal-deep tint persistant 4s, indique action déjà déclenchée pour cette conv).

### 11.1 Podcast briefing (multi-scope)
Action one-shot (`brief_podcast`) avec un `scope` selon le contexte :
- Bouton footer → scope=`full` (toute la conv)
- Bouton mini sur résumé mail → scope=`mail`
- Bouton 🎙 sur situation note → scope=`situation`
- Bouton sur chaque PJ → scope=`attachment` + `attachment_id`
- Gros bouton "Lancer le briefing podcast" v3 → scope=`fused`, payload `include_summary` + `attachment_ids`

Toast `Briefing envoyé`. Le résultat (audio) est livré async via Notion + commentaire Missive.

### 11.2 Estimer l'opportunité
One-shot `estimate_opportunity`. Toast `Estimation en cours — résultat en commentaire`.

### 11.3 Briefer une réponse
Ouvre `footer-sheet` (cf. 11.6) avec textarea instructions. `brief_reply`. L'agent rédige un draft Missive.

### 11.4 Signature & documents juridiques
Ouvre sheet avec layout 2-col :

- **Gauche — 3 actions empilées** :
  - **Analyse juridique** (`legal_analysis`) — lecture des documents, identification des points sensibles, clauses, risques
  - **Signature des documents** (`sign_documents`) — envoi à DocuSign avec les signataires identifiés
  - **Générer un NDA** (`generate_nda`) — création d'un NDA standard côté POF, injecté dans la conversation
- **Droite** : aside `Pièces jointes à inclure` — chaque PJ de la conv en checkbox

Click sur une action → `signature_action` avec `action` + `attachment_ids` sélectionnés. Toast personnalisé selon l'action.

### 11.5 Feedback
Sheet avec textarea libre. `submit_agent_feedback`. Permet au user de signaler bugs / corrections / règles de tri à ajuster à l'équipe IA.

### Footer sheet
Slide-up panel positionné au-dessus du footer. Backdrop semi-transparent + blur léger. Header (icône + titre + close), corps scrollable. Animation `transform: translateY` + opacity. Ferme sur backdrop click, bouton close, ou Esc.

---

## 12. Briefing podcast unifié (v3 — Conv. fused)

L'idée de v3 : un seul gros bouton final qui agrège tout ce que l'utilisateur a coché dans le panneau Conv.

```
☑ Inclure le résumé dans le podcast
☑ Pièce jointe : Term-sheet ICS v3.pdf
☐ Pièce jointe : ICS-portfolio.pdf
☑ Pièce jointe : Profil-Marc.docx
↓
[Lancer le briefing podcast]
Résumé + 2 pièce(s) jointe(s)
```

- Par défaut : résumé coché, seule la **PJ la plus lourde** cochée (sélection automatique au render).
- Sous-titre du gros bouton se met à jour en live (`updatePodcastLaunchSub`).
- État `done` : icône → check, label → "Briefing lancé", reste désactivé 2s puis ré-armé.

Visuel des checkboxes : `.pod-include` (label level) et `.att-pod-toggle` (attachment level) partagent **un seul bloc CSS** — strictement identiques (pill 12×12, teal-dark coché, fond teal soft).

---

## 13. Design system

### Tokens (`:root` dans `sidebar.css`)

| Catégorie | Token | Valeur | Usage |
|---|---|---|---|
| **POF brand** | `--pof-navy` | `#1C1F3B` | Texte primaire, primary buttons, badges utilisateur |
| | `--pof-teal` | `#80C7C2` | Accents secondaires, success light |
| | `--pof-teal-dark` | `#2BA595` | Focus rings, checkboxes coché, success |
| | `--pof-teal-deep` | `#09414A` | Hover badges, CTA done |
| | `--pof-coral` | `#E8546C` | Urgence, today, agent dot collapsed, P0 accent |
| | `--pof-steel` | `#435D74` | Texte neutre secondaire |
| | `--pof-light-steel` | `#5F7D95` | Icônes contact-field |
| **Status** | `--pof-success` | `#28A745` | Réservé |
| | `--pof-warning` | `#E5A100` | Réservé |
| | `--pof-error` | `#DC3545` | Erreur form, P0 |
| **🟣 AI accent** | `--pof-ai` | `#6B3FBF` | **RÉSERVÉ STRICT IA** — `.ai-wand`, `.ai-source`, `.ai-found-badge`, agent avatar. Jamais sur UI neutre, file-type, ou statut. |
| | `--pof-ai-soft` | `#F1E9FB` | Background du badge IA détectée uniquement |
| **Neutres** | `--pof-white` | `#FFFFFF` | |
| | `--pof-neutral-light` | `#F9FCFF` | bg-soft |
| | `--pof-neutral-mid` | `#EAEBED` | borders, dividers, tags muted |
| | `--pof-gray-400` | `#CED4DA` | Borders inputs |
| | `--pof-gray-600` | `#6C757D` | text-muted |
| **Sémantiques** | `--bg`, `--bg-soft`, `--bg-tinted` | dérivés | |
| | `--border`, `--border-soft` | dérivés | |
| | `--text`, `--text-body`, `--text-muted`, `--text-xmuted` | dérivés | |
| **Radii** | `--r-sm` / `--r-md` / `--r-pill` | `4` / `8` / `100px` | |

**Règle de palette** : tout ce qui n'est pas IA doit utiliser les tokens DS. Le violet `--pof-ai` est l'**unique** dérogation, strictement scopée aux affordances IA.

### Typo
- **Heading** : Poppins (500/600/700)
- **Body** : Raleway (400/500)
- **Mono** : JetBrains Mono (IDs, dates, téléphones)

### Icônes
Source unique : **Tabler Icons outline**, inlinées avec `stroke="currentColor"`. Tailles 11–17px. **Aucun emoji ni icon font** — partout, y compris dans les notes de situation (les risques portent un `icon: 'name'` côté payload).

### Composants partagés (CSS)

| Famille | Classes |
|---|---|
| Boutons | `.btn`, `.btn-primary`, `.btn-outline`, `.btn-ghost`, `.btn-block` |
| Badges | `.badge`, `.badge-found`, `.badge-folk`, `.badge-missing`, `.badge-loading` |
| Notion link unifié | `.notion-pill` — pill gris (label + flèche **toujours visible**, sans logo Notion). Utilisée pour : meetings, tasks, attachments, timeline items. Single source of truth visuel. |
| Tags Notion (chip) | `.cf-tag`, `.chip` |
| AI hint | `.ai-wand`, `.ai-source`, `.ai-found-badge` (palette `--pof-ai`) |
| Cards | `.card`, `.pinned-note`, `.attachment`, `.source-item`, `.task-item`, `.pn-todo` |
| Form | `.form-field`, `.segmented`, `.required-dot`, `.field-error` |
| Feedback | `.toast`, `.spinner`, `.waiting` |
| Sheet | `.footer-sheet`, `.sheet-body`, `.sheet-head`, `.sheet-content`, `.sig-grid`, `.sig-action`, `.sig-att` |
| Agent dock | `.agent-dock`, `.agent-thread`, `.agent-msg`, `.agent-composer`, `.agent-mic`, `.agent-send` |
| Podcast toggles | `.pod-include` + `.att-pod-toggle` (bloc CSS partagé, strictement identiques) |
| Big CTA | `.btn-podcast-big`, `.es-cta` (homologues : navy plein + accent teal) |
| Timeline | `.tl-node[data-type]`, `.tl-item.future`, `.tl-day-sep`, `.tl-day-sep-future` |

---

## 14. Contrat API proxy

Toutes les requêtes : `POST <PROXY_URL>`, body JSON `{action, token, …args}`, header `Content-Type: text/plain;charset=utf-8`.

### Lookup / écriture personnes
| Action | Args | Réponse |
|---|---|---|
| `dump_persons` | `{}` | `{persons: [...]}` index complet pour cache local |
| `lookup_person` | `{email, name}` | `{found, name, email, notion_page_id, notion_page_url, person_instructions, vip, company, company_source, title, title_source, tags, phone, phone_source, meetings}` |
| `lookup_folk` | `{email, name}` | `{found, notion_page_id?}` |
| `create_person` | `{email, name}` | `{success, notion_page_id, notion_page_url}` |
| `update_person_instructions` | `{page_id, text}` | `{success}` |
| `toggle_vip` | `{page_id, vip}` | `{success}` |
| `add_phone_to_notion` | `{page_id, phone}` | `{success}` |
| `add_field_to_notion` | `{page_id, field, value}` | `{success}` |
| `enrich_contact` | `{conversation_id, instructions, contact_page_id?, contact_email?, contact_name?}` | `{success}` |

### Conversation
| Action | Args | Réponse |
|---|---|---|
| `lookup_conv` | `{missive_conversation_id}` | `{instructions, suggested, notion_page_id}` |
| `upsert_conv` | `{missive_conversation_id, text, page_id?}` | `{success, notion_page_id}` |

### Contenu / synthèse
| Action | Args | Réponse |
|---|---|---|
| `analyze_content` | `{conversation_id}` | `{summary, attachments: [{id,name,size,type,summary,url}], sources: [{id,type,name,subtitle,meta,url,watched}]}` |
| `list_timeline` | `{conversation_id}` | `{situation: {updated, headline, bullets, risks}, upcoming: [...], interactions: [...]}` |
| `update_situation` | `{conversation_id, html}` | `{success}` |
| `regen_situation` | `{conversation_id}` | `{success}` (résultat async via push ou polling) |

### Tasks (Notion-synced)
| Action | Args | Réponse |
|---|---|---|
| `list_tasks` | `{conversation_id}` | `{tasks: [{id,name,prio,assignee,deadline,done,notion_url}]}` |
| `list_proposed_tasks` | `{conversation_id}` | `{proposed: [...]}` |
| `create_task` | `{conversation_id, name, description, deadline, prio, assignee}` | `{success, task}` |
| `update_task` | `{id, …champ(s) à patcher}` | `{success}` |
| `toggle_task` | `{id, done, conversation_id}` | `{success}` |

### Actions IA / footer
| Action | Args | Réponse |
|---|---|---|
| `brief_podcast` | `{conversation_id, scope, include_summary?, attachment_ids?, subject?, main?, others?, person_instructions?, conv_instructions?}` | `{success}` |
| `brief_attachment` | `{attachment_id, attachment_name, conversation_id}` | `{success}` |
| `brief_reply` | `{conversation_id, instructions}` | `{success}` |
| `estimate_opportunity` | `{conversation_id}` | `{success}` |
| `signature_action` | `{action: 'legal_analysis'|'sign_documents'|'generate_nda', attachment_ids: string[], conversation_id}` | `{success}` |
| `ask_agent` | `{prompt, conversation_id, main?, situation?}` | `{success, reply, proposed?, situation?}` |
| `follow_source` | `{source_id, watched, conversation_id}` | `{success}` |
| `submit_agent_feedback` | `{text, conversation_id, situation?}` | `{success}` |

### Inbox / triage *(Sidebar.html uniquement)*
| Action | Args | Réponse |
|---|---|---|
| `last_triage_report` | `{}` | `{found, title, notion_page_id, notion_page_url, run_at, run_at_label, stats: {triaged, archived, priority_1}}` |
| `run_triage` | `{}` | `{success}` |

---

## 15. États & Feedback

### Loading
- **Spinner inline** dans la card / le badge / le bouton
- **Empty waiting** : icône + message centré dans `.waiting`

### Confirmation
- **Toast** bottom-center, pill navy, auto-hide 2.2s
- **State button** : `Sauvegarde…` → `✓ Sauvegardé` → reset après 2s
- **Footer action `done`** : tint teal-deep persistant 4s indiquant déjà-déclenché pour cette conv

### Erreur
- **Champs** : bordure coral + halo rouge + message `.field-error` (hidden par défaut)
- **Bouton** : rollback à l'état initial + toast d'erreur
- **Network** : `{error}` propagé du proxy, toast

### Empty states
- **Pas de contact** : icône inbox + message
- **Pas de participants / PJ / sources** : message texte discret ou section masquée
- **Pas de tâches** : "Aucune tâche pour cette conversation."
- **Pas de conversation sélectionnée** : empty shell complet (§5, Sidebar.html uniquement)

---

## 16. Mode preview / mock

Les deux fichiers HTML détectent l'absence du SDK Missive et basculent en **mock** :

- **Mock SDK Missive** : conv avec Marc Castagnet (from) + Esther Wong + Thibault Kheres + Benoît Blancher (to/cc)
- **Mock proxy** (`__pofMock`) : fixtures cohérentes pour toutes les actions (lookups 700ms, writes 300ms)
- **State switch** : `window.__POF_DEMO_STATE = 'found' | 'folk' | 'missing' | 'loading' | 'empty'`

Permet de reviewer le design hors prod et tester chaque état sans toucher Notion. Le SDK Missive prod n'est chargé que si `__POF_MOCK` est `false`.

---

## 17. Cohérence visuelle

Inspirations :
- **Missive** : compacité, sidebar étroite, hierarchy verticale, badges discrets, sticky tabs.
- **Notion** : segmented control en pill, labels small caps gris très clair, hairlines plutôt que box shadows, cards `bg-soft`, focus rings teal subtils.
- **POF DS** : Poppins/Raleway, navy primary, teal accents, coral pour urgence, 8px grid, pas de gradients sur composants UI standards (sauf gros CTA podcast `.btn-podcast-big`).

**Règle de pruning** : à chaque ajout, vérifier que les couleurs employées sont dans la liste des tokens DS. Le violet `--pof-ai` est la seule dérogation tolérée, et uniquement pour signaler une source IA. Tout autre violet, vert custom, ou cream beige est interdit.

---

## 18. Fichiers

```
Sidebar.html         markup variante 4-onglets (avec Contenu + empty shell) + mock + boot
Sidebar v3.html      markup variante 3-onglets Conv. fusionné + mock + boot
sidebar.css          tokens + tous composants partagés
sidebar.js           SDK Missive, proxy, render, agent dock, situation, tasks, sheets, timeline, empty shell
assets/
  pof-logo-color.svg     logo (non utilisé en footer actions, conservé pour empty shell éventuel)
  pof-logo-variant-1.svg logo alternatif
SPEC.md              ce document
```

Cache-busting : `?v=N` sur les imports `sidebar.css` et `sidebar.js`. Bump à chaque release.
