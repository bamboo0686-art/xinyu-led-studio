# V21.0.2 Non-Destructive Self-Test Hotfix

問題：`?selftest=1` 會以 `document.body.innerHTML` 直接覆蓋正式首頁，因此使用者只看到測試結果，沒有任何產品功能。

修正：
- 自我測試改為 Modal，不再破壞正式介面。
- 測試完成後保留首頁與工作區。
- 加入「返回首頁」「重新測試」。
- 執行 `?selftest=1` 後自動移除 query，避免重新整理再次陷入測試畫面。
- Self Test 使用暫存狀態，執行完恢復原專案資料。
