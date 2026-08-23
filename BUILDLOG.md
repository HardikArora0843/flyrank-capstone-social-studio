# Build Log & AI Assistance Record

This document records the incremental development of the Social Media Studio capstone, detailing design decisions, AI tool assistance, corrections made, and verification steps.

---

## Phase 1 — Project Inception & Design

### Work Completed:
- Initialized Node.js project with ES modules, Express 5, Prisma ORM 7, Better-SQLite3, and Vitest.
- Designed system architecture in `docs/design.md` detailing the data model (`Post`, `Platform`, `Variant`, `Schedule`, `PublishAttempt`), state machine, and adapter boundaries.
- Defined non-goals (real OAuth for paid networks, image generation, analytics, multi-tenancy).

### AI Assistance & Evaluation:
- **Where AI helped**: Outlining the initial entity relationship model and defining the polymorphic publisher interface.
- **Where AI was corrected**: Initial design contemplated in-memory queueing. This was corrected to use a persistent database job store in SQLite to guarantee worker crash recovery and durability.

---

## Phase 2 — Ingestion & Constraint Profiles

### Work Completed:
- Built ingestion controllers & services supporting raw Markdown and URL scraping (`src/services/postService.js`).
- Created platform constraint enforcement and validation engines (`src/services/variantConstraintService.js`) covering character length, hashtag quotas, and tone rules (`concise`, `professional`, `informative`).
- Generated platform-specific variants on ingestion while preserving the stored post as the immutable source of truth.

### AI Assistance & Evaluation:
- **Where AI helped**: Writing regex tokenizers for hashtags and sentence counts.
- **Where AI was corrected**: Initial truncation logic cut words in mid-token and left orphaned hashtags. Added clean token-based filtering and character bounding.

---

## Phase 3 — Review Workflow & State Machine

### Work Completed:
- Implemented variant state transitions: `DRAFT`, `APPROVED`, `REJECTED`, `PUBLISHED`.
- Added review endpoints (`PATCH /api/variants/:id`, `POST /api/variants/:id/approve`, `POST /api/variants/:id/reject`).
- Enforced constraint re-validation on variant edit/approval.
- Enforced strict refusal of unapproved variants at the scheduling layer (`POST /api/schedules` and `POST /api/variants/:id/schedule` return 409 Conflict).

### AI Assistance & Evaluation:
- **Where AI helped**: Structuring Express route handlers and input validation helpers.
- **Where AI was corrected**: When editing a variant, the status was initially preserved. Corrected so that modifying content automatically resets the status to `DRAFT`, requiring re-approval.

---

## Phase 4 — Publisher Adapters & Idempotency

### Work Completed:
- Defined `PublisherAdapter` abstract base class with uniform `publish({ content, idempotencyKey })` contract.
- Implemented `TelegramAdapter` calling the Telegram Bot API `sendMessage` and generating live message links (`https://t.me/...`).
- Implemented `MockXAdapter` and `MockLinkedInAdapter` recording publish previews.
- Designed deterministic idempotency keys: `variant:<variantId>:slot:<scheduledFor ISO>` with unique index in SQLite.

### AI Assistance & Evaluation:
- **Where AI helped**: Crafting the dynamic factory `createPublisherAdapter(platform)` based on `platform.adapterKey`.
- **Where AI was corrected**: Telegram chat ID parsing required handling channel prefixes (`@channel` vs `-100...` supergroup IDs) to construct valid web preview URLs.

---

## Phase 5 — Durable Scheduling, Worker Recovery & Publish History

### Work Completed:
- Built `publishingWorker.js` with atomic claiming (`claimPendingSchedule`) to avoid race conditions.
- Implemented crash recovery: interrupted schedules in `PROCESSING` status are safely picked up on restart and completed without duplicate posts.
- Created `PublishAttempt` records tracking attempt numbers, errors, and previews.
- Added publishing metrics aggregation endpoint (`GET /api/metrics/publishing`).

### AI Assistance & Evaluation:
- **Where AI helped**: Writing concurrency protection and retry counter logic (`MAX_PUBLISH_ATTEMPTS`).
- **Where AI was corrected**: Concurrent executions of `processSchedule` previously had a window where two workers could both attempt to publish. Implemented atomic `updateMany` claiming on `PENDING` schedules.

---

## Phase 6 — Verification & Acceptance Probes Suite

### Work Completed:
- Created standalone `tests/acceptanceProbes.test.js` validating all 6 official capstone acceptance probes.
- Added `vitest.config.js` with `fileParallelism: false` to ensure atomic SQLite testing without cross-suite database collisions.
- Validated 100 passing tests across 7 test suites.
- Completed `README.md` and `EVIDENCE.md` with complete documentation, diagrams, run steps, and actual verification transcripts.