# Changelog — POF Missive Sidebar

Versions notables. Date au format YYYY-MM-DD.

## v1.18.0 — 2026-07-02 (correctifs audit — backend à redéployer V39, frontend à merger sur main)

**Lot de correctifs issus de l'audit du 01/07** (cf. `AUDIT-2026-07-01.md`). Ne modifie aucun contrat d'endpoint (changements additifs). Vérifié par `node --check` ; validation réelle dans Missive à faire.

**Backend** (`Code.gs`).
- `ask_agent` : accepte `body.query || body.prompt` (le dock envoie `prompt`, le back n'attendait que `query` → chaque message échouait). Le wrapper de logging **n'écrase plus** la propriété « Agent session ID » quand elle sert de clé de lookup des Conversations (elle stockait le `conversation_id` Missive ; y écrire le session id orphelinait la page — synthèse/tâches/instructions — et créait des doublons).
- `parseJsonLoose_` renvoie `null` en cas de JSON invalide (au lieu d'un objet `{error}` truthy qui passait les gardes et faisait écraser la synthèse persistée par du vide) ; `regen_situation` ne persiste plus une synthèse vide.
- `update_situation` accepte `body.html` (converti via `htmlToText_`) en plus de `body.text` : l'édition manuelle de la synthèse n'échoue plus silencieusement.
- `toggle_vip` résout la fiche par email/nom si `page_id` absent (étoile VIP des participants secondaires).
- `update_task` patche enfin la description (propriété `Prompt`).
- Feedback : `parent.database_id` au lieu de `data_source_id` (incompatible avec Notion-Version 2022-06-28 → 400) ; schéma du scan nocturne aligné sur la base réelle (`Titre`, `Status` type status, `Demande utilisateur`).
- `upsert_conv` ignore le `page_id` transmis par le front et résout toujours la page côté serveur via le `conversation_id` (neutralise l'écriture croisée entre conversations).
- Version bump 1.17.0 → 1.18.0.

**Frontend** (`sidebar.js`, `index.html`).
- Signature Odoo : succès affiché uniquement si `success === true` (l'ancien test `success === false` affichait « Document signé » sur erreur réseau/token, sans rien signer).
- Popup signature auto : timer annulé au changement de conversation + re-vérification au déclenchement (ne s'ouvre plus sur la mauvaise conv).
- Gardes anti-race après `await` dans `loadConvInstructions`, `loadTasks`, `saveConv`, et side-effects de `ask_agent` ; `TaskState` remis à zéro au changement de conversation.
- Helper `safeHref()` (n'autorise que http(s)/mailto) appliqué aux liens sources et `notion-pill` : bloque un lien `javascript:` extrait par l'IA du contenu d'un mail (XSS).
- Dock agent : affiche l'erreur backend au lieu d'un faux « OK, j'ai pris en compte ta demande ». `follow_source` envoie les infos de contact (sinon « contact non identifié ») et n'appelle qu'à l'activation.
- Robustesse `prio` (tâches) + `stopOdooSignProgress()` à la fermeture du sheet.
- Cache-busting `?v=36` → `?v=37`.

## v1.17.2 — 2026-07-01

**Écran de progression Odoo Sign** (frontend, PR #2). Le bouton figé « Signature en cours… » (perçu comme un gel) est remplacé par un panneau spinner + étapes temporisées (« Récupération du document… » → « Envoi vers Odoo Sign… » → « Application de la signature… ») puis un écran résultat ✅/⚠️ qui reste ouvert. Un seul `callProxy` inchangé. `sidebar.js` +48, `sidebar.css` +28.

## v1.17.1 — 2026-06-19

**Pipeline `enrich_and_sync`** (PR #1, `Code.gs` +303). Nouvel endpoint : dédoublonnage Notion+Folk → parse de la signature Missive → recherche web Tavily (`TAVILY_API_KEY`) → GLEIF (LEI, sans clé) → synthèse Claude → création Folk si absent → création/enrichissement de la fiche Notion. Le bouton « Créer la fiche Notion » de la sidebar appelle désormais cet endpoint à la place de `create_person` (qui reste disponible côté backend, utilisé en interne par `reconcile_folk`).

## v1.17.0 — 2026-06-19

**Signature Odoo Sign native** : endpoint `odoo_sign` (`handleOdooSign_`), signature directe via le contrôleur web `/sign/sign/<req>/<token>` (auth compte Benoît, PNG data URL, skip des champs template non placés). Détecté côté front quand le sujet contient « demande de signature ». Distinct de `sign_documents` (qui ne fait que filer une tâche). Validé le 19/06 : attestation STC Côme signée en conditions réelles. Deploy GAS V38, hash `65918f7d`.

## v1.16.4 — 2026-06-10

**L'onglet Actions ne reste plus vide.** La synthèse exécutive et la timeline n'étaient jamais câblées bout-en-bout : `handleListTimeline_` renvoyait `situation: null` en dur (les champs `Situation *` de la base Conversations, écrits par `regen_situation`, n'étaient relus nulle part), le frontend n'envoyait jamais `contact_page_id` (le backend bailait donc immédiatement, Notes + MOUs toujours vides), aucun bouton ne permettait de générer la première synthèse, le bouton regen jetait son résultat sans re-render, et les formes backend/renderer divergeaient.

**Backend** (`Code.gs`). Nouveaux helpers `readConvSituation_(convId)` (relit la synthèse persistée par query sur Agent session ID, sans créer la page) et `buildSituationObject_()` (forme normalisée headline + bullets[{value}] + risks[{severity,icon,text}]). `handleListTimeline_` relit la synthèse via `conversation_id` et charge Notes/MOUs via `contact_page_id` — les deux args sont indépendants. `regen_situation` reçoit désormais `conv_text` (le résumé est construit sur le fil réel, plus seulement le sujet) et renvoie un objet `situation` normalisé. `ask_agent` intent summarize forwarde aussi `situation`.

**Frontend** (`sidebar.js`). `loadTimeline` scindé en `loadSituation` (relit + auto-génère si absente, décision : auto-gen à l'ouverture) et `loadTimelineInteractions` (Notes/MOUs après résolution du contact). `autoGenSituation(convId, force)` passe le texte du fil (`fetchConvText`), persiste et rend ; garde-fou anti-doublon par conv. État vide enrichi : indicateur « Génération… » + bouton « Générer la synthèse » en fallback. Bouton regen recâblé sur `autoGenSituation(force)`. `TimelineState` reset au changement de conversation.

**Schéma Notion.** Ajout de la propriété texte `Situation summary` sur la base Conversations (le headline n'était pas persisté).

## v1.16.3 — 2026-06-10

**Filtrage des images décoratives (signatures, logos, icônes).** Le filtre ne capturait que le pattern Outlook `image001.png` — les logos, icônes réseaux sociaux (facebook, youtube…) et bandeaux nommés autrement passaient encore. `isInlineImage_` → `isDecorativeImage_(a, bodyHtml)`, qui combine trois signaux : (a) référence inline dans le corps du message (cid embarqué), (b) noms décoratifs / réseaux sociaux, (c) seuils taille/dimensions (< 50 Ko, < 400 px de côté, bandeau d'aspect > 4:1). Les PDF et docs passent toujours ; une image n'est gardée que si elle a une vraie valeur (photo, scan, capture). Validé sur conversations réelles (Ali Hilass, AZERTY) : icônes de signature filtrées, PDF conservés. S'applique au bloc PIÈCES JOINTES et au briefing podcast.

## v1.16.2 — 2026-06-10

**Les pièces jointes s'affichent avant le résumé.** Elles étaient bundlées dans la réponse de `analyze_content` (qui attend Claude) → elles n'apparaissaient qu'une fois le résumé généré. Nouvel endpoint backend `list_attachments` (PJ seules via `collectConvAttachments_`, pas d'IA, ~0.5s). Frontend `loadContent` appelle `list_attachments` en premier et rend les PJ immédiatement, puis `analyze_content` pour le résumé + sources en parallèle (fallback PJ conservé si l'appel rapide échoue). Aucun changement de payload ni de webhook.

## v1.16.1 — 2026-06-10

**Génération du briefing alignée sur la skill `/podcast-generator`.** Le transport était déjà identique à la skill (POST `{Texte_a_lire}` sur le hook `…/uwyi8u9/` — le code ne touche jamais ElevenLabs ; la mention « ElevenLabs » du hub Notion est périmée). Reste l'alignement de la génération : le prompt système de `handleBriefPodcast_` reprend les directives de la skill (briefing qui filtre et non résume, voix CFO, patterns interdits zéro-tolérance, hiérarchie GARDER/TUER, structure accroche/corps/bottom-line, format audio sans listes, chiffres en toutes lettres, max 1000 mots) en conservant la lecture/analyse des PDF et l'intégration des sources de v1.16. `max_tokens` 1500 → 2000. Webhook et payload inchangés.

## v1.16 — 2026-06-10

**Le briefing podcast lit et résume vraiment les pièces jointes.** Les deux déclencheurs (gros bouton « Lancer le briefing podcast » et footer PODCAST) avaient des comportements divergents et le backend ignorait l'essentiel de ce que le frontend envoyait : `summary_text`, `attachment_ids`, `scope`, `situation` n'étaient jamais lus, et le PDF (souvent la pièce la plus importante) n'était jamais analysé.

**Backend** (`Code.gs`). `handleBriefPodcast_` refait. Récupère le fil Missive (`missiveListMessages_`, limit 10), télécharge les PDF sélectionnés et les envoie à Claude en blocs `document` base64 — lecture native PDF par `claude-sonnet-4-6`, aucun header beta. Synthétise : résumé édité (si coché) + fil de la conversation + PDF lus + sources. Sans instruction Notion, déduit l'important du sujet et du contenu. Filtre les images inline, dédup par nom + taille. Garde-fous : PDF > 12 Mo ignoré, budget cumulatif 18 Mo, max 5 PDF — les skips sont signalés dans le prompt (pas de troncature silencieuse). Nouveau helper `htmlToText_`. Forme du bloc document validée contre l'API réelle (download Missive → base64 → lecture Claude).

**Frontend** (`sidebar.js`). Les deux boutons appellent une fonction unique `launchPodcastBrief()` : même payload, même comportement. Sélection par défaut = **tout coché** (résumé + toutes les PJ), au lieu de la seule PJ la plus lourde. Payload enrichi : `sources`, `person_instructions`, `conv_instructions`. Le footer PODCAST perd sa logique de scope (cosmétique, ignorée par le backend).

**Validé** end-to-end sur une vraie conversation avec PDF : le briefing restitue le fil + montants / échéances / demande extraits du PDF, voix Impact Realist.

## v1.15.1 — 2026-06-10

**Les pièces jointes sont enfin détectées.** L'onglet Conv. affichait « PIÈCES JOINTES (0) — Aucune pièce jointe » même sur un mail portant un PDF de plusieurs Mo. Cause : `handleAnalyzeContent_` renvoyait `attachments: []` en dur (`// pas de Missive API ici`, TODO laissé en v1.14). Le frontend lit `r.attachments` : tableau toujours vide → bloc toujours vide, et compteur du launcher podcast faux.

**Backend** (`Code.gs`). `handleAnalyzeContent_` récupère désormais les PJ via le helper `collectConvAttachments_(convId)` (Missive API `missiveListMessages_`, déjà utilisé par le flow juridique). Le tableau est renvoyé dans **toutes** les sorties de la fonction, y compris les chemins d'erreur IA et le court-circuit « pas d'info » : les PJ s'affichent même si le résumé échoue. Normalisation vers la forme attendue par le frontend `{id, name, type, size, url}` via `attachmentExt_()` (extension minuscule pour le badge) et `humanFileSize_()` (octets → « 3.13 MB »). Déduplication par nom + taille (robuste aux fichiers re-cités dans les réponses d'un thread). Best-effort : `[]` si l'API Missive échoue.

Deux points validés contre l'API réelle (`GET /conversations/:id/messages`) :
- **Cap `limit` = 10.** Au-delà, Missive renvoie `HTTP 400 "max 'limit' value is 10"`. Le premier jet v1.15 (V25) appelait avec `limit=20` → 400 → exception attrapée → `[]` en permanence. Corrigé en `limit=10`.
- **Filtrage des images inline.** Les signatures/logos embarqués (`media_type: image` + nom auto-généré type `image001.png`) sont exclus via `isInlineImage_()`, comme le fait Missive dans son propre affichage. L'API REST n'expose ni flag `inline` ni content-id ; le pattern de nom est le signal fiable. Seules les vraies PJ (PDF, docx, images nommées…) restent listées.

Forme attachment confirmée : `{id, filename, extension, media_type, sub_type, size (octets), url, width, height}`.

**Zéro breaking change** : aucun champ renommé, contrat `{summary, attachments, sources}` inchangé, aucune modification frontend.

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
