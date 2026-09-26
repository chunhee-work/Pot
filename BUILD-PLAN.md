# BUILD-PLAN — `/reel` 动态设计 Showreel

## Goal

新增一个独立页面 `/reel`：Chun Hee 的动态设计 showreel，用来放进简历。它是一段约 60 秒、在网页里实时渲染的编排式短片，自动循环，带播放器控件。首页和其它页面一个字不改，也不从任何页面链接过去，只能通过 `/reel` 直接访问。

## 创意方向

**主线（signature）：一根不断的金线。** 网站的主题句是 "from needle & thread, to camera & code"。整段 reel 由一根连续的金色缝线贯穿，从头到尾不断：一开始它一针一针缝出名字，然后依次变成胶片齿孔、角色配音的声波、切开品牌片的刀口、Gacha 卡包外那圈 10 格充能环，最后收成一个结，回到第一针，无缝循环。每个转场都是这根线的一次「match cut」。

- **颜色**：沿用网站现有的 `#0a0a09` 底色、`#f5f5f0` 文字色、`#a19f97` 次要色。线是刺绣金 `#d8b26a`，高光 `#f3dfa8`。
- **字体**：只用 repo 里已有的 Archivo（网站正文字体）和 Cinzel Bold（Land of Hope 标题字体），不引入新字体。
- **技术**：WebGL 层用 repo 里已有的本地 three.js bundle（`assets/gameui/three-ec08179080.js`），负责图片平面、位移转场、3D Land of Hope chrome logo（已有 `.glb`）和胶片颗粒后期。2D canvas 层负责金线和逐字排版动画。整段画面是时间 `t` 的纯函数，所以拖动进度条到任何一帧都完全准确。不加任何新依赖、不加 CDN 请求。

## 分镜（时间码按背景音乐的节拍微调）

| 时间 | 章节 | 画面 |
|---|---|---|
| 00:00–00:06 | Needle | 黑场。针尖刺破画面，金线一针一针缝出 **CHUN HEE**，配字 "from needle & thread," |
| 00:06–00:12 | Medium | 针脚拉直，变成胶片齿孔（match cut）。"to camera & code." 逐字砸进来 |
| 00:12–00:24 | Land of Hope | 3D chrome logo 升起；4 集剧照沿着胶片线带视差滑过，位移转场；"4 episodes · 17 min original animation" 计数动画 |
| 00:24–00:36 | The Cast | 金线变成声波；10 个角色卡按节拍翻入，名字做 kinetic type；"12 voices" |
| 00:36–00:44 | Four more cuts | CCATS / OG10 / SKET / Bounty Board 快切，金线像刀一样斜切画面，色调依次是琥珀、钢蓝、粉、余烬 |
| 00:44–00:54 | The Product | 金线绕成 Gacha 卡包外的 10 格充能环；卡包界面 before → after 对比；"every pixel given a job" |
| 00:54–01:00 | One operator | 金线收成一个结，变成名字 lockup 和联系邮箱，然后无缝接回第一针 |

**控件**：播放/暂停、带章节刻度的进度条（可拖动）、章节名、声音开关、全屏、重播。键盘操作：空格、←/→ 跳 5 秒、M 静音、F 全屏、1–7 跳章节。鼠标静止 2.5 秒后控件自动隐藏。

## Milestones

### M0 准备
- **T1 分支和骨架** — est 20m
  - 把 `staging` 强制重置到生产分支 `claude/chun-hee-portfolio-8ptzy9` 的最新提交（已获批 6A），session 分支从它开出。
  - 建 `BUILD-STATUS.md`，加 `.vercelignore`（不把计划、状态文件和测试部署上线），`vercel.json` 加 `/reel` → `/reel.html` rewrite，建空页面骨架。
  - done-when：`origin/staging` 和生产分支 HEAD 是同一个 commit；本地打开 `/reel.html` 返回 200；首页 HTML 文件的 hash 没有变化。

### M1 引擎
- **T2 时间轴引擎和渲染器** — est 60m
  - 纯函数 `render(t)`；素材预加载带进度；WebGL 层和 2D 层合成；颗粒、暗角后期。
  - done-when：冒烟测试 seek 到 0s、30s、59s，每帧都不是空白（像素方差高于阈值），控制台零报错；附截图。
- **T3 播放器控件** — est 40m
  - 实现上面列出的全部控件和快捷键。
  - done-when：测试逐项验证播放、暂停、拖动、跳章节、静音、键盘操作；附桌面和手机控件截图。
- **T4 静态版、手机布局、加载态** — est 30m
  - done-when：模拟「减少动态效果」时显示静态版，并且不跑动画循环；390px 宽度截图没有横向滚动；加载态截图。

### M2 七个章节
- **T5 Needle** — est 35m
- **T6 Medium** — est 30m
- **T7 Land of Hope** — est 45m
- **T8 The Cast** — est 45m
- **T9 Four more cuts** — est 35m
- **T10 The Product** — est 40m
- **T11 One operator + 无缝循环** — est 30m
- 每个章节的 done-when：该章节 3 个时间点的桌面截图，加 1 张手机截图，冒烟测试全绿。T11 另外要验证 59.9s 到 0.0s 的画面衔接没有跳变（两帧像素差低于阈值）。

### M3 声音
- **T12 背景音乐和配音点缀** — est 30m
  - done-when：测试验证默认静音（audio 暂停）；按 M 后开始播放；拖动进度条后，声音和画面误差不超过 0.1 秒。

### M4 打磨与审查
- **T13 性能、分享图、全面审查** — est 60m
  - 测每帧 JS 耗时；用 reel 里的一帧生成 og:image，方便简历链接分享预览；由不带上下文的 reviewer 审一遍，修掉发现的问题。
  - done-when：1280×720 下每帧 JS 平均耗时 < 6ms；reel 素材总重 < 6MB；review 发现的问题全部处理，并附处理结果。

### M5 Go-Live（上 staging）
- **T14 合并与验收** — est 30m
  - 把 staging 合进 session 分支 → 跑完整测试 → push → 开 PR（base: `staging`）→ 等 Vercel 检查通过 → 合并 → 删除 session 分支（远端和本地）→ 用 Vercel 确认 staging 部署是 READY。
  - done-when：PR 已合进 staging；session 分支已删；staging 预览链接和 `/reel` 路径已发给你；每个章节的截图已发给你。
  - **生产分支不动**，等你明确说了才上线。

**总估时约 8 小时。**

## 需要你拍板的决策点

1. **背景音乐**：我打算用 `/process` 页面已经在用的那首 bgm（`assets/process/bgm-0ac7bdea7b.mp3`）当音乐底，配音片段做点缀。如果你不想用这首，请告诉我。
2. **画面文字**：全部取自网站现有文案，上线后你可以随时让我改。
3. **上生产**：不在这一轮做，等你明确说了才上线。

## 假设

- repo 里没有测试、lint 和 CI。我会补 `tests/reel.smoke.mjs`（Playwright）当作完整测试。PR 上的「CI」就是 Vercel 的部署检查。
- 容器的网络打不开 `*.vercel.app` 和 unpkg/esm.sh。所以截图用本地起的、合并后 staging 同一棵代码树；staging 部署状态通过 Vercel 连接器确认。
- 容器里没有真 GPU，无法实测 60fps。我用「每帧 JS 耗时」当作代理指标。
- 首页（`Chun Hee - Portfolio.dc.html`）、`/process`、`/work` 不做任何改动。
