# Ethan · 认知剧场 / ViBlog

Ethan 的个人技术网站：可探索的三维认知雕塑、项目案例与技术笔记。

Astro 生成完整静态 HTML；React 管理雕塑状态和文章筛选；Three.js 的 WebGPURenderer 渲染真实三维几何，支持 WebGPU 并回退至 WebGL 2。无图形支持时保留实际场景的静态图与全部内容入口。

首页的三组开放圆环表达推理、行动与反馈：持续自动循环，拖动改变观察角度且不暂停自转，点击只聚焦，自然滚动展开。光标靠近时，附近金属表面泛起柔和银白反光，移开后 0.3 秒淡出；周围粒子随光标避让、旋绕和变亮。不显示底部控件、悬停文字卡或点击卡片，不绘制环间连线和脉冲球。保留键盘探索与系统减少动态效果偏好，触屏纵向滑动保留页面滚动。雕塑不连接模型服务；真实项目在独立内容区呈现。

全站通过 Astro ClientRouter 在同一文档中切换内容，顶栏固定并跨页面保留；页面内容使用短淡入，链接在悬停时预取。代码复制、画廊和图表按页面初始化并在离页时清理。加载占位图为桌面与手机分别截取的透明雕塑，不含导航或标题，避免刷新时文字重影。

## 本地运行

需要 Node.js 22.23.4+（当前验证环境为 Node.js 24）与 npm 9.6.5+。

```sh
npm install
npm start
```

开发地址为 http://localhost:3000/。若端口被其他服务占用，Astro 会在启动输出中报告实际地址。

```sh
npm run check          # TypeScript / Astro 类型检查
npm run build          # 重建内容索引、同步素材、生成 dist/
npm run preview        # 在 3000 端口预览生产构建
npm run verify:release # 类型检查、构建与搜索分享/图片产物检查
```

静态托管的构建命令为 `npm run build`，发布目录为 `dist`。字体、公式样式和前端依赖均随构建自托管。Three.js 与 Mermaid 按需加载，普通内容页不加载 3D 渲染器。

默认构建为禁止搜索收录的预览版，正式地址已确认为 `https://exl.qzz.io`。正式发布时，在托管平台设置 `SITE_ENV=production`；`SITE_URL` 可覆盖仓库内的正式地址。构建会校验地址，并生成 canonical、分享绝对地址、robots.txt 与站点地图。支持复制 `.env.example` 为本地 `.env`；文件不提交。不会生成指向 localhost 的搜索地址。完整发布检查见 [上线清单](docs/launch-checklist.md)。

`npm run assets` 自动生成带内容哈希的响应式 WebP。首屏使用压缩后的桌面/移动图片；项目、文章与头像使用 srcset 和实际尺寸。放大查看仍读取原始图片。原始素材继续存放在原目录，无需手动维护压缩版本。`public/media` 是生成目录，`public/social/cover.jpg` 是当前真实首页的分享截图。

## 页面与内容

| 页面 | 路径 |
| --- | --- |
| 认知剧场首页 | / |
| 文章与筛选 | /posts/ |
| 文章详情 | /articles/10000002/ |
| 项目列表 | /projects/ |
| 项目案例 | /projects/p001/ |
| 关于 | /about/ |

旧的 posts.html、projects.html、about.html、article.html?id=... 和 project.html?id=... 继续跳转到对应新页面。

文章仍存放在 articles/<id>/index.md 与 meta.json；项目仍使用 projects/<id>/detail.json 和原有图片。详见 [内容维护指南](docs/内容维护指南.md)。项目 p003 中保留原版网站的历史实现说明和截图，并标注版本差异。

## 代码结构

```text
src/
  pages/                   # 首页、文章、项目、关于、404
  layouts/Layout.astro     # 统一导航、字体与页脚
  components/              # Theatre、文章筛选、图标、图片对话框
  data/cognition.ts        # 推理、行动、反馈的简短内容
  lib/content.ts           # 现有内容读取与构建期 Markdown 渲染
  lib/theatre.ts           # 圆环、拾取、连续自转、拖拽与资源释放
  lib/particle-field.ts    # 实例化柔光粒子与光标力场
  lib/site.ts              # 代码复制、Mermaid、图片放大
  styles/global.css        # 内容组件与基础布局
  styles/theatre.css       # 认知剧场主题、交互与响应式规则
scripts/
  sync-public.mjs          # 同步现有内容素材并生成旧链接入口
  optimize-images.mjs      # 生成响应式 WebP 与图片尺寸清单
  inspect-release.mjs      # 发布环境、搜索分享与图片体积检查
  inspect-lab.mjs          # Playwright 浏览器验收与截图
  inspect-theatre.mjs      # 实际像素变化、拾取、聚焦、触屏、滚动、离屏与降级验收
  inspect-navigation.mjs   # 同文档导航、固定顶栏、页面生命周期与透明占位图验收
  inspect-entrance.mjs     # 多方向入场、加载回退、减少动态效果和中途操作验收
  capture-theatre-poster.mjs # 只截取真实 canvas，重新生成透明占位图
build-manifest.cjs         # 内容索引构建器
```

public/articles、public/projects、public/assets 是自动生成的镜像，不应直接编辑。重启开发服务或重新构建时会同步。原图不被改写；镜像旁的 JSON 记录其仓库来源，不代表对原始授权的独立核验。

## 浏览器验收

复用 Playwright，检查装置状态、WebGL 兼容路径、减少动态效果、内容搜索、目录、公式、流程图、画廊、旧链接，以及桌面与移动端溢出。

```sh
npx playwright install chromium   # 本机尚无 Playwright 浏览器时运行一次
node scripts/inspect-lab.mjs
node scripts/inspect-theatre.mjs
node scripts/inspect-navigation.mjs
node scripts/inspect-entrance.mjs
```

默认访问 3000；可用 PREVIEW_URL 指定其他预览地址，用 BROWSER_PATH 指定已有 Chromium 可执行文件。截图和验收 JSON 写入 .impeccable/review/，不提交到仓库。

设计规范记录在 DESIGN.md；产品约束记录在 PRODUCT.md；实施与验收边界记录在 docs/cognitive-theatre-plan.md。软件渲染浏览器的功能验收不代表真实手机 GPU 帧率，生产部署前可在目标设备进一步测量。

MIT License
