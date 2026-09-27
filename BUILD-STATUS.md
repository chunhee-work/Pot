# BUILD-STATUS — `/reel`、`/reel2`、`/reel3`

## Now
- `/reel3` 三支 reel 完整测试（`node tests/run-all.mjs`，04:50 MYT 开始）

## Done
- R3 审查返修（04:48 MYT）：8 章全部返修，每章由不带上下文的复核员再查；复核又发现 3 个问题也已修好（launch 缓存没按像素密度区分；shots 在画布限尺寸的屏幕上字号四舍五入成 9.9px；worlds 横放手机上标签和正文一样大）
  - 片尾金属字不再被切；第 7→8 章只剩一次跃迁；「同一个地方」换成同一个村庄广场的三次回访（夜/昼/夜）；编造的星图坐标换成 /process 里真实的编号（SB 03 / 23、ENV-AUREA 25 / 29）；「BUILT AS」字距修好
  - 字号：8 章在 390×844、390×664、844×390、768×1024、1280×720 上，要读的文字全部 ≥ 10px（量出来 0 处小于 10px）
  - 短竖屏边缘检查：8 章全过
  - 分享图换成新的片尾定格：`assets/reel/og3-9b69fd3401.jpg`
- R3 页面修正（02:32 MYT，提交 `78504a0`）：预载 Cinzel 字体（慢网速下第一帧约 6.8s → 3.4s）；加载进度不再在等字体时显示 100%；平板宽度下章节标签互相重叠 → 1180px 以下隐藏；播放器残留的金色改成本片的冷色；无 JavaScript 时显示提示
- R3 配乐（01:34 MYT，提交 `f309e31`）：96 bpm D 小调，每章 3 小节；每章交界有跃迁上升音和落拍重音，第 5–7 章推高、第 8 章落在 D 大三和弦；离线渲染峰值 −2.4 dBFS 无削波；声音相关测试全过
- R3 整片审查（02:05 MYT）：4 个维度（整片观感、代码规则与文案、各尺寸构图、页面与播放器），每条发现再由另一位审查员独立复现；确认 1 项必修、11 项应修
- R3 分享图（00:48 MYT）：`assets/reel/og3-6def29404e.jpg`（1200×630，片尾 Land of Hope 金属字升过星球 Aurea）
- R3-T2..T9 八个章节（00:43 MYT）：launch、story、shots、boards、characters、worlds、edit、arrival，每章都经过制作 → 独立评审 → 返修；我逐章看过横屏 12 帧 + 手机帧；`check-chapter` 八章全部 PASS，每帧平均绘制 0.8–2.9ms
  - 播放器修正：`prepare()` 以前可能在字体加载前就生成文字缓存（评审在 Launch 里发现片名用了备用字体、字距不匀），现在等字体到了才生成，三支 reel 都受益
- R3-T1 骨架（22:33 MYT，提交 `2907944`）：共用视觉工具 `showreel/three/kit3.js`、8 个占位章节、`reel3.html`、`/reel3` 路由、测试加上 reel3；演示帧里导航胶囊、阶段卡片、金属线、星空、交界帧都能正常画出
- R2-T13 Go-Live 上 staging（20:16 MYT）
  - PR https://github.com/chunhee00/Pot/pull/2 已合并进 `staging`（合并提交 `c7f901c`），CI（Vercel）绿，无 review 评论
  - staging 部署 `dpl_Av4iiosCNCoAVdvHa4zNWjUH4Hwk` 状态 READY：https://chunhee-portfolio-jvq3m59qw-chunhee00s-projects.vercel.app/reel2
  - 本地分支已删；远端 `claude/reel-two` 删不掉（git 代理在删除时断开连接），需要在 PR #2 页面点「Delete branch」
- R2-T12 审查与完整测试（20:05 MYT）
  - 审查 5 项全部修复：等待加载时不再漏出下一章音乐；第 1 章在极宽/极高屏幕上钻进「I」不再露底；没有 Web Audio 时声音按钮不再误显示已开；进度条总时长按实际读出；加了 `/reel2` 分享图 `assets/reel/og2-f0bf0bafd5.jpg`
  - 性能：章节可在加载时预先生成缓存（`prepare`）；Code 章节不再在切点上一次生成 13 块面板，3D「G」改为固定尺寸渲染
  - `node tests/run-all.mjs`：`/reel` 51/51、`/reel2` 52/52（输出存档于 `/tmp/claude-0/final3.txt`）
- R2 八个章节、合成配乐、测试套件（19:02–19:36 MYT）：每章 check-chapter PASS；Toolbox 返修两次（横屏构图、竖屏出界）
- R2-T1 播放器通用化（18:10 MYT）：两支 reel 共用一个播放器；`/reel` 完整测试 51/51 仍全过
- R2-T2 2.5D 空间模块、`/reel2` 骨架、8 个占位章节（18:12 MYT）
- T14 Go-Live 上 staging（00:27 MYT）
  - PR https://github.com/chunhee00/Pot/pull/1 已合并进 `staging`（合并提交 `ad075b7`），CI（Vercel）绿，无 review 评论
  - staging 部署 `dpl_53LuxDeLq2qPA5WoE2UdKiG6RJjN` 状态 READY：https://chunhee-portfolio-3ywzwmc5p-chunhee00s-projects.vercel.app/reel
  - 本地 session 分支已删；远端 `claude/vibrant-allen-9mlymk` 删不掉（容器的 git 代理在删除时断开连接，GitHub 连接器没有删分支工具），需要在 PR 页面点「Delete branch」
- T13 审查（00:14 MYT）：第二轮 review 5 项全部修复并加测试（3D 模型下载失败不再卡住、等待加载时声音不再循环、iPhone 工具栏 / iPad 竖屏布局不出界、Needle 缓存按像素密度区分、两处缓存加上限）
  - 最终代码 `2280d7a` 完整测试 51/51 通过（输出存档于 `/tmp/claude-0/final-test.txt`）
- T13 部分（23:17 MYT）
  - 完整测试 46/46 通过（7 个章节检查 + 播放器 + 声音 + 慢网络 + 手机 + 减少动态效果 + 首页未改动）
  - 每帧 JS 绘制耗时：整片平均 1.05ms（无头浏览器 CPU）
  - 素材：整片 6.29MB（超出计划的 6MB 0.29MB）；改为渐进加载后，第一帧只需约 0.43MB（代码 + 字体），慢网络测试中 139ms 出第一帧
  - 分享图：`assets/reel/og-48114eb348.jpg`（1200×630，片尾名字卡）
- T5 Needle、T8 The Cast（23:08 MYT）：check-chapter PASS；配音 12 段按拍触发，已去掉每段开头 0.1–0.3s 的静音
- T6 Medium、T9 Four more cuts、T10 The Product（22:55 MYT）：check-chapter 全部 PASS
  - Medium 横屏 0.96ms / 手机 0.76ms；Cuts 0.88ms / 1.42ms；Product 0.49ms / 0.33ms（每帧平均绘制耗时）
- T11 One operator（22:53 MYT）：check-chapter PASS（横屏 0.74ms，手机 0.92ms）；截图 `/tmp/claude-0/shots/operator-final/`
- T7 Land of Hope（22:44 MYT）：check-chapter PASS（横屏每帧 1.0ms，手机 1.14ms）；截图 `/tmp/claude-0/shots/landofhope/`
- 引擎 review 13 项全部修复（22:36 MYT），页面测试 34/35（剩「配音已加载」等 The Cast）
- T2–T4 引擎、控件、静态版、手机布局、加载态（22:21 MYT）
  - 冒烟测试（跳过章节检查）：29/34 通过，失败项是占位章节导致（静态版是空白、没有配音 cue），另有 2 项是测试本身的时序问题，已修
- T12 声音（22:21 MYT）：score 作主时钟；测试结果：播放时画面 21.488s、声音 21.500s；seek 后画面 41.128s、声音 41.197s（误差 < 0.1s）
- T1 分支和骨架（22:15 MYT）
  - `staging` 已强制重置到生产分支 `50d078e`（6A 已批准）
  - `vercel.json` 已加 `/reel` → `/reel.html`；`.vercelignore` 排除计划、状态文件和测试
  - 首页、`/process`、`/work` 三个文件的 sha256 和开工前一致

## Queue
- R3-T11 整片审查、分享图、三支 reel 完整测试
- R3-T12 PR 合进 staging、删分支、截图
- 生产分支等你明确说了才上线

## Blockers
- 两个远端分支待你手动删除：PR #1 页面的 `claude/vibrant-allen-9mlymk`、PR #2 页面的 `claude/reel-two`（各点一下「Delete branch」）

## Resume notes
- 本地预览：`node tests/shoot.mjs <输出目录> <时间,…> [--size 390x844] [--debug]`
- 单独看某一章：`/reel.html?solo=<章节 id>&debug`
- 章节接口约定写在 `showreel/kit.js` 文件头和 `showreel/timeline.js`
- 容器打不开 `*.vercel.app`、unpkg、esm.sh；reel 不依赖任何 CDN
- 第二支：`node tests/shoot.mjs <目录> <时间> --page reel2`；`node tests/check-chapter.mjs <id> --page reel2`
- 第三支：同上，`--page reel3`；章节说明在 `BUILD-PLAN-reel3.md`；如果 session 中断，先看 `showreel/three/scenes/` 里哪些章节已经不是占位文件
