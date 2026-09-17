---
name: harden-security
description: Harden authentication, authorization, location, file, AI, import, webhook, or provider boundaries in Turismo Vinculación when a security audit or sensitive feature requires it.
---

# Harden security

Read `docs/security/principles.md`, `threat-model.md`, `hardening.md` and, for GPS,
`privacy-location.md`.

Map assets, actors, trust boundaries and abuse cases. Apply controls at the server
boundary: validation, record authorization, minimization, rate limits, idempotency,
timeouts and redaction. Treat files, jobs, provider replies and retrieved AI documents as
untrusted.

Add negative tests that demonstrate the control. Do not rotate secrets, change live
permissions or mutate production without explicit authorization.
