---
name: review-code
description: Review changes in this tourism platform for correctness, authorization, privacy, data integrity, provider failures, regressions, and missing tests.
---

# Review code

Read the relevant spec, architecture and `docs/quality/code-review.md`. Inspect diffs and
surrounding code rather than judging style in isolation.

Prioritize concrete bugs: unpublished data exposure, broken role/ownership checks,
location overcollection, unsafe files, prompt injection, non-idempotent retries,
transaction gaps, migration loss, stale caches and contract breaks. Check denial/failure
paths and realistic tests.

Report findings by severity with file/line, triggering scenario, impact and actionable
fix. State remaining uncertainty when execution or environment validation is unavailable.
