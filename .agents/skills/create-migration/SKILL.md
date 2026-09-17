---
name: create-migration
description: Create or review PostgreSQL/PostGIS migrations for the tourism domain, including data movement, spatial indexes, seeds, rollback, and compatibility.
---

# Create migration

Read `docs/architecture/database.md`, the feature spec and affected parts of `temp/db.md`.

Preserve soft deletion, history, publication isolation and the 17-character code rules.
Use native PostgreSQL/PostGIS deliberately; parameterize application queries. Include
indexes for new foreign keys and proven critical queries.

For destructive or backfill work document preconditions, batching, locks, backup,
roll-forward/rollback and deployment order. Test from an empty database and against a
representative prior schema. Keep seeds idempotent. Refresh generated schema references.

Never treat SQLite as proof that a PostGIS migration works.
