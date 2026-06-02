# S4 设计 spec — 抽离 App.vue 编排逻辑为可测工厂

> 关联：[`ISSUES.md`](../../analysis/ISSUES.md)（S4）｜[`分析报告`](../../analysis/2026-06-02-VictoriaLogs-Explorer-分析报告.md)（路线图 v2.2 / App.vue 上帝编排器）
> 分支：`fix/stoploss-guardrails-2026-06-02`（续用）
> 批次：v2.2「逐个深做·地基优先」第 1 项。本轮只做 S4；后续顺序 **S4 → S2 → S5 → S3**，每项各自 spec → 实现计划 → 编码。

## 1. 背景与目标

`src/App.vue`（260 行）已成为「上帝编排器」：`<script setup>` 里用 6 个 watch 串起 **搜索编排 / URL 同步 / 审计 / 自动刷新 / 快捷键**，并以 `queryStore.queryVersion`（一个自增计数）当作**隐式全局事件总线**——`executeQuery()` 名义上「执行查询」实际只是 `queryVersion++`，真正的副作用链发生在远处 App.vue 的 watcher 里，难以阅读、无法单测。

**目标**：把编排逻辑从 SFC 抽出为**纯依赖注入工厂**，使其可像现有 `createSearchExecutor` 一样用 `node:test` 单测；App.vue 退化为「接线 + UI」。这是 v2.2 的地基项，为后续 S2（查询补全）/ S3（聚合分析，需要新的 `runSearch` 形态）/ S5（增量尾随，需改 `autoRefresh`/取数循环）提供一个**可测试、职责单一**的编排层。

**非目标**：不改任何可观察行为（见 §7 严格等价），不动 `queryStore` 的触发机制，不迁移 6 个 `executeQuery()` 调用方与 2 个 `queryVersion` 订阅方。

## 2. 决策记录（brainstorm 结论）

| 决策点 | 选择 | 理由 |
|---|---|---|
| 范围策略 | 逐个深做·地基优先 | 四项 v2.2 多为 L 级独立设计问题，各自一份 spec；S4 先行给其余三项干净底座 |
| 重构深度 | **核心抽离** | 抽 3 个工厂；App.vue 保留 `watch(queryVersion → runSearch())`；`executeQuery`/`queryVersion` 与 6 调用方 + 2 订阅方**不动**，低风险 |
| 行为保持 | **严格保持** | 纯结构重构，零可观察变更，评审/验证按「无行为变更」对待；已知瑕疵记为后续 issue（§8） |
| 抽离形态 | **`create*` DI 工厂** | 对齐仓库唯一编排先例 `createSearchExecutor`，纯 DI 单测（无 Pinia、无 jsdom） |

> 命名采用 `create*` 而非报告建议的 `use*`：抽出的是命令式编排工厂，非响应式 composable，与 `searchOrchestration.js#createSearchExecutor` 保持一致。目录沿用 `src/composables/`（ISSUES.md 已预留）以标记「App 编排黏合层」，区别于叶子 `utils/`。

## 3. 模块边界与文件布局

三个纯工厂落在新目录 `src/composables/`，依赖全部注入，内部不直接触碰 `window` / `useXStore()`：

| 新文件 | 工厂 | 职责 |
|---|---|---|
| `src/composables/searchController.js` | `createSearchController(deps)` | `executeSearch()`（组装参数 → `searchExecutor.execute`）与 `runSearch()`（clearCache → 写 URL → 审计 → executeSearch 链） |
| `src/composables/urlSync.js` | `createUrlSync(deps)` | `writeState()` 写 `?s=`；`readInitialState()` 读 `?s=` → `loadUrlState`；window/URL 访问藏在注入访问器后 |
| `src/composables/autoRefresh.js` | `createAutoRefresh(deps)` | `sync(interval)` 起停定时器；`stop()` 清理；timer 函数可注入 |

App.vue 仍创建 `searchExecutor = createSearchExecutor({...})`（原样不动），并把它注入 `createSearchController`。

## 4. 工厂 API 规格

### 4.1 `createSearchController(deps)`

```js
createSearchController({
  searchExecutor,    // createSearchExecutor(...) 实例，含 .execute(params)
  getSearchParams,   // () => ({ query, limit, start, end, step, rangeMs })
  clearFieldCache,   // () => void
  writeUrlState,     // () => void
  logAudit,          // () => void
}) → {
  executeSearch,     // async () => searchExecutor.execute(getSearchParams())
  runSearch,         // () => { clearFieldCache(); writeUrlState(); logAudit(); return executeSearch() }
}
```

`runSearch()` 严格复现 App.vue 当前 `queryVersion` watch（188–199）的四步顺序：**clearFieldCache → writeUrlState → logAudit → executeSearch**。`executeSearch` 也归入本工厂，因为「读 store 参数 + 调 executor」正是要被单测的那段。

### 4.2 `createUrlSync(deps)`

```js
createUrlSync({
  getUrlState,       // () => string   (queryStore.getUrlState())
  loadUrlState,      // (s: string) => void
  getCurrentHref,    // () => string   (window.location.href)
  getSearchString,   // () => string   (window.location.search)
  replaceState,      // (href: string) => void  (window.history.replaceState({}, '', href))
}) → {
  writeState,        // () => { const u = new URL(getCurrentHref()); u.searchParams.set('s', getUrlState()); replaceState(u.toString()) }
  readInitialState,  // () => { const s = new URLSearchParams(getSearchString()).get('s'); if (s) loadUrlState(s) }
}
```

### 4.3 `createAutoRefresh(deps)`

```js
createAutoRefresh({
  onTick,                       // () => void   (() => controller.executeSearch())
  setIntervalFn = setInterval,  // 可注入
  clearIntervalFn = clearInterval,
}) → {
  sync,   // (interval) => { clearIntervalFn(timer); if (interval > 0) timer = setIntervalFn(() => onTick(), interval) }
  stop,   // () => { clearIntervalFn(timer); timer = null }
}
```

`sync()` 严格复现 Watch C（203–211）的 `clearInterval` + 条件 `setInterval` 行为。

## 5. App.vue 重构后形态

```js
const searchExecutor = createSearchExecutor({ /* 126–134 原样不动 */ })

const urlSync = createUrlSync({
  getUrlState: () => queryStore.getUrlState(),
  loadUrlState: (s) => queryStore.loadUrlState(s),
  getCurrentHref: () => window.location.href,
  getSearchString: () => window.location.search,
  replaceState: (href) => window.history.replaceState({}, '', href),
})
const controller = createSearchController({
  searchExecutor,
  getSearchParams: () => ({
    query: queryStore.effectiveQuery,
    limit: settingsStore.resultLimit,
    start: queryStore.timeRange.start,
    end: queryStore.timeRange.end,
    step: queryStore.histogramStep,
    rangeMs: queryStore.timeRange.rangeMs,
  }),
  clearFieldCache: () => fieldStore.clearCache(),
  writeUrlState: () => urlSync.writeState(),
  logAudit: () => settingsStore.logAuditEvent('执行查询', queryStore.effectiveQuery),
})
const autoRefresh = createAutoRefresh({ onTick: () => controller.executeSearch() })
```

四个 watch **保留**，body 变薄：

- **Watch A**（`filters/timePreset/customStart/customEnd/freeTextQuery` 深度防抖 300ms → `queryStore.executeQuery()`）：**不动**（UI 输入触发器）。`searchTimer` 仍在 App.vue。
- **Watch B**（`queryVersion` → 副作用链）：body → `() => controller.runSearch()`。
- **Watch C**（`autoRefreshInterval` → 定时器）：body → `(interval) => autoRefresh.sync(interval)`。
- **Watch D**（`apiBaseUrl` 变更 → `logStore.clearLogs()` + `fieldStore.clearCache()` + `queryStore.executeQuery()`）：**不动**（含 §8 约定不修的重复 clearCache）。
- `onMounted`：`settingsStore.initTheme()` + `urlSync.readInitialState()` + `queryStore.executeQuery()` + 注册 keydown。
- `onUnmounted`：移除 keydown + `clearTimeout(searchTimer)` + `autoRefresh.stop()`。

UI（`currentApi` / `activityCount` / `toggleTheme` / `copyShareLink` / `openConnectionSettings` / `submitSearch` / `onGlobalKeydown` / 模板）全部不动。`queryStore` 的 `executeQuery` / `queryVersion`、6 个调用方（QueryEditor、LiveTailPanel、SavedViewsPanel、SettingsPanel、LogTable、App）与 2 个订阅方（ActivityDrawer、FieldItem）**均不动**。

> **LOC 说明（诚实）**：编排逻辑全部移出 SFC 进入 3 个被测模块，但 DI 显式接线本身占行数，App.vue `<script>` 净减约 15–30 行，并非「腰斩」。核心收益是**单一职责 + 可单测**，而非行数。

## 6. 数据流与调用顺序（保持不变）

```
触发者（6 组件/App 的 4 处）→ queryStore.executeQuery() → queryVersion++
        → Watch B → controller.runSearch()
              → clearFieldCache → urlSync.writeState → logAudit → controller.executeSearch()
                    → searchExecutor.execute(getSearchParams())
                          → fetchLogs（主）→ 延迟后 runAuxiliary（histogram ∥ fieldNames→facets，runId 守卫）
订阅者：ActivityDrawer / FieldItem 继续 watch queryVersion 自行反应（不变）
自动刷新：Watch C → autoRefresh.sync(interval) → 周期 onTick → controller.executeSearch()
```

`searchExecutor`（`utils/searchOrchestration.js`）内部的 runId 竞态守卫、辅助延迟、facets 串接均不改动。

## 7. 测试策略

新增 3 个 `node:test` DI 测试，**零 Pinia、零 jsdom**，与 `searchOrchestration.test.mjs` 同款（注入假依赖、断言事件序列）：

- `src/__tests__/searchController.test.mjs`
  - `runSearch` 按 **clearFieldCache → writeUrlState → logAudit → executeSearch** 顺序触发（事件数组断言）。
  - `executeSearch` 把 `getSearchParams()` 的返回原样透传给 `searchExecutor.execute`。
- `src/__tests__/urlSync.test.mjs`
  - `writeState`：给定 `getCurrentHref` 与 `getUrlState()→'ABC'`，断言 `replaceState` 收到的 href 的 `s` 参数 == `'ABC'`。
  - `readInitialState`：`getSearchString()→'?s=XYZ'` 时以 `'XYZ'` 调 `loadUrlState`；无 `s` 时不调。
- `src/__tests__/autoRefresh.test.mjs`
  - 注入假 `setIntervalFn/clearIntervalFn`：`sync(0)` 只清不设；`sync(n>0)` 设并能回调 `onTick`；再次 `sync` 先清旧；`stop` 清理。

既有 20 个测试文件不动、保持绿（`queryStore`/`logsStore`/`fieldStore`/`searchExecutor` 均未改）。

## 8. 行为等价映射（证明零可观察变更）

| 旧（App.vue） | 新 | 等价点 |
|---|---|---|
| `executeSearch()` 149–162 | `controller.executeSearch()` | 同参数、同 `searchExecutor.execute` 调用 |
| Watch B body 188–199 | `controller.runSearch()` | 同四步顺序 |
| onMounted URL 解析 233–237 | `urlSync.readInitialState()` | 同解析 + `loadUrlState` |
| Watch C body 203–211 | `autoRefresh.sync(interval)` | 同 `clearInterval` + 条件 `setInterval` |
| onUnmounted `clearInterval` 258 | `autoRefresh.stop()` | 同清理 |
| Watch A/D、`submitSearch`、keydown、theme、computeds、store、6 调用方/2 订阅方 | 不动 | 完全一致 |

## 9. 验收标准

- `node --test` 全绿：既有全部 + 3 个新测试组。
- `npm run lint` 退出 0（不新增 error；warn 级存量不回退）。
- `vite build` 成功（既有 >500kB chunk 警告 = D50，不在本轮）。
- 手动 QA 无回归：提交查询、直方图刷选时间、自动刷新起停、分享链接（`?s=`）打开回放、切换 API Base URL、`/` 聚焦查询框。

## 10. 不在本轮（记为后续 issue）

严格保持行为，故以下**已知瑕疵原样保留**，另开 issue：

- **D-mount-double**：mount 且 URL 带 `?s=` 时，`loadUrlState` 改动 filters/time 触发 Watch A 防抖 → 在显式 `executeQuery()` 之后约 300ms 再查一次（疑似双取）。
- **D-api-double-clear**：Watch D 先 `clearCache()` 再 `executeQuery()`，后者经 Watch B → `runSearch()` 再次 `clearCache()`（重复一次）。

## 11. 影响文件

- 新增：`src/composables/searchController.js`、`src/composables/urlSync.js`、`src/composables/autoRefresh.js`
- 新增测试：`src/__tests__/searchController.test.mjs`、`src/__tests__/urlSync.test.mjs`、`src/__tests__/autoRefresh.test.mjs`
- 修改：`src/App.vue`（实例化 3 工厂 + 4 个 watch/生命周期 body 变薄）
- 不改：`src/stores/query.js`、`src/utils/searchOrchestration.js`、6 个调用方组件、2 个订阅方组件

## 12. Commit

单条 commit 落在 `fix/stoploss-guardrails-2026-06-02`：

```
refactor(app): extract orchestration into DI-tested composables (S4)
```
