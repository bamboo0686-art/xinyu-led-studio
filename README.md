# Xinyu LED Studio V4.0｜實景建模渲染核心修正版

開發單位：心禹國際開發科技有限公司

## 本次真正找到的根因

V3.9 的 LED 建立流程本身已經能把模型寫入 `O` 場景陣列，
但 Canvas 的 `paint()` 在繪製沒有圖片／影片素材的 LED 時會呼叫：

`ledPattern()`

這個函式在先前版本重構時遺失，因此瀏覽器實際會出現：

`ReferenceError: ledPattern is not defined`

結果是：
1. LED 資料已建立；
2. Canvas 開始重繪；
3. 繪製 LED 時發生 ReferenceError；
4. 整次 renderNow() 中斷；
5. 使用者在實景畫面中完全看不到 LED。

因此看起來就像「LED 建立失敗」。

## V4.0 修正

### LED Pattern 渲染器恢復
重新建立快取式 LED 點陣 Pattern，不再使用大量逐點迴圈，也不會找不到函式。

### 單一模型錯誤隔離
新增 `safePaint()`。
任何一個 LED／LCD／遮罩物件發生錯誤時：
- 只隔離該模型；
- 其他模型與背景仍繼續顯示；
- 不允許單一模型讓整張實景 Canvas 停止繪製。

### 建立後同步驗證
`createModelSafe()` 現在會立即：
- 寫入場景；
- 同步 renderNow()；
- 檢查場景陣列數量；
- 檢查 ID；
- 檢查 x / y / w / h；
- 確認尺寸有效；
- 再更新屬性與工程資料。

## 建立 LED 的方式
1. 點擊「心禹工作台」LED 模型卡片。
2. 拖曳 LED 模型到實景。
3. 使用「快速建立 LED」。
4. 雙擊實景空白處建立常規 LED。

## 升級後
請部署 V4.0 後執行 Ctrl + F5。
如果曾使用 V3.9，建議清除該網站舊 Service Worker／網站快取一次。
