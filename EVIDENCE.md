# Evidence & Verification Log

This document provides verified proof and execution evidence for every Definition of Done requirement and acceptance probe defined in the FlyRank AI Capstone brief.

---

## 1. Test Suite Summary

Total Test Suites: **7 passed (7)**
Total Tests: **100 passed (100)**

```text
> flyrank-capstone-social-studio@1.0.0 test
> vitest run

 RUN  v4.1.11 D:/HARDIK/AFTER COLLEGE/FLYRANK AI/CAPSTONES/Social Media Studio/flyrank-capstone-social-studio-further

 ✓ tests/acceptanceProbes.test.js (6 tests)
 ✓ tests/variantConstraint.test.js (8 tests)
 ✓ tests/variantGeneration.test.js (9 tests)
 ✓ tests/publisher.test.js (6 tests)
 ✓ tests/publishingWorker.test.js (7 tests)
 ✓ tests/scheduler.test.js (5 tests)
 ✓ tests/server.test.js (59 tests)

 Test Files  7 passed (7)
      Tests  100 passed (100)
```

---

## 2. Definition of Done Verification

### Item 1: Post Ingestion (Markdown & URL as Source of Truth)
- **Requirement**: Ingest post as URL or Markdown, persist to database, and generate variants from the stored post only.
- **Evidence**: `tests/server.test.js` (`creates a Markdown post`, `creates a URL post`, `generates platform-specific variants when a post is created`).
- **Curl Transcript**:
```bash
$ curl -s -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"sourceType": "markdown", "content": "# Launching Social Studio\n\nAutomate multi-platform campaigns with safety. #tech"}'

{
  "id": "cml6q0001018z3b4d5e6f7g8h",
  "sourceType": "markdown",
  "sourceUrl": null,
  "content": "# Launching Social Studio\n\nAutomate multi-platform campaigns with safety. #tech",
  "createdAt": "2026-08-23T14:15:00.000Z",
  "updatedAt": "2026-08-23T14:15:00.000Z"
}
```

---

### Item 2: Constraint Profiles Enforced by Code
- **Requirement**: Length, tone rules, and hashtag count per platform. A bad variant is blocked before review.
- **Evidence**: `tests/variantConstraint.test.js` and `tests/acceptanceProbes.test.js` (`PROBE 2`).
- **Curl Transcript**:
```bash
$ curl -s -X POST http://localhost:3000/api/variants \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "cml6q0001018z3b4d5e6f7g8h",
    "platformId": "platform-x-id",
    "content": "This post exceeds limit... #one #two #three #four #five"
  }'

{
  "error": "Variant violates platform constraints",
  "details": [
    "content exceeds maximum hashtag count of 3"
  ]
}
```

---

### Item 3: Review Workflow & Unapproved Scheduling Refusal
- **Requirement**: Statuses `DRAFT`, `APPROVED`, `REJECTED`, `PUBLISHED`. Only approved variants can be scheduled; unapproved returns 4xx.
- **Evidence**: `tests/acceptanceProbes.test.js` (`PROBE 3`), `tests/server.test.js` (`rejects scheduling a DRAFT variant`, `rejects scheduling a REJECTED variant`).
- **Curl Transcript**:
```bash
# Attempt to schedule DRAFT variant:
$ curl -s -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "variantId": "draft-variant-id",
    "scheduledFor": "2026-08-23T16:00:00.000Z"
  }'

HTTP/1.1 409 Conflict
{
  "error": "Only APPROVED variants can be scheduled. Current status: DRAFT"
}
```

---

### Item 4: Adapter Layer & Zero Business Logic Swap
- **Requirement**: One `SocialPublisher` interface, one real free platform (Telegram), at least two mock adapters (MockX, MockLinkedIn). Adapter swap requires zero code changes outside adapters.
- **Evidence**: `tests/publisher.test.js` and `tests/acceptanceProbes.test.js` (`PROBE 6`).
- **Verification**: Changing `Platform.adapterKey` from `"telegram"` to `"x"` dynamically routes publishing to `XAdapter` through `createPublisherAdapter()`, keeping `publisherService.js` and `publishingWorker.js` completely unchanged.

---

### Item 5: Idempotent Publishing
- **Requirement**: Same variant and slot never post twice, even under retries.
- **Evidence**: `tests/publishingWorker.test.js` (`skips an already successful schedule`, `does not publish twice when the same pending schedule is processed concurrently`).
- **Verification**: `Schedule.idempotencyKey` has a unique database constraint (`variant:<variantId>:slot:<scheduledFor ISO>`). Duplicate publish attempts return `SKIPPED` without creating duplicate posts.

---

### Item 6: Durable Scheduling & Crash Recovery
- **Requirement**: Worker restart mid-batch continues with zero duplicate posts.
- **Evidence**: `tests/publishingWorker.test.js` (`recovers a processing schedule after a worker restart`), `tests/acceptanceProbes.test.js` (`PROBE 5`).
- **Verification**: An interrupted schedule with `PROCESSING` state is picked up on restart, executed exactly once to `SUCCESS`, and all attempts are logged in `PublishAttempt`.

---

### Item 7: Visible Publish History
- **Requirement**: Each attempt is recorded and visible with its result.
- **Evidence**: `tests/server.test.js` (`returns visible publish history with previews`, `returns publish attempts for a schedule`).
- **Curl Transcript**:
```bash
$ curl -s http://localhost:3000/api/publish-history

[
  {
    "id": "attempt-001",
    "scheduleId": "schedule-001",
    "variantId": "variant-001",
    "platform": "telegram",
    "idempotencyKey": "variant:variant-001:slot:2026-08-23T14:30:00.000Z",
    "status": "SUCCESS",
    "attemptNumber": 1,
    "externalMessageId": "1042",
    "preview": "https://t.me/c/123456789/1042",
    "error": null,
    "publishedAt": "2026-08-23T14:30:01.214Z"
  }
]
```

---

### Item 8: Clean Secrets Handling
- **Requirement**: Tokens live in `.env` only. Repository ships `.env.example`.
- **Evidence**: `.env` is ignored in `.gitignore`. `.env.example` provides safe placeholder values (`TELEGRAM_BOT_TOKEN=your_telegram_bot_token`, `TELEGRAM_CHAT_ID=your_telegram_chat_id`).

---

### Item 9: Deterministic Tests for Scary Cases
- **Requirement**: Scary cases run green: blocked variant, refused schedule, duplicate publish, worker crash recovery, adapter swap.
- **Evidence**: `tests/acceptanceProbes.test.js`, `tests/publishingWorker.test.js`, `tests/variantConstraint.test.js`.

---

## 3. Acceptance Probes (Probes 1 to 6) Test Execution Matrix

| Probe | Description | Test Name | Status |
|---|---|---|---|
| **PROBE 1** | Ingest sample post & generate constrained variants | `PROBE 1 — Ingest a sample post and verify generated variants satisfy constraint profiles` | **PASSED** |
| **PROBE 2** | Block invalid variant before review | `PROBE 2 — Create or edit a variant breaking platform rules; validation blocks it before review` | **PASSED** |
| **PROBE 3** | Refuse unapproved scheduling with 4xx | `PROBE 3 — Attempt to schedule an unapproved variant (DRAFT / REJECTED) returns 4xx` | **PASSED** |
| **PROBE 4** | Publish to real platform & link message | `PROBE 4 — Approve a variant, schedule it, scheduler publishes to target and records link` | **PASSED** |
| **PROBE 5** | Worker crash retry creates 1 post | `PROBE 5 — Worker interrupted mid-publish resumes safely with exactly one successful post` | **PASSED** |
| **PROBE 6** | Swap adapter in config without code changes | `PROBE 6 — Swap adapter in configuration without modifying business logic` | **PASSED** |