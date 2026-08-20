# V20.8.1 Critical Button Runtime Hotfix

## Root cause
V20.8 assigned `q("del").onclick = deleteSelectedObjects` and referenced `deleteSelectedObjects` in the Edit menu, but that function no longer existed after the soft-delete refactor. This causes a top-level `ReferenceError` during app.js evaluation and aborts all later button bindings.

## Fix
Restored `deleteSelectedObjects()` as a compatibility wrapper around `softDeleteSelected()`.

## Permanent prevention
Release Gate now includes Runtime Boot Smoke Test in addition to syntax/DOM/static handler checks.
