# 心禹 LED 虛擬播放器 V4

## 本版最重要的訂正

### 真正連體三面ㄇ字型
- 正面位於中間。
- 左面與正面左邊緣直接相接。
- 右面與正面右邊緣直接相接。
- 左右面與正面皆為90°。
- 三片共用接縫，沒有間隔、沒有斜角、不是三角柱。

俯視：

左側面 ┐ 正面 ┌ 右側面

實際幾何座標：
- 正面：x = -0.5 至 0.5、z = 0
- 左面：x = -0.5、z = 0 至 1
- 右面：x = 0.5、z = 0 至 1

### 真正同步播放
- 程式只建立一個 HTMLVideoElement。
- 程式只建立一個 THREE.VideoTexture。
- 正面、左面與右面都共同引用同一張 VideoTexture。
- 播放、暫停、進度、聲音與循環都只有一個時間軸。
- 不會產生三個影片各自播放或時間不同步的情況。

## 更新
將 ZIP 解壓縮後，把以下檔案覆蓋上傳到 Repository 根目錄：
- index.html
- manifest.json
- sw.js
- icon.svg
- README.md

網站：
https://bamboo0686-art.github.io/xinyu-led-studio/

上傳後請按 Ctrl + F5，手機則重新開啟網站。
