---
name: update-documentation
description: Update project product, architecture, ADR, quality, security, or generated-documentation sources when behavior or technical decisions change.
---

# Update documentation

Identify the durable source of truth before editing. Product behavior belongs in
`docs/product`, system constraints in `docs/architecture`, costly decisions in ADRs,
operational acceptance in `docs/quality` and controls in `docs/security`.

Describe current truth, not planned implementation as completed fact. Update links and
remove contradictory assumptions. Do not manually edit `docs/generated`; update its
generator/source. Keep `AGENTS.md` a short routing and invariant document.
