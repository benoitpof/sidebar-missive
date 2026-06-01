# POF Missive Sidebar

Interface humaine légère sur l'écosystème POF, déployée comme sidebar dans Missive. Pas un nouveau système — un raccourci vers les pipelines existants (Missive Triage, Gestion documentaire, Morning Briefing).

**Doc complète** : [Missive Sidebar — page hub Notion](https://www.notion.so/353c2ce245e88132bf51e041d7ce9e66)

## URLs

| Composant | URL |
|---|---|
| Prod | https://benoitpof.github.io/sidebar-missive/ |
| Preview standalone | https://benoitpof.github.io/sidebar-missive/?preview=1 |
| Variante 4 onglets (legacy) | https://benoitpof.github.io/sidebar-missive/Sidebar-4tabs.html |
| GAS Web App | `AKfycbyW.../exec` (cf. page hub Notion) |

## Layout

3 onglets : **Contact** / **Conv.** / **Timeline**
+ Agent chat dock (en bas, dépliable)
+ Footer actions (Podcast / Estimer / Réponse / Signature / Feedback)

## Architecture

```
Sidebar (browser, iframe Missive)
  │ POST text/plain { action, token, ...args }
  ▼
GAS proxy missive-sidebar-proxy
  ├─→ Notion REST API (Personnes, Conversations, Tasks, MOUs, ...)
  ├─→ Missive API (drafts, posts) — MISSIVE_API_TOKEN Doppler
  ├─→ Anthropic API (Drafter A Haiku / Drafter B Sonnet / regen / analyse)
  ├─→ Slack API (DM #ai-assistan-legal)
  └─→ Zapier webhook (ElevenLabs podcast)
```

**Pattern Secrets_Proxy POF** : tous les tokens via `getSecret_(name)` runtime → Doppler. Aucun secret hardcodé.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Variante 3 onglets (Sidebar v3) — variante en cours de prod |
| `Sidebar-4tabs.html` | Variante 4 onglets (Contenu séparé) — sauvegarde |
| `sidebar.css` | Tokens DS POF + composants (4 091 lignes) |
| `sidebar.js` | Logique frontend (3 244 lignes) — proxy calls, render, agent, footer actions, mock preview |
| `Code.gs` | Backend GAS proxy (1 800+ lignes) — 32 endpoints, Notion REST, Missive API, Slack, Anthropic |
| `SPEC.md` | Spec fonctionnelle (592 lignes) — design system, layout, contrat API |

## Installation Missive (utilisateur)

Settings → Integrations → Sidebars → New Sidebar → URL prod ci-dessus.

Premier load : ~30s pour synchroniser l'index Personnes (319 contacts, 96 KB). Cache `localStorage` 6h pour les loads suivants.

## Backend — Script Properties GAS

Toutes les valeurs lues au runtime via `getSecret_('<NAME>')` → Secrets_Proxy GAS → Doppler. **Aucune Script Property avec secret en clair.**

| Script Property | Source |
|---|---|
| `SECRETS_PROXY_URL` + `SECRETS_PROXY_TOKEN` | Pattern Secrets_Proxy POF |
| `PUBLIC_TOKEN` | Random, partagé avec `CFG.PROXY_TOKEN` dans `index.html` |

Secrets Doppler utilisés au runtime : `ANTROPIC_API_TOKEN`, `NOTION_API_TOKEN`, `MISSIVE_API_TOKEN`, `SLACK_BOT_TOKEN`.

## 32 endpoints API + Agent Registry

Voir [page hub Notion](https://www.notion.so/353c2ce245e88132bf51e041d7ce9e66) pour la liste complète et les payloads attendus, ou les `case '...':` du switch principal dans `Code.gs`.

Catégories endpoints legacy :
- Lookup & cache Notion (5)
- Écritures Notion (10)
- Lecture cross-bases (4)
- Actions IA (8)
- Workflow juridique (1 endpoint, 3 sub-actions)
- Veille / triage (3)
- Feedback (2)

**POF Agent Registry (v1.12, en prod)** — 2 endpoints API uniforme :
- `agent_invoke` : `{action, token, agent: 'function/agent-id', query, context, mode}` → réponse `{ok, agent, model, reply, output, proposed_actions, side_effects, tokens_used}`
- `agent_list` : retourne les 10 agents avec model + role + permissions

10 agents répartis en 4 fonctions :
- `marketing-comms/` : drafter-short, drafter-formal, podcast-briefer
- `business-deals/` : situation-summarizer, deal-analyst
- `lawyer/` : legal-orchestrator, legal-analyzer, nda-expert, corporate-governance-expert
- `ops-it/` : workflow-architect

Spec Registry : [POF Agent Registry](https://www.notion.so/371c2ce245e88143b9c3e30f0122958c)

## Specs liées

- [Spec 1 — Workflow juridique sidebar](https://www.notion.so/363c2ce245e881c98f6bfc03b5cd7b06)
- [Spec 2 — Agent sidebar mails](https://www.notion.so/363c2ce245e881379fcad37bc9aa5771)
- [POF Agent Registry](https://www.notion.so/371c2ce245e88143b9c3e30f0122958c)
- [Gestion documentaire](https://www.notion.so/352c2ce245e880d9ad49ea835e83afe0)
- [Missive Triage — section sidebar §9](https://www.notion.so/340c2ce245e88128ad9fe868d4935d61)
- [Morning Briefing — feedback loop sidebar](https://www.notion.so/332c2ce245e8817ebb8bd950556f4599)

## Voir aussi

- [CHANGELOG.md](./CHANGELOG.md) — historique des versions
