# 🎨 红尘百宝箱 - Developer Toolbox

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Web-orange.svg)
![Offline](https://img.shields.io/badge/offline-ready-success.svg)

**一站式离线优先开发者工具集 · 30+ 工具 · 7 套主题 · 零构建运行**

[✨ 特性](#-特性) • [🚀 快速开始](#-快速开始) • [🛠️ 功能列表](#️-功能列表) • [🎨 主题](#-主题) • [📝 更新日志](#-更新日志)

[![GitHub](https://img.shields.io/badge/GitHub-HongChenGG-blue?logo=github)](https://github.com/HongChenGG/DeveloperToolBox)

</div>

---

## 📖 简介

红尘百宝箱是一个集成 **30+ 实用开发工具** 的纯前端 Web 应用。Vue、Element UI、Three.js、Markdown、KaTeX、代码高亮等运行依赖全部本地化；断网时本地工具照常使用，需要公网的天气、音乐和 AI 联网搜索会静默隐藏。

### ✨ 特性

- 🎯 **工具齐全** — JSON / SQL / JWT / Cron / Hash / 正则 / 代码生成 / Vue 速查……一网打尽
- 🌐 **离线优先运行** — 启动不访问外网；断网静默隐藏天气、音乐和联网搜索，恢复网络后自动显示
- 🎨 **7 套主题** — 含深色与极光午夜，按钮/阴影随主题色动态切换
- 💾 **本地存储** — 会话、会议、提醒和片段保存在当前浏览器，并支持损坏恢复或备份导出
- 🌌 **3D 背景** — Three.js 粒子背景，主题感知配色
- 🤖 **AI 对话助手** — OpenAI 兼容接口 / 本地 Ollama、会话分支、备份恢复、文件上下文、上下文预算、联网来源审批
- 🎵 **音乐播放** — 用户打开播放器后才加载在线歌单
- 🌤️ **天气 + 会议纪要** — 顺手的生活/办公小工具
- 🚀 **零构建** — 双击 index.html 即可运行，无需任何框架/打包工具

---

## 🛠️ 功能列表

### 📚 速查文档

| 工具 | 说明 |
|------|------|
| **Vue 2 / Vue 3 速查** | 三段式（是什么/为什么/什么时候用）+ 行内中文注释，小白友好 |
| **Vue Playground** | 本地 Vue 2 + Element UI 组件编辑与沙箱实时预览 |
| **Vue SFC 生成器** | 一键生成 `<template>/<script>/<style>` 骨架 |

### 📝 数据处理

| 工具 | 说明 |
|------|------|
| **JSON 格式化** | 格式化/压缩/字段识别/批量填充 |
| **SQL 拼接 / 字段清洗** | IN 查询拼接、字段批量清理 |
| **表格转换** | Markdown / CSV / JSON / SQL INSERT 互转 |
| **文本对比** | diff 高亮，行级差异展示 |

### 🔧 编码 / 转换

| 工具 | 说明 |
|------|------|
| **编码加密** | Base64 / URL / MD5 / Unicode / HTML 实体 |
| **Hash 计算** | MD5 / SHA-1 / SHA-256 / SHA-512 |
| **Base 进制转换** | 二/八/十/十六进制互转 |
| **大小写转换** | camelCase / snake_case / PascalCase / kebab-case |
| **配置格式互转** | JSON ⇄ YAML ⇄ Properties ⇄ XML |
| **JWT 解析** | Header / Payload 解码与过期时间展示（不验证签名） |
| **时间戳转换** | 时间戳 ⇄ 日期，多时区显示 |

### ⚙️ 代码生成

| 工具 | 说明 |
|------|------|
| **JSON 转类** | JSON → Java / TypeScript / Go 类定义 |
| **JSON 转 Vue 表单** | JSON Schema → Element 表单代码 |
| **POJO 映射** | 字段映射代码自动生成 |
| **Spring 注解速查** | 常用注解 + 示例 + 一键复制 |
| **Lombok 展开** | `@Data` 等注解展开为完整 Java 代码 |
| **MyBatis 生成器** | 表结构 → Mapper / Entity / XML |

### 🌐 网络 / 系统

| 工具 | 说明 |
|------|------|
| **Cron 表达式** | 可视化解析 + 自然语言翻译 + 下次执行时间 |
| **正则表达式** | 实时匹配、分组高亮、常用模板 |
| **IP 计算** | 子网划分、CIDR、IP 范围、二进制展示 |
| **UUID 生成** | v1 / v4 批量生成 |
| **API Mock** | 快速构造 Mock 响应数据 |
| **请求头工具** | 常用请求头模板 |

### 📋 办公 / 生活

| 工具 | 说明 |
|------|------|
| **Markdown 编辑器** | 实时双栏预览，支持代码高亮 |
| **代码片段** | 常用片段收藏 + 搜索 |
| **会议纪要** | 议题/决议/待办分类，本地存储，可导出 |
| **二维码 / 条形码** | 生成 + 解析 + 自定义样式 |
| **天气查询** | 50+ 城市，24h / 7d 预报 |
| **音乐播放器** | 悬浮窗，黑胶旋转效果 |

### 🤖 AI 助手

| 功能 | 说明 |
|------|------|
| **本地与兼容接口** | 优先支持本机 Ollama，也支持 OpenAI 兼容中转服务 |
| **会话管理** | 搜索、置顶、非破坏式编辑/重新生成分支、继续生成 |
| **上下文** | Skills、图片、本轮文本文件、长对话摘要、上下文预算估算 |
| **备份恢复** | 会话/Profile/Skills JSON 合并或覆盖恢复，API Key 默认不导出 |
| **联网工具** | 网络可用时显示；新域名访问需审批，并保留来源记录 |

---

## 🎨 主题

7 套主题，按钮渐变和阴影色会跟着主题色动态切换：

| 主题 | 描述 | 主色调 |
|------|------|--------|
| 🌊 清新青蓝 | 清爽明亮，默认主题 | `#00B4D8` |
| 🌸 甜美粉色 | 温柔甜美 | `#FF6B9D` |
| 💜 神秘紫色 | 高贵神秘 | `#A78BFA` |
| 🍊 阳光橙色 | 热情活力 | `#FB923C` |
| 🌿 清新绿色 | 自然清新 | `#10B981` |
| 🌙 深色模式 | 低调护眼 | `#60A5FA` |
| 🌌 极光午夜 | 深空梦幻渐变 | `#7DD3FC` |

---

## 🚀 快速开始

### 直接使用

双击 `index.html` 即可运行。JSON、SQL、编码转换、文档、Markdown、Playground 等本地功能无需联网；天气、音乐、云端 AI 和联网搜索按需访问网络。

页面启动阶段不会主动探测或访问第三方地址。浏览器报告离线时，天气、音乐、DeepSeek/OneAPI 快速预设与 AI 联网搜索会静默隐藏，网络恢复后自动显示。本地 Ollama 入口始终保留。

### 本地部署（可选）

```bash
git clone https://github.com/HongChenGG/DeveloperToolBox.git
cd DeveloperToolBox

# 任选一种静态服务器
python -m http.server 8080
# 或
npx http-server -p 8080
```

### 本地 Ollama CORS

通过本地 HTTP 访问百宝箱时，建议只把实际页面 Origin 加入 Ollama 的允许列表，例如 `http://127.0.0.1:8080` 或 `http://localhost:8080`。不同 Ollama 版本的配置方式可能不同，请以当前版本文档为准。

`OLLAMA_ORIGINS=*` 只适合临时排障；它会允许任意网页向本机 Ollama 发起跨域请求，不建议作为长期配置。`file://` 页面如受浏览器跨域策略限制，优先使用上面的本地静态服务器方式运行。

### 浏览器要求

Chrome 90+ / Firefox 88+ / Safari 14+ / Edge 90+

---

## 📁 项目结构

```
toolbox/
├── index.html                  # 单页入口
├── favicon.ico
├── README.md
├── css/
│   ├── style.css              # 主样式
│   └── modern.css             # 现代化样式系统
├── js/
│   ├── app.js                 # 主应用
│   ├── security.js            # 安全 URL / Markdown 渲染边界
│   ├── ai-chat-core.js        # AI 数据迁移、SSE、分支、备份等纯逻辑
│   ├── ai-chat.js             # AI 页面与请求编排
│   ├── theme.js               # 主题切换 + 动态按钮配色
│   ├── three-bg.js            # 3D 粒子背景
│   ├── vue-docs.js            # Vue 2/3 速查文档
│   ├── vue-playground.js      # Vue 在线 Playground
│   ├── jwt.js / cron.js / regex.js / ipcalc.js / hash.js
│   ├── json2class.js / pojo-mapper.js / mybatis-gen.js
│   ├── spring-annotations.js / lombok-expand.js
│   ├── markdown.js / textdiff.js / tableconv.js
│   ├── baseconv.js / caseconv.js / configconv.js
│   ├── idgen.js / api-mock.js / snippets.js
│   ├── notes.js / weather.js / music.js
│   ├── regex-worker.js / hash-worker.js
│   └── offline-detect.js / enhance.js / page-meta.js
├── lib/                        # 第三方库（本地化）
│   ├── three.min.js           # 3D 背景
│   ├── marked.min.js          # Markdown
│   ├── crypto-js.min.js       # 加密
│   ├── diff.min.js            # 文本对比
│   ├── js-yaml.min.js         # YAML 解析
│   └── cronstrue-i18n.min.js  # Cron 翻译
└── vendor/                     # 重型框架（离线）
    ├── vue.min.js             # Vue 2.7
    ├── vue-playground-host.html # file:// 可用的隔离预览宿主页
    └── element-ui/            # ElementUI 2.15
```

---

## 🔒 隐私与安全

- ✅ **本地工具不外传** — JSON、SQL、转换器、文档、笔记和代码生成等在浏览器本地处理
- ✅ **启动零外网请求** — 不使用百度等第三方探测网络
- ✅ **断网可用** — 第三方运行库全部 vendor 本地化
- ✅ **沙箱预览** — Playground 预览不能读取父页面 DOM 或 localStorage
- ⚠️ **云端 AI** — API Key 作为请求头发送给你配置的模型服务；对话、图片、系统提示词、Skills 与本轮文件也会发送给该服务
- ⚠️ **天气 / 音乐 / 联网搜索** — 仅在用户主动操作时访问对应第三方或搜索代理
- ⚠️ **共享代理 Token** — 静态前端中的默认代理 Token 无法保密，只能通过 Worker 限制目标地址、超时、响应体积和域名审批缩小风险

---

## 🛣️ 路线图

### 已完成 ✅

- [x] 基础工具集成（30+）
- [x] 7 套主题 + 动态按钮配色
- [x] 3D 粒子背景
- [x] Vue 2 / Vue 3 速查文档（小白友好版）
- [x] Vue Playground 在线编辑器
- [x] Markdown 编辑器 / 正则测试 / 代码生成系列
- [x] 离线优先运行（启动零外网请求，联网功能动态显隐）
- [x] AI 会话分支、备份恢复、上下文预算、本地文件与联网来源审批

### 计划中 📋

- [ ] 颜色选择器 / 调色板
- [ ] 图片压缩 / 格式转换
- [ ] 更多代码生成器（GraphQL / Protobuf）
- [ ] PWA 支持，可安装到桌面

---

## 📝 更新日志

### v2.0.0 (2026-05)

- ✨ **新增 Vue 2/Vue 3 速查文档** — 三段式说明 + 行内中文注释，小白友好
- ✨ **新增 Vue Playground** — 在线编辑 Vue SFC，实时预览
- ✨ **新增大批工具** — JWT、Cron、正则、IP 计算、Hash、Markdown、文本对比、表格/Base/大小写/配置转换、UUID、Spring/Lombok/MyBatis/POJO 代码生成等
- 🎨 **主题按钮动态配色** — 主题设置 + 音乐按钮按主题色渲染渐变/阴影
- 🎨 **3D 粒子背景** — Three.js 实现，配色感知主题
- 🌌 **新增极光午夜主题**
- 📦 **完全离线化** — Vue / ElementUI / Three.js 等全部本地 vendor

### v1.0.0 (2024-12-02)

- 🎉 首次发布，集成 10+ 基础工具
- 🎨 6 套主题
- 🎵 音乐播放器 + 🌤️ 天气查询 + 📋 会议纪要

---

## 🤝 贡献

欢迎 Issue / PR！

1. Fork 项目
2. 新建分支 (`git checkout -b feature/AmazingFeature`)
3. 提交 (`git commit -m 'feat: add AmazingFeature'`)
4. 推送 (`git push origin feature/AmazingFeature`)
5. 开 Pull Request

---

## 📄 许可证

当前仓库尚未包含独立许可证文件；使用、修改或分发前请先确认仓库所有者的授权范围。

---

## 💖 致谢

- [Vue.js](https://vuejs.org/) · [Element UI](https://element.eleme.cn/) · [Three.js](https://threejs.org/)
- [marked](https://github.com/markedjs/marked) · [crypto-js](https://github.com/brix/crypto-js) · [js-yaml](https://github.com/nodeca/js-yaml)
- [cronstrue](https://github.com/bradymholt/cronstrue) · [diff](https://github.com/kpdecker/jsdiff)
- [QRCode.js](https://github.com/davidshimjs/qrcodejs) · [JsBarcode](https://github.com/lindell/JsBarcode) · [jsQR](https://github.com/cozmo/jsQR)

---

## 📧 联系方式

- 🐛 Issues: [https://github.com/HongChenGG/DeveloperToolBox/issues](https://github.com/HongChenGG/DeveloperToolBox/issues)
- ⭐ Star: [https://github.com/HongChenGG/DeveloperToolBox](https://github.com/HongChenGG/DeveloperToolBox)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请点个 Star！⭐**

Made with ❤️ by [HongChen](https://github.com/HongChenGG)

</div>
