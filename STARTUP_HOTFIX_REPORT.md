# V21.0.1 Single-Bundle Startup Hotfix

## User-visible symptom
畫面停在「正在啟動專業視覺工作環境…／初始化核心」，不會進入首頁。

## Root cause class
V21.0 啟動採 ES Module：
`app.js -> import ./core.mjs`

只要 core.mjs 未同步、MIME/404、GitHub Pages 快取或 module 載入失敗，app.js 會在 boot() 執行前停止，因此靜態啟動畫面永遠停住。

## Fix
1. core.mjs 內容併入單一 app.js。
2. 啟動改用 `<script defer src="./app.js">`。
3. 主 UI 啟動不再依賴 core.mjs。
4. Three.js 仍只在 3D 預覽時動態載入。
5. 新增 4.5 秒 Boot Watchdog。
6. Service Worker 更新為 v21-0-1，核心 shell network-first。
7. 舊 cache activation 時自動清除。

## Important
core.mjs 保留於套件中僅供原始碼/測試參考，V21.0.1 正式啟動不需要它。
