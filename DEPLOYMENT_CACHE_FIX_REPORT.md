# V20.8.3.1 部署快取修正報告

## 根因
V20.8.3 的 CSS/JS 內容有修改，但 index.html 仍顯示 V20.8.2.2，Service Worker 快取名稱也仍為 `xinyu-led-studio-v20-8-2-2`。
原 Service Worker 對 `styles.css` 採 cache-first，因此 GitHub Pages 上傳新檔後，瀏覽器仍可能持續使用舊 CSS，造成「上傳 V20.8.3 但畫面完全沒有改變」。

## 本版修正
1. index.html / 頁首 / Release Gate 全部改為 V20.8.3.1。
2. styles.css 使用 `?v=20.8.3.1`。
3. app.js 使用 `?v=20.8.3.1`。
4. manifest / icon 同步版本參數。
5. Service Worker cache 升級為 `xinyu-led-studio-v20-8-3-1`。
6. index/app/styles/manifest/icon 改成 network-first + no-store。
7. activate 時自動刪除舊 Xinyu Service Worker caches。
8. Service Worker register 使用 `updateViaCache: none` 並主動 `reg.update()`。
9. 畫面新增可見 `BUILD V20.8.3.1` 標籤。
10. 啟動畫面會檢查 JS 與 CSS 是否同版本；若不同會直接顯示版本警告。

## 上傳後如何確認
打開系統後，頁首應看到 `BUILD V20.8.3.1`，右下角也會看到 `V20.8.3.1` 小標記。
若仍看不到，代表 GitHub Pages 尚未發布到這個版本，或上傳位置不是 Pages 正在使用的分支/資料夾。
