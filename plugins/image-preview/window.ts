import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import * as path from "node:path";

export const MACOS_SCRIPT = String.raw`
ObjC.import('Cocoa')

function run () {
  const env = $.NSProcessInfo.processInfo.environment
  const read = key => { const value = env.objectForKey(key); return value.isNil() ? '' : ObjC.unwrap(value) }
  const say = text => $.NSFileHandle.fileHandleWithStandardOutput.writeData($(text + '\n').dataUsingEncoding($.NSUTF8StringEncoding))
  const largest = Number(read('IMAGE_PREVIEW_SIZE')) || 800
  $.NSApplication.sharedApplication.setActivationPolicy(1)
  const image = $.NSImage.alloc.initWithContentsOfFile(read('IMAGE_PREVIEW_FILE'))
  if (image.isNil() || image.representations.count === 0) { say('error: cannot read image'); return }
  const pixels = image.representations.firstObject
  const mouse = $.NSEvent.mouseLocation
  const screens = $.NSScreen.screens
  let screen = $.NSScreen.mainScreen
  for (let i = 0; i < screens.count; i++) {
    const frame = screens.objectAtIndex(i).frame
    if (mouse.x >= frame.origin.x && mouse.x < frame.origin.x + frame.size.width && mouse.y >= frame.origin.y && mouse.y < frame.origin.y + frame.size.height) screen = screens.objectAtIndex(i)
  }
  const area = screen.visibleFrame
  let width = pixels.pixelsWide / screen.backingScaleFactor
  let height = pixels.pixelsHigh / screen.backingScaleFactor
  const fit = Math.min(1, largest / Math.max(width, height), (area.size.width * 0.7) / width, (area.size.height * 0.7) / height)
  width = Math.round(width * fit)
  height = Math.round(height * fit)
  const pad = 6
  const gap = 18
  const outer = { width: width + pad * 2, height: height + pad * 2 }
  const top = area.origin.y + area.size.height
  const right = area.origin.x + area.size.width
  let x = mouse.x + gap
  let y = mouse.y + gap
  if (y + outer.height > top) y = mouse.y - gap - outer.height
  if (x + outer.width > right) x = mouse.x - gap - outer.width
  x = Math.max(area.origin.x, Math.min(x, right - outer.width))
  y = Math.max(area.origin.y, Math.min(y, top - outer.height))
  const panel = $.NSPanel.alloc.initWithContentRectStyleMaskBackingDefer($.NSMakeRect(x, y, outer.width, outer.height), 128, 2, false)
  panel.level = 25
  panel.ignoresMouseEvents = true
  panel.hasShadow = true
  panel.opaque = false
  panel.backgroundColor = $.NSColor.clearColor
  panel.collectionBehavior = 1 | 16 | 256
  const backdrop = $.NSVisualEffectView.alloc.initWithFrame($.NSMakeRect(0, 0, outer.width, outer.height))
  backdrop.material = 13
  backdrop.state = 1
  backdrop.wantsLayer = true
  backdrop.layer.cornerRadius = 10
  backdrop.layer.masksToBounds = true
  const view = $.NSImageView.alloc.initWithFrame($.NSMakeRect(pad, pad, width, height))
  view.image = image
  view.imageScaling = 3
  backdrop.addSubview(view)
  panel.contentView = backdrop
  panel.orderFrontRegardless
  say('shown')
  let entered = false
  const initial = mouse
  const startTime = Date.now()
  while (true) {
    $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.04))
    const cur = $.NSEvent.mouseLocation
    const inBounds = (cur.x >= x && cur.x <= x + outer.width && cur.y >= y && cur.y <= y + outer.height)
    if (inBounds) {
      entered = true
    } else if (entered) {
      break
    } else {
      const dist = Math.hypot(cur.x - initial.x, cur.y - initial.y)
      if (dist > 35 || (Date.now() - startTime > 4000)) break
    }
  }
}
`;

export const LINUX_SCRIPT = String.raw`
import math, os, sys
try:
    import tkinter as tk
except ImportError:
    print('error: no tkinter', flush=True)
    sys.exit(1)

largest = int(os.environ.get('IMAGE_PREVIEW_SIZE') or 800)
life = float(os.environ.get('IMAGE_PREVIEW_LIFE') or 120)
try:
    root = tk.Tk()
except tk.TclError as error:
    print('error: no display: %s' % error, flush=True)
    sys.exit(1)
root.withdraw()
root.overrideredirect(True)
for name, value in (('-topmost', True), ('-type', 'tooltip')):
    try:
        root.attributes(name, value)
    except tk.TclError:
        pass
try:
    image = tk.PhotoImage(file=os.environ.get('IMAGE_PREVIEW_FILE', ''))
except tk.TclError:
    print('error: cannot read the image', flush=True)
    sys.exit(1)
screen_width, screen_height = root.winfo_screenwidth(), root.winfo_screenheight()
step = max(1, math.ceil(max(image.width() / min(largest, screen_width * 0.7), image.height() / min(largest, screen_height * 0.7))))
if step > 1:
    image = image.subsample(step)
pad, gap = 6, 18
width, height = image.width() + pad * 2, image.height() + pad * 2
root.configure(background='#202020')
tk.Label(root, image=image, borderwidth=0, highlightthickness=0, background='#202020').pack(padx=pad, pady=pad)
mouse_x, mouse_y = root.winfo_pointerxy()
x, y = mouse_x + gap, mouse_y - gap - height
if y < 0:
    y = mouse_y + gap
if x + width > screen_width:
    x = mouse_x - gap - width
x = max(0, min(x, screen_width - width))
y = max(0, min(y, screen_height - height))
root.geometry('%dx%d+%d+%d' % (width, height, x, y))
root.deiconify()
root.update_idletasks()
print('shown', flush=True)
entered = False
initial_x, initial_y = mouse_x, mouse_y
start_time = time.time()

def check_hover():
    global entered
    cur_x, cur_y = root.winfo_pointerxy()
    in_bounds = (x <= cur_x <= x + width and y <= cur_y <= y + height)
    if in_bounds:
        entered = True
    elif entered:
        root.destroy()
        return
    else:
        dist = math.hypot(cur_x - initial_x, cur_y - initial_y)
        if dist > 35 or (time.time() - start_time > 4.0):
            root.destroy()
            return
    root.after(35, check_hover)

check_hover()
root.mainloop()
`;

export const WINDOWS_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$largest = if ($env:IMAGE_PREVIEW_SIZE) { [int]$env:IMAGE_PREVIEW_SIZE } else { 800 }
$life = if ($env:IMAGE_PREVIEW_LIFE) { [int]$env:IMAGE_PREVIEW_LIFE } else { 120 }
$assembly = Join-Path $env:TEMP 'image-preview-popup-v2.dll'
if (-not (Test-Path $assembly)) {
  try {
    Add-Type -OutputAssembly $assembly -OutputType Library -ReferencedAssemblies System.Windows.Forms, System.Drawing -TypeDefinition @'
using System;
using System.Windows.Forms;
public class ImagePreviewPopupV2 : Form {
  protected override bool ShowWithoutActivation { get { return true; } }
  protected override CreateParams CreateParams {
    get {
      CreateParams p = base.CreateParams;
      p.ExStyle |= 0x08000000 | 0x00000080 | 0x00000008;
      return p;
    }
  }
}
'@
  } catch {
  }
}
Add-Type -Path $assembly
try { $image = [System.Drawing.Image]::FromFile($env:IMAGE_PREVIEW_FILE) } catch { exit 1 }
$cursor = [System.Windows.Forms.Cursor]::Position
$area = [System.Windows.Forms.Screen]::FromPoint($cursor).WorkingArea
$fit = [Math]::Min(1.0, [Math]::Min($largest / [Math]::Max($image.Width, $image.Height), [Math]::Min($area.Width * 0.7 / $image.Width, $area.Height * 0.7 / $image.Height)))
$pad = 6
$gap = 18
$width = [int]($image.Width * $fit) + $pad * 2
$height = [int]($image.Height * $fit) + $pad * 2
$x = $cursor.X + $gap
$y = $cursor.Y - $gap - $height
if ($y -lt $area.Top) { $y = $cursor.Y + $gap }
if ($x + $width -gt $area.Right) { $x = $cursor.X - $gap - $width }
$x = [Math]::Max($area.Left, [Math]::Min($x, $area.Right - $width))
$y = [Math]::Max($area.Top, [Math]::Min($y, $area.Bottom - $height))
$form = New-Object ImagePreviewPopupV2
$form.FormBorderStyle = 'None'
$form.ShowInTaskbar = $false
$form.TopMost = $true
$form.StartPosition = 'Manual'
$form.Bounds = New-Object System.Drawing.Rectangle($x, $y, $width, $height)
$form.BackColor = [System.Drawing.Color]::FromArgb(24, 24, 24)
$form.Padding = New-Object System.Windows.Forms.Padding($pad)
$form.Opacity = 0.99
$form.KeyPreview = $true
$box = New-Object System.Windows.Forms.PictureBox
$box.Dock = 'Fill'
$box.SizeMode = 'Zoom'
$box.Image = $image
$box.Cursor = [System.Windows.Forms.Cursors]::Hand
$box.BackColor = [System.Drawing.Color]::FromArgb(24, 24, 24)
$clickAction = {
  try { [System.Diagnostics.Process]::Start($env:IMAGE_PREVIEW_FILE) } catch {}
  $form.Close()
}
$box.add_Click($clickAction)
$form.add_Click($clickAction)
$form.add_KeyDown({
  if ($_.KeyCode -eq [System.Windows.Forms.Keys]::Escape) { $form.Close() }
})
$form.Controls.Add($box)
$script:enteredWindow = $false
$script:startTime = [DateTime]::UtcNow

$hoverTimer = New-Object System.Windows.Forms.Timer
$hoverTimer.Interval = 35
$hoverTimer.add_Tick({
  $pos = [System.Windows.Forms.Cursor]::Position

  if ($form.Bounds.Contains($pos)) {
    $script:enteredWindow = $true
    return
  }

  if ($script:enteredWindow) {
    $form.Close()
    return
  }

  $envelope = [System.Drawing.Rectangle]::FromLTRB(
    [Math]::Min($initialCursor.X, $form.Bounds.Left) - 20,
    [Math]::Min($initialCursor.Y, $form.Bounds.Top) - 20,
    [Math]::Max($initialCursor.X, $form.Bounds.Right) + 20,
    [Math]::Max($initialCursor.Y, $form.Bounds.Bottom) + 20
  )

  $dx = $pos.X - $initialCursor.X
  $dy = $pos.Y - $initialCursor.Y
  $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)

  if (-not $envelope.Contains($pos) -or ($dist -gt 35)) {
    $form.Close()
    return
  }

  $elapsed = ([DateTime]::UtcNow - $script:startTime).TotalSeconds
  if ($elapsed -gt 4.0) {
    $form.Close()
    return
  }
})
$hoverTimer.Start()

[System.Windows.Forms.Application]::Run($form)
`;

export function openInSystemViewer(targetPath: string): void {
  const resolved = path.resolve(targetPath);
  if (process.platform === "darwin") {
    spawn("open", ["-a", "Preview", resolved], { detached: true, stdio: "ignore" }).unref();
  } else if (process.platform === "win32") {
    spawn("explorer.exe", [resolved.replace(/\//g, "\\")], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("xdg-open", [resolved], { detached: true, stdio: "ignore" }).unref();
  }
}

export function spawnFloatingPreview(
  targetPath: string,
  maxSize = 800,
  maxLifeSeconds = 120
): ChildProcess | null {
  const resolved = path.resolve(targetPath);
  const spawnEnv: Record<string, string | undefined> = {
    ...process.env,
    IMAGE_PREVIEW_FILE: resolved,
    IMAGE_PREVIEW_SIZE: String(maxSize),
    IMAGE_PREVIEW_LIFE: String(maxLifeSeconds)
  };

  try {
    if (process.platform === "darwin") {
      const child = spawn("osascript", ["-l", "JavaScript", "-e", MACOS_SCRIPT], {
        env: spawnEnv,
        stdio: ["ignore", "pipe", "pipe"],
        detached: true
      });
      child.stdout?.resume();
      child.stderr?.resume();
      child.unref();
      return child;
    }

    if (process.platform === "win32") {
      const buf = Buffer.from(WINDOWS_SCRIPT, "utf16le");
      const b64 = buf.toString("base64");
      const child = spawn(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", b64],
        {
          env: spawnEnv,
          stdio: ["ignore", "pipe", "pipe"],
          detached: true
        }
      );
      child.stdout?.resume();
      child.stderr?.resume();
      child.unref();
      return child;
    }

    const child = spawn("python3", ["-c", LINUX_SCRIPT], {
      env: spawnEnv,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true
    });
    child.stdout?.resume();
    child.stderr?.resume();
    child.unref();
    return child;
  } catch {
    return null;
  }
}
