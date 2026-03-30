# Activity Drawer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move recent audit events out of the settings drawer into a dedicated global activity drawer opened from the header.

**Architecture:** Reuse the existing audit event store and panel rendering, but relocate the UI entry point to the app header. Keep settings focused on configuration, add a lightweight clear action for activity history, and avoid introducing new routes or server persistence.

**Tech Stack:** Vue 3, Pinia, Arco Design Vue, Vite, Node test runner

---

### Task 1: Add store coverage for clearing local activity history

**Files:**
- Modify: `/Users/chenjiao/works/coderepository/victorialogsui/src/stores/settings.js`
- Test: `/Users/chenjiao/works/coderepository/victorialogsui/src/__tests__/settings.test.mjs`

**Step 1: Write the failing test**

Add a test that seeds local audit events, calls `clearAuditEvents()`, and expects an empty array plus cleared persisted storage.

**Step 2: Run test to verify it fails**

Run: `node --test src/__tests__/settings.test.mjs`

Expected: FAIL because `clearAuditEvents` does not exist yet.

**Step 3: Write minimal implementation**

Add `clearAuditEvents()` to the settings store and persist the empty array back to local storage.

**Step 4: Run test to verify it passes**

Run: `node --test src/__tests__/settings.test.mjs`

Expected: PASS.

### Task 2: Move audit UI into a dedicated activity drawer

**Files:**
- Create: `/Users/chenjiao/works/coderepository/victorialogsui/src/components/ActivityDrawer.vue`
- Modify: `/Users/chenjiao/works/coderepository/victorialogsui/src/components/AuditPanel.vue`
- Modify: `/Users/chenjiao/works/coderepository/victorialogsui/src/components/SettingsPanel.vue`
- Modify: `/Users/chenjiao/works/coderepository/victorialogsui/src/App.vue`
- Modify: `/Users/chenjiao/works/coderepository/victorialogsui/src/styles/index.css`

**Step 1: Keep the panel presentational**

Update `AuditPanel.vue` so it can be reused outside settings, with an optional clear button and neutral section framing.

**Step 2: Add a global drawer**

Create `ActivityDrawer.vue` that renders the shared audit panel inside an Arco drawer opened from the header.

**Step 3: Add the header trigger**

Wire a new activity button into `App.vue` next to settings and remove the embedded panel from settings.

**Step 4: Style for the global layout**

Add compact activity badge/button styling and drawer-friendly audit panel spacing without stealing height from the main results area.

### Task 3: Verify end-to-end behavior

**Files:**
- Verify: `/Users/chenjiao/works/coderepository/victorialogsui/src/App.vue`
- Verify: `/Users/chenjiao/works/coderepository/victorialogsui/src/components/ActivityDrawer.vue`
- Verify: `/Users/chenjiao/works/coderepository/victorialogsui/src/components/AuditPanel.vue`

**Step 1: Run targeted tests**

Run: `node --test src/__tests__/settings.test.mjs`

Expected: PASS.

**Step 2: Run full test suite**

Run: `npm test`

Expected: PASS with no regressions.

**Step 3: Run production build**

Run: `npm run build`

Expected: PASS.
