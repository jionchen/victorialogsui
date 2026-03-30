# Config Centralization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centralize cross-module configuration constants and storage keys into shared config modules for easier maintenance.

**Architecture:** Create a top-level `config/` directory with small, responsibility-based modules instead of a single giant settings file. Refactor runtime code to import from shared config while keeping purely local implementation details inside their components.

**Tech Stack:** Vue 3, Pinia, Vite, Node test runner

---

### Task 1: Add config coverage

**Files:**
- Create: `/Users/chenjiao/works/coderepository/victorialogsui/src/__tests__/config.test.mjs`

**Step 1: Write the failing test**

Add a test that imports the future shared config modules and asserts representative values for storage keys, proxy defaults, and UI presets.

**Step 2: Run test to verify it fails**

Run: `node --test src/__tests__/config.test.mjs`

Expected: FAIL because the shared config modules do not exist yet.

### Task 2: Create shared config modules

**Files:**
- Create: `/Users/chenjiao/works/coderepository/victorialogsui/config/storageKeys.js`
- Create: `/Users/chenjiao/works/coderepository/victorialogsui/config/appConfig.js`
- Create: `/Users/chenjiao/works/coderepository/victorialogsui/config/uiConfig.js`
- Create: `/Users/chenjiao/works/coderepository/victorialogsui/config/securityConfig.js`
- Create: `/Users/chenjiao/works/coderepository/victorialogsui/config/proxyConfig.js`

**Step 1: Export shared constants**

Define grouped exports for storage keys, list limits, default pinned fields, default table columns, time presets, chart colors, row height, security patterns, and proxy defaults.

**Step 2: Keep them environment-agnostic**

Do not use `window`, `localStorage`, or `import.meta.env` inside the shared config modules so both app code and `vite.config.js` can import them safely.

### Task 3: Refactor runtime code to use shared config

**Files:**
- Modify: `/Users/chenjiao/works/coderepository/victorialogsui/src/api/client.js`
- Modify: `/Users/chenjiao/works/coderepository/victorialogsui/src/stores/settings.js`
- Modify: `/Users/chenjiao/works/coderepository/victorialogsui/src/stores/query.js`
- Modify: `/Users/chenjiao/works/coderepository/victorialogsui/src/utils/timeUtils.js`
- Modify: `/Users/chenjiao/works/coderepository/victorialogsui/src/utils/permissions.js`
- Modify: `/Users/chenjiao/works/coderepository/victorialogsui/src/utils/redaction.js`
- Modify: `/Users/chenjiao/works/coderepository/victorialogsui/src/components/HitsHistogram.vue`
- Modify: `/Users/chenjiao/works/coderepository/victorialogsui/src/components/LogTable.vue`
- Modify: `/Users/chenjiao/works/coderepository/victorialogsui/vite.config.js`

**Step 1: Swap hard-coded constants for imports**

Replace repeated inline constants with shared imports while preserving behavior.

**Step 2: Leave truly local values alone**

Do not move one-off values that are only meaningful inside a single render or helper.

### Task 4: Verify behavior

**Files:**
- Verify: `/Users/chenjiao/works/coderepository/victorialogsui/src/__tests__/config.test.mjs`
- Verify: `/Users/chenjiao/works/coderepository/victorialogsui/src/__tests__/settings.test.mjs`
- Verify: `/Users/chenjiao/works/coderepository/victorialogsui/src/__tests__/timeUtils.test.mjs`
- Verify: `/Users/chenjiao/works/coderepository/victorialogsui/src/__tests__/client.test.mjs`

**Step 1: Run targeted tests**

Run: `node --test src/__tests__/config.test.mjs`

Expected: PASS.

**Step 2: Run full test suite**

Run: `npm test`

Expected: PASS.

**Step 3: Run production build**

Run: `npm run build`

Expected: PASS.
