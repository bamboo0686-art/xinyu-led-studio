# V20.5 Fixture／Mock E2E Migration Report

- E2E cases: 155
- AUTO_SAFE: 44
- FIXTURE_MOCK_AUTOMATABLE: 111

## Mock adapters
- File/Image Fixture
- Video Element Fixture
- Audio Element Fixture
- Download Capture
- MediaRecorder Mock
- Three.js / OrbitControls Mock
- Timeline / Seek Runtime Test
- Model create / duplicate / delete / restore
- Engineering calculation / BOM
- Safe serialization / Undo / Redo

## Limitation
Fixture／Mock 會驗證應用程式邏輯與 Action 結果，但不等同真實瀏覽器 Codec、GPU/WebGL、作業系統檔案選擇器、下載權限、MediaRecorder 編碼器、真實 LED 控制硬體驗收。