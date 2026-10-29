# 上线收尾

本轮保持用户已确认的视觉与交互，处理图片体积、搜索分享、生产验收和发布准备。用户确认通过 GitHub 自动部署至 Cloudflare；按 Cloudflare Pages 静态站点准备。正式地址确认为 `https://exl.qzz.io`，已写入仓库配置。

## 构建与发布

- Node.js 22.23.4+；安装使用 `npm ci`，构建使用 `npm run build`，静态输出目录 `dist`。
- 默认 `SITE_ENV=preview`：页面 `noindex, nofollow`，robots 禁止抓取；canonical 与分享地址采用已确认的正式域名，不使用 localhost。
- 正式发布设置 `SITE_ENV=production`；默认域名为 `https://exl.qzz.io`，可通过 `SITE_URL` 覆盖。域名必须是完整 HTTPS 源地址，不能带子路径、查询或本地地址。不合法时构建失败。
- 支持 `.env` 本地配置，示例见 `.env.example`；托管平台直接设置同名构建环境变量。
- 上线前执行 `npm run check`、`npm run build` 和 `node scripts/inspect-release.mjs`。生产预览复用 `scripts/inspect-theatre.mjs` 与 `scripts/inspect-lab.mjs`，设置 `PREVIEW_URL` 指向实际预览地址。
- `_headers` 提供 HTML 重新验证和带哈希资源长缓存；须确认所选平台支持该文件，并检查实际 HTTP 响应。
- 正式域名启用 HTTPS；验证不存在路径返回 404、旧 `.html` 与 query ID 入口继续可达。
- 发布前保留 Git 提交；首发后复验主要路由和分享信息，失败时回到前一版本。

## Cloudflare Pages 设置

| 配置 | 值 |
| --- | --- |
| Framework preset | Astro |
| Build command | `npm run verify:release`（含类型、构建与发布产物检查） |
| Build output directory | `dist` |
| Root directory | 仓库根目录 |
| Node.js | 仓库 `.node-version` 固定为本地验证的 24.20.0 |
| Production 环境变量 | `SITE_ENV=production`；`SITE_URL=https://exl.qzz.io`（与仓库默认地址一致） |
| Preview 环境变量 | `SITE_ENV=preview`；`SITE_URL=https://exl.qzz.io`，页面禁止收录 |

此站点不需要 Cloudflare adapter、Functions 或常驻 Node 服务。`robots.txt` 和站点地图在构建时生成普通文件。旧项目如使用根目录作为发布目录，必须改为 `dist`；不要将源码目录直接当作构建结果。

核对设置后先推送预览分支，检查站点、缓存、旧链接、真实 404 与图片加载，再将已验收提交用于正式分支。当前本机 GitHub CLI 尚未认证，未读取或修改远端 Cloudflare 设置。

依据：[Cloudflare Astro 指南](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)、[Node 版本设置](https://developers.cloudflare.com/pages/configuration/build-image/)、[响应头规则](https://developers.cloudflare.com/pages/configuration/headers/)。

## 图片与内容

- `npm run assets` 同步现有内容，并为主视觉、头像、项目与文章配图生成 480/960/1600/1920px WebP。小图不放大，内容哈希用于缓存；原始图片保留供放大查看。
- 页面使用响应式尺寸，主视觉按桌面和移动端选择尺寸；新的文章和项目图片随构建自动处理。
- 当前优化不更改个人经历或联系方式。内容上线前仍需本人核对；ViBlog 详情明确保留旧版实现记录。
- 分享封面来自当前实际首页的截图，输出 1200×630 JPEG。调整首页视觉后应重新截图。

## 验收边界

- 生产构建分别记录内容与雕塑浏览器验收、搜索分享产物检查、桌面和移动布局。
- 软件图形浏览器验收不能作为真实手机 GPU 帧率、发热或功耗结论。真实设备检查保留为人工上线检查项。
- 正式域名、托管平台、真实设备与外部链接的访问状态，应记录实际结果；未检查的项目不标为通过。

## 本轮结果（2026-10-29）

- 桌面主视觉两图由 4,453,590 字节减至 223,634 字节；移动端为 95,732 字节。原图保持不变。
- 生产预览下雕塑交互 29/29、内容功能 34/34 通过，包含多个尺寸、合成触屏、减少动态效果、无 GPU 回退及旧链接。实际截图已检查。
- WebGPU 完成真实场景绘制与交互验收；另强制 WebGL 2，像素验证局部反光和淡出后还原，无页面异常。
- 类型检查无错误；构建和 6 项发布产物检查通过。最初使用隔离测试夹具验证正式模式；域名确认后，已用 `https://exl.qzz.io` 重新完成正式构建与全部检查，`dist` 为正式版本。另在隔离目录验证已配置域名的预览模式仍为 noindex，测试夹具地址不用于发布。
- 规范与需求独立复核发现的域名校验、EXIF 图片方向、项目 Markdown 图片覆盖与缓存规则冲突均已修正并复查闭合。
- 尚未进行 Cloudflare 线上响应与真实手机硬件验收。GitHub 仓库外链因未认证及抓取失败无法确认访问状态，不据此认定失效。
- 正式域名的浏览工具访问及本机 HTTPS 请求未成功，线上连通性验收未完成；这不作为站点故障结论。未推送 GitHub 或触发线上部署。
