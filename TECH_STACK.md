Here’s a solid, “build-it-on-weekends but scalable” technical architecture for a teacher timer app (web-first, then mobile).

## Goals the stack should satisfy

- **Instant load** (classroom tools can’t be slow)
- **Offline-capable** (Wi-Fi in schools is unreliable)
- **Runs great full-screen** on projector/smartboard
- **Simple deploy + low ops**
- **Room to grow** into accounts, syncing, templates, analytics

---

## Recommended architecture (phased)

### Phase 1: MVP (no accounts)

**Client-only PWA** + static hosting

**Frontend**

- **Next.js (React) + TypeScript**
  - App Router, static export or serverless
  - Great SEO for “classroom timer / teacher timer”

- UI: **Tailwind CSS**
- State: React state for MVP
- Forms/validation: **zod** (nice with TypeScript)

**PWA / Offline**

- **next-pwa** (or Workbox directly)
- Cache strategy:
  - App shell + assets: precache
  - Sounds/images: cache-first
  - Versioned builds so updates are safe

**Local persistence**

- **localStorage** for presets + settings (simple)
- Upgrade path: **IndexedDB (Dexie.js)** for lesson templates + logs (if needed)

**Hosting**

- **Vercel** (easiest for Next.js)
- Domain + CDN included

**Why this works**

- Cheapest and fastest: no backend required, still feels like an app, works offline.

---

### Phase 2: Accounts + Sync (optional sign-in)

Add a backend (still low ops)

**Auth**

- **Supabase**
- Login options: Google + email magic link (teachers like Google)

**Backend**

**Supabase**

- Postgres DB
- Auth
- Row-level security (nice for multi-tenant schools)
- Edge Functions (light server code)
- Storage (if you later add media/themes)

**API style**

- **tRPC** if you stay full TypeScript (great DX)
- or simple **Next.js route handlers** (REST-ish)

**What you sync**

- Presets
- Lesson templates
- User settings (theme, sounds)
- Optional: time logs

---

### Phase 3: Mobile apps

If the PWA isn’t enough, you can ship native apps without rewriting much.

**Mobile**

- **React Native with Expo**
- Share core timer logic via a monorepo (Turborepo)
- Use same design tokens / UI primitives as web where possible

**Why Expo**

- Fast distribution, push notifications if you add reminders later
- Better device support (e.g., keep screen awake, sound behaviors)

---

## Data model (simple + future-proof)

Even if MVP is local-only, design the objects like they’ll later sync.

**Preset**

- id (uuid)
- name
- durationSeconds
- sortOrder
- createdAt, updatedAt

**LessonTemplate**

- id
- name
- steps: [{ stepId, title, durationSeconds }]
- createdAt, updatedAt

**Settings**

- theme: light/dark/high-contrast
- sound: bell/chime/silent
- volume (0–1)
- finalMinuteWarnings: boolean
- autoFullscreenPrompt: boolean

**TimeLog (optional premium)**

- id
- templateId (nullable)
- startedAt
- stepsRun: [{ title, plannedSeconds, actualSeconds }]
- totalActualSeconds

---

## Key engineering decisions for a “timer” app

**Accuracy**

- Don’t rely solely on `setInterval`.
- Use a “wall clock” approach:
  - store `startTimestamp` + `duration`
  - compute remaining time from `Date.now()` each tick

- Handle tab sleep:
  - use `visibilitychange` to re-sync remaining time when tab resumes

**Audio**

- Use Web Audio or preloaded HTML audio
- Safari quirks: require user interaction before playing sound
- Provide “visual only” mode

**Keep screen awake**

- On web: use the **Wake Lock API** when available
- Fallback: prompt user to disable sleep / use guided access (iPad)

**Full-screen**

- Fullscreen API for projector mode
- Provide big “Enter Fullscreen” CTA (many classrooms need it)

---

## Observability & analytics (privacy-friendly)

MVP: keep it minimal.

- **Posthog** (privacy-first analytics in cookieless mode)
- Track only:
  - page view
  - timer started
  - preset used
  - fullscreen used

- No student info, no keystroke/session replay.

---

## Suggested repo / structure

**Single repo (MVP)**

- `apps/web` (Next.js)
- `packages/core` (timer engine + shared types)

Later (if Expo):

- `apps/mobile` (Expo)
- `packages/ui` (shared components/tokens)
- Use **Turborepo** for builds.

---

## Deployment checklist

- HTTPS enforced
- Cache busting for PWA updates
- “New version available → refresh” banner (important for schools)
- Light + dark + high-contrast themes
- Lighthouse performance target: 95+

---
