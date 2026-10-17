import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { parseBmp, parsePng, renderAscii, renderHalfBlocks, type PixelGrid } from "./pixels";

async function loadPixelGrid(filePath: string, pi: ExtensionAPI, ctx: ExtensionContext): Promise<PixelGrid | null> {
  try {
    const rawBytes = await fs.readFile(filePath);
    const u8 = new Uint8Array(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength);

    // 1. Pure TypeScript PNG decode (cross-platform, zero external dependencies)
    const pngGrid = parsePng(u8);
    if (pngGrid) return pngGrid;

    // 2. Pure TypeScript BMP decode (cross-platform, zero external dependencies)
    const bmpGrid = parseBmp(u8);
    if (bmpGrid) return bmpGrid;

    // 3. Platform-specific conversion for other formats (JPG, WebP, GIF)
    const tempBmp = path.join(os.tmpdir(), `omp_img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.bmp`);

    if (process.platform === "darwin") {
      // macOS: sips is built-in on 100% of Macs
      const cmd = `sips -s format bmp "${filePath.replace(/"/g, '\\"')}" --out "${tempBmp}"`;
      const res = await pi.exec(cmd, { cwd: ctx.cwd });
      if (res.exitCode === 0) {
        const bmpBytes = await fs.readFile(tempBmp);
        await fs.unlink(tempBmp).catch(() => {});
        return parseBmp(new Uint8Array(bmpBytes.buffer, bmpBytes.byteOffset, bmpBytes.byteLength));
      }
    } else if (process.platform === "win32") {
      // Windows: PowerShell System.Drawing
      const escaped = filePath.replace(/'/g, "''");
      const outEscaped = tempBmp.replace(/'/g, "''");
      const script = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${escaped}'); $bmp = New-Object System.Drawing.Bitmap($img); $bmp.Save('${outEscaped}', [System.Drawing.Imaging.ImageFormat]::Bmp); $img.Dispose(); $bmp.Dispose()`;
      const res = await pi.exec(`powershell -NoProfile -Command "${script}"`, { cwd: ctx.cwd });
      if (res.exitCode === 0) {
        const bmpBytes = await fs.readFile(tempBmp);
        await fs.unlink(tempBmp).catch(() => {});
        return parseBmp(new Uint8Array(bmpBytes.buffer, bmpBytes.byteOffset, bmpBytes.byteLength));
      }
    } else {
      // Linux / Unix: check convert (ImageMagick), ffmpeg, or python3
      const convertCmd = `convert "${filePath.replace(/"/g, '\\"')}" bmp:"${tempBmp}" 2>/dev/null || ffmpeg -y -v error -i "${filePath.replace(/"/g, '\\"')}" "${tempBmp}" 2>/dev/null`;
      const res = await pi.exec(convertCmd, { cwd: ctx.cwd });
      if (res.exitCode === 0) {
        const bmpBytes = await fs.readFile(tempBmp);
        await fs.unlink(tempBmp).catch(() => {});
        return parseBmp(new Uint8Array(bmpBytes.buffer, bmpBytes.byteOffset, bmpBytes.byteLength));
      }
    }
  } catch {
    // Read or conversion failure
  }

  return null;
}

export default function imagePreviewPlugin(pi: ExtensionAPI) {
  pi.setLabel("Image Preview");
  const z = pi.zod;

  pi.registerTool({
    name: "preview_image",
    label: "Preview Image",
    description: "Renders an image file to the terminal using ANSI truecolor half-blocks or ASCII art",
    parameters: z.object({
      path: z.string().describe("Path to the image file (png, jpg, webp, bmp, gif)"),
      cols: z.number().optional().default(64).describe("Max columns width for terminal display (default: 64)"),
      mode: z.enum(["color", "ascii"]).optional().default("color").describe("Display mode: 'color' (ANSI truecolor) or 'ascii'")
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const fullPath = path.isAbsolute(params.path) ? params.path : path.join(ctx.cwd, params.path);
      const grid = await loadPixelGrid(fullPath, pi, ctx);

      if (!grid) {
        return {
          content: [{ type: "text", text: `Unable to decode image at ${params.path}. File may be missing or unsupported.` }],
          details: { error: "decode_failed", path: params.path }
        };
      }

      const rendered = params.mode === "ascii"
        ? renderAscii(grid, params.cols, Math.round(params.cols / 2))
        : renderHalfBlocks(grid, params.cols, Math.round(params.cols / 2));

      return {
        content: [
          { type: "text", text: `Image: ${path.basename(params.path)} (${grid.width}x${grid.height})\n\n${rendered}` }
        ],
        details: { width: grid.width, height: grid.height, path: params.path }
      };
    }
  });

  pi.registerCommand("preview-image", {
    description: "Preview an image in the terminal (/preview-image <file.png>)",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const fileArg = args.trim();
      if (!fileArg) {
        ctx.ui.notify("Usage: /preview-image <path/to/image.png>", "warning");
        return;
      }

      const fullPath = path.isAbsolute(fileArg) ? fileArg : path.join(ctx.cwd, fileArg);
      const grid = await loadPixelGrid(fullPath, pi, ctx);

      if (!grid) {
        ctx.ui.notify(`Could not load or decode image: ${fileArg}`, "error");
        return;
      }

      const asciiArt = renderHalfBlocks(grid, 60, 30);
      pi.sendMessage(
        {
          customType: "image-preview",
          content: `Preview of \`${path.basename(fileArg)}\` (${grid.width}×${grid.height}px):\n\n${asciiArt}`,
          display: true,
          attribution: "agent"
        },
        { triggerTurn: false }
      );
      ctx.ui.notify(`Previewed ${path.basename(fileArg)} (${grid.width}×${grid.height})`, "info");
    }
  });

  pi.on("input", async (event, ctx: ExtensionContext) => {
    const text = event.text;
    const imgMatch = text.match(/\[Image #\d+\]|[\w\-./\\]+\.(png|jpe?g|webp|bmp|gif)/i);
    if (imgMatch) {
      const matchedName = imgMatch[0] ?? "Image";
      ctx.ui.setStatus("image-detected", `🖼️ ${matchedName}`);
      ctx.setTimeout?.(() => {
        ctx.ui.setStatus("image-detected", undefined);
      }, 5000);
    }
  });
}
