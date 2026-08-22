# Social Media Studio — Design Document

## 1. Problem

Social Media Studio is a backend service that transforms one stored blog post into platform-specific social media variants.

The system accepts a blog post as either a URL or pasted Markdown and stores it as the single source of truth. It then generates one variant for each configured platform and validates every variant against that platform's constraint profile.

Each variant must pass through a human review workflow before it can be scheduled. A variant can be drafted, approved, rejected, or published. Only approved variants are allowed to be scheduled.

Approved variants are scheduled for publication through a common `SocialPublisher` interface. The application uses one real free social platform and two mock platform adapters. The adapter architecture ensures that changing the publishing platform does not require changes to business logic.

The publishing system is designed for reliable execution. Each variant and scheduled slot receives an idempotency key so that retries do not create duplicate posts. Scheduled jobs are stored durably so that a worker can safely continue after a restart. Every publishing attempt is recorded in publish history.

The primary engineering goals are:

- Reliable multi-platform publishing
- Platform-specific constraint enforcement
- Human approval before publication
- Adapter-based platform integration
- Idempotent publishing
- Durable scheduling
- Visible publish history

AI-generated content is optional. The system's constraint enforcement and publishing reliability do not depend on an external AI service.

---

## 2. Architecture

```text
                    Blog Post
               URL or Markdown
                       |
                       v
              +----------------+
              | Post Ingestion |
              +-------+--------+
                      |
                      v
              +----------------+
              | Stored Post    |
              | Source of Truth|
              +-------+--------+
                      |
                      v
              +-------------------+
              | Variant Generator |
              +---------+---------+
                        |
                        v
              +-------------------+
              | Constraint        |
              | Validation        |
              +---------+---------+
                        |
                  valid variants
                        |
                        v
              +-------------------+
              | Review Workflow   |
              | draft / approved  |
              | rejected           |
              +---------+---------+
                        |
                  approved only
                        |
                        v
              +-------------------+
              | Durable Scheduler |
              +---------+---------+
                        |
                        v
              +-------------------+
              | Publishing Worker |
              +---------+---------+
                        |
                        v
              +-------------------+
              | SocialPublisher   |
              | Interface         |
              +----+---------+----+
                   |         |
          +--------+--+   +--+-----------+
          |           |   |              |
          v           v   v              v
      Telegram     Mock X     Mock LinkedIn
        REAL        MOCK          MOCK
                   |
                   v
           Publish History
```

The application depends on the `SocialPublisher` interface rather than on a specific platform implementation.

---

## 3. Platform Configuration

The initial configured platforms are:

| Platform | Adapter | Type |
|---|---|---|
| Telegram | `TelegramPublisher` | Real |
| X-style | `MockXPublisher` | Mock |
| LinkedIn-style | `MockLinkedInPublisher` | Mock |

Each platform has a constraint profile containing:

- Maximum content length
- Tone requirement
- Maximum hashtag count

Constraint profiles are enforced by application code. A variant that violates its platform profile is rejected before entering the review workflow.

The exact numeric constraint values will be defined in the implementation configuration and tested as part of the constraint-validation test suite.

---

## 4. Data Model

### Post

Stores the original blog post.

```text
Post
- id
- sourceType
- sourceUrl
- content
- createdAt
- updatedAt
```

`content` is the stored source of truth used for variant generation.

### Platform

Stores platform configuration and constraint information.

```text
Platform
- id
- name
- adapterKey
- maxLength
- tone
- maxHashtags
```

### Variant

Stores one platform-specific version of a post.

```text
Variant
- id
- postId
- platformId
- content
- status
- createdAt
- updatedAt
```

Allowed statuses:

```text
draft
approved
rejected
published
```

### Schedule

Stores a requested publication slot.

```text
Schedule
- id
- variantId
- scheduledFor
- status
- idempotencyKey
- createdAt
- updatedAt
```

The idempotency key uniquely represents the publication of a particular variant in a particular scheduled slot.

### PublishAttempt

Stores publishing history.

```text
PublishAttempt
- id
- scheduleId
- variantId
- platform
- idempotencyKey
- status
- attemptNumber
- externalMessageId
- error
- createdAt
- publishedAt
```

This record allows successful and failed publishing attempts to remain visible.

---

## 5. Variant Workflow

Variants follow this lifecycle:

```text
draft
  |
  +----> approved ----> scheduled ----> published
  |
  +----> rejected
```

Only an `approved` variant can be scheduled.

Scheduling requests for `draft`, `rejected`, or otherwise unapproved variants return a 4xx response.

After successful publication, the variant becomes `published`.

---

## 6. API Surface

### Post Ingestion

```text
POST /api/posts
GET  /api/posts
GET  /api/posts/:id
```

`POST /api/posts` accepts either a URL or pasted Markdown.

### Variant Generation

```text
POST /api/posts/:id/variants
GET  /api/posts/:id/variants
GET  /api/variants/:id
```

Generation reads only from the stored post.

### Variant Review

```text
PATCH /api/variants/:id
POST  /api/variants/:id/approve
POST  /api/variants/:id/reject
```

The edit endpoint allows a reviewer to modify a variant before approval.

### Scheduling

```text
POST /api/variants/:id/schedule
GET  /api/schedules
```

The scheduling endpoint refuses variants that are not approved.

### Publish History

```text
GET /api/publish-history
GET /api/publish-history/:id
```

These endpoints expose the results of publishing attempts.

---

## 7. Publisher Adapter Interface

All publishing implementations follow one common interface:

```text
SocialPublisher
    publish(content, metadata)
```

Implementations:

```text
TelegramPublisher
MockXPublisher
MockLinkedInPublisher
```

The business logic calls the interface and does not depend on platform-specific implementation details.

Changing the configured adapter from Telegram to a mock adapter must not require changes to business logic.

Mock adapters record the post in the local database and provide a preview of what would have been published.

---

## 8. Idempotent Publishing

Every scheduled publication receives an idempotency key derived from its variant and scheduled slot.

The persistence layer enforces uniqueness for the key.

If the same publication is attempted again because of a retry, timeout, or worker restart, the existing publication state is detected and another external post is not created.

The required behavior is:

```text
First attempt  -> one publication
Retry           -> no duplicate publication
Worker restart  -> no duplicate publication
```

Publish attempts remain visible in publish history.

---

## 9. Durable Scheduling

Scheduled work is persisted rather than kept only in process memory.

A worker periodically identifies due schedules and passes them to the publishing service.

The worker is designed to be safely restarted. If it stops during a batch, previously completed publications are recognized through persistent state and idempotency protection.

The scheduler and publishing logic remain separate so that scheduling concerns do not become coupled to individual platform APIs.

---

## 10. Testing Strategy

The implementation will include deterministic tests for the critical failure cases:

```text
1. A variant violating platform constraints is blocked.
2. An unapproved variant cannot be scheduled.
3. An approved variant can be scheduled.
4. Publishing through an adapter succeeds.
5. Repeating the same publish does not create a duplicate.
6. Switching adapters requires no business-logic change.
7. Worker restart does not create duplicate publications.
8. Publish attempts are recorded in history.
```

These tests are designed around the acceptance probes defined in the capstone brief.

---

## 11. Security and Configuration

Secrets are stored in environment variables.

The real platform token will be stored in `.env` and never committed to Git.

The repository will provide:

```text
.env.example
```

with safe placeholder values.

`.env` will be included in `.gitignore`.

---

## 12. Explicit Non-Goals

The following are intentionally outside the scope of this capstone:

- Real Instagram publishing
- Real X publishing
- Real LinkedIn publishing
- Image generation
- Social-media analytics
- Engagement tracking
- Multi-tenant agency/client management

The project focuses on reliable content transformation, review, scheduling, adapter architecture, idempotency, and publishing history.

---

## 13. Phase 1 Gate

Phase 1 is complete when this design establishes:

- The problem being solved
- The core data model
- The API surface
- The publishing architecture
- The constraint-validation approach
- The review workflow
- The idempotency strategy
- The durable scheduling strategy
- At least one explicit non-goal

Implementation will begin only after this design is accepted as the project baseline.