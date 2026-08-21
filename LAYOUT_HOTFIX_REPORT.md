# V20.8.3 Layout Hotfix Report

- Static validation: 100%
- State: **PRODUCTION_CANDIDATE**

## Checks
- PASS｜JavaScript syntax
- PASS｜HTML duplicate IDs｜387/387
- PASS｜q() refs
- PASS｜duplicate functions｜{}
- PASS｜setWorkbenchHeight
- PASS｜restoreWorkbenchLayout
- PASS｜installWorkbenchResize
- PASS｜workbenchVisibilityAudit
- PASS｜UI workbenchPanel
- PASS｜UI workbenchResizeHandle
- PASS｜UI workbenchCompact
- PASS｜UI workbenchRestore
- PASS｜UI workbenchMaximize
- PASS｜UI workbenchVisibilityState
- PASS｜Legacy 4-column override
- PASS｜Workbench 2-column layout
- PASS｜Independent scrolling

## Root Cause
- `.app` 原本底部 grid row 固定為 185px，但心禹工作台實際內容遠超過 185px。
- `.dockHead` 未設獨立捲動區，造成後半部功能被推出可視範圍。
- 舊版 `dock-collapsed` 仍使用 4 欄 grid，與目前 3 欄架構衝突。
- 固定底部狀態列會進一步遮住最後一列內容。