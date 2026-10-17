# Think Hard Plugin for omp

Prefix any prompt with `+` to temporarily run that single turn with maximum reasoning effort (`thinking: max`).

## How it works

When you submit a prompt beginning with `+`:
1. The `+` prefix is stripped from your question.
2. The model's reasoning effort is boosted to `max` for that specific turn.
3. A visual status indicator `🧠 Think Hard: MAX` appears in the TUI footer.
4. When the turn finishes, your original thinking level is automatically restored.

## Examples

```text
+ prove the correctness of this concurrent worker queue and identify all race conditions
```

Or manage thinking directly:
```text
/think-hard max
/think-hard auto
```

## Cross-Platform Compatibility

Pure TypeScript extension with zero external dependencies. Fully compatible with **Windows**, **macOS**, and **Linux**.
