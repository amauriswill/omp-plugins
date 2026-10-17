# Image Preview Plugin for omp

Opens a floating, borderless preview window right beside your mouse pointer outside the terminal, keeping the terminal focused and never stealing keyboard input.

## Features

- **Floating Tool Window by Pointer**:
  - Pops up directly above/beside the mouse pointer outside the terminal.
  - Borderless, dark background, rounded padding, sharp 1:1 image rendering.
  - Never steals keyboard focus or mouse clicks (`WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW | WS_EX_TRANSPARENT`).
  - Automatically bounds itself within the monitor workspace so it never covers your pointer or spills off-screen.
- **Native OS Implementation**:
  - **macOS**: AppKit HUD panel with blur material and drop shadow via `osascript` (JXA).
  - **Windows**: Borderless tool window via PowerShell `System.Windows.Forms`.
  - **Linux**: X11 tooltip window via Python3 `tkinter`.
- **System Default Viewer**: Click or invoke `/open-image <path>` to open in the system viewer (Preview on macOS, Photos/Explorer on Windows, `xdg-open` on Linux).

## Commands

```text
/preview-image path/to/image.png     # Opens floating window by pointer
/open-image path/to/image.png        # Opens in system default viewer
/close-preview                       # Closes active preview window
```

## Tool Specification

The assistant can also trigger previews or inspect images:
```json
{
  "name": "preview_image",
  "parameters": {
    "path": "screenshots/login.png",
    "action": "preview"
  }
}
```
Actions:
- `"preview"`: Opens the floating preview window beside cursor.
- `"open"`: Opens in the system default image viewer.
- `"close"`: Closes the active floating preview.
