---
name: implement-mobile-feature
description: Build React Native/Expo mobile features involving MapLibre, location, navigation, offline state, tourist UX, or guide field capture.
---

# Implement mobile feature

Read `docs/architecture/mobile.md`, `maps-navigation.md`,
`docs/security/privacy-location.md` and the feature specification.

Model denied permissions, GPS off, stale location, network loss and cancellation as
normal states. Keep browsing usable without location. Request background access only for
active navigation and release tracking/resources when it ends.

Use repositories behind TanStack Query, generated API models, local cache only for declared
cached or draft state, and Expo SecureStore only for minimal credentials. MapLibre requires
a Development Build, never Expo Go. Verify supported Android and iOS devices, deep links,
lifecycle restoration, accessibility and degraded networks.
