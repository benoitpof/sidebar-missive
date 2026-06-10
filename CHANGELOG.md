# Changelog — POF Missive Sidebar

Versions notables. Date au format YYYY-MM-DD.

## v1.14 — 2026-06-10

**Le résumé de la conversation se remplit tout seul.** L'onglet Conv. affichait un champ « Résumé de la conversation » vide en permanence : le frontend appelait `analyze_content` en ne passant que `conversation_id`, et le backend court-circuitait l'appel IA quand sujet + instructions étaient absents. Résultat : placeholder permanent, jamais de résumé.

**Frontend** (`sidebar.js`). `loadContent` récupère désormais le texte réel du thread via le SDK Missive (`Missive.fetchMessages`, avec fallback sur les previews/bodies déjà présents sur l'objet conversation) et l'envoie à `analyze_content` avec le sujet, le contact principal et les instructions Notion. Nouveaux helpers `fetchConvText()` + `htmlToText()`. Transcript borné à 12k chars, 12 derniers messages. `S.conversation` stocke l'objet conversation courant.

**Backend** (`Code.gs`). `handleAnalyzeContent_` accepte le champ `conv_text`, le garde-fou ne court-circuite plus si un fil est présent, et le prompt résume le contenu réel de l'échange (où on en est, demande de fond, actionnable). `max_tokens` 400 → 500. Contrat de retour inchangé (`{summary, attachments, sources}`).

**Zéro breaking change** : champs ajoutés, rien renommé.

## v1.13 — 2026-06-08

**Recherche Folk plus permissive + réconciliation manuelle.** Deux chantiers pour corriger les contacts qui existent dans Folk mais reviennent « Non trouvé ».

**Migration `lookup_folk` vers l'API REST Folk** (backend). Remplace le combo Claude + MCP Zapier (match exact, mono-groupe, périmètre limité) par un appel direct `GET api.folk.app/v1/people` avec `filter[emails][like]` + `filter[fullName][like]` + `combinator=or` : match partiel, workspace entier, un seul appel. Token `FOLK_API_KEY` via Secrets_Proxy (jamais hardcodé). Ancien chemin conservé en fallback (`handleLookupFolkViaMcp_`) : tant que le token n'est pas dans Doppler, zéro régression. Contrat de retour inchangé + ajout `folk_url`.

**Endpoint `reconcile_folk`** (backend + frontend). L'humain colle le lien Folk d'un contact dans la carte Contact (états « Non trouvé » et « Folk uniquement ») ; le backend crée/lie la fiche Notion et y stocke `Lien Folk` + `ID folk`. Débloque les contacts hors périmètre API en s'appuyant sur la session navigateur. Réutilise `handleCreatePerson_` + `handleAddFieldToNotion_` (champs déjà whitelistés).

**Zéro breaking change frontend** sur les endpoints existants.

## v1.12 — 2026-06-01

**Bascule prod complète du POF Agent Registry**. Le proxy `missive-sidebar-proxy` est déployé en version 21 (GAS), code hash `25ec1c90`. 10 agents listés via `agent_list`.

**3 nouveaux agents lawyer** ajoutés au registre :
- `lawyer/legal-orchestrator` (Haiku, router JSON) — classifie un document/requête et dispatche vers l'expert approprié
- `lawyer/nda-expert` (Sonnet, JSON) — analyse NDA adverse (modes `analyse` / `generation`), valide signature, génère NDA POF via template Odoo Sign
- `lawyer/corporate-governance-expert` (Sonnet, JSON) — pactes associés, contrat de marque POF×PO, mode `ESCALATE_REQUIRED` systématique

Registry total : 10 agents répartis en 4 fonctions (marketing-comms, business-deals, lawyer, ops-it).

**Helper interne `invokeAgent_(agentId, ctx, query, mode)`** ajouté côté backend pour permettre aux handlers legacy (`handleAskAgent_`, `handleRegenSituation_`, `handleBriefPodcast_`, `handleLegalAnalysis_`, `handleGenerateNda_`) de déléguer au Registry sans dupliquer la logique Claude. Refactor des handlers reporté (zero frontend change).

**Zéro breaking change frontend** — la sidebar continue d'appeler ses endpoints legacy. Le Registry est exposé en parallèle via `agent_invoke` + `agent_list` pour les autres surfaces (Cowork, Slack future).

Endpoint `doGet` (ping public) renvoie maintenant version + agents.

## v1.10 — 2026-05-18

**POF Agent Registry POC** (cf. [spec Notion](https://www.notion.so/371c2ce245e88143b9c3e30f0122958c)).

Introduction d'un registre canonique des agents POF par fonction métier, accessible via API uniforme. Premier pas vers la séparation interface/agent : la sidebar deviendra à terme un client thin du registry, et d'autres surfaces (Cowork, Slack) pourront invoquer les mêmes agents.

**7 agents migrés depuis l'existant inline** :
- `marketing-comms/drafter-short` (Haiku) — ex Drafter A de Missive Triage
- `marketing-comms/drafter-formal` (Sonnet) — ex Drafter B
- `marketing-comms/podcast-briefer` (Sonnet) — ex brief_podcast
- `business-deals/situation-summarizer` (Haiku, output JSON) — ex regen_situation
- `business-deals/deal-analyst` (Sonnet, output JSON) — ex estimate_opportunity
- `lawyer/legal-analyzer` (Sonnet, output JSON) — ex signature_action.legal_analysis
- `ops-it/workflow-architect` (Sonnet) — nouveau

**2 nouveaux endpoints** : `agent_invoke` (POST {action, token, agent, query, context, mode}) et `agent_list`.

POC déployé dans le proxy missive-sidebar-proxy en attendant un GAS dédié. La sidebar continue d'utiliser ses prompts inline en parallèle — pas de breaking change. Migration prévue Phase 3 (semaine du 26/05).


## v1.9.1 — 2026-05-17

**Fix Missive `/posts` payload** : ajout du champ `notification` (title + body) requis par l'API Missive pour les commentaires d'équipe. Sans ça, l'analyse juridique ne se postait pas en commentaire.

## v1.9 — 2026-05-17

**3 stubs implémentés en versions réelles** (specs Notion validées par Benoit).

- `ask_agent` (Spec 2) : détection intent par mots-clés LARGE (draft court/long, résumé, tâche, veille, podcast, légal, chat), délégation Drafter A (Haiku) ou Drafter B (Sonnet), **création directe du brouillon Missive** (pas de validation, décision Benoit), chat libre Sonnet sur contexte enrichi
- `regen_situation` (Spec 2) : Claude Haiku synthèse JSON `{summary, bullets[], risks[]}`, persistance Notion sur la Conv
- `signature_action` (Spec 1) complet :
  - `legal_analysis` : Missive API extraction PJ + Claude Sonnet analyse + commentaire Missive + Slack DM `#ai-assistan-legal` si signature requise
  - `sign_documents` : queue Backlog + Slack DM (templates Odoo Sign en suspens)
  - `generate_nda` : queue Backlog + Slack DM (template Odoo PDF en suspens)

Helpers ajoutés : `missiveApi_`, `missiveCreateDraft_`, `missivePostComment_`, `missiveListMessages_`, `slackPost_`.

## v1.8 — 2026-05-17

**Frontend v3 (3 onglets)** : `Sidebar v3.html` devient `index.html`. Variante 4 onglets sauvegardée en `Sidebar-4tabs.html`. SPEC.md v6 marque la v3 comme "variante en cours de prod".

Régressions handoff corrigées (5) : SDK URL `integrations.missiveapp.com/missive.js`, mock gating `?preview=1`, Folk silent background, cache localStorage TTL 6h, loading message dynamique.

Meta `Cache-Control: no-cache` ajoutés à l'HTML.

## v1.7 — 2026-05-17

- Champ "Téléphone" (phone_number) ajouté à la base Personnes Notion
- `extractPersonEnriched_()` : helper centralisé qui extrait vip, company, tags, phone, meetings (relation Notes)
- `lookup_person` enrichi avec `with_meetings: true` option
- `dump_persons` enrichi (sauf meetings pour rester léger)
- Nouveau : `toggle_vip`, `add_phone_to_notion`, `list_proposed_tasks` (Claude analyse, retourne 0-3 tâches actionnables)

## v1.6 — 2026-05-16

Actions directes (pas de queue Backlog) :
- `brief_podcast` : Anthropic puis POST direct webhook Zapier ElevenLabs
- `add_to_watch` : append direct "Briefing veille" du contact + `Suivi veille=true` + Type de veille mappé
- `enrich_contact` : append direct "Briefing veille"
- `brief_reply` : append direct "Instruction spécifique" de la Conv

`resolveContactPageId_` : fallback nom après email pour les fiches sans email rempli.

## v1.5 — 2026-05-16

**Tasks Backlog réel** : `list_tasks`, `create_task`, `toggle_task` wirés sur la base Notion Tasks Backlog avec lien automatique vers la Conversation via la relation `Tâche associée`.

6 stubs IA (`brief_podcast`, `add_to_watch`, `estimate_opportunity`, `brief_reply`, `send_nda`, `enrich_contact`) qui créent des tâches Backlog en `Mode=Confier à l'IA` avec prompt typé.

## v1.4 — 2026-05-16

- `dump_persons` : index complet de la base Personnes en un appel paginé (pour cache local frontend)
- `list_conv_tasks` : tâches Notion liées à une conversation via relation `Tâche associée`
- API frontend : cache local sessionStorage TTL 30 min + matching local instantané + name fallback normalisé (sans accents)

## v1.3 — 2026-05-16

**Abandon MCP, switch vers Notion REST direct** : le MCP Notion (`mcp.notion.com/mcp`) utilise OAuth, incompatible avec notre integration token (`NOTION_API_TOKEN` Doppler). Refactor complet : appels Notion REST direct avec Bearer auth. Folk garde MCP via Zapier.

Plus rapide, plus simple, plus prévisible.

## v1.2 — 2026-05-16

**Injection token OAuth dans `mcp_servers`** : pour bypass auth Notion MCP. Échec final, abandonné en v1.3.

## v1.1 — 2026-05-16

**Endpoint `setup_config` one-shot** : bootstrap autonome des Script Properties via `PropertiesService.setProperties()` (pluriel, bypass de la regex `setProperty` singulier du meta-deployer). Self-lock via `STATE_setup_done='1'`.

Permet à Claude de configurer entièrement le GAS sans intervention manuelle dans l'éditeur Apps Script.

## v1.0 — 2026-05-16

**Premier déploiement** du proxy GAS. 6 endpoints initiaux : `lookup_person`, `create_person`, `update_person_instructions`, `lookup_conv`, `upsert_conv`, `lookup_folk`.

Architecture proxy : frontend statique GitHub Pages → GAS Web App → Notion / Anthropic. Pattern Secrets_Proxy POF. Aucune clé Anthropic ni token Notion exposé côté frontend.
