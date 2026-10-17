# Image Preview Plugin for omp

Opens a floating, borderless preview window right beside your mouse pointer outside the terminal, keeping the terminal focused and never stealing keyboard input.

## Features

- **Floating Tool Window by Pointer**:
  - Pops up directly above/beside the mouse pointer outside the terminal.
  - Borderless, dark background, rounded padding, sharp 1:1 image rendering.
  - Never steals keyboard focus or mouse clicks (`WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW | WS_EX_TRANSPARENT`).
  - Automatically bounds itself within the monitor workspace so it never covers your pointer or spills off-screen.
- **Automatic Token Resolution**:
  - Automatically resolves `[Image #1]`, `[Image #1, 1172x631]`, `#1`, `1`, or local file paths.
  - Omitted argument (`/preview-image`) automatically defaults to the latest image attachment in the session.
  - Reads directly from session attachments and blob storage, automatically converting formats like WebP for GDI+ compatibility.
- **Native OS Implementation**:
  - **macOS**: AppKit HUD panel with blur material and drop shadow via `osascript` (JXA).
  - **Windows**: Borderless tool window via PowerShell `System.Windows.Forms`.
  - **Linux**: X11 tooltip window via Python3 `tkinter`.
- **System Default Viewer**: Click or invoke `/open-image <path>` to open in the system viewer (Preview on macOS, Photos/Explorer on Windows, `xdg-open` on Linux).

## Commands

```text
/preview-image                   # Opens floating window by pointer for latest image
/preview-image [Image #1]        # Opens floating window by pointer for Image #1
/preview-image path/to/image.png # Opens floating window by pointer for specified file
/open-image [Image #1]           # Opens in system default viewer (Preview/Photos/xdg-open)
/close-preview                   # Closes active preview window
```

## Tool Specification

The assistant can also trigger previews or inspect images:
```json
{
  "name": "preview_image",
  "parameters": {
    "path": "[Image #1]",
    "action": "preview"
  }
}
```
Actions:
- `"preview"`: Opens the floating preview window beside cursor.
- `"open"`: Opens in the system default image viewer.
- `"close"`: Closes the active floating preview.
