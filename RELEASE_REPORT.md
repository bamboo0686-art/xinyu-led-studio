# Xinyu LED Studio V20.1｜工作區啟動與核心解耦修復報告

- Static validation: 100%
- State: **PRODUCTION_CANDIDATE**

## 錄影證據判讀
使用者上傳的 IMG_2768.MOV 顯示：專案 Dashboard 能渲染，但操作後持續停留在 Dashboard，工作區沒有成功切換。這與 app.js 在事件綁定前被外部模組或本機資料解析錯誤阻斷的症狀一致。

## P0 修正
1. 移除 Three.js / OrbitControls 靜態 CDN import；改成點擊 3D 時才動態載入。
2. Three.js 載入失敗只影響 3D，不能再讓專案、2D、工作區全部失效。
3. XLS_PROJECTS 改用 safeLoadProjects()；損壞 JSON 自動備份並重建。
4. open() 改成錯誤隔離，失敗時回 Dashboard 並顯示實際原因。
5. 新專案直接建立完整 Scene Schema。
6. Dashboard 新增核心啟動狀態、重新初始化、修復本機專案資料。
7. Service Worker 對 index.html/app.js 採 Network First，避免舊版壞 JS 被長期快取。

## 靜態驗證
- PASS｜JavaScript syntax
- PASS｜HTML duplicate IDs｜288/288
- PASS｜q() references
- PASS｜Duplicate functions｜{}
- PASS｜Three.js no longer blocks startup
- PASS｜Safe localStorage boot
- PASS｜Workspace open recovery
- PASS｜Startup diagnostics
- PASS｜Network-first core SW
- PASS｜Snap/Grid real handlers
- PASS｜Workspace critical DOM

## 優點
- V20 功能面完整：2D實景、多LED、時間軸、媒體、工程計算、BOM、Mapping、CAD、曲面/ㄇ字型3D基礎。
- LED/LCD/STRUCTURE 已分流，安全序列化與 IndexedDB 架構已建立。
- V20.1 最大進步是把『核心啟動』從『3D外部依賴』拆開。

## 仍有缺陷
- Three.js 仍使用 CDN，只是已不再阻塞核心；完整離線3D仍待本地 vendor 化。
- 此容器 Chromium 仍有 Crashpad/DBus 限制，不能取代你的 Windows Chrome/Edge 實機 E2E。
- app.js 仍偏大；未來應繼續拆成 core / ui / media / engineering / 3d 模組。
- AI Vision / Inpainting、NovaStar/Huidu 硬體級操作仍不是正式實作。
- 大量模型＋多影片長時間壓力測試仍需實機。