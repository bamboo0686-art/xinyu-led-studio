# Xinyu LED Studio V10.0｜正式完成版

開發單位：心禹國際開發科技有限公司

## V10.0 核心完成項目
- V4.1 功能基線完整保留。
- HTML / CSS / JavaScript 分離，降低單一 index.html 持續膨脹。
- LED / LCD / STRUCTURE 正式分類。
- 結構件不再套用 LED Pitch、像素、接收卡與 LED 功率公式。
- LCD 使用獨立面板/箱體估算基礎。
- 三相電流改為 I=P/(√3×V×PF)，單相為 I=P/(V×PF)。
- 新增功率因數 PF。
- 新增單接收卡像素容量設定，不再固定只能以 512×512 假設。
- 保留實景、模型、圖片、影片、音訊、裸眼3D預覽、3D預覽、BOM、Mapping、CAD、錄製、AI輔助、IndexedDB、PWA。
- 新增 V10.0 Release Gate。
- 新增瀏覽器內建 Self Test，可使用 `?selftest=1` 執行。

## 正式版本驗收原則
V10.0 軟體內建 Release Gate。程式包的靜態/結構/語法驗證通過，不代表所有瀏覽器、所有影片編碼、所有 GPU 與現場 LED 控制硬體均已認證。真正對外部署前仍應在目標 Windows/Chrome/Edge 電腦完成實機 E2E。

## 主要操作
1. 上傳實景。
2. 點擊、拖曳或快速建立 LED。
3. 調整尺寸、Pitch、位置、透視、亮度、內容。
4. 可在同一場景建立多個 LED / LCD / 結構模型。
5. 上傳圖片、影片、音效並播放。
6. 使用 3D / 裸眼3D預覽。
7. 使用工程計算、BOM、Mapping、CAD 與輸出。
8. 專案頁可執行「系統功能健檢」及「V10.0 Release Gate」。

## 建議影片
MP4 H.264 + AAC 或 WebM VP8/VP9 + Opus。
