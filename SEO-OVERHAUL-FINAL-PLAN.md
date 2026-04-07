# SEO System Overhaul — Final Execution Plan

**Date:** 2026-04-04
**Status:** APPROVED after 6-agent debate & verification
**Verification:** All 15 core claims verified TRUE. 3 issues reclassified (severity adjusted). 8 new bugs discovered.

---

## Debate Summary

Six specialized agents reviewed the R&D plan:

| Role | Key Finding |
|------|------------|
| **Devil's Advocate** | 23/26 issues CONFIRMED. 3 partially false (wizard optional steps understated, WP step already labeled "optional", detail page has clear sections). Found 8 new bugs including a credit-eating bug (FN-4) and broken toast (FN-7). |
| **Frontend UX Expert** | All UI changes feasible. Wizard should stay as a page (not modal) for mobile UX. Real-time editor deferred to Phase 3. Standalone keyword research needs a "default agent" pattern. |
| **Backend Architect** | Making `agentId` optional on keywords is SAFE (single ALTER). WordPress config extraction is DANGEROUS (breaks publishing job). Junction table for clusters is SAFE with careful migration. |
| **QA Engineer** | 88 test cases across both phases. Top 5 risks: standalone keyword `agentId` removal, sidebar visibility logic, WP credential handling, credit deduction accuracy, `main.wasp` completeness. |
| **Product Manager** | Cut 2 changes (normalize keywords, extract WP config — zero user value). Defer 6 changes (editor, competitor analysis, onboarding, free tier, SpyFu fix, approval workflow). |
| **Code Verifier** | 15/15 factual claims in R&D are TRUE. Zero false positives on verifiable facts. |

### Consensus Decisions

1. **CUT** database schema normalization (junction table, WP config extraction) — migration risk, zero user value
2. **CUT** content approval workflow — no user demand
3. **DEFER** real-time SEO editor to Phase 3 — 4-6 week standalone initiative
4. **DEFER** competitor gap analysis, guided onboarding, free tier preview
5. **FIX IMMEDIATELY** credit-eating bug (FN-4) and broken toast (FN-7) in Phase 1
6. **Wizard stays as page, not modal** — better mobile UX
7. **Keep existing routes working** — never break bookmarked URLs
8. **No `main.wasp` entity list changes in Phase 1** — all changes are frontend-only

---

## PHASE 1: Remove Friction (Frontend-Only)

**Goal:** Reduce creation flow from 22 interactions to ~8. No backend changes. No DB migrations. No new routes.
**Estimated effort:** 3-5 days
**Risk level:** LOW

### Phase 1 Changes

#### 1.1 Fix Critical Bugs (Day 1)

**Bug FN-4: Credit deduction without refund on keyword research failure**
- **File:** `src/extensions/seo-agent/keywordOperations.ts`
- **Problem:** Credits deducted at line 113 BEFORE OpenAI call. If API fails in "related" branch (lines 129-187), no try/catch with refund exists. Compare with `clusterKeywords` (line 432-434) which does refund on failure.
- **Fix:** Wrap the OpenAI call in try/catch and call `refundCredits` on failure, matching the pattern in `clusterKeywords`.

**Bug FN-7: Toast always shows "Found 0 keyword opportunities"**
- **File:** `src/extensions/seo-agent/SeoAgentDetailPage.tsx` line 149
- **Problem:** Code reads `(result as any)?.count` but `researchKeywords` returns `{ added: N }` (keywordOperations.ts line 235).
- **Fix:** Change to `(result as any)?.added ?? 0`.

**Bug FN-1: Keywords stat card shows seed keyword count instead of researched count**
- **File:** `src/extensions/seo-agent/SeoAgentDetailPage.tsx` line 305
- **Problem:** Shows `agent.seedKeywords?.length` instead of `allKeywords.length`.
- **Fix:** Change to show `allKeywords?.length ?? 0`.

**Bug FN-5: No post content viewer**
- **File:** `src/extensions/seo-agent/SeoAgentDetailPage.tsx`
- **Problem:** Posts shown as list items but clicking them doesn't show content. `getSeoPost` query exists but no UI renders individual post content.
- **Fix:** Add a post detail dialog/expandable that shows title, content, meta description, SEO score breakdown when a post row is clicked.

#### 1.2 Simplify Wizard from 6 Steps to 3 (Days 1-2)

**File:** `src/extensions/seo-agent/SeoAgentFormPage.tsx`

**Current 6 steps → New 3 steps:**

| New Step | Contains | From Old Steps |
|----------|----------|----------------|
| Step 1: Basics | Agent Name*, Brand Voice, Website URL, Niche | Old Step 1 |
| Step 2: Content | Seed Keywords*, Content Types*, Tone, Language, Target Word Count | Old Steps 2 + 3 + 4 (minus AI Provider) |
| Step 3: Review & Create | Summary of all settings, Create button | New |

**Removed from wizard entirely:**
- AI Provider dropdown (hardcode "openai") — CONFIRMED pointless, single option
- Schedule (days + daily count) — move to detail page Settings tab
- WordPress credentials — move to detail page Settings tab

**Key implementation details:**
- Change `FORM_STEPS = 6` to `FORM_STEPS = 3`
- Update step validation: Step 1 requires `name`, Step 2 requires at least 1 keyword and 1 content type
- Keep all `formData` state fields (backend still accepts them), just don't collect schedule/WP during creation
- Default values filled automatically: `scheduleDays: []`, `dailyContentCount: 1`, `aiProvider: "openai"`, WordPress fields empty
- Edit mode (`/extensions/seo-agent/:id/edit`) should use the same simplified wizard but pre-populate all fields

#### 1.3 Restructure Sidebar Navigation (Days 2-3)

**File:** `src/user-dashboard/layout/UserSidebar.tsx`

**Current:**
```
CONTENT (conditional: social OR seo active)
  ├── Post Hub
  └── Content Calendar
EXTENSIONS (conditional: any active extension)
  └── SEO Agent (single link)
```

**New:**
```
SEO & CONTENT (conditional: seo-agent active)
  ├── SEO Projects (/extensions/seo-agent)    [existing route, renamed]
  ├── Keywords (/extensions/seo-agent)         [links to first agent's keywords, or agent list if multiple]
  ├── Content Briefs (coming soon badge)       [visible but disabled, Phase 2]
  ├── Post Hub (/post-hub)                     [existing]
  └── Content Calendar (/content-calendar)     [existing]

EXTENSIONS (conditional: non-seo active extensions)
  └── [Other extensions like AI Image Generator, Video Studio, etc.]
```

**For users WITHOUT SEO Agent purchased:**
```
SEO & CONTENT (always visible)
  ├── SEO Projects (🔒 locked → links to /marketplace)
  ├── Keywords (🔒 locked → links to /marketplace)
  ├── Post Hub (shows if social agent active, else locked)
  └── Content Calendar (shows if social agent active, else locked)
```

**Implementation approach (per Frontend UX Expert):**
1. Special-case `seo-agent` out of the generic extension loop
2. Filter `nonSeoExtensions = activeExtensions.filter(ext => ext.id !== "seo-agent")`
3. Derive `hasSeoAgent = activeExtensions.some(ext => ext.id === "seo-agent")`
4. Render dedicated "SEO & CONTENT" section (replaces current "CONTENT" section)
5. Do NOT modify `registry.ts` — sidebar rendering is frontend-only concern

#### 1.4 Add Settings Tab to Agent Detail Page (Days 3-4)

**File:** `src/extensions/seo-agent/SeoAgentDetailPage.tsx`

Add a collapsible "Settings" card BELOW the existing Configuration card with:
- **WordPress Integration:** URL, Username, Password, Category ID (moved from wizard step 6)
- **Schedule:** Active Days toggles + Daily Content Count (moved from wizard step 5)
- **Save Settings** button that calls existing `updateSeoAgent` action

This is a lightweight version of the full tabbed interface (Phase 2). We add just one settings section now, and do full tabs in Phase 2.

**Why not full tabs now:** Tabs require restructuring the entire 738-line component. The Settings card is additive (~100 lines) and ships faster.

#### 1.5 Add SERP Preview Component (Day 4)

**New file:** `src/extensions/seo-agent/components/SerpPreview.tsx` (~80 lines)

Pure presentational component:
- Input: `title`, `description`, `url`
- Output: Google-style search result preview
- Truncation: title at 60 chars, description at 160 chars
- Color: blue title, green URL, gray description
- Character count indicators (green when in range, red when over/under)

Add to the post detail dialog (from bug fix FN-5) so users see how their article would appear on Google.

---

### Phase 1 QA Checklist

**Before deploying, verify ALL of the following:**

| # | Test | Expected | Risk |
|---|------|----------|------|
| 1 | Create new agent with simplified 3-step wizard | Agent created with defaults for schedule, WP, AI provider | HIGH |
| 2 | Edit existing agent (created before overhaul) | All fields load correctly, WP/schedule visible in detail settings | HIGH |
| 3 | Sidebar shows SEO section for activated users | "SEO & CONTENT" section with sub-items visible | HIGH |
| 4 | Sidebar shows locked items for non-SEO users | Lock icons visible, clicking goes to marketplace | HIGH |
| 5 | Sidebar still shows other extensions normally | AI Image Generator etc. under EXTENSIONS section | MEDIUM |
| 6 | User with only Social Media Agent (no SEO) | Post Hub/Calendar visible, no SEO items (or locked) | MEDIUM |
| 7 | Keyword research toast shows correct count | "Found N keyword opportunities" with actual count | MEDIUM |
| 8 | Keyword research failure refunds credits | Simulate API failure, verify credit balance unchanged | HIGH |
| 9 | Keywords stat card shows researched count | Shows actual keyword count, not seed keyword count | MEDIUM |
| 10 | Post content viewable via click/dialog | Click post row, see full content + meta + SEO score | MEDIUM |
| 11 | SERP preview renders correctly | Google-style preview with truncation | LOW |
| 12 | Existing agents still work (no data loss) | All agents, posts, keywords intact | HIGH |
| 13 | Credit deduction unchanged (10 research, 40 article) | Verify exact amounts in credit transactions | HIGH |
| 14 | WordPress publishing still works for existing agents | Scheduled publish job picks up and publishes | HIGH |
| 15 | Extension purchase flow unchanged | Marketplace → Purchase → Activate → SEO visible | HIGH |
| 16 | Mobile sidebar renders correctly | No overflow, all items tappable | MEDIUM |
| 17 | Wizard progress bar accurate (Step X of 3) | Progress percentage matches actual steps | LOW |
| 18 | Wizard back button works between new steps | Navigate back without data loss | LOW |

---

## PHASE 2: Surface Hidden Power (Backend + Frontend)

**Goal:** Unlock Content Briefs, Keyword Clustering, tabbed detail page, standalone keyword research, centralized posts view. Make SEO competitive with entry-level tools.
**Estimated effort:** 2-3 weeks
**Risk level:** MEDIUM
**Prerequisite:** Phase 1 deployed and verified

### Phase 2 Changes

#### 2.1 Tabbed Agent Detail Page (Week 1)

**File:** `src/extensions/seo-agent/SeoAgentDetailPage.tsx`

Replace single-scroll layout with 4 tabs using existing `src/client/components/ui/tabs.tsx` (shadcn/ui Radix Tabs):

| Tab | Content | Source |
|-----|---------|--------|
| **Overview** | Stats cards + Quick actions (Research, Generate, Batch) | Existing header + stats (lines 263-334) |
| **Keywords** | Keyword list + Research button + Clustering UI (NEW) | Existing keywords section (lines 427-524) + new clustering |
| **Articles** | Post list + Generate/Batch/Create + Post detail with SERP preview | Existing posts section (lines 527-644) |
| **Briefs** | Content briefs list + Generate brief from cluster (NEW) | New — uses existing `getContentBriefs`, `generateContentBrief`, `generateArticleFromBrief` |
| **Settings** | Agent config + WordPress + Schedule (from Phase 1) | Phase 1 settings card, promoted to a tab |

**Tab URL state:** Use `?tab=keywords` query param. Default tab: `overview`. Preserve on refresh.

#### 2.2 Surface Keyword Clustering (Week 1)

**File:** `src/extensions/seo-agent/SeoAgentDetailPage.tsx` (Keywords tab)

Add to Keywords tab:
- **"Auto-Cluster" button** — appears when agent has 5+ keywords
- Calls existing `clusterKeywords` action (keywordOperations.ts lines 346-513)
- Displays clusters as collapsible cards showing: cluster name, intent badge, keyword list
- Each cluster has a "Generate Brief" button → calls `generateContentBrief`
- Credits: 10 per clustering operation

**No backend changes needed** — `clusterKeywords` and `getSeoAgentClusters` are fully implemented and declared in `main.wasp`.

#### 2.3 Surface Content Briefs (Week 1-2)

**File:** `src/extensions/seo-agent/SeoAgentDetailPage.tsx` (Briefs tab)

New "Briefs" tab content:
- List of existing briefs from `getContentBriefs({ agentId })`
- Each brief shows: outline headings, target keywords, target word count
- **"Generate Article" button** on each brief → calls existing `generateArticleFromBrief`
- **"New Brief" button** → modal with keyword/cluster selection → calls `generateContentBrief`
- Credits: 15 per brief, 40 per article from brief

**No backend changes needed** — `generateContentBrief`, `generateArticleFromBrief`, and `getContentBriefs` are fully implemented.

#### 2.4 Standalone Keyword Research Page (Week 2)

**New file:** `src/extensions/seo-agent/KeywordResearchPage.tsx` (~400 lines)
**New route in `main.wasp`:**
```
route KeywordResearchRoute { path: "/seo/keywords", to: KeywordResearchPage }
page KeywordResearchPage {
  authRequired: true,
  component: import KeywordResearchPage from "@src/extensions/seo-agent/KeywordResearchPage"
}
```

**Backend change:** Modify `researchKeywords` in `keywordOperations.ts`:
- Make `agentId` optional in schema: `agentId: z.string().uuid().optional()`
- When no `agentId`: require `keyword` parameter, skip agent lookup, skip seed keywords fallback
- Store keywords with `agentId: null` (requires schema migration — see below)
- Still require `ensureExtensionActive` (SEO extension must be purchased)
- Still deduct 10 credits

**Schema migration (SAFE — additive only):**
```prisma
model SeoAgentKeyword {
  agent    SeoAgent? @relation(fields: [agentId], references: [id], onDelete: Cascade)
  agentId  String?   // Changed from required to optional
}
```
Migration SQL: `ALTER TABLE "SeoAgentKeyword" ALTER COLUMN "agentId" DROP NOT NULL;`
- Zero data loss — existing rows keep their agentId values
- `onDelete: Cascade` still works for agent-linked keywords
- Standalone keywords (agentId = null) persist independently

**Page UI:**
- Search bar: "Enter a keyword or domain URL"
- Toggle: "Related Keywords" (OpenAI) / "Domain Keywords" (SpyFu)
- Results table: keyword, volume, difficulty, CPC, intent, opportunity score
- Per-row actions: "Save to Agent" (dropdown of user's agents), "Write Article" (links to agent detail → generate)
- Sorting by any column, filtering by intent

#### 2.5 Centralized SEO Articles Page (Week 2)

**New file:** `src/extensions/seo-agent/SeoArticlesPage.tsx` (~250 lines)
**New route in `main.wasp`:**
```
route SeoArticlesRoute { path: "/seo/articles", to: SeoArticlesPage }
page SeoArticlesPage {
  authRequired: true,
  component: import SeoArticlesPage from "@src/extensions/seo-agent/SeoArticlesPage"
}
```

**Backend change:** Modify `getSeoPosts` in `postOperations.ts`:
- Make `agentId` optional
- When no `agentId`: return all SEO posts for the user (across all agents)
- Add agent name to the response for identification

**Page UI:**
- Table of all SEO posts across all agents
- Columns: Title, Agent Name, Status, SEO Score, Content Type, Created Date
- Filters: by agent, by status, by content type
- Click row → opens post detail (with SERP preview from Phase 1)

#### 2.6 Update Sidebar with New Routes (Week 2)

**File:** `src/user-dashboard/layout/UserSidebar.tsx`

Update "SEO & CONTENT" section with the new pages:
```
SEO & CONTENT
  ├── Keyword Research (/seo/keywords)       [NEW standalone page]
  ├── SEO Projects (/extensions/seo-agent)   [existing agent list]
  ├── Content Briefs (inside agent detail)    [links to agent detail ?tab=briefs]
  ├── All Articles (/seo/articles)           [NEW centralized view]
  ├── Post Hub (/post-hub)                   [existing]
  └── Content Calendar (/content-calendar)   [existing]
```

#### 2.7 Show Locked SEO Items Pre-Purchase (Week 2-3)

**File:** `src/user-dashboard/layout/UserSidebar.tsx`

For users without SEO Agent purchased:
- Show all SEO sidebar items with a small Lock icon or "PRO" badge
- Clicking any locked item navigates to `/marketplace` or opens a promotional modal
- Modal shows: SEO Agent description, feature list, $15 price, "Purchase" CTA

---

### Phase 2 QA Checklist

| # | Test | Expected | Risk |
|---|------|----------|------|
| 1 | Tabbed detail page loads with 5 tabs | All tabs render, default is Overview | MEDIUM |
| 2 | Tab switching preserves state | Switch Keywords → Articles → back, keyword search state preserved | MEDIUM |
| 3 | Tab URL param works (`?tab=keywords`) | Direct link opens correct tab, refresh preserves tab | LOW |
| 4 | Keywords tab: "Auto-Cluster" button | Appears when 5+ keywords, calls `clusterKeywords`, shows clusters | MEDIUM |
| 5 | Clustering deducts 10 credits | Credit transaction created with correct amount | HIGH |
| 6 | Cluster display shows name, intent, keywords | All cluster data rendered in collapsible cards | LOW |
| 7 | "Generate Brief" from cluster | Calls `generateContentBrief`, brief appears in Briefs tab, 15 credits deducted | HIGH |
| 8 | Briefs tab lists all briefs | `getContentBriefs` returns briefs for agent, each shows outline | MEDIUM |
| 9 | "Generate Article" from brief | Calls `generateArticleFromBrief`, article appears in Articles tab, 40 credits deducted | HIGH |
| 10 | Standalone keyword research page loads | `/seo/keywords` renders with search bar | HIGH |
| 11 | Keyword search (related mode) | Enter keyword, see 20-30 results with metrics, 10 credits deducted | HIGH |
| 12 | Keyword search (domain mode) | Enter domain, see SpyFu results, 10 credits deducted | MEDIUM |
| 13 | Keyword search with no agentId | Keywords stored with `agentId: null`, no foreign key error | HIGH |
| 14 | "Save to Agent" on keyword result | Dropdown shows user's agents, saving creates keyword with selected agentId | MEDIUM |
| 15 | Centralized articles page loads | `/seo/articles` shows all SEO posts across all agents | HIGH |
| 16 | Articles page filtering | Filter by agent, status, content type all work | MEDIUM |
| 17 | New sidebar items link correctly | All new routes accessible from sidebar | MEDIUM |
| 18 | Locked items for non-SEO users | Lock icon visible, click goes to marketplace | MEDIUM |
| 19 | Existing agent detail URL still works | `/extensions/seo-agent/:id` loads tabbed page, no 404 | HIGH |
| 20 | All existing routes still work | `/extensions/seo-agent`, `/extensions/seo-agent/create`, etc. | HIGH |
| 21 | DB migration runs without data loss | `agentId` nullable on SeoAgentKeyword, existing data intact | HIGH |
| 22 | Extension guard on new pages | Non-SEO users cannot access `/seo/keywords` or `/seo/articles` | HIGH |
| 23 | Credit deduction on all new operations | Clustering: 10, Brief: 15, Article from brief: 40, Standalone search: 10 | HIGH |
| 24 | Mobile: tabbed page responsive | Tabs scroll horizontally on narrow screens | MEDIUM |
| 25 | Mobile: keyword research page responsive | Search bar + results table usable on mobile | MEDIUM |

---

## What Was Cut (and Why)

| Change | Reason |
|--------|--------|
| Normalize keyword storage (junction table) | DB migration risk for zero user benefit. JSON works at current scale. PM + Backend Architect agreed. |
| Extract WordPress config to separate model | Breaks `publishScheduledPosts` cron job. Zero user value. Backend Architect flagged as DANGEROUS. |
| Content approval workflow | No user demand signal. Draft status is sufficient. PM cut. |
| Real-time SEO Content Editor | 4-6 week standalone project. Deferred to Phase 3. All agents agreed. |
| Competitor keyword gap analysis | Depends on SpyFu multi-domain. Deferred until standalone search proves useful. |
| Guided onboarding flow | Simplified wizard largely solves this. Reassess after Phase 1 metrics. |
| Free tier preview access | Requires credit system changes. Wait for lock-icon conversion data from Phase 2. |
| Fix SpyFu related keywords | Low priority. OpenAI fallback works. Fix opportunistically. |

---

## Agent Assignments

### Phase 1 Agents (3-5 days)

| Agent | Responsibility | Files |
|-------|---------------|-------|
| Agent 1: Bug Fixer | Fix FN-4 (credit refund), FN-7 (toast count), FN-1 (stat card), FN-5 (post viewer) | `keywordOperations.ts`, `SeoAgentDetailPage.tsx` |
| Agent 2: Wizard Simplifier | Collapse wizard to 3 steps, remove AI Provider, set defaults | `SeoAgentFormPage.tsx` |
| Agent 3: Sidebar Restructurer | New SEO section, locked items, special-case seo-agent | `UserSidebar.tsx` |
| Agent 4: Settings & SERP | Add settings card to detail page, build SERP preview component | `SeoAgentDetailPage.tsx`, `components/SerpPreview.tsx` |
| Agent 5: QA Verifier | Run all 18 Phase 1 test cases | All files |

### Phase 2 Agents (2-3 weeks)

| Agent | Responsibility | Files |
|-------|---------------|-------|
| Agent 1: Tab Architect | Rebuild detail page with 5 tabs | `SeoAgentDetailPage.tsx` |
| Agent 2: Hidden Features | Build clustering UI + briefs UI within tabs | `SeoAgentDetailPage.tsx` |
| Agent 3: Standalone Keyword | New page + backend modification + schema migration | `KeywordResearchPage.tsx`, `keywordOperations.ts`, `main.wasp`, `schema.prisma` |
| Agent 4: Centralized Articles | New articles page + backend modification + sidebar update | `SeoArticlesPage.tsx`, `postOperations.ts`, `main.wasp`, `UserSidebar.tsx` |
| Agent 5: QA Verifier | Run all 25 Phase 2 test cases | All files |

---

## Success Metrics

After Phase 1:
- Wizard completion rate: target >80% (from estimated <40%)
- Steps to first article: target 8 (from 22)
- Bug fix: zero credits lost to failed keyword research

After Phase 2:
- Steps to first keyword search: target 3 (from 11+)
- Content Briefs usage: target >20% of SEO users (from 0%)
- Keyword Clustering usage: target >15% of SEO users (from 0%)
- Feature discovery rate: target >60% (from estimated <20%)
