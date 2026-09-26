# BUILD-STATUS — `/reel`

## Now
- 无。本轮完成（00:27 MYT）

## Done
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
- 无（生产分支等你明确说了才上线）

## Blockers
- 远端分支 `claude/vibrant-allen-9mlymk` 待手动删除（见上）

## Resume notes
- 本地预览：`node tests/shoot.mjs <输出目录> <时间,…> [--size 390x844] [--debug]`
- 单独看某一章：`/reel.html?solo=<章节 id>&debug`
- 章节接口约定写在 `showreel/kit.js` 文件头和 `showreel/timeline.js`
- 容器打不开 `*.vercel.app`、unpkg、esm.sh；reel 不依赖任何 CDN
