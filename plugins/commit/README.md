# Commit Plugin for omp

Provides the `/commit` slash command to automate semantic Conventional Commits with push and branch strategies.

## Features

- **Interactive Selection**: Prompts how to handle current changes:
  1. **Commit + push (Recommended)**: commits on the current branch and pushes to remote.
  2. **Commit only**: commits locally without pushing.
  3. **Commit on a new branch**: switches to a descriptive branch (e.g. `feat/feature-name`), commits, and pushes.
- **Smart Grouping**: Groups git diffs into clean, atomic commits.
- **Conventional Commits**: Uses standard `type(scope): message` format (`feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`, `build`).
- **Security**: Automatically excludes `.env*`, keys, and credentials from staging.
- **Clean Attribution**: Never includes AI disclaimers or generated metadata.

## Usage

In the omp prompt:
```text
/commit
```

## Cross-Platform Compatibility

Tested and fully functional on **Windows**, **macOS**, and **Linux** (requires `git` in PATH).
