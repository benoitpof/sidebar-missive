# POF Missive Sidebar

Sidebar Missive intégrant la base Personnes Notion et le champ Instructions par conversation.

## Architecture

- `index.html` — sidebar statique servie via GitHub Pages
- `Code.gs` — proxy GAS qui masque la clé Anthropic (pattern Secrets_Proxy POF). Déployé sur le projet GAS `1XMCmVZ3n0WR7fXZx0hiS2JwxTX8_OQ7ipMUZ-NwCK5yZYWrMD2iqoHVZ`.

## Flow

```
Sidebar (browser) → POST /exec du proxy GAS
                  → getSecret_('ANTROPIC_API_TOKEN') via Secrets_Proxy → Doppler
                  → api.anthropic.com avec MCP Notion / Folk
                  → JSON parsé renvoyé au browser
```

## Deploy

URL prod : https://benoitpof.github.io/sidebar-missive/

Ajout dans Missive : Settings → Integrations → Sidebars → New Sidebar → URL ci-dessus.

## Script Properties requises côté GAS proxy

| Property | Source |
|---|---|
| `SECRETS_PROXY_URL`, `SECRETS_PROXY_TOKEN` | Pattern Secrets_Proxy POF |
| `PUBLIC_TOKEN` | Random, partagé avec `CFG.PROXY_TOKEN` dans index.html |
| `NOTION_PERSONS_DB`, `NOTION_CONVS_DB` | UUIDs Notion |
| `PERSON_EMAIL_PROP`, `PERSON_INSTRUCTIONS_PROP` | Noms de propriétés Personnes |
| `CONV_MISSIVE_ID_PROP`, `CONV_INSTRUCTIONS_PROP` | Noms de propriétés Conversations |
