# After Plugin for omp

A prompt queue that lets you queue up instructions while the agent is still running, without steering or interrupting the current turn. When the agent finishes, the next queued task automatically executes.

## Features

- `/after <task>`: Queues a task to execute as soon as the current run finishes.
- `/before <task>`: Inserts a high-priority task at the top of the queue (runs next).
- `/after`: Displays all currently queued tasks.
- `/after clear`: Empties the queue.
- `/after run`: Immediately executes the next task if the agent is idle.
- **TUI Status Footer**: Shows `📋 Queue (N)` whenever tasks are waiting.

## Usage

While omp is working on a feature or refactor, type:
```text
/after run npm test and fix any failing tests
/after commit and push with Conventional Commits
```

The tasks wait safely in the queue and run sequentially as each turn finishes.

## Cross-Platform Compatibility

Pure TypeScript extension using in-process session lifecycle hooks. Fully compatible with **Windows**, **macOS**, and **Linux**.
