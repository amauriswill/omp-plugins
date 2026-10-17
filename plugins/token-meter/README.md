# Token Meter Plugin for omp

Tracks real-time token consumption for each turn (input, output, and cache read/creation) and cumulative session totals directly in the TUI status footer.

## Features

- **Turn Breakdown**: Displays input (`↑`), output (`↓`), and cached (`c:`) token amounts for the most recent response.
- **Session Cumulative Total**: Keeps a running total across all turns (`Σ`).
- **Slash Command**: `/tokens` prints a clean breakdown table and reports the cache hit rate percentage.

## Status Line Preview

```text
📊 ↑ 1.4k · ↓ 340 · c: 4.8k | Σ 14.2k
```

## Command

```text
/tokens
```

Outputs:
```markdown
### 📊 Session Token Metrics

| Metric | Last Turn | Session Total |
| :--- | :--- | :--- |
| **Input** | 1,420 | 11,250 |
| **Output** | 340 | 2,950 |
| **Cache Read/Creation** | 4,810 | 38,400 |
| **Total Tokens** | 1,760 | 14,200 |

- **Turns elapsed**: 6
- **Cache hit rate**: 77.3%
```

## Cross-Platform Compatibility

Pure TypeScript extension with zero external dependencies. Fully compatible with **Windows**, **macOS**, and **Linux**.
