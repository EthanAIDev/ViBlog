# Ethan ViBlog 个人技术博客

一个**纯静态**的个人技术博客系统，基于 Dark AI Lab 设计语言（方案 A）构建，
支持 Markdown 文章管理、项目展示、动效交互与响应式设计。
无数据库、无后台、无写接口 —— 内容维护直接编辑文件，或让 AI Agent 代劳（见 [docs/内容维护指南.md](docs/内容维护指南.md)）。

## 功能特性

- 📝 文章管理：Markdown 文章 + 自动索引，支持代码高亮、数学公式、Mermaid 图表、提示块
- 💼 项目展示：项目详情页（概述 / 技术栈 / 实现方案 / 图片画廊）
- 🎨 Dark AI Lab 设计系统：深色玻璃质感、紫青渐变、终端美学
- ✨ 动效引擎：打字机终端、数字滚动、滚动渐入、3D 卡片倾斜、磁性按钮、鼠标光斑、阅读进度条
- 🔍 文章过滤：搜索 + 分类 + 标签 + 分页
- ⚡ 纯静态：任何静态托管平台可直接部署（含 Cloudflare Pages `_headers`）

## 快速开始

```bash
npm install   # 实际上无运行时依赖，仅备用
npm start     # http://localhost:3000
npm run build-manifest  # 新增/修改文章或项目后重建索引
```

| 页面 | 访问路径 |
|---|---|
| 首页 | http://localhost:3000/ |
| 文章列表 | http://localhost:3000/posts.html |
| 文章详情 | http://localhost:3000/article.html?id=10000001 |
| 项目列表 | http://localhost:3000/projects.html |
| 项目详情 | http://localhost:3000/project.html?id=p001 |
| 关于我 | http://localhost:3000/about.html |

## 内容维护（Agent 工作流）

需要新增文章或项目时，直接对 AI Agent 说"帮我加一篇文章/项目"即可。
手动操作方式、meta.json / detail.json 格式、正文扩展语法
（公式 / Mermaid / 提示块 / 图片）见 **[docs/内容维护指南.md](docs/内容维护指南.md)**。

## 项目结构

```
ViBlog/
├── index.html          # 首页
├── posts.html          # 文章列表
├── article.html        # 文章详情
├── projects.html       # 项目列表
├── project.html        # 项目详情
├── about.html          # 关于我
├── articles/           # 文章内容（manifest.json 自动生成）
├── projects/           # 项目内容（manifest.json 自动生成）
├── assets/             # 静态资源
├── styles.css          # Dark AI Lab 设计系统
├── script.js           # 前端逻辑 + 动效引擎
├── server.js           # 纯静态文件服务器（只读）
└── build-manifest.js   # 内容索引构建器
```

## License

MIT License
