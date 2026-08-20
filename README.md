# Xinyu LED Studio V21.0
## Professional Product Rebuild Edition

這不是 V20.x 的換色版，而是新的產品外殼與互動核心。

### 核心工作流程
實景 → 設備 → 素材 → 調整 → 3D 預覽／輸出

### V21.0 已實作
- 儀表板／最近專案
- 新專案建立與 LocalStorage 儲存
- 實景圖片上傳、旋轉、縮放、刪除
- 8 種 LED 設備預設
- 設備滑鼠拖曳、縮放、旋轉
- 設備複製、刪除、還原
- 右側上下文屬性面板
- 圖片／影片素材庫（IndexedDB）
- 影片播放、暫停、時間軸、音量、循環
- 圖層列表
- 格線、吸附、適合畫面
- 3D 預覽（Three.js 動態載入；失敗不影響 2D）
- Xinyu AI 本機指令入口
- ACTIONS Registry：可見按鈕沒有 Handler 時直接禁用
- Global Error Boundary
- ?selftest=1 內建 Self Test
- PWA / Service Worker

### 目前狀態
**INTERNAL_ALPHA_RUNTIME_GATED**

靜態與核心 Runtime 測試：**100%**

這個狀態名稱刻意不使用 PRODUCTION_CANDIDATE。正式發布前仍必須在 Windows Chrome / Edge 上完成真實瀏覽器 E2E、影片 Codec、3D WebGL、檔案上傳與不同 DPI 實機驗收。
