# BUILD-STATUS — `/reel`

## Now
- T2–T4 引擎：时间轴、渲染层、后期、3D logo、播放器控件已写好；接下来补冒烟测试，然后分派章节 agent

## Done
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
