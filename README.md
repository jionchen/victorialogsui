# VictoriaLogs Explorer

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/vue-3.x-brightgreen.svg)
![Vite](https://img.shields.io/badge/vite-latest-blueviolet.svg)

一个为 [VictoriaLogs](https://docs.victoriametrics.com/victorialogs/) 量身定制的轻量级、高性能日志探索 UI。旨在提供类似 Kibana Discover 的交互体验，让用户通过**点击而非记忆语法**来高效探索日志。

## ✨ 核心特性

- **可视化字段侧边栏**：自动发现日志标签和流字段，展示 Top Values 分布，点击即可快速过滤。
- **高级日志查询 (LogsQL)**：支持 LogsQL 语法，提供查询历史记录，支持与 UI 筛选条件的双向同步。
- **交互式趋势图**：直观展示日志命中分布，支持框选区域自动缩放时间空间，点选下钻。
- **自定义表格列**：用户可自由选择要展示的字段列，支持拖拽移除及持久化存储。
- **上下文日志 (Surrounding Docs)**：一键查看特定日志行前后的上下文信息。
- **高性能渲染**：采用增量渲染技术（Progressive Rendering），轻松应对万级日志展示而不卡顿。
- **状态持久化**：查询条件、时间范围等实时同步至 URL，方便分享与深度链接。
- **安全设计**：生产环境不硬编码任何凭证，支持通过界面配置 Basic Auth。

## 🚀 快速开始

### Docker 部署 (推荐)

项目已内置 `docker-compose.yml`，可一键启动：

```bash
docker-compose up -d --build
```

启动后访问 `http://localhost:8080/vlogs-ui/`。

### 本地开发

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

3. 生产环境构建：
```bash
npm run build
```

## 🛠️ 配置说明

### 1. 代理配置 (Nginx)
在生产环境中，通常将此 UI 作为 VictoriaLogs 的代理层部署。内置的 Nginx 配置已处理了：
- 静态文件路径 `/vlogs-ui/`。
- API 转发 `/api/` 到 VictoriaLogs 后端（端口 9428），有效解决跨域问题。

### 2. 界面配置
访问 UI 后，点击右上角 **⚙️ 设置** 图标：
- **API Base URL**：配置 VictoriaLogs 的访问地址（默认为 `/api`）。
- **Authentication**：配置 Basic Auth 用户名和密码。
- **Pinned Fields**：配置侧边栏置顶展示的常用字段。

## 🍱 技术栈

- **Core**: Vue 3 (Composition API), Pinia, Vite
- **UI**: Arco Design Vue
- **Charts**: ECharts
- **Styling**: Vanilla CSS (Custom Variables)
- **Deployment**: Docker, Nginx

## 📜 许可证

MIT License
