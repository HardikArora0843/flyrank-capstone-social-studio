# FlyRank AI Capstone — Social Media Studio

Social Media Studio is a backend service that transforms one blog post into platform-specific social media variants.

The system supports:

- Blog post ingestion from a URL or pasted Markdown
- Platform-specific variant generation
- Constraint validation
- Human review and approval
- Scheduled publishing
- A common social publisher adapter interface
- One real social platform adapter
- Mock social platform adapters
- Idempotent publishing
- Durable scheduling
- Publish history

## Project Status

Phase 1 — Design and project initialization.

## Planned Stack

- Node.js
- Express
- SQLite
- Telegram as the real publishing target
- Mock X adapter
- Mock LinkedIn adapter
- Vitest for testing

## Documentation

- [Design Document](docs/design.md)
- [Evidence](EVIDENCE.md)
- [Build Log](BUILDLOG.md)