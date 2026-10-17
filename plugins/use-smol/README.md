# Use Smol Plugin for omp

Prefix any prompt with `_` to run that single turn on a lightweight, fast model (smol / Haiku / Flash) instead of your primary reasoning model.

## How it works

When you submit a prompt beginning with `_` (e.g. `_summarize this log`):
1. The `_` prefix is stripped from the prompt.
2. The plugin switches to the configured `@smol` role or lightweight model (`claude-haiku`, `gemini-flash`, `gpt-4o-mini`).
3. An indicator `⚡ Smol: <model>` appears in the TUI status bar.
4. When the turn finishes, your original model is automatically restored.

Note: Prompts starting with `__` (e.g. `__init__.py`) are ignored so code filenames are never triggered by mistake.

## Commands

- `/use-smol` (or `/use-haiku`): display the active fast model configuration.

## Cross-Platform Compatibility

Pure TypeScript extension with zero external dependencies. Fully compatible with **Windows**, **macOS**, and **Linux**.
