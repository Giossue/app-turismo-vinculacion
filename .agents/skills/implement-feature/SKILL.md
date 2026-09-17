---
name: implement-feature
description: Implement a Turismo Vinculación feature across specification, API, mobile or web, persistence, tests, and documentation when the request changes product behavior.
---

# Implement feature

Read `AGENTS.md`, the feature spec, `ARCHITECTURE.md`, the affected client document and
`docs/quality/definition-of-done.md`.

For non-trivial work create/update `docs/plans/active/`. Identify actor, permission,
published/private visibility, offline/location behavior, data ownership and external
degradation before coding.

Implement the smallest vertical slice. Keep domain rules out of controllers/widgets,
validate boundaries, authorize the record, use migrations for schema changes and update
OpenAPI before regenerating clients. Add tests at the lowest useful level plus a critical
integration/E2E path. Update durable docs and report verification truthfully.

Do not expand into adjacent roadmap modules without explicit scope.
