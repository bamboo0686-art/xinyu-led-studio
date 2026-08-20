# Xinyu LED Studio V20.8｜AI Engineering Optimizer＋Role-Based Adaptive UI

## 1. Role-Based Adaptive UI
新增四種角色：
- 管理者：完整功能與健檢、Agent、工程、輸出。
- 業務：實景、快速建模、素材、3D預覽、輸出。
- 設計：實景、設備、素材、屬性、3D。
- 工程：工程計算、屬性、圖層、3D、BOM/Mapping/輸出。

角色切換後，系統會自動精簡與突出相關功能。

## 2. AI Engineering Optimizer
依據：
- 用途
- 室內／戶外
- 最短觀看距離
- 舒適觀看距離
- 目標亮度
- 預留係數
- LED 尺寸
- Pixel Pitch
- 像素數
- 接收卡容量
- 網口容量
- 功率

產出：
- AI工程適配分數
- 目前方案
- 建議方案
- 建議 Pitch
- 建議亮度
- 建議解析度
- 建議接收卡
- 建議網口
- 功率估算
- 工程風險提示

## 3. AI Agent 整合
Agent 新增 `optimize-engineering` Action。
工程角色下，Contextual UX 會優先推薦 AI 工程優化，再進 BOM。
