# VictoriaLogs Explorer — Issue 清单

> 来源：[`2026-06-02-VictoriaLogs-Explorer-分析报告.md`](./2026-06-02-VictoriaLogs-Explorer-分析报告.md)
> 生成日期：2026-06-02 ｜ 分支：`fix/stoploss-guardrails-2026-06-02`

把报告「重点建议」（Q1–Q10 快速见效 + S1–S10 战略投入）与「分维度详细分析」全部拆成可独立跟踪的 issue。
本轮 workflow 多 agent 实际编码范围 = **止损+护栏批：Q1 / Q2 / Q3 / Q4 / Q5 / Q9 / Q10**（详见 [`PLAN-2026-06-02-止损护栏批.md`](./PLAN-2026-06-02-止损护栏批.md)）。其余 issue 仅登记、本轮不自动编码。

## 图例

- **严重度**：🔴 高 ｜ 🟠 中 ｜ 🟡 低
- **工作量**：S 小 ｜ M 中 ｜ L 大
- **状态**：🔲 待处理 ｜ 🚧 进行中 ｜ ✅ 已完成 ｜ ⏸️ 已登记(本轮不做)
- **本轮**：✅ 本轮编码 ｜ — 后续版本

---

## A. 快速见效（Q1–Q10，低工作量·高价值）

| ID | 标题 | 来源维度 | 类型 | 严重度 | 工作量 | 影响文件（推断） | 验收要点 | 本轮 | 状态 |
|---|---|---|---|---|---|---|---|---|---|
| **Q1** | Nginx 层强制代理目标白名单堵 SSRF | 安全/工程化 | 风险 | 🔴 | M | `nginx/default.conf`、`vite.config.js`、`config/proxyConfig.js` | 服务端枚举命名上游，非白名单拒绝/回落；不再把 `X-Proxy-Target` 当 `proxy_pass`；dev 代理对齐等价白名单 | ✅ | ✅ |
| **Q2** | 修复数据失真（命中总数 / 字段值分布） | 功能/API/质量 | 风险 | 🔴 | S-M | `src/stores/logs.js`、`src/stores/fields.js`、`src/components/HitsHistogram.vue`、`src/components/FieldItem.vue` | 拆分「命中总数」与「已加载条数」两独立字段；字段值缺真实计数时标「分布未知」而非均摊伪造等长条 | ✅ | ✅ |
| **Q3** | 统一收敛约 11 处 console 调试日志 | 质量/安全/性能 | 优化 | 🟠 | S | `App.vue`、`stores/logs.js`、`stores/fields.js`、`stores/query.js`、`components/LogDetail.vue`、`components/LogContextModal.vue`、`api/client.js` | 引入 DEV 开关的轻量 logger 或删除；务必关闭 `client.js` 逐请求打印后端地址 | ✅ | ✅ |
| **Q4** | 为 `queryBuilder.js` 补专属单测 | 质量 | 风险 | 🔴 | S | `src/__tests__/queryBuilder.test.mjs`（新增） | 覆盖转义/否定/多值/中文自由文本/`parseBasicLogsQL` 往返；`node --test` 通过 | ✅ | ✅ |
| **Q5** | 接入最小 CI（PR 跑 ci+test+build 门禁） | 工程化 | 技术债 | 🔴 | M | `.github/workflows/ci.yml`（新增） | PR 上 install + `node --test` + `vite build` 全绿作为合并门禁 | ✅ | ✅ |
| **Q6** | 加「复制链接」入口 | UX | 新功能 | 🟠 | S | 工具栏组件、`stores/query.js`/URL 同步处 | URL 状态已可序列化恢复，加一键复制+反馈（pushState 前进后退留作后续） | ✅ | ✅ |
| **Q7** | 空态/错误态用语义化 SVG 图标替换 `--` 占位 | UX | 优化 | 🟠 | S | `FieldSidebar.vue`、`LogTable.vue`、空态相关组件 | 按连接失败/无结果/无字段区分语义化图标 | ✅ | ✅ |
| **Q8** | 引入 ESLint + Prettier（warn 级接入存量）+ 锁定关键依赖 | 质量/工程化 | 技术债 | 🔴 | M | `package.json`、`.eslintrc*`、`.prettierrc*`、`package-lock.json` | lint/format 脚本就位（warn 级接入存量，npm run lint 退出 0）；CI 执行 | ✅ | ✅ |
| **Q9** | 修复上下文查询回退过滤非法前导 `AND`，统一排序时间口径 | API | 风险 | 🟠 | S | `src/components/LogContextModal.vue` | `streamFilter += ' AND ...'` 去掉非法前导 AND；排序复用 `getLogDisplayTimestamp` | ✅ | ✅ |
| **Q10** | 修正 docker-compose 版本脱节、后端镜像固定版本 | 工程化 | 风险 | 🟠 | S | `docker-compose.yml` | `vlogs-ui:v0.0.1` → 对齐 `package.json` 2.0.0；后端 `victoria-logs:latest` → 固定版本 | ✅ | ✅ |

---

## B. 战略性投入（S1–S10，中大工作量）

> 本轮一律仅登记、不自动编码：其中 S2/S3/S5/S7/S10 为大型功能、S4 为编排重构，均需独立设计与较大改动面。

| ID | 标题 | 来源维度 | 类型 | 严重度 | 工作量 | 影响范围（推断） | 本轮 | 状态 |
|---|---|---|---|---|---|---|---|---|
| **S1** | 接入 facets 批量分布（`/select/logsql/facets`） | 功能/API | 新功能 | 🔴 | M | `api/logs.js`(`queryFacets`→已接入 `loadFacets`)、`stores/fields.js` | ✅ | ✅ |
| **S2** | 查询编辑器升级为带补全/错误定位/着色 | UX/功能 | 新功能 | 🔴 | L | `components/QueryEditor.vue`、`stores/fields.js` | ✅ | ✅(MVP: 字段名/操作符/管道关键字补全) |
| **S3** | 新增聚合分析（stats by）模式 | 功能 | 新功能 | 🔴 | L | 新模块 + `queryBuilder.js` + ECharts | ✅ | ✅ |
| **S4** | 抽离 App.vue 编排逻辑为协调器/composable | 架构 | 技术债 | 🔴 | M | `App.vue`、新 `composables/*`、`utils/searchOrchestration.js` | ✅ | ✅ |
| **S5** | 真正的增量实时尾随（时间游标+去重+环形缓冲） | 性能/功能 | 新功能 | 🔴 | L | `components/LiveTailPanel.vue`、`stores/logs.js`、`api/logs.js` | ✅ | ✅ |
| **S6** | 日志全量数据改 shallowRef/markRaw + 取消模块级单例控制器 | 性能/API | 优化 | 🔴 | M | `stores/logs.js`、`api/logs.js`、`components/LogTable.vue` | ✅ | ✅ |
| **S7** | 建立响应式断点策略（侧栏抽屉化/工具栏堆叠/表格降级） | UX | 新功能 | 🔴 | L | 全局样式 + 多组件 | ✅ | ✅ |
| **S8** | 补齐 a11y（语义化按钮/role/tabindex/焦点样式/焦点陷阱） | UX | 技术债 | 🔴 | M | 多组件 | ✅ | ✅ |
| **S9** | 统一持久化（useStorage）与时间归一化层（时区可配） | 架构/API | 优化 | 🟠 | M | `stores/settings.js`、`utils/timeUtils.js`、`config/storageKeys.js` | ✅ | ✅ |
| **S10** | 日志模式聚类（Pattern/Drain 归并） | 功能 | 新功能 | 🔴 | L | 新模块 + 结果集处理 | ✅ | ✅ |

---

## C. 分维度细分发现（D 系列，来自报告「分维度详细分析」）

> 这些是各维度表格中、未被 Q/S 直接覆盖的更细颗粒发现。已与 Q/S 去重并交叉引用。本轮均不编码。

### 架构与代码结构
| ID | 标题 | 严重度 | 工作量 | 关联 |
|---|---|---|---|---|
| D1 | settings store 杂物抽屉按领域拆分、`apiBaseUrl` 与 client.js 双写归一 | 🟠 | M | S9 |
| D2 | LogTable.vue 次级上帝组件拆分（导出抽 utils/测高封 composable/错误区抽子组件） | 🟠 | M | S6 |
| D3 | 移除未用的 vue-router 死依赖（或真正引入承载查询状态） | 🟡 | S | D50 |
| D4 | 字段取数判等/缓存键在 store 与组件重复，封装 `useFieldValues(field)` 单一键定义 | 🟠 | S | — |
| D5 | graphify 报告与代码脱节（引用已删除模块），纳入同步流程或剔除 | 🟡 | S | — |
| D6 | `config/` 真值分散与命名混杂，按部署常量/业务默认/编排调参重新归类 | 🟡 | S | — |
| D7 | 缺统一并发/取消治理：三套 fetchId/activeRunId 并存，以一次 search run 下发 AbortSignal | 🟠 | M | S6 |

### 性能与渲染优化
| ID | 标题 | 严重度 | 工作量 | 关联 |
|---|---|---|---|---|
| D8 | 行高 Map 每次测量全量克隆 → 非响应式累积 + rAF 批量增量 | 🟠 | M | — |
| D9 | 直方图无缓存每次整图重建 → 按 query+start+end+step 短期缓存/合并请求 | 🟠 | M | — |
| D10 | ECharts 主题色在 computed 内 `getComputedStyle` 读 DOM → 缓存为随 theme 变化值 | 🟠 | S | — |
| D11 | `activityCount` 对全量日志深度遍历 → 惰性计算或入库预聚合 | 🟠 | S | — |
| D12 | NDJSON 解析与排序全在主线程 → Web Worker / 流式分批 append | 🟠 | L | D44 |
| D13 | Arco 全量引入、构建未分包 → 按需引入 + vendor 分包 + 异步加载 | 🟠 | M | D50 |
| D14 | 查询触发链路重复/抖动请求（onMounted 与 deep watch 双触发） | 🟠 | S | S4 |
| D15 | 每次查询全量 `clearCache` 削弱缓存 → 按 query/时间维度精细失效 | 🟡 | S | D47 |

### UX/UI 与交互设计
| ID | 标题 | 严重度 | 工作量 | 关联 |
|---|---|---|---|---|
| D16 | 缺首次使用引导与冷启动空态（零配置直落错误态） | 🟠 | M | — |
| D17 | Top Values 缺占比与排序语境（硬上限 30、无百分比、基准误导） | 🟠 | M | Q2/S1 |
| D18 | 主题缺「跟随系统」auto + prefers-color-scheme 兜底 | 🟠 | S | — |
| D19 | 无 prefers-reduced-motion 降级（shimmer 无限动画） | 🟡 | S | — |
| D20 | 过滤胶囊「单击整块禁用」语义不直观 → 显式开关/图标 + tooltip | 🟡 | S | — |
| D21 | 表格列不可拖拽排序/调宽 → 增加拖拽 + 列宽调整并持久化 | 🟡 | M | D25 |
| D22 | 自定义时间无回显/无相对绝对切换 → 回显区间 + 相对/绝对模式 + 快捷区间 | 🟠 | M | ✅ v2.1 |

### 功能完整度与机会
| ID | 标题 | 严重度 | 工作量 | 关联 |
|---|---|---|---|---|
| D23 | 无多 Tab/多查询并行对比 → query store 可实例化多会话 | 🟠 | L | — |
| D24 | 保存项缺订阅/告警/编辑管理 → 先暴露重命名/删除/置顶，再引入轻量阈值告警 | 🟠 | M | — |
| D25 | 表格缺拖拽且无行内 +/- 快捷过滤；修正 README「支持拖拽」不符 | 🟠 | M | D21 |
| D26 | 无 trace/请求关联跳转 → 识别 trace_id/request_id，「查看同 trace 全部日志」 | 🟠 | M | — |
| D27 | 关键字活动统计为固定英文词表 → 迁入设置可自定义、按 level 分类 | 🟡 | S | — |
| D28 | 导出仅限已加载结果（受 limit 2000 截断、列漂移）→ 服务端流式导出 + 可选字段 | 🟡 | M | D49 |

### 代码质量与可维护性
| ID | 标题 | 严重度 | 工作量 | 关联 |
|---|---|---|---|---|
| D29 | 组件层几乎零测试（13/14 组件）→ `@vue/test-utils` + DOM 环境真实挂载行为断言 | 🔴 | L | — |
| D30 | 日期/时间格式化重复实现（formatters/timeUtils/logTime 三套 pad）→ 收敛单一模块 | 🟠 | S | S9 |
| D31 | `api/fields.js` 四函数高度重复 → 抽内部 params 构造器 + POST 薄封装 | 🟠 | S | D47 |
| D32 | 魔法数字分散、部分未进 config（结果条数选项两处硬编码）→ 上提 config 共用 | 🟠 | S | — |
| D33 | 错误处理风格不统一、空 catch 吞错 → 统一错误模型集中中文文案，空 catch DEV 留痕 | 🟠 | M | Q3 |
| D34 | 测试缺 coverage/CI 门禁、依赖范围宽松 → 加 coverage，锁定关键依赖 | 🟡 | S | Q5/Q8 |
| D35 | 字段 hits 估算隐式逻辑缺注释与测试 → 补注释与边界单测，UI 区分估算与真实命中 | 🟡 | S | Q2 |

### 安全性 (AppSec)
| ID | 标题 | 严重度 | 工作量 | 关联 |
|---|---|---|---|---|
| D36 | 代理白名单默认关闭、客户端校验可绕过 → 严格模式设默认基线，白名单作服务端强制项 | 🔴 | S | Q1 |
| D37 | Basic Auth 凭证明文 base64 存 localStorage → 反代统一注入认证 / 仅会话期 + 显著提示 | 🔴 | M | — |
| D38 | UI 自身无访问认证 → 入口与 /api 加统一访问控制，文档列「仅限可信网络」硬前置 | 🔴 | L | — |
| D39 | 缺日志内容脱敏能力 → 可配置字段级脱敏 + 默认敏感集合 | 🟠 | M | — |
| D40 | 审计仅记元数据且只存本地无防篡改 → 区分操作历史与安全审计（后者服务端不可清除） | 🟠 | M | — |
| D41 | CSP/安全头仅 Nginx 生效且 style-src 含 unsafe-inline → 去内联样式 + object-src/HSTS | 🟠 | S | — |
| D42 | 依赖供应链缺锁定审计与漏洞扫描 → CI 加 npm audit/Dependabot | 🟠 | S | Q5/Q8 |
| D43 | 保存视图快照 base64 易被误认为加密 → 加载结构校验 + 字段白名单 + 文档说明非加密 | 🟡 | S | — |

### API 集成与数据层
| ID | 标题 | 严重度 | 工作量 | 关联 |
|---|---|---|---|---|
| D44 | NDJSON 整包缓冲非真正流式 → fetch + ReadableStream 边读边解析分批 append | 🟠 | L | D12 |
| D45 | 相对时间令牌与 ISO 语义不统一 + 硬编码东八区 8h 偏移 → 统一归一化层、时区可配 | 🟠 | M | S9 |
| D46 | 重试拦截器对查询 POST 重放（502/504 打三遍、超时重跑）→ 查询端点收紧重试 | 🟠 | S | — |
| D47 | 字段元数据获取串行且无取消、每次全量 clearCache → 并行 + 真取消 + 精细失效 | 🟠 | M | D31/D15 |
| D48 | 请求统一附加 `_t` 禁缓存 → 区分对待，稳定元数据允许短 TTL | 🟡 | S | — |
| D49 | limit 仅客户端截断、无超限提示与续拉 → 真实命中总数比对提示截断 + 时间游标「加载更多」 | 🟠 | M | Q2/D28 · ✅ v2.1(截断提示；续拉待后续) |

### 工程化、构建与部署
| ID | 标题 | 严重度 | 工作量 | 关联 |
|---|---|---|---|---|
| D50 | 构建产物单包 ~1.4MB 未分包（Arco/ECharts/Vue 同 chunk）→ vendor 分离 + 低频面板异步加载 | 🟠 | M | D13 |
| D51 | 缺前端全局错误处理与上报 → 注册 errorHandler/unhandledrejection + 预留上报出口 | 🟠 | M | — |
| D52 | Docker/Nginx 缺健康检查与非 root 加固 → 加 HEALTHCHECK，按需非特权用户运行 | 🟡 | S | — |
| D53 | 环境变量与多环境配置缺体系 → 提供 `.env.example`，配置迁 Vite 环境变量分层 | 🟡 | M | — |

---

## 汇总

- **快速见效 Q1–Q10**：10 项 **全部完成 ✅**
- **战略投入 S1–S10**：**S1 ✅ / S2 ✅ / S3 ✅ / S4 ✅ / S5 ✅ / S6 ✅ / S7 ✅ / S8 ✅ / S9 ✅ / S10 ✅ 全部完成**
- **细分发现 D1–D53**：**D22 ✅ / D49 ✅(截断提示) 已完成**，其余 51 项与 Q/S 交叉引用、登记

> 路线图衔接见报告「功能更新路线图建议」：v2.1 止损与基础体验（**已清零**：Q2/Q6/Q7 + S1/D49/D22）→ v2.2–v2.3 分析能力升级（S2 查询补全 / S3 聚合分析 / S5 增量尾随 / S4 抽离编排 / S6 shallowRef / S7 响应式 / S8 a11y / S9 持久化 / S10 模式聚类）→ v3.0 平台化重构。详见 [`PLAN-2026-06-02-v2.1-facets-truncation-timeecho.md`](./PLAN-2026-06-02-v2.1-facets-truncation-timeecho.md)。
