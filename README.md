# Xinyu LED Studio V20.1｜Workspace Startup Stability Edition

本版針對「首頁看得到、但無法進入工作區」做 P0 級修復。

核心改變：
- 2D/專案核心完全不再依賴 Three.js CDN 才能啟動。
- Three.js 改成點擊 3D 時才載入；載入失敗只停用3D。
- LocalStorage 損壞自動備份、重建。
- open() 工作區入口加入完整錯誤隔離與回復。
- Dashboard 新增啟動狀態、重新初始化、修復本機專案資料。
- Service Worker 對 app.js/index.html 採 Network First，降低舊快取造成無法進工作區。
