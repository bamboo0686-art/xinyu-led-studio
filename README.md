# 心禹 LED 虛擬播放器 V5

## 本版核心修正：內容顯示於ㄇ字型外側

ㄇ字型開口朝內部，LED內容不得朝內播放。

### 正確顯示方向
- 正面LED：朝ㄇ字型外部正前方。
- 左側LED：朝左外側。
- 右側LED：朝右外側。
- ㄇ字型內側只看到設備背面，不播放內容。

### 幾何方向
假設ㄇ字型內部開口朝 +Z：
- 正面顯示法向量：-Z。
- 左側顯示法向量：-X。
- 右側顯示法向量：+X。

### 同步播放
- 全程只建立一個影片元素。
- 全程只建立一個 VideoTexture。
- 三面共同引用同一張 VideoTexture。
- 播放、暫停、聲音、進度與循環完全同步。

## GitHub更新
解壓縮後，將下列檔案覆蓋上傳到Repository根目錄：
- index.html
- manifest.json
- sw.js
- icon.svg
- README.md

更新後開啟：
https://bamboo0686-art.github.io/xinyu-led-studio/

電腦請按 Ctrl + F5；手機請關閉舊網站後重新開啟。
