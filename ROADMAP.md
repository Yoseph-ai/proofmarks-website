# Project Roadmap

Based on `ARCHITECTURE.md` and `SECURITY.md`. Tasks are ordered for efficient execution.

## 0. Foundation (Pre‑requisite)

- [ ] **Centralise environment configuration** – create `src/lib/config.js` that exports validated `operatorId`, `operatorKey`, `mirrorNodeUrl`, `topicId`. Update all files to import from here. (`ARCHITECTURE.md: env handling fragmentation`) [1.5h]

## 1. Logic Fixes

- [ ] **Fix race condition in `submitHash()`** – implement in‑memory `Set` lock keyed by document hash to prevent duplicate submissions. Add a regression test (simulate two concurrent requests). (`SECURITY.md: High – duplicate submission`) [3h]
- [ ] **Add paging limits to `verifyHash()`** – stop after 20 pages, add error handling for malformed `next` links. (`SECURITY.md: Medium – unbounded topic scan`) [2.5h]
- [ ] **Validate `certificateId` strictly** – use regex `^\d+\.\d+\.\d+@\d+$` in `/api/certificate/[certificateId]/route.js`. (`SECURITY.md: Medium – certificateId parsing`) [1h]
- [ ] **Fix `sequence` / `sequenceNumber` mismatch** – update client `timestamp/page.tsx` to use `data.sequenceNumber`. (`SECURITY.md: Low – sequence mismatch`) [1h]
- [ ] **Remove duplicate `<Header />`** in `src/app/page.tsx`. (`ARCHITECTURE.md: duplicate Header`) [0.5h]

## 2. Security Patches

- [ ] **Add API key authentication** – require `x-api-key` header on all `/api/*` routes, read from `.env`. (`SECURITY.md: Medium – public unauthenticated APIs`) [1.5h]
- [ ] **Add rate limiting** – implement simple in‑memory rate limiter (e.g., 100 requests per minute per IP) on `/api/timestamp` and `/api/verify`. [1h]
- [ ] **Encode `certificateId` in client API call** – use `encodeURIComponent(certificateId)` in `src/app/verify/[certificateId]/page.tsx`. (`SECURITY.md: Medium – route parameter handling`) [0.5h]
- [ ] **Harden Mirror Node response handling** – guard against missing `msg.message` in `/api/certificate/[certificateId]/route.js`. (`SECURITY.md: Medium – invalid message payload`) [1h]
- [ ] **Add file upload validation** – restrict to PDF only (MIME type `application/pdf`, file extension `.pdf`, size ≤10 MB). Use `pdfplumber` safely (no external calls). [1.5h]
- [ ] **Write regression test for duplicate submission** – simulate concurrent requests to confirm lock works. [1h]

## 3. Code Cleanup

- [ ] **Extract shared utilities** – move `toHex()`, timestamp formatting, mirror URL selection into `src/lib/utils.js`. (`ARCHITECTURE.md: duplicate logic`) [2h]
- [ ] **Consolidate certificate payload schema** – define shared TypeScript interface for certificate responses; use across `hederaService.js`, APIs, and UI. (`ARCHITECTURE.md: schema mismatches`) [2h]
- [ ] **Migrate server/service code to TypeScript** – convert `src/lib/hederaService.js` and all `route.js` files to `.ts`. (`ARCHITECTURE.md: mixed file styles`) [4h]
- [ ] **Move `.env` writes out of CLI scripts** – `scripts/create-topic.js` should not modify `.env`; output topic ID to console instead. (`ARCHITECTURE.md: script coupling`) [1h]
- [ ] **Standardise field names** – ensure server always returns `sequenceNumber` (not `sequence`) and clients consume it. [1h]

## 4. Validation (Post‑fix)

- [ ] Run `npm audit` again – fix any new warnings.
- [ ] Manually test duplicate submission with two concurrent tabs.
- [ ] Attempt malicious inputs (e.g., `certificateId` with `../../`) – confirm rejection.
- [ ] Upload a non‑PDF file – should be rejected.
- [ ] Run the same Copilot audit prompt again – verify all previous findings are resolved.

## Blockers

- Foundation (centralised config) must be completed **before** any other task.
- Shared utility extraction should be done **before** schema consolidation and TypeScript migration.
- API authentication and rate limiting are prerequisites for any public‑facing pilot.
