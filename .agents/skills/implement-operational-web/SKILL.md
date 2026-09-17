---
name: implement-operational-web
description: Implement Next.js administrative workflows for tourism capture, review, catalogs, moderation, imports, or audit with consistent accessible operational UX.
---

# Implement operational web

Read `docs/architecture/web.md`, the feature spec and `docs/quality/web-checklist.md`.

Optimize repeated work: searchable selectors, consistent tables, clear state/permission
actions and recoverable long forms. Use dialogs for brief CRUD and pages for the 14-section
workflow. Make published versus proposed data obvious during review.

Use HeroUI React and shared tokens/components. TanStack Query owns server state, React
Hook Form owns form state and the URL owns shareable filters. Every mutation handles
pending/success/error and repeated submission. Backend remains the authorization boundary.
