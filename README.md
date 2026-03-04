# mAutomation

AI-powered marketing automation platform. Built with Wasp (React + Node + Prisma + PostgreSQL).

**Live**: https://mautomate.ai

## Features
- AI Chatbot with multi-channel support (Website, WhatsApp, Telegram)
- Central Inbox — AI + human agent conversations with handoff protocol
- Social Media Agent — AI post generation, multi-platform publishing
- SEO Agent — AI article generation, keyword research, WordPress publishing
- Post Hub — Unified content management with Kanban, Calendar, approvals
- Unified Credit System — 3-bucket credits with Stripe top-ups
- Extension Marketplace — Modular feature activation

## Setup

```bash
# Install dependencies
npm install

# Start dev server (client :3000, server :3001)
npx wasp start

# Run migrations
npx wasp db migrate-dev

# Deploy to production
./deploy.sh
```

## Tech Stack
- **Framework**: Wasp 0.21
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express
- **Database**: PostgreSQL, Prisma ORM
- **AI**: OpenAI GPT-4, DALL-E 3
- **Payments**: Stripe
- **Deployment**: PM2, Nginx, Cloudflare
