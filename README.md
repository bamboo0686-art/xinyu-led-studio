# Xinyu LED Studio V20.8.1｜Critical Runtime Hotfix

This hotfix fixes the V20.8 regression where the UI rendered but buttons were effectively dead because JavaScript initialization aborted.

Fixed: `deleteSelectedObjects`, `sectionLabel`, `cardPass`, and `multiSel` initialization.

A Runtime Boot Smoke Test is now a mandatory Release Gate in addition to syntax and DOM checks.
