# Xinyu LED Studio V3.0
## 高階3D＋AI智慧視覺＋CAD工程整合版
開發單位：心禹國際開發科技有限公司

## V2.0 能力已整合
### 高階3D
- 3D品質：效能／平衡／高品質
- 正面、左側、右側、俯視、自由視角
- LED底座與基本結構顯示
- 原有3D錄影保留
- U型／三面LED使用單一連續幾何與連續UV

### 三面同步映射
- Left／Front／Right 三面預覽
- 單一連續畫布切成三段
- 三面LED在3D中使用連續UV
- 適用三境光幕屏與三面LED精神堡壘前端預覽

### CAD工程輸出
- 進階DXF
- SVG工程圖
- LED外框
- 模組線
- 箱體線
- 中心線
- 尺寸文字
- Mapping編號
- 工程圖採mm實際尺寸座標

## V3.0 AI能力
### AI場景辨識
雙層架構：
1. 本機輔助CV：瀏覽器直接做亮度／邊緣／區域分析，提供候選牆面、門窗等區域。
2. 外部AI模型服務：可設定模型服務URL，將場景分析工作交給正式視覺模型。

本機模式刻意標示為「輔助分析」，不冒充大型AI模型。

### AI透視
- 根據候選牆面自動建立四點透視。
- 執行後仍可人工調整錨點。

### AI遮罩
- 根據辨識候選物件建立前景遮罩。
- 可再手動修改。

### AI修補
- 本機模式：鄰域色彩快速補洞。
- 外部AI模式：預留inpainting模型API。
- 適合舊招牌移除後之場景修補流程。

### AI自然語言指令
可解析如：
「在這面牆安裝一面 4m × 2m P2.604 LED」
並建立／修改LED尺寸、Pitch及透視貼合。

## AI模型服務API契約
POST JSON:
{
  "action": "scene_analysis | inpaint",
  "image": "data:image/jpeg;base64,...",
  "project": {"name":"..."},
  "...": "action-specific payload"
}

scene_analysis 建議回傳：
{
  "detections":[
    {"type":"wall","label":"牆面","x":0.1,"y":0.1,"w":0.6,"h":0.5,"confidence":0.95}
  ]
}

inpaint 建議回傳：
{
  "image":"data:image/png;base64,..."
}

## 與V1.6既有能力整合
- 專案管理
- 多場景
- 自動儲存
- 圖層／遮罩
- 透視／錨點／異形
- LED亮度與內容
- 工程尺寸
- 模組、箱體、電源、接收卡
- BOM
- Mapping
- 配電
- 單相／三相
- 專案健檢
- 工程鎖定
- 提案／施工模式
- PNG／JPG／PDF／JSON／CSV／DXF／SVG／WebM

## 專業限制
1. 本機AI場景辨識屬前端輔助CV，不等同訓練完成的語義分割模型。
2. 真正AI語義辨識、精準遮罩及生成式修補需接入外部視覺模型服務。
3. CAD輸出目前以DXF/SVG為主；DWG應透過AutoCAD/ODA等合法相容流程轉換。
4. Mapping、接收卡、網口與配電為工程前端模擬，正式施工仍須依實際NovaStar/Huidu硬體、控制器與現場條件覆核。

## 下一階段建議
- WebGPU／Three.js後處理
- PBR場景材質
- 真實牆面平面重建
- 正式語義分割模型
- Depth Estimate深度估計
- SAM類互動式遮罩
- 生成式Inpainting
- CAD圖框／比例尺／A3工程圖
- NovaStar/Huidu合法API/SDK相容層
