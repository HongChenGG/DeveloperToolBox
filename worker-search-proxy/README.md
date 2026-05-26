# toolbox-search-proxy

给红尘百宝箱的 AI 联网搜索准备的 **Cloudflare Workers 反代**，单文件、零依赖、5 分钟部署。

## 解决什么问题

浏览器端的 AI 在前端直接 `fetch('https://www.baidu.com/s?wd=xxx')` 会被 CORS 拒绝。
本 Worker 充当中转：

| 路径 | 作用 |
|---|---|
| `/search?q=关键词` | 默认走 **Bing HTML 抓取**（免 API Key，对云 IP 友好），也可指定 `&engine=ddg` / `&engine=google` / `&engine=bing` |
| `/fetch?url=https://...` | 抓任意网页，自动转纯文本（HTML 不友好 LLM） |
| `/health` | 健康检查 |

> ⚠️ **为何不默认 DuckDuckGo**：DDG 会基于 IP 段判断是否真人，Cloudflare 数据中心 IP 经常被它返回空结果。Bing 的反爬较宽松，抓 HTML 命中率高得多。

所有响应都自带 `Access-Control-Allow-Origin: *`，浏览器端 AI 直接拿来用。

## 部署（仪表盘方式，最快）

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create**
2. 选 *Hello World* 模板 → **Quick edit**
3. 把 [`worker.js`](./worker.js) 的内容**整段粘贴覆盖**
4. **Save and deploy**，记下 `*.workers.dev` 地址（例：`https://toolbox-search-proxy.your-name.workers.dev`）
5. **Settings → Variables and Secrets** 里加变量：

| 变量名 | 必填 | 说明 |
|---|---|---|
| `PROXY_TOKEN` | **强烈建议** | 你自己起的访问密钥；不设则全网公开调用 |
| `DEFAULT_ENGINE` | 否 | `bing_html`（默认）/ `ddg` / `google` / `bing` |
| `GOOGLE_API_KEY` | 想用 Google | [Google Cloud Console](https://console.cloud.google.com) 申请。⚠️ 2025 起新建 CSE 已无法"搜索整个网络"，不推荐 |
| `GOOGLE_CX` | 想用 Google | [Programmable Search Engine](https://programmablesearchengine.google.com/) 建一个引擎拿到的 cx |
| `BING_API_KEY` | 想用 Bing | Azure Marketplace 申请，F0 阶梯 1000 次/月免费 |
| `FETCH_MAX_CHARS` | 否 | `/fetch` 单次返回字符上限，默认 8000 |

**最简配置**：只填 `PROXY_TOKEN` 一项就能用 —— 默认走 Bing HTML 抓取不需要任何搜索 API Key。

> 如果默认引擎抓不到（极少数情况），Worker 会自动 fallback 到 DuckDuckGo lite，响应里会带 `"fallback": "bing_html → ddg"` 字段。

## 接入红尘百宝箱

在 toolbox 的「AI 设置 → 联网搜索」里：

- **搜索引擎 URL 模板**：`https://toolbox-search-proxy.your-name.workers.dev/search?q={q}&token=你设置的PROXY_TOKEN`
- 启用联网搜索勾上即可

`web_fetch` 会自动复用同一域名替换路径走 `/fetch?url=...`（前端代码会处理）。

## 部署（wrangler CLI，适合多环境）

```bash
npm i -g wrangler && wrangler login
wrangler init toolbox-search-proxy --type=javascript
# 用 worker.js 覆盖 src/index.js
echo "<your-token>" | wrangler secret put PROXY_TOKEN
echo "<your-google-key>" | wrangler secret put GOOGLE_API_KEY
echo "<your-cx>" | wrangler secret put GOOGLE_CX
wrangler deploy
```

## 免费额度

| 服务 | 配额 |
|---|---|
| Cloudflare Workers Free | 10 万次请求/天 |
| Google CSE 免费档 | 1000 次/天 |
| Bing Web Search F0 | 1000 次/月 |

够个人用一辈子。

## 安全提醒

- `PROXY_TOKEN` 强烈建议设置——否则全网都能用你的 Google/Bing 配额，免费额度几小时就被薅光
- API Key（Google/Bing）只放 Cloudflare Variables，**永远不要写进前端代码**
- 想限制 origin 的话，把 `worker.js` 里 `Access-Control-Allow-Origin: '*'` 改成你的域名

## 与 HelloKimi 的关系

[HelloKimi](https://d/Code/HelloKimi) 是把 kimi-ai.chat 包装成 OpenAI 兼容 API 的 Worker（用 Hono 框架）。
本项目是它的**轻量姊妹**：不依赖 Hono，只做搜索/抓取反代，单文件 < 200 行，复制粘贴就能跑。
