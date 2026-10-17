# Image Preview Plugin for omp

Provides cross-platform in-terminal graphical image preview using ANSI 24-bit truecolor half-blocks (`▀`) and ASCII art.

## Features

- **Slash command `/preview-image <path>`**: Render PNG, JPG, WebP, GIF, or BMP images directly in your terminal transcript.
- **LLM Tool `preview_image`**: Allows omp to visually inspect images directly within the conversation.
- **Prompt Hook**: Detects pasted image tokens like `[Image #1]` or image file paths and displays a preview indicator in the status line.

## Commands

```text
/preview-image path/to/screenshot.png
```

## Tool Specification

```json
{
  "name": "preview_image",
  "parameters": {
    "path": "path/to/image.png",
    "cols": 64,
    "mode": "color"
  }
}
```

## Cross-Platform Compatibility

Tested and fully supported on **Windows**, **macOS**, and **Linux**:
- **Pure TypeScript Decoders**: Built-in decoders for uncompressed BMP and full PNG (with `node:zlib`).
- **macOS**: Native integration with `sips` for JPG/WebP/GIF conversion.
- **Linux**: Automatic fallback via `convert` (ImageMagick), `ffmpeg`, or `python3`.
- **Windows**: Built-in PowerShell `System.Drawing` conversion fallback.
