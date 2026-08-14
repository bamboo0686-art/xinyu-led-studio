# Xinyu LED Studio V3.6｜穩定核心與播放引擎重構版

開發單位：心禹國際開發科技有限公司

## 這次不是功能追加，而是核心重構

### 1. 故障與當機改善
已清除前幾版逐步升級後累積的「重複工具事件綁定」。
舊版存在同一個 click / pointer 事件被重複註冊的風險，會造成：
- 一次操作觸發多次
- 記憶體逐步增加
- 操作愈久愈卡
- 偶發錯誤與當機

V3.6 改回單一事件來源，並加入：
- 全域錯誤攔截
- Promise 錯誤攔截
- 核心狀態顯示
- 錯誤發生時阻止整套介面一起中斷

### 2. LED 模型建立效能
- LED像素點視覺由大量雙層 for-loop 改成快取 Canvas Pattern。
- 新建模型時不執行完整歷史快照。
- 新建後先即時畫面，再延後圖層/BOM/工程統計。
- 工程計算改 debounce + idle 執行。
- 屬性顯示不再每次都同步做 Mapping/BOM 計算。
- Canvas DPR 上限由 1.5 再降至 1.25，提高 2K/4K 螢幕流暢度。
- Undo 歷史由 40 降至 20，且不序列化 video/canvas 物件。

### 3. 影片播放引擎重構
移除每支影片各自維護 Frame Callback 的方式，改成：
- 單一全域媒體播放 loop
- 只有有影片正在播放時才運作
- 約 29fps Canvas 更新
- 沒影片播放時完全停止
- ordinary playback 不依賴 Web Audio Context

影片載入事件增加：
- loadedmetadata
- canplay
- playing
- waiting
- stalled
- error

影片播放加入 10 秒載入逾時與明確錯誤提示。

### 4. 建議影片格式
最穩定：
- MP4：H.264 視訊 + AAC 音訊
- WebM：VP8/VP9 + Opus

不建議直接使用：
- HEVC/H.265
- ProRes
- 超高碼率 4K/8K
- 某些手機 HDR 特殊編碼

### 5. 重要
若舊版曾長時間開啟，升級 V3.6 後建議：
1. 覆蓋 GitHub Pages。
2. 等部署完成。
3. `Ctrl + F5`。
4. 若仍出現舊行為，再清除此網站快取一次。
