# Timer Drift Fix — Design Spec

## Problem

`app.js:163` uses `setInterval(onTimerTick, 1000)` to count down. When the computer
sleeps, the JS event loop is blocked, or the system is under load, the actual interval
exceeds 1000ms. This causes the displayed remaining time to lag behind real wall-clock
time — the timer "runs slow."

## Solution

Replace interval-based counting with wall-clock delta tracking:

1. When the timer starts or resumes, record a `targetTimestamp`:
   `targetTimestamp = Date.now() + timeRemaining * 1000`
2. On each tick, compute remaining as:
   `timeRemaining = Math.ceil((targetTimestamp - Date.now()) / 1000)`
3. Clamp to 0 so the timer never overshoots.
4. `setInterval` still fires ticks, but the displayed value is derived from
   `Date.now()` — any drift between ticks is absorbed.

### Changes

**File: [app.js](renderer/app.js)**

- Add `targetTimestamp` state variable (null when not running)
- `startTimer()`: compute `targetTimestamp` from current `timeRemaining`
- `onTimerTick()`: recompute `timeRemaining` from `Date.now()`; clear interval and
  fire notification when `<= 0`
- `pauseTimer()`: save current `timeRemaining` (from the delta), clear interval,
  reset `targetTimestamp` to null
- `resetTimer()`: reset `targetTimestamp = null`
- All other state transitions (phase change, settings apply) already call
  `transitionTo()` which sets `timeRemaining` and clears the interval — no changes
  needed.

### Files Modified

- `renderer/app.js` — ~10 lines changed

### Not Changing

- No UI changes
- No dependency changes
- No new files
