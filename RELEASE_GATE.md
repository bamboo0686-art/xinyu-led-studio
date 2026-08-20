# V21.0 RELEASE GATE

- State: **INTERNAL_ALPHA_RUNTIME_GATED**
- Automated build/core validation: **100%**
- Visible UI actions: 29
- Registered actions: 29
- Missing visible actions: 0

## Automated checks
- PASS｜syntax:app.js
- PASS｜syntax:core.mjs
- PASS｜syntax:sw.js
- PASS｜html_unique_ids｜58/58
- PASS｜dom_references
- PASS｜visible_button_actions
- PASS｜device_presets
- PASS｜core_runtime_tests｜CORE_TEST_PASS
- PASS｜workspace_grid
- PASS｜four_region_layout
- PASS｜timeline_dock
- PASS｜context_inspector
- PASS｜small_height_support
- PASS｜dashboard
- PASS｜scene_upload
- PASS｜device_layer
- PASS｜media_upload
- PASS｜timeline
- PASS｜3d_preview
- PASS｜ai_drawer
- PASS｜project_persistence
- PASS｜indexeddb
- PASS｜runtime_button_audit
- PASS｜selftest
- PASS｜global_error_boundary

## Not claimed as completed
- Windows Chrome / Edge real browser E2E
- Windows 100% / 125% / 150% DPI visual verification
- Real MediaRecorder codec verification
- Real WebGL/Three.js network availability
- Real hardware LED controller integration

## Release rule
只要上述真實環境驗收未完成，版本不得標示 PRODUCTION_READY 或 PRODUCTION_CANDIDATE。

# V21.0.1 Startup Hotfix Gate
- Validation: 100%
- State: **INTERNAL_ALPHA_STARTUP_HOTFIX_READY**
- PASS｜Bundled app.js syntax
- PASS｜Service worker syntax
- PASS｜HTML unique IDs｜58/58
- PASS｜DOM refs
- PASS｜No static core.mjs import
- PASS｜Classic defer startup
- PASS｜Boot watchdog
- PASS｜Boot OK flag
- PASS｜Core functions bundled
- PASS｜3D lazy import
- PASS｜SW no core runtime dependency
- PASS｜SW network-first
- PASS｜Core source smoke｜PASS
