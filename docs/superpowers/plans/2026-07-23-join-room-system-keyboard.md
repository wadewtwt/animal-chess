# Join Room System Keyboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the in-dialog number pad on the join-room modal with the WeChat Mini Game system numeric keyboard while keeping the 6-slot room code UI and auto-join behavior.

**Architecture:** Keep the existing room join flow in `ModeSelectionUI.ts`. Replace the custom on-screen keyboard rendering with a hidden `EditBox` input bridge that syncs into the six visual slots and submits automatically at six digits.

**Tech Stack:** Cocos Creator 3.8.7, TypeScript, WeChat Mini Game adapter

---

### Task 1: Replace Join Dialog Input Mechanism

**Files:**
- Modify: `animal-chess-client/assets/scripts/ui/ModeSelectionUI.ts`

- [ ] **Step 1: Add `EditBox` import and dialog input state**

Add `EditBox` to the `cc` import list and add dialog-scoped fields for the hidden input component and submit guard.

- [ ] **Step 2: Remove custom keypad rendering**

Delete the virtual numeric keypad creation block inside `showJoinRoomKeyboard()` and keep the existing six display cells.

- [ ] **Step 3: Add hidden `EditBox` bridge**

Create a touchable input area above the six cells, attach an `EditBox` configured with `InputMode.NUMERIC`, `KeyboardReturnType.DONE`, and `maxLength = 6`, and focus it when the dialog opens or the user taps the input area.

- [ ] **Step 4: Sync input text into the six slots**

Add a text-change handler that strips non-digits, truncates to six characters, updates `currentInputCode`, and refreshes the slot labels.

- [ ] **Step 5: Auto-submit at six digits**

Add a submit helper that prevents duplicate submission, validates six digits, closes the dialog, and calls the existing `startOnlineMatch(code)`.

- [ ] **Step 6: Reset dialog state on close**

Clear the cached `EditBox`, code string, and submit guard inside `hideJoinRoomKeyboard()`.

### Task 2: Verify No Obvious Regression

**Files:**
- Verify: `animal-chess-client/assets/scripts/ui/ModeSelectionUI.ts`

- [ ] **Step 1: Run TypeScript no-emit check**

Run: `npx tsc -p D:\work\ai\animal-chess\animal-chess-client\tsconfig.json --noEmit`

Expected: no new type errors caused by the join-room keyboard change.

- [ ] **Step 2: Confirm old keypad hooks are gone**

Run: `rg -n "onKeyClick\\(|虚拟键盘渲染" D:\work\ai\animal-chess\animal-chess-client\assets\scripts\ui\ModeSelectionUI.ts -S`

Expected: no matches.
