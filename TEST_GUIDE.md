# V10.0 Windows / GitHub Pages 最終驗收

1. 完整覆蓋 V10.0 所有檔案並 Commit。
2. 等 GitHub Pages 部署完成。
3. Ctrl + F5。
4. 開啟網站網址後加上 `?selftest=1`。
5. 到「專案」頁執行「系統功能健檢」。
6. 執行「V10.0 Release Gate」。
7. 實測完整流程：上傳實景 → 建立多個 LED → 修改尺寸 → 圖片 → 影片含聲音 → 刪除影片 → 裸眼3D → 3D預覽 → 儲存 → 重開 → Undo/Redo → BOM → Mapping → CAD → 工作區影音輸出。
8. Release Gate 100% 且完整流程沒有 P0/P1 錯誤，再標記 PRODUCTION_READY。
