# FlyRank AI Capstone — Social Media Studio

> **Transform one long-form blog post into an idempotent, multi-platform social media campaign with constraint enforcement, human review, durable scheduling, and pluggable publisher adapters.**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Platform Profiles & Constraints](#platform-profiles--constraints)
4. [Prerequisites & Installation](#prerequisites--installation)
5. [Database Setup & Seeding](#database-setup--seeding)
6. [Running the Application & Background Worker](#running-the-application--background-worker)
7. [Running Automated Tests](#running-automated-tests)
8. [Step-by-Step Feature Walkthrough & Acceptance Probes](#step-by-step-feature-walkthrough--acceptance-probes)
   - [Probe 1: Ingest Post & Auto-Generate Variants](#probe-1-ingest-post--auto-generate-variants)
   - [Probe 2: Constraint Validation Blocks Rule-Breaking Content](#probe-2-constraint-validation-blocks-rule-breaking-content)
   - [Probe 3: Refuse Scheduling Unapproved Variants](#probe-3-refuse-scheduling-unapproved-variants)
   - [Review Workflow: Edit, Approve, or Reject Variants](#review-workflow-edit-approve-or-reject-variants)
   - [Probe 4: Schedule & Publish to Target Platform](#probe-4-schedule--publish-to-target-platform)
   - [Probe 5: Worker Crash Resilience & Idempotency](#probe-5-worker-crash-resilience--idempotency)
   - [Probe 6: Zero-Code Adapter Swapping via Configuration](#probe-6-zero-code-adapter-swapping-via-configuration)
   - [Publish History & Metrics](#publish-history--metrics)
9. [Complete API Reference](#complete-api-reference)
10. [Troubleshooting & Windows Tips](#troubleshooting--windows-tips)
11. [Design Documentation & Submission Files](#design-documentation--submission-files)

---

## Project Overview

Social Media Studio is a backend service designed to solve the real-world challenges of multi-platform social media publishing:
- **Single Source of Truth**: Original blog posts (Markdown or web URLs) are stored in the database. All downstream platform variants derive strictly from the stored record.
- **Constraint Enforcement**: Automatically enforces platform-specific character limits, hashtag quotas, and tone rules (`concise`, `professional`, `informative`). Rule-breaking variants are rejected before entering human review.
- **Human Review State Machine**: Variants progress through explicit lifecycle states (`DRAFT` → `APPROVED` / `REJECTED` → `PUBLISHED`). Unapproved variants can **never** be scheduled.
- **Pluggable Adapter Seam**: Decoupled publisher architecture supporting real platforms (**Telegram Bot API**) and mock targets (**Mock X**, **Mock LinkedIn**) behind a uniform `PublisherAdapter` contract. Swapping an adapter requires zero modifications to business logic.
- **Durable Scheduling & Idempotency**: Scheduled slots are persisted in SQLite with unique idempotency keys (`variant:<id>:slot:<iso>`). Retries, network timeouts, or worker restarts will **never** create duplicate posts.

---

## System Architecture

```text
                                Blog Post
                           (URL or Markdown)
                                   │
                                   ▼
                         ┌───────────────────┐
                         │  Post Ingestion   │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │    Stored Post    │ (Single Source of Truth)
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Variant Generator │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────────┐
                         │ Constraint Validation │ (Enforces Length, Tone, Hashtags)
                         └───────────┬───────────┘
                                     │
                                     ▼
                       ┌───────────────────────────┐
                       │      Review Workflow      │
                       │  DRAFT -> APPROVED/REJECT │
                       └─────────────┬─────────────┘
                                     │ (Approved variants only)
                                     ▼
                       ┌───────────────────────────┐
                       │     Durable Scheduler     │ (SQLite / Persistent Job Store)
                       └─────────────┬─────────────┘
                                     │
                                     ▼
                       ┌───────────────────────────┐
                       │     Publishing Worker     │ (Atomic Claiming & Crash Safe)
                       └─────────────┬─────────────┘
                                     │
                                     ▼
                       ┌───────────────────────────┐
                       │  SocialPublisher Adapter  │
                       └─────┬───────────────┬─────┘
                             │               │
              ┌──────────────┴──┐         ┌──┴───────────────┐
              │                 │         │                  │
              ▼                 ▼         ▼                  ▼
      TelegramAdapter       MockXAdapter   MockLinkedInAdapter
       (Real Target)           (Mock)            (Mock)
              │                 │                  │
              └─────────────────┼──────────────────┘
                                │
                                ▼
                       ┌───────────────────┐
                       │  Publish History  │ (Idempotent 1 Slot = 1 Post)
                       └───────────────────┘
```

---

## Platform Profiles & Constraints

| Platform | Adapter Key | Type | Max Characters | Tone Requirement | Max Hashtags |
|---|---|---|---|---|---|
| **Telegram** | `telegram` | Real Free Target | 4,096 | `informative` | 10 |
| **X** | `x` | Mock | 280 | `concise` (max 3 sentences) | 3 |
| **LinkedIn** | `linkedin` | Mock | 3,000 | `professional` (no slang like *lol, omg, btw*) | 5 |

---

## Prerequisites & Installation

### 1. Prerequisites
- **Node.js** >= 18.0.0 (Node 20 or 22 recommended)
- **npm** >= 9.0.0

### 2. Clone & Install Dependencies
Open your terminal (PowerShell on Windows, or Terminal on macOS/Linux):
```bash
git clone https://github.com/HardikArora0843/flyrank-capstone-social-studio.git
cd flyrank-capstone-social-studio
npm install
```

### 3. Configure Environment Variables
Copy the template configuration into `.env`:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**macOS / Linux / Git Bash:**
```bash
cp .env.example .env
```

The default `.env` is configured for local SQLite development:
```env
PORT=3000
DATABASE_URL="file:./dev.db"
NODE_ENV=development

SCHEDULER_INTERVAL_MS=30000
MAX_PUBLISH_ATTEMPTS=3

# Optional: Set for live Telegram bot publishing (Probe 4)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

---

## Database Setup & Seeding

### 1. Apply Database Migrations
Create the SQLite database (`dev.db`) and apply all schema migrations:
```bash
npx prisma migrate dev
```

### 2. Seed Default Platform Profiles
Populate the database with the initial platform constraint profiles (Telegram, X, LinkedIn):
```bash
npm run seed
```

---

## Running the Application & Background Worker

### Option A: Start API Server with Built-in Scheduler
Starts the Express API server on `http://localhost:3000` and automatically runs the background publishing cycle every 30 seconds:
```bash
npm start
```

### Option B: Run Standalone Background Worker
To run the publishing worker in a separate dedicated process:
```bash
npm run worker
```

---

## Running Automated Tests

The test suite runs deterministically with Vitest (sequential database access for SQLite):

```bash
npm test
```

### Expected Output:
```text
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

## Step-by-Step Feature Walkthrough & Acceptance Probes

> **Note for Windows Users**: In PowerShell, use the provided `Invoke-RestMethod` commands. Postman / GUI users can copy the Postman instructions directly.

---

### Probe 1: Ingest Post & Auto-Generate Variants

Ingest a sample blog post. The system persists the post as the single source of truth and automatically generates 3 platform-specific variants (Telegram, X, LinkedIn) that pass their constraint profiles.

#### 1. Create Post

<details open>
<summary><b>Windows PowerShell</b></summary>

```powershell
$body = @{
    sourceType = "markdown"
    content = "# Launching Social Studio`n`nAutomate multi-platform social campaigns with safety and idempotency. Built for resilient engineering teams. #ai #tech #launch"
} | ConvertTo-Json

$post = Invoke-RestMethod -Uri "http://localhost:3000/api/posts" -Method Post -ContentType "application/json" -Body $body
$post
```
</details>

<details>
<summary><b>cURL (Linux / macOS / Git Bash)</b></summary>

```bash
curl -s -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "sourceType": "markdown",
    "content": "# Launching Social Studio\n\nAutomate multi-platform social campaigns with safety and idempotency. Built for resilient engineering teams. #ai #tech #launch"
  }'
```
</details>

<details>
<summary><b>Postman / REST Client</b></summary>

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/posts`
- **Headers**: `Content-Type: application/json`
- **Body (raw JSON)**:
```json
{
  "sourceType": "markdown",
  "content": "# Launching Social Studio\n\nAutomate multi-platform social campaigns with safety and idempotency. Built for resilient engineering teams. #ai #tech #launch"
}
```
</details>

**Expected Response (`201 Created`):**
```json
{
  "id": "cmt5qckkf0000b4d97w8ujynz",
  "sourceType": "markdown",
  "sourceUrl": null,
  "content": "# Launching Social Studio\n\nAutomate multi-platform social campaigns with safety and idempotency. Built for resilient engineering teams. #ai #tech #launch",
  "createdAt": "2026-08-23T11:34:45.279Z",
  "updatedAt": "2026-08-23T11:34:45.279Z"
}
```

---

#### 2. View the Generated Variants

<details open>
<summary><b>Windows PowerShell</b></summary>

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/posts/$($post.id)/variants"
```
</details>

<details>
<summary><b>cURL</b></summary>

```bash
curl -s http://localhost:3000/api/posts/<POST_ID>/variants
```
</details>

<details>
<summary><b>Postman</b></summary>

- **Method**: `GET`
- **URL**: `http://localhost:3000/api/posts/<POST_ID>/variants`
</details>

**Expected Response (`200 OK`):**
Returns 3 variants (for Telegram, X, LinkedIn) with status `DRAFT`, each strictly respecting length, hashtags, and tone.

---

### Probe 2: Constraint Validation Blocks Rule-Breaking Content

Attempt to manually create or edit a variant that violates platform rules (e.g. exceeding hashtag limits on X or using informal slang on LinkedIn).

<details open>
<summary><b>Windows PowerShell</b></summary>

```powershell
# Attempting to submit 6 hashtags when X only allows 3
$body = @{
    postId = $post.id
    platformId = "platform-x-id"
    content = "Check this out #one #two #three #four #five #six"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/variants" -Method Post -ContentType "application/json" -Body $body
} catch {
    $_.ErrorDetails.Message
}
```
</details>

<details>
<summary><b>cURL</b></summary>

```bash
curl -s -X POST http://localhost:3000/api/variants \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "<POST_ID>",
    "platformId": "<PLATFORM_ID>",
    "content": "Check this out #one #two #three #four #five #six"
  }'
```
</details>

<details>
<summary><b>Postman</b></summary>

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/variants`
- **Headers**: `Content-Type: application/json`
- **Body (raw JSON)**:
```json
{
  "postId": "<POST_ID>",
  "platformId": "<PLATFORM_ID>",
  "content": "Check this out #one #two #three #four #five #six"
}
```
</details>

**Expected Response (`400 Bad Request`):**
```json
{
  "error": "Variant violates platform constraints",
  "details": [
    "content exceeds maximum hashtag count of 3"
  ]
}
```

---

### Probe 3: Refuse Scheduling Unapproved Variants

Attempting to schedule a variant while it is still in `DRAFT` or `REJECTED` status is strictly blocked with `409 Conflict`.

<details open>
<summary><b>Windows PowerShell</b></summary>

```powershell
$body = @{
    scheduledFor = "2026-08-25T12:00:00.000Z"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/variants/<DRAFT_VARIANT_ID>/schedule" -Method Post -ContentType "application/json" -Body $body
} catch {
    $_.ErrorDetails.Message
}
```
</details>

<details>
<summary><b>cURL</b></summary>

```bash
curl -s -X POST http://localhost:3000/api/variants/<DRAFT_VARIANT_ID>/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledFor": "2026-08-25T12:00:00.000Z"
  }'
```
</details>

<details>
<summary><b>Postman</b></summary>

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/variants/<DRAFT_VARIANT_ID>/schedule`
- **Headers**: `Content-Type: application/json`
- **Body (raw JSON)**:
```json
{
  "scheduledFor": "2026-08-25T12:00:00.000Z"
}
```
</details>

**Expected Response (`409 Conflict`):**
```json
{
  "error": "Only APPROVED variants can be scheduled. Current status: DRAFT"
}
```

---

### Review Workflow: Edit, Approve, or Reject Variants

#### 1. Approve a Variant
<details open>
<summary><b>Windows PowerShell</b></summary>

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/variants/<VARIANT_ID>/approve" -Method Post
```
</details>

<details>
<summary><b>Postman</b></summary>

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/variants/<VARIANT_ID>/approve`
</details>

**Expected Response (`200 OK`):**
Variant status updates to `APPROVED`.

#### 2. Edit a Variant
*(Editing automatically re-validates constraints and resets status to `DRAFT` for re-approval)*
<details open>
<summary><b>Windows PowerShell</b></summary>

```powershell
$body = @{
    content = "Refined professional content for social campaign. #tech"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/variants/<VARIANT_ID>" -Method Patch -ContentType "application/json" -Body $body
```
</details>

<details>
<summary><b>Postman</b></summary>

- **Method**: `PATCH`
- **URL**: `http://localhost:3000/api/variants/<VARIANT_ID>`
- **Headers**: `Content-Type: application/json`
- **Body (raw JSON)**:
```json
{
  "content": "Refined professional content for social campaign. #tech"
}
```
</details>

#### 3. Reject a Variant
<details open>
<summary><b>Windows PowerShell</b></summary>

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/variants/<VARIANT_ID>/reject" -Method Post
```
</details>

<details>
<summary><b>Postman</b></summary>

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/variants/<VARIANT_ID>/reject`
</details>

---

### Probe 4: Schedule & Publish to Target Platform

Once a variant is `APPROVED`, schedule it for publication.

<details open>
<summary><b>Windows PowerShell</b></summary>

```powershell
$body = @{
    scheduledFor = "2026-08-23T12:00:00.000Z"
} | ConvertTo-Json

$schedule = Invoke-RestMethod -Uri "http://localhost:3000/api/variants/<APPROVED_VARIANT_ID>/schedule" -Method Post -ContentType "application/json" -Body $body
$schedule
```
</details>

<details>
<summary><b>cURL</b></summary>

```bash
curl -s -X POST http://localhost:3000/api/variants/<APPROVED_VARIANT_ID>/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledFor": "2026-08-23T12:00:00.000Z"
  }'
```
</details>

<details>
<summary><b>Postman</b></summary>

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/variants/<APPROVED_VARIANT_ID>/schedule`
- **Headers**: `Content-Type: application/json`
- **Body (raw JSON)**:
```json
{
  "scheduledFor": "2026-08-23T12:00:00.000Z"
}
```
</details>

**Expected Response (`201 Created`):**
```json
{
  "id": "cml6qschedule001",
  "variantId": "cmt5qckkf0000b4d97w8ujynz",
  "scheduledFor": "2026-08-23T12:00:00.000Z",
  "status": "PENDING",
  "idempotencyKey": "variant:cmt5qckkf0000b4d97w8ujynz:slot:2026-08-23T12:00:00.000Z"
}
```

When the scheduled time arrives, the background worker picks up the job, marks the schedule and variant `PUBLISHED`, and creates a `PublishAttempt` record with a preview of the publication.

---

### Probe 5: Worker Crash Resilience & Idempotency

1. **Idempotency**: Submitting the same variant for the same time slot returns `409 Conflict` (enforced by a database uniqueness constraint on `idempotencyKey`).
2. **Crash Resilience**: If a publishing worker process stops while executing a batch (leaving a schedule in `PROCESSING` status), upon restart the worker automatically resumes unfinished work, records the success, and produces **zero duplicate external posts**.

---

### Probe 6: Zero-Code Adapter Swapping via Configuration

The application interacts strictly with the `PublisherAdapter` interface. Swapping a platform's publishing target (for example, from Telegram to Mock X) requires only updating `adapterKey` in the database:
- The adapter factory `createPublisherAdapter(platform)` dynamically instantiates the appropriate adapter (`TelegramAdapter`, `XAdapter`, `LinkedInAdapter`).
- **Zero code changes** are needed in any controller, service, route, or scheduler.

---

### Publish History & Metrics

#### 1. View Publish History
Inspect all completed and recorded publications:

<details open>
<summary><b>Windows PowerShell</b></summary>

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/publish-history"
```
</details>

<details>
<summary><b>Postman</b></summary>

- **Method**: `GET`
- **URL**: `http://localhost:3000/api/publish-history`
</details>

**Expected Response (`200 OK`):**
```json
[
  {
    "id": "attempt-001",
    "scheduleId": "schedule-001",
    "platform": "telegram",
    "status": "SUCCESS",
    "attemptNumber": 1,
    "preview": "https://t.me/c/123456789/1042",
    "publishedAt": "2026-08-23T12:00:01.120Z"
  }
]
```

#### 2. View Aggregate Metrics
Inspect counts of pending, published, and failed schedules:

<details open>
<summary><b>Windows PowerShell</b></summary>

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/metrics/publishing"
```
</details>

<details>
<summary><b>Postman</b></summary>

- **Method**: `GET`
- **URL**: `http://localhost:3000/api/metrics/publishing`
</details>

---

## Complete API Reference

| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `GET` | `/` | Health check endpoint | `200` |
| `POST` | `/api/posts` | Ingest new post (Markdown or URL) | `201` / `400` |
| `GET` | `/api/posts` | List all stored posts | `200` |
| `GET` | `/api/posts/:id` | Get post by ID | `200` / `404` |
| `POST` | `/api/posts/:id/variants` | Generate platform variants for a post | `201` / `404` |
| `GET` | `/api/posts/:id/variants` | List all variants for a post | `200` / `404` |
| `POST` | `/api/variants` | Manually create a variant | `201` / `400` |
| `GET` | `/api/variants/:id` | Get variant by ID | `200` / `404` |
| `PATCH` | `/api/variants/:id` | Edit variant content (resets status to `DRAFT`) | `200` / `400` |
| `POST` | `/api/variants/:id/approve` | Approve variant for scheduling | `200` / `409` |
| `POST` | `/api/variants/:id/reject` | Reject variant | `200` / `409` |
| `POST` | `/api/variants/:id/schedule` | Schedule an approved variant | `201` / `409` |
| `GET` | `/api/schedules` | List schedules (optional `?status=PENDING`) | `200` |
| `GET` | `/api/schedules/:id` | Get schedule details | `200` / `404` |
| `PATCH` | `/api/schedules/:id/cancel` | Cancel a pending schedule | `200` / `409` |
| `POST` | `/api/schedules/:id/retry` | Retry a failed schedule | `200` / `409` |
| `GET` | `/api/schedules/:id/attempts` | List publish attempts for a schedule | `200` / `404` |
| `GET` | `/api/publish-history` | View global publish history & previews | `200` |
| `GET` | `/api/publish-history/:id` | View publish attempt details | `200` / `404` |
| `GET` | `/api/metrics/publishing` | View publishing statistics & attempt counts | `200` |

---

## Troubleshooting & Windows Tips

1. **PowerShell `curl` vs `Invoke-RestMethod`**:
   - In Windows PowerShell, `curl` is an alias for `Invoke-WebRequest`. Use `Invoke-RestMethod` (or `curl.exe`) for REST API calls as shown in this guide.
2. **Database Reset**:
   - If you want to reset the database to a clean state:
     ```bash
     npx prisma migrate reset --force
     npm run seed
     ```
3. **Running in Background**:
   - To start both the web server and background worker, run `npm start` (the server starts the publishing scheduler interval automatically).

---

## Design Documentation & Submission Files

- [`docs/design.md`](docs/design.md) — Capstone architecture, data model, API surface, and explicit non-goals.
- [`EVIDENCE.md`](EVIDENCE.md) — Comprehensive execution proof for each Definition of Done item.
- [`BUILDLOG.md`](BUILDLOG.md) — Honest log of incremental development and AI assistance.
- [`.env.example`](.env.example) — Safe environment variable placeholders.