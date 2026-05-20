# Architecture Overview

## Repository Structure

- `src/app/`
  - `page.tsx` - homepage with landing links and duplicated `Header` usage.
  - `layout.tsx` - root layout for the app, imports `Header` and global styles.
  - `timestamp/page.tsx` - client page for document timestamping.
  - `verify/page.tsx` - client page for uploading a document and verifying by hash.
  - `verify/[certificateId]/page.tsx` - client page for viewing a specific certificate by ID.
  - `api/timestamp/route.js` - server route that accepts a hash and timestamps it via Hedera.
  - `api/verify/route.js` - server route that accepts a hash and checks the topic for a match.
  - `api/certificate/[certificateId]/route.js` - server route that resolves a certificate ID to an on-chain message.
  - `workers/certificate.worker.ts` - web worker that generates a PDF certificate from timestamp metadata.

- `src/components/`
  - `Header.tsx` - shared site header.
  - `DragDrop.tsx` - dropzone file upload component.
  - `Certificate.tsx` - UI component displaying timestamp/certificate details.
  - `ui/` - local UI primitives used by the app.

- `src/lib/hederaService.js`
  - central Hedera service helper for topic creation, hash submission, lookup, and connection testing.

- `scripts/`
  - `create-topic.js` - CLI helper script to create a Hedera topic and optionally append it to `.env`.
  - `test-hedera.js` - CLI smoke test for Hedera connectivity and timestamp/verify flow.

## Data Flow

1. Client selects a file in either `timestamp` or `verify` pages.
2. Browser computes SHA-256 on the file using `crypto.subtle.digest`.
3. Timestamp flow (`timestamp/page.tsx`):
   - POST `/api/timestamp` with `{ hash }`
   - `src/app/api/timestamp/route.js` validates hash and calls `submitHash()`.
   - `src/lib/hederaService.js` checks for duplicates via `verifyHash()` and submits a message to the HCS topic.
   - Response returns a certificate object with `certificateId`, `transactionId`, `timestamp`, `timestampIso`, `mirrorNodeUrl`, and other metadata.
   - Client generates a PDF using `src/app/workers/certificate.worker.ts` and provides a download link.

4. Verify flow (`verify/page.tsx`):
   - POST `/api/verify` with `{ hash }`
   - `src/app/api/verify/route.js` validates hash and calls `verifyHash()`.
   - `src/lib/hederaService.js` scans the topic messages from the Mirror Node until it finds a matching hash or exhausts data.
   - Response returns `{ exists, timestamp, sequenceNumber, network, mirrorNodeUrl, certificateId }`.
   - Client renders verification details and a deep link into Mirror Node data.

5. Certificate lookup flow (`verify/[certificateId]/page.tsx`):
   - Client calls `/api/certificate/{certificateId}`.
   - `src/app/api/certificate/[certificateId]/route.js` parses `certificateId`, fetches the exact topic message from the Mirror Node, decodes the base64 payload, and returns certificate metadata.
   - Client renders certificate detail page using that response.

## Key Architectural Components

- `src/lib/hederaService.js`
  - Single point for Hedera SDK use.
  - Supports `createTopic()`, `submitHash()`, `verifyHash()`, and `testConnection()`.
  - Reads environment vars via `dotenv.config()`.
  - Uses lazy initialization and logs missing environment variables instead of failing immediately.

- `src/app/api/*/route.js`
  - Thin server adapters that validate request data and call service helpers.
  - `timestamp` and `verify` routes reuse `hederaService.js`.
  - `certificate` route uses independent Mirror Node fetch logic instead of the shared service.

- `src/app/workers/certificate.worker.ts`
  - Separate PDF generation pipeline in a web worker.
  - Accepts certificate metadata and QR code data URL.
  - Produces a binary PDF for download.

- Client pages are all marked `use client`.
  - `timestamp` and `verify` pages compute file hashes and call server APIs.
  - certificate detail page solely fetches API data and renders it.

## Inconsistencies & Fragmentation

### 1. Mixed JS/TS file styles
- `src/app/api/*.route.js` and `src/lib/hederaService.js` are plain JavaScript with `.js` extension.
- UI pages and components are TypeScript/TSX.
- `src/app/workers/certificate.worker.ts` is TypeScript, but imports are not always type-consistent with the rest of the JS service layer.

### 2. Duplicate logic
- `toHex()` is duplicated in `timestamp/page.tsx` and `verify/page.tsx`.
- Timestamp formatting logic exists in both `src/app/api/certificate/[certificateId]/route.js` and `verify/page.tsx`.
- Mirror Node URL selection logic is repeated in `verifyHash()`, `submitHash()`, and `api/certificate/[certificateId]/route.js`.

### 3. Schema mismatches and ad hoc payload shapes
- `submitHash()` returns both raw `timestamp` and `timestampIso`, but client components sometimes use only one field.
- `Certificate.tsx` falls back to `new Date(timestamp)` when `timestampIso` is absent, but `timestamp` is a Hedera-style `seconds.nanos` string that is not reliably parseable by JavaScript.
- `verifyHash()` returns `certificateId`, while certificate route independently reconstructs IDs from parameters; there is no shared typed schema for certificate payloads.
- `timestamp/page.tsx` uses `result.sequence` when generating the worker payload, but the server returns `sequenceNumber`; this is a potential mismatch unless the API response always includes `sequence` as alias.

### 4. UI composition issues
- `src/app/layout.tsx` already renders `<Header />` for every page.
- `src/app/page.tsx` also renders `<Header />`, causing duplicate header output on the homepage.
- `Header.tsx` uses `next/image` while other pages use plain `<img>` tags, mixing image loading patterns.

### 5. Service coupling and route duplication
- `src/app/api/certificate/[certificateId]/route.js` bypasses `hederaService.js` and reimplements Mirror Node fetch logic.
- `verifyHash()` performs a full topic scan to detect duplicates and verification; this scan is expensive and repeated by `submitHash()` during duplicate checks.
- `scripts/create-topic.js` and `scripts/test-hedera.js` both import `src/lib/hederaService.js`, but `create-topic.js` also manually edits `.env`, which couples runtime logic with deployment configuration.

### 6. Environment handling
- `hederaService.js` lazy-initializes environment values and logs warnings, but `createTopic()` and `submitHash()` still fail if env is missing.
- `.env` is used in scripts and in server routes, but there is no central config module or environment schema.

## Architecture Feel

The project is largely centered around a central Hedera service plus a few client flows, but the architecture feels fragmented because:

- There is no single shared domain model for certificates and hashes.
- API payload shapes are assembled independently in several places.
- UI and service layers mix JavaScript and TypeScript without a consistent typing boundary.
- Some utility behavior is duplicated instead of centralized.
- The certificate lookup route duplicates Mirror Node logic instead of reusing the Hedera service.

## Recommendations for consolidation

- Create shared schema/types for certificate payloads and API responses.
- Move common utilities like `toHex()`, timestamp formatting, and mirror URL selection into a shared helper module.
- Align the route layer with the service layer: let `api/certificate` reuse `hederaService.js` or a separate certificate helper.
- Remove the duplicate `Header` render in `src/app/page.tsx`.
- Convert the API and service code consistently to TypeScript or consistently remain JavaScript with clear boundaries.
- Centralize `.env` / Hedera network configuration in a single config module.
