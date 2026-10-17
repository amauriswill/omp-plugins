# Sub Meter Plugin for omp

Displays provider rate limits and subscription usage windows (5-hour and 7-day rate limit windows) with visual progress bars and reset countdowns in the TUI status footer and via `/sub-meter`.

## Features

- **TUI Status Footer**: Real-time progress bar and reset countdown directly in the status line:
  ```text
  ⏳ 5h [████░░░░] 40% (~3h)
  ```
- **Slash Command**: `/sub-meter` renders an ASCII HUD box showing all tracked windows.

## Commands

```text
/sub-meter
```

Outputs:
```text
┌─ [ RATE LIMITS & QUOTA ] ─────────────────────────────────────┐
│ • 5h Limit         [████████░░░░░░░░]   40%  resets ~3h    │
│ • 7d Limit         [████░░░░░░░░░░░░]   20%  resets ~5d    │
└───────────────────────────────────────────────────────────────┘
```

## Cross-Platform Compatibility

Tested and fully functional on **Windows**, **macOS**, and **Linux**.
