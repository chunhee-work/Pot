# BUILD-STATUS — `/reel`

## Now
- T5–T11：7 个章节 agent 并行在做（22:16 MYT 派出），每个只改 `showreel/scenes/<n>-<id>.js`
- T2–T4、T12：不带上下文的 reviewer 正在审引擎代码

## Done
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
- T5–T11 七个章节（每章一个 agent 并行）
- T12 声音
- T13 性能、分享图、审查
- T14 Go-Live 上 staging

## Blockers
- 无

## Resume notes
- 本地预览：`node tests/shoot.mjs <输出目录> <时间,…> [--size 390x844] [--debug]`
- 单独看某一章：`/reel.html?solo=<章节 id>&debug`
- 章节接口约定写在 `showreel/kit.js` 文件头和 `showreel/timeline.js`
- 容器打不开 `*.vercel.app`、unpkg、esm.sh；reel 不依赖任何 CDN
