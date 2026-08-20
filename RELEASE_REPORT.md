# Xinyu LED Studio V20.8.1｜Critical Runtime Hotfix

- Validation: 100%
- State: **HOTFIX_RUNTIME_SMOKE_PASS**

## Root causes fixed
1. `deleteSelectedObjects` was referenced but undefined, aborting app.js during top-level button binding.
2. `sectionLabel` was undefined, breaking workbench/model-library initialization.
3. `cardPass` was undefined, breaking dock card filtering/rendering.
4. `multiSel` was used by Action Guard but never initialized.

## Permanent prevention
- Release validation may no longer stop at `node --check` / DOM ID / handler-string checks.
- A Runtime Boot Smoke Test must evaluate the complete app and run initialization far enough to detect top-level ReferenceError and bootstrap ReferenceError.
- Missing compatibility APIs after refactors must fail the Release Gate.

## Checks
- PASS｜JavaScript syntax
- PASS｜Duplicate HTML IDs｜381/381
- PASS｜q() DOM references
- PASS｜deleteSelectedObjects compatibility API
- PASS｜sectionLabel restored
- PASS｜cardPass restored
- PASS｜multiSel initialized
- PASS｜Runtime Boot Smoke Test｜EVAL PASS


## Remaining limitation
The runtime smoke test uses an isolated DOM/browser API harness. It proves the JavaScript can evaluate and bootstrap without the discovered ReferenceErrors, but final GitHub Pages + Windows Chrome/Edge interaction still requires deployment verification.