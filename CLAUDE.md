# mAutomation — Project Guide

## What is this?
AI marketing automation SaaS built on **Wasp 0.21** (React + Node + Prisma + PostgreSQL).
Forked/inspired by MagicAI (Laravel) but rebuilt as a modern JS stack.

## Project Root
All app code lives in `template/app/`. Key paths:
- `template/app/main.wasp` — ALL route, page, query, action declarations
- `template/app/schema.prisma` — ALL database models
- `template/app/src/` — source code (client + server)

## Architecture
- **Wasp framework**: declarations in `main.wasp` auto-generate types, API routes, auth
- **Frontend**: React + TypeScript + shadcn/ui + Tailwind CSS
- **Backend**: Node.js actions/queries defined in `main.wasp`, implemented in `src/*/operations.ts`
- **Auth**: Email/password via Wasp built-in auth
- **Payments**: Stripe integration (`src/payment/`)
- **DB**: PostgreSQL via Prisma ORM

## Key Modules (src/)
| Module | Purpose | Key Files |
|--------|---------|-----------|
| `chatbot/` | Chatbot wizard (channels, training, deploy, live chat) | `operations.ts`, `components/ChatbotWizard.tsx` |
| `extensions/` | Marketplace + extension registry | `registry.ts`, `operations.ts`, `marketplace/` |
| `social-connect/` | OAuth social account linking | `operations.ts`, `encryption.ts` |
| `brand-voice/` | Brand voice profiles | `BrandVoicePage.tsx` |
| `post-hub/` | Centralized post management (SEO + Social) | Multiple files |
| `seo-agent/` | SEO content generation extension | Extension under `extensions/` |
| `demo-ai-app/` | Demo AI features (GPT tasks) | `operations.ts` |
| `admin/` | Admin dashboard + settings | `elements/settings/` |
| `payment/` | Stripe checkout, webhooks, plans | `stripe/webhook.ts` |
| `user-dashboard/` | Dashboard layout + sidebar | `layout/`, `sidebar/` |

## Conventions
- **Actions/Queries**: Declared in `main.wasp`, implemented in `src/<module>/operations.ts`
- **Validation**: Use `ensureArgsSchemaOrThrowHttpError()` from `src/server/validation.ts` with Zod
- **Styling**: Tailwind + shadcn/ui components in `src/client/components/ui/`
- **Extensions**: Registered in `src/extensions/registry.ts`, purchased via marketplace
- **OpenAI**: Key stored in Setting table as `platform.openai_api_key` (not env var). Create client dynamically per-request.
- **Encryption**: Sensitive fields encrypted via `src/social-connect/encryption.ts`

## Database Key Models
- `User`, `Setting` (key-value config), `UserExtension` (purchased extensions)
- `Chatbot`, `ChatbotData`, `ChatbotChannel`
- `Post`, `PostRevision`, `PostMedia` (Post Hub)
- `BrandVoice`
- `SocialAppCredential`, `SocialAccount`, `OAuthState`

## MagicAI Reference
The original Laravel codebase is at `../app/` (parent directory). Used as reference for feature parity.
Do NOT copy Laravel code directly — translate patterns to Wasp/React/Node.

## Dev Commands
```bash
cd template/app
npx wasp start          # Dev server (client :3000, server :3001)
npx wasp db migrate-dev # Run migrations after schema.prisma changes
npx wasp db studio      # Prisma Studio (DB browser)
```

## Important Notes
- When Stripe isn't configured, extensions activate directly (no payment flow)
- Always add new actions/queries to BOTH `main.wasp` AND the operations file
- The `.wasp/out/` directory is auto-generated — never edit directly
- Org-scoping: users see only their own data (filter by userId)
