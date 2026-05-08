# Ethan ViBlog 个人技术博客

一个静态的个人技术博客系统，全程使用Vibe Coding，基于个人审美和纯前端技术栈构建，支持文章管理、项目展示和响应式设计。

## 功能特性

- 📝 文章管理：支持 Markdown 格式文章，自动化生成文章列表和详情页
- 💼 项目展示：灵活的项目展示页面，支持自定义项目详情
- 🎨 响应式设计：适配各种设备，从桌面到移动端
- ⚡ 轻量高效：纯静态页面，无需复杂后端支持
- 🖼️ 多媒体支持：支持文章内图片展示

## 技术栈

- HTML5 + CSS3 + JavaScript
- Markdown 内容管理
- Node.js 服务端（用于开发环境）

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm start
```

服务器将在 http://localhost:3000 启动

### 构建文章索引

```bash
npm run build-manifest
```

## 项目结构

```
ViBlog/
├── index.html          # 首页
├── about.html          # 关于页面
├── article.html        # 文章详情页
├── posts.html          # 文章列表页
├── project.html        # 项目详情页
├── projects.html       # 项目列表页
├── articles/           # 文章内容目录
├── projects/           # 项目配置目录
├── assets/             # 静态资源（图片、图标等）
└── server.js           # Node.js 服务器
```

## 文章管理

在 `articles/` 目录下创建文件夹来添加新文章：

```
articles/
└── [文章ID]/
    ├── index.md        # 文章正文
    ├── meta.json       # 文章元数据
    └── *.png           # 文章图片
```

## 项目展示

在 `projects/` 目录下创建文件夹来添加新项目：

```
projects/
└── [项目ID]/
    ├── detail.json     # 项目详情配置
    └── images/        # 项目图片
```

## License

MIT License
