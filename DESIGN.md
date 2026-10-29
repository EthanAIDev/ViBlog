---
name: Ethan / ViBlog — 认知剧场
description: 深蓝黑展厅中的认知雕塑，以暖象牙文字、银色材质与浅蓝反馈连接作品和技术阅读。
colors:
  paper: "#080b11"
  paper-light: "#10151e"
  ink: "#ede7dc"
  muted: "#a0a6b0"
  line: "#303742"
  accent: "#96b5e8"
  accent-ink: "#b9d2fa"
  button-surface: "#e4e7ed"
  button-ink: "#131b29"
  prose-ink: "#d2d6df"
typography:
  display:
    fontFamily: "'Noto Serif SC Variable', serif"
    fontSize: "clamp(40px, 4.35vw, 72px)"
    fontWeight: 400
    lineHeight: 1.42
    letterSpacing: "-.025em"
  headline:
    fontFamily: "'Cormorant Garamond', 'Noto Serif SC Variable', serif"
    fontSize: "clamp(44px, 6.3vw, 86px)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-.025em"
  section:
    fontFamily: "'Cormorant Garamond', 'Noto Serif SC Variable', serif"
    fontSize: "clamp(36px, 3.2vw, 52px)"
    fontWeight: 400
    lineHeight: 1.2
  title:
    fontFamily: "'Manrope Variable', 'Noto Sans SC Variable', sans-serif"
    fontSize: "23px"
    fontWeight: 550
    lineHeight: 1.6
  article-title:
    fontFamily: "'Noto Serif SC Variable', serif"
    fontSize: "clamp(27px, 3.5vw, 43px)"
    fontWeight: 500
    lineHeight: 1.55
    letterSpacing: "-.025em"
  body:
    fontFamily: "'Manrope Variable', 'Noto Sans SC Variable', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.8
  reading:
    fontFamily: "'Manrope Variable', 'Noto Sans SC Variable', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 2.05
  control:
    fontFamily: "'Manrope Variable', 'Noto Sans SC Variable', sans-serif"
    fontSize: "14px"
    fontWeight: 550
  label:
    fontFamily: "'Manrope Variable', 'Noto Sans SC Variable', sans-serif"
    fontSize: "12px"
    fontWeight: 400
  code:
    fontFamily: "'IBM Plex Mono', monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.8
rounded:
  control: "3px"
  code: "4px"
  circular: "50%"
spacing:
  gutter: "clamp(22px, 3.8vw, 72px)"
  button: "12px 23px"
  section-desktop: "110px"
  section-mobile: "65px"
  filter: "5px 12px"
components:
  button-primary:
    backgroundColor: "{colors.button-surface}"
    textColor: "{colors.button-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "{spacing.button}"
  button-primary-hover:
    backgroundColor: "{colors.accent-ink}"
    textColor: "{colors.button-ink}"
  topic-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "{spacing.filter}"
  text-link:
    textColor: "{colors.ink}"
    padding: "10px 0"
  text-link-hover:
    textColor: "{colors.accent-ink}"
  theatre-part:
    backgroundColor: "#0d1726ec"
    textColor: "#e6efff"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  theatre-part-selected:
    backgroundColor: "#d4e4fa"
    textColor: "#101a29"
  search-input:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "9px 0"
  navigation-link:
    textColor: "{colors.ink}"
    padding: "14px 0"
  article-row:
    textColor: "{colors.ink}"
    padding: "35px 0"
  theatre-observation:
    backgroundColor: "#0b1322ed"
    textColor: "{colors.ink}"
    padding: "20px 34px 20px 20px"
  orbit-input:
    backgroundColor: "transparent"
    height: "44px"
---

# Design System: Ethan / ViBlog — 认知剧场

## Overview

**Creative North Star: "认知剧场"**

以嵌套环形雕塑把推理、行动与反馈变成可探索的空间。深蓝黑展厅承托银色金属、烟色玻璃和暖象牙文字；浅蓝只承担交互反馈与链接。中文衬线标题与英文展示字形成安静、开放的展览气质。

视觉强度随任务收放：作品展示保留大图、留白和材质，索引依靠细线与对齐组织信息，文章回到稳定的阅读列。标题、导航、作品与文字内容使用真实 HTML，始终与三维资源独立。

当前视觉来源为 `src/styles/theatre.css`；`src/styles/global.css` 提供被复用的布局、组件结构与行为，两者由 `src/layouts/Layout.astro` 依次加载。前置令牌记录生效的体系，不把基础文件中的旧视觉残留作为新规范。

**Key Characteristics:**

- 深蓝黑底面、暖象牙文字与浅蓝交互信号。
- 中文 Noto Serif SC 与英文 Cormorant Garamond 分工，正文使用 Manrope / Noto Sans SC。
- 真实三维金属与玻璃承担主视觉；真实项目截图承担作品内容。
- 开放图文、细线列表和窄阅读列共享同一视觉语言。
- 自然滚动、原生控件、可见焦点与减少动态效果共同保留内容入口。

## Colors

暖象牙文字悬于深蓝黑底面，灰蓝分隔线保持结构，浅蓝承担可操作性。精确色值以前置令牌为准。

### Primary

- **浅蓝信号（accent）**：全局交互色角色，与金属反射的冷色方向呼应。
- **亮浅蓝（accent-ink）**：链接悬停、正文链接、焦点轮廓与浅色按钮悬停。

### Neutral

- **展厅蓝黑（paper）**：全站基础底面；**近黑蓝（paper-light）**：页脚与轻微换层。
- **暖象牙（ink）**：主标题、导航、正文标题与主题选中面。
- **灰蓝说明（muted）**：日期、技术信息、摘要与辅助文字；**结构线（line）**：列表、筛选区与章节边界。
- **浅灰按钮面（button-surface） / 深蓝按钮字（button-ink）**：实心操作按钮的反差配对。
- **阅读灰白（prose-ink）**：长文正文，较暖象牙标题稍退后。

局部三维说明和代码区使用各自的深蓝承托面；它们不是第二套主题。文本选区沿用深蓝选中面，滚动条与输入光标也使用本体系的蓝灰角色。

**The Quiet Signal Rule.** 浅蓝用于链接、焦点与局部交互反馈；大面积底面仍由深蓝黑承担。

## Typography

**Display Font:** 中文为 Noto Serif SC Variable，回退 serif；英文为 Cormorant Garamond，中文回退 Noto Serif SC Variable，再回退 serif。
**Body Font:** Manrope Variable，中文回退 Noto Sans SC Variable，再回退 sans-serif。
**Code Font:** IBM Plex Mono，回退 monospace。

字体由 `Layout.astro` 的 Fontsource 导入在本地打包。Cormorant Garamond 已加载（400 / 500），其余中英文字体使用可变版本；代码字体加载（400）。不以系统字体充当展示字。

### Hierarchy

- **Display**：中文主视觉标题，轻字重、紧字距与充足行高并用；保留已建立的两行分句。
- **Headline / Section**：英文集合页与章节标题；作品名称使用同一展示字，首页作品名按（36px–64px）伸缩。
- **Title**：文章索引标题；正文摘要与技术信息使用更小的无衬线，避免与入口标题争夺层级。
- **Article title**：中文文章主标题采用衬线，正文二、三级标题继续使用无衬线，分别为（25px / 19px，500）。
- **Body / Reading**：基础界面文字与长文分开。桌面长文使用 reading 角色；手机正文为（15px），项目详情段落保留更紧凑的（14px）。
- **Control / Label / Code**：控件与辅助标签使用正文家族；日期、内容标识与代码可以使用等宽字，不把等宽字扩展为整页的技术装饰。

**The Bilingual Type Rule.** 中文主视觉与文章主标题使用中文衬线；英文展示标题使用 Cormorant Garamond；正文与操作文字使用无衬线。

## Layout

常规内容外壳居中，最大宽（1600px），水平边距使用 gutter。区块依靠留白、图文比例和细线建立阅读顺序，不给每个内容单元追加外框。

- **展示**：首页雕塑采用全幅舞台，桌面高度随宽度变化（47.16vw）。中文标题位于画面左下，主导航覆盖舞台上方，作品入口使用 HTML；舞台底部不放操作控件。真实作品图文交替排列，常见比例（1.4fr / 1fr），下一项反转视觉重心。
- **索引**：作品索引将截图与说明并置（1.2fr / .9fr）；文章索引按日期、内容、入口分列（150px / 1fr / 50px）。搜索、分类、主题与结果数按筛选任务连续组织。
- **阅读**：文章外壳最大宽（900px），桌面内侧留白（36px），手机为（22px）。项目说明采用目录与内容双列（220px / minmax(0,1fr)），内容列最大宽（850px）。代码、表格、公式与流程图允许自身横向滚动。

响应规则：

| 条件 | 已实现行为 |
| --- | --- |
| 宽度至少（1700px） | 主视觉舞台解除桌面最大高度限制，继续按视口宽度构图。 |
| 宽度不超过（1100px） | 收紧主视觉标题与作品双列比例，项目目录列缩至（170px）。 |
| 宽度不超过（760px） | 页头高（76px），隐藏身份副说明，保留三个直接导航入口；主视觉重新安排镜头与标题，粒子数减至（125）。 |
| 同上 | 作品、关于、项目索引和画廊改为单列；交替作品恢复图片在前。文章日期移至标题上方，项目目录取消吸顶并横向换行。 |
| 同上 | 搜索与分类保持同行，分类宽由（185px）缩至（100px）；长文与大标题相应缩小。 |

主视觉在触屏保留纵向页面滚动；横向拖动用于旋转。首页作品与文章不要求访客完成雕塑交互后才能进入。

## Elevation & Depth

界面本身主要通过底色差、细线和留白分层，截图保留轻柔的软阴影。主视觉的深度来自真实三维几何、银色金属、烟色玻璃、环境照明、粒子柔光与克制的镜像回声；不叠加部件文字浮层。

### Shadow Vocabulary

- **主视觉标题**：使用轻微文字阴影抵御环境图明暗变化，文字仍为真实 HTML。

三维金属使用物理材质（金属度 1、静止粗糙度 .19、清漆 1）；烟色玻璃为非金属（金属度 0、粗糙度 .12、透射 .65、折射率 1.46）。这些是当前场景参数，不构成图像级反射、真机帧率或设备性能的承诺。下方反射为低透明度镜像结构，手机关闭此回声。

**The Material Rule.** 雕塑的金属、玻璃与反射由真实几何、物理材质和受光关系表达，不用界面卡片、CSS 模糊或静态整张概念图替代交互主体。

## Shapes

内容区、导航与图片承托面保持直边；小型按钮、主题筛选和部件入口使用小圆角，代码块略大。圆形只服务雕塑结构、状态与少量原有入口，不作为通用内容容器。

边界以单像素细线为主，键盘部件入口使用蓝灰描边。作品截图尊重原始比例，索引和画廊使用 contain；关于肖像为正方形裁切、低饱和度、无旋转。

## Components

### Buttons

实心按钮是浅灰面与深蓝字，源代码中的两种旧变体名称在当前视觉中共享这一外观。最小高度（50px），使用 button 内边距和 control 圆角。悬停背景转亮浅蓝并上移（2px），过渡（.2s）。

图标操作最小目标（44px），用共享内联 SVG 和可读名称。全局可见焦点使用（2px）亮浅蓝轮廓与（5px）偏移。文字入口保持轻量，普通文字链接的箭头在悬停时移动（3px, -2px）。

### Inputs / Fields

搜索与分类使用透明底和蓝灰下划线，标签在上、控件起点对齐，最小高度（50px）。搜索保留原生 search 行为、可见标签与提示；分类使用原生 select。结果数以状态文本反馈，空结果提供清除筛选，分页禁用态降低透明度。

雕塑不显示旋转滑条或播放控件，通过拖拽观察，键盘部件入口用于聚焦。

### Chips

主题按钮可换行，选中为暖象牙底配深蓝黑字，悬停为深蓝面；用 `aria-pressed` 表达状态。文章展示标签是轻文本，不伪装成交互控件。

### Cards / Containers

作品以开放的真实截图、名称、摘要与案例入口组成；文章以横线分隔的内容行组成。首页的作品按顺序交替图文布局，不将其做成等尺寸概览卡。图片悬停只轻微放大（1.025），使用（.5s cubic-bezier(.16,1,.3,1)）。

### Navigation

ETHAN 字标使用正文家族（21px，500，字距 .22em），主导航保留中文直接入口。当前项以文字下方的一条暖象牙细线标记（1px、与文字等宽）。手机隐藏身份副说明，不引入折叠菜单。

跳到主要内容、返回链接、返回顶部与可见焦点复用全站行为。文章与项目详情分别归属对应主导航；已有内容路由与旧链接继续可达。

### Cognitive Sculpture

三组开放环分别表达推理、行动与反馈，周围的柔光粒子与光标互动。它是通用 Agent 隐喻，个人项目在独立内容区呈现。

- 自动运行时各环缓慢异速旋转；鼠标移动产生有限视差。光标靠近环时，局部银白反光随之滑过，移开后（300ms）淡出；金属原色、粗糙度保持一致，不用整圈蓝色自发光表示悬停或选中。键盘聚焦保留同样的局部光照反馈。
- 点击三维环或原生部件按钮选中；结构轻微分开、镜头聚焦，不弹出卡片。再次点击或 Escape 返回整体；Escape 保留焦点归还路径。
- 拖动旋转，释放后有阻尼；拖动只改变整体姿态，三环自转持续运行。纵向触屏手势交还页面。不显示暂停、复位或旋转滑条。
- 自然滚动使三环逐步展开并轻微退后，反向滚动恢复。
- 部件入口最小目标（44px），按三维位置投影；仅键盘焦点时显示，鼠标悬停和选中不显示文字标签。图形初始化失败时显示实际场景的静态回退图。
- 柔光粒子使用实例化精灵一次绘制，桌面（280）个、手机（125）个；光标附近轻微避让、旋绕和提亮，移出后回到缓慢漂浮。不绘制环间连线或脉冲球。
- 减少动态效果关闭自动旋转、视差、滚动空间变化及粒子运动/光标力场，保留静态微光与即时选中；离屏与页面隐藏时停止绘制。CSS 同时关闭平滑滚动并压缩过渡时间。

### Reading / Gallery

长文保留可折叠目录、标题锚点、代码复制、公式与流程图。代码和引用使用深蓝承托，正文链接保留下划线。流程图使用浅色画布以保留图内可读性，不将其扩大为页面主题。

文章图片与项目画廊使用原生 dialog 查看，保留关闭按钮、Escape 与关闭后的焦点归还；桌面画廊两列、手机一列。预览宽（min(1400px,94vw)）、最大高（93dvh），图片保持完整比例。

## Do's and Don'ts

### Do:

- Do 复用深蓝黑、暖象牙与浅蓝的角色，以及现有本地字体与共享 SVG 图标。
- Do 让真实截图、项目说明和文章内容决定版面比例，保留列表字段与表单起点的对齐。
- Do 保持导航、文字和作品入口独立于三维加载，并保留静态视图与原生操作路径。
- Do 在手机、键盘、触屏和减少动态效果条件下验收布局与关键交互。

### Don't:

- Don't 把旧样式中的残留颜色、未加载字体或一次性局部值提升为新页面的设计令牌。
- Don't 在阅读页加入持续运行的三维场景，或让大幅展示字替代正文层级。
- Don't 将认知雕塑描述为真实 Agent 请求、线上追踪数据、性能基准或产品能力背书。
- Don't 增加无任务作用的副标签、编号和说明，让布局、标题与真实内容承担解释。

## 导航与加载连续性

- 顶栏固定在视口顶部，桌面高 82px、手机高 76px；首页顶部透明，滚动后使用近不透明深色背景。内容页与锚点预留相应高度。
- 站内链接使用 Astro ClientRouter，保留顶栏，只对内容区做 90ms 退出与 170ms 淡入。系统减少动态效果时直接切换，内容入口不依赖动画。
- 加载与无 GPU 回退使用桌面/手机独立的透明雕塑截图；截图只含实际 canvas，禁止混入标题、导航或环境图。环境与真实 HTML 各自只渲染一层。
- 场景先编译再显示；高频鼠标悬停仅做轻量拾取，点击按实际可见几何判断。页面离开后释放场景及交互监听。
