# Versioned Roadmap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver the advanced logging viewer roadmap incrementally as `v1.2`, `v1.3`, `v1.4`, and `v2.0`, with each version verified and committed before the next begins.

**Architecture:** Keep the current single-page Vue application, but harden the request model, improve rendering and state management, and gradually add saved views, richer querying, real-time log streaming, and platform-grade security controls. Each version should remain shippable on its own and avoid speculative backend dependencies where the current VictoriaLogs APIs already suffice.

**Tech Stack:** Vue 3, Pinia, Vite, Arco Design Vue, ECharts, Axios, Nginx, Docker

---

### Task 1: Create `v1.2` stability and security baseline

**Files:**
- Modify: `src/App.vue`
- Modify: `src/components/QueryEditor.vue`
- Modify: `src/components/LogTable.vue`
- Modify: `src/components/SettingsPanel.vue`
- Modify: `src/stores/query.js`
- Modify: `src/stores/settings.js`
- Modify: `src/stores/fields.js`
- Modify: `src/api/client.js`
- Modify: `vite.config.js`
- Modify: `nginx/default.conf`
- Modify: `package.json`
- Create: `src/__tests__/queryStore.test.mjs`
- Create: `src/__tests__/settingsStore.test.mjs`

**Step 1: Write the failing tests**

Add store-level regression tests covering:
- explicit query submission instead of auto-search on typing
- safe API target validation / normalization
- result limit updates
- URL state round-trip behavior

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because test runner is missing or behavior is not implemented yet

**Step 3: Write minimal implementation**

Implement:
- draft-vs-submitted query flow
- safer API target allowlist validation
- immediate result limit refresh wiring
- duplicate request cleanup
- local credential handling improvements
- security headers and proxy hardening

**Step 4: Run verification**

Run:
- `npm test`
- `npm run build`

Expected:
- tests PASS
- production build PASS

**Step 5: Commit**

```bash
git add docs/plans/2026-03-28-versioned-roadmap.md package.json src vite.config.js nginx/default.conf
git commit -m "feat: ship v1.2 stability and security baseline"
```

### Task 2: Deliver `v1.3` advanced exploration workflow

**Files:**
- Modify: `src/components/QueryEditor.vue`
- Modify: `src/components/FieldSidebar.vue`
- Modify: `src/components/LogDetail.vue`
- Modify: `src/components/LogTable.vue`
- Modify: `src/components/SettingsPanel.vue`
- Modify: `src/stores/query.js`
- Modify: `src/stores/settings.js`
- Modify: `src/api/fields.js`
- Create: `src/components/SavedViewsPanel.vue`
- Create: `src/utils/queryValidation.js`
- Create: `src/__tests__/savedViews.test.mjs`

**Step 1: Write the failing tests**

Cover:
- saved queries / saved views persistence
- query validation behavior
- safe share-state serialization

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL on missing saved-view logic

**Step 3: Write minimal implementation**

Implement:
- saved queries and views
- query validation / helper text
- improved field metadata and detail rendering
- safer share/export controls

**Step 4: Run verification**

Run:
- `npm test`
- `npm run build`

**Step 5: Commit**

```bash
git add src package.json
git commit -m "feat: ship v1.3 advanced exploration workflow"
```

### Task 3: Deliver `v1.4` real-time and high-volume performance

**Files:**
- Modify: `src/components/LogTable.vue`
- Modify: `src/components/HitsHistogram.vue`
- Modify: `src/components/LogContextModal.vue`
- Modify: `src/api/logs.js`
- Modify: `src/stores/logs.js`
- Create: `src/components/LiveTailPanel.vue`
- Create: `src/utils/virtualList.js`
- Create: `src/workers/logParser.worker.js`
- Create: `src/__tests__/virtualList.test.mjs`

**Step 1: Write the failing tests**

Cover:
- virtual list window calculations
- streaming parser chunk assembly
- live tail state transitions

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL on missing performance primitives

**Step 3: Write minimal implementation**

Implement:
- real virtualized log rows
- NDJSON chunk parsing
- live tail controls
- targeted chart/table rerender reductions

**Step 4: Run verification**

Run:
- `npm test`
- `npm run build`

**Step 5: Commit**

```bash
git add src package.json
git commit -m "feat: ship v1.4 realtime performance tooling"
```

### Task 4: Deliver `v2.0` collaboration and governance

**Files:**
- Modify: `src/App.vue`
- Modify: `src/components/SettingsPanel.vue`
- Modify: `src/stores/settings.js`
- Modify: `src/api/client.js`
- Create: `src/components/WorkspaceSwitcher.vue`
- Create: `src/components/AuditPanel.vue`
- Create: `src/utils/redaction.js`
- Create: `src/utils/permissions.js`
- Create: `src/__tests__/redaction.test.mjs`

**Step 1: Write the failing tests**

Cover:
- field redaction
- role-based visibility helpers
- audit event generation

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL on missing governance layer

**Step 3: Write minimal implementation**

Implement:
- workspace and multi-target switching model
- redaction layer
- audit event hooks
- role-aware field visibility groundwork

**Step 4: Run verification**

Run:
- `npm test`
- `npm run build`

**Step 5: Commit**

```bash
git add src package.json
git commit -m "feat: ship v2.0 collaboration and governance"
```
