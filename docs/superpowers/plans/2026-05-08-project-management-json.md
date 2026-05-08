# Project Management JSON Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add project management in the admin panel using the existing JSON project structure, with markdown-based text import, independent gallery image uploads, and support for GitHub/docs links.

**Architecture:** Keep `projects/<id>/detail.json` as the source of truth. The admin UI edits only the reduced schema and saves it back as JSON. Project images are uploaded into `projects/<id>/images/`, then referenced from `gallery` entries in the JSON. `project.html` will be simplified to render only the preserved fields.

**Tech Stack:** Vanilla JavaScript, Node.js HTTP server, static HTML/CSS, JSON files.

---

### Task 1: Define the reduced project schema and migrate existing samples

**Files:**
- Modify: `projects/p001/detail.json`
- Modify: `projects/p002/detail.json`
- Modify: `projects/p003/detail.json`
- Modify: `projects/manifest.json`

- [ ] **Step 1: Write the failing data-shape check**

```js
const fs = require('fs');
const detail = JSON.parse(fs.readFileSync('projects/p001/detail.json', 'utf-8'));
console.assert(Object.keys(detail).sort().join(',') === 'gallery,id,implementation,links,overview,summary,techStack,title');
console.assert(Object.keys(detail.links).sort().join(',') === 'docs,github');
```

- [ ] **Step 2: Run the check and confirm it fails**

Run: `node -e "const fs=require('fs');const detail=JSON.parse(fs.readFileSync('projects/p001/detail.json','utf-8'));console.log(Object.keys(detail).sort().join(','));"`
Expected: shows extra fields like `background`, `results`, `role`, `status`, `dateRange`, `tags`.

- [ ] **Step 3: Rewrite the sample JSON files to the reduced schema**

```json
{
  "id": "p001",
  "title": "AI 知识库问答原型",
  "summary": "面向技术内容团队的问答原型，重点解决“找得到、答得准、可追溯”三个核心问题。",
  "techStack": ["RAG", "FastAPI", "向量检索"],
  "implementation": [
    "从文档切分、向量化、检索到答案生成，搭建完整链路。",
    "引入多路召回与重排序，提升复杂问题的命中质量。",
    "输出引用片段和来源，增强答案的可验证性。"
  ],
  "links": {
    "github": "https://github.com/example/rag-kb-prototype",
    "docs": "https://example.feishu.cn/wiki/rag-kb-prototype"
  },
  "gallery": [
    { "src": "images/cover.svg", "alt": "知识库问答首页", "caption": "问答入口与引用展示区" },
    { "src": "images/flow.svg", "alt": "检索流程图", "caption": "从提问到答案生成的链路流程" }
  ]
}
```

- [ ] **Step 4: Rebuild `projects/manifest.json` to match the reduced manifest shape**

```json
[
  {
    "id": "p001",
    "title": "AI 知识库问答原型",
    "summary": "面向技术内容团队的问答原型，重点解决“找得到、答得准、可追溯”三个核心问题。",
    "cover": "images/cover.svg",
    "href": "project.html?id=p001"
  }
]
```

- [ ] **Step 5: Re-run the check**

Run: `node -e "const fs=require('fs');const detail=JSON.parse(fs.readFileSync('projects/p001/detail.json','utf-8'));console.log(detail.id, detail.links.docs, Array.isArray(detail.gallery));"`
Expected: prints `p001`, a docs URL, and `true`.

### Task 2: Simplify the project detail page renderer

**Files:**
- Modify: `project.html`

- [ ] **Step 1: Write a rendering check in the browser console**

```js
const detail = {
  id: 'p001',
  title: 'Demo',
  summary: 'Summary',
  techStack: ['A', 'B'],
  implementation: ['One', 'Two'],
  links: { github: '#', docs: '#' },
  gallery: [{ src: 'images/a.svg', alt: 'A', caption: 'A' }]
};
```

- [ ] **Step 2: Replace the current multi-section renderer with a reduced renderer**

```html
<section class="project-detail-section">
  <h2>项目概述</h2>
  <p>...</p>
</section>
<section class="project-detail-section">
  <h2>技术栈</h2>
  <ul>...</ul>
</section>
<section class="project-detail-section">
  <h2>实现方案</h2>
  <ul>...</ul>
</section>
<section class="project-detail-section">
  <h2>链接</h2>
  <a href="...">GitHub</a>
  <a href="...">文档</a>
</section>
<section class="project-detail-section">
  <h2>演示图片</h2>
  ...
</section>
```

- [ ] **Step 3: Preserve safe image path rendering**

```js
img.src = './projects/' + projectId + '/' + item.src;
```

- [ ] **Step 4: Verify the page loads `p001` and renders only the reduced sections**

Run: open `http://localhost:3000/project.html?id=p001`
Expected: only the reduced sections are visible; no background/results/decision blocks remain.

### Task 3: Add backend support for project CRUD and gallery uploads

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add failing request checks**

```bash
curl http://localhost:3000/api/projects
curl -X POST http://localhost:3000/api/projects/save
curl -X POST http://localhost:3000/api/projects/upload-image
```

- [ ] **Step 2: Implement project list, load, save, delete, and image upload endpoints**

```js
// GET /api/projects
// GET /api/projects/:id
// POST /api/projects/save
// DELETE /api/projects/:id
// POST /api/projects/upload-image
```

- [ ] **Step 3: Save gallery images under `projects/<id>/images/` and return relative paths**

```js
{ success: true, imageSrc: 'images/demo_001.png' }
```

- [ ] **Step 4: Verify endpoint responses**

Run:
```bash
curl http://localhost:3000/api/projects
curl http://localhost:3000/api/projects/p001
```
Expected: JSON list and single detail payload.

### Task 4: Build the admin project management UI

**Files:**
- Modify: `admin/index.html`
- Modify: `admin/admin.js`
- Modify: `admin/admin.css`

- [ ] **Step 1: Add the project management section and form**

```html
<section id="projects-section" class="content-section">
  <div class="toolbar">
    <button class="btn btn-primary" id="add-project-btn">添加项目</button>
  </div>
  <div id="projects-table"></div>
</section>
```

- [ ] **Step 2: Add the project editor fields**

```html
<input id="project-id">
<input id="project-title">
<textarea id="project-summary"></textarea>
<input id="project-tech-stack">
<textarea id="project-implementation"></textarea>
<input id="project-link-github">
<input id="project-link-docs">
```

- [ ] **Step 3: Add gallery image upload controls**

```html
<input type="file" id="project-gallery-input" multiple accept="image/*">
<div id="project-gallery-list"></div>
```

- [ ] **Step 4: Implement markdown import and gallery extraction in admin JS**

```js
// markdown first heading -> title
// markdown summary block -> summary
// markdown unordered list -> techStack / implementation
// uploaded images -> gallery entries in order
```

- [ ] **Step 5: Add styling for the new project manager**

```css
.project-gallery-list { display: grid; gap: 12px; }
.project-gallery-item { display: flex; align-items: center; gap: 12px; }
```

- [ ] **Step 6: Verify add/edit/delete/save flows in the admin UI**

Run: open `/admin/`, create a project, upload images, save, and reopen the project.
Expected: gallery entries persist and links are saved.

### Task 5: Wire the project page and admin to the reduced manifest shape

**Files:**
- Modify: `script.js`
- Modify: `projects.html`
- Modify: `build-manifest.js`

- [ ] **Step 1: Remove references to deleted project fields from the shared renderer**

```js
var projectStatus = project.status || "项目";
var keywords = (project.tags || project.keywords || []).map(...)
```

- [ ] **Step 2: Adjust project list cards to use the reduced shape**

```js
var projectTitle = project.title;
var projectSummary = project.summary;
```

- [ ] **Step 3: Ensure manifest generation only emits reduced fields**

```js
manifest.push({
  id: meta.id,
  title: meta.title,
  summary: meta.summary,
  cover: meta.cover || '',
  href: 'project.html?id=' + meta.id
});
```

- [ ] **Step 4: Verify the projects list still renders and links to detail pages**

Run: open `http://localhost:3000/projects.html`
Expected: cards render without references to removed fields.

### Task 6: Sanity check and cleanup

**Files:**
- Modify: any touched file above only if needed

- [ ] **Step 1: Run syntax checks**

```bash
node --check server.js
node --check admin/admin.js
node --check script.js
```

- [ ] **Step 2: Reload the browser pages**

Open:
```text
http://localhost:3000/admin/
http://localhost:3000/projects.html
http://localhost:3000/project.html?id=p001
```

- [ ] **Step 3: Confirm the old unused project fields are gone from rendered output**

Expected: no `background`, `results`, `dateRange`, `role`, or `status` sections remain in `project.html`.

