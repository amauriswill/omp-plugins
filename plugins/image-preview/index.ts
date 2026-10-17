import type { ChildProcess } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { openInSystemViewer, spawnFloatingPreview } from "./window";

export default function imagePreviewPlugin(pi: ExtensionAPI) {
  pi.setLabel("Image Preview");
  const z = pi.zod;

  let activePreviewProcess: ChildProcess | null = null;

  const closeActivePreview = () => {
    if (activePreviewProcess) {
      try {
        activePreviewProcess.kill();
      } catch {
        // Process already exited
      }
      activePreviewProcess = null;
    }
  };

  const launchPreview = async (filePath: string, ctx: ExtensionContext): Promise<boolean> => {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(ctx.cwd, filePath);

    try {
      await fs.access(fullPath);
    } catch {
      return false;
    }

    closeActivePreview();
    activePreviewProcess = spawnFloatingPreview(fullPath, 800, 120);

    if (activePreviewProcess) {
      activePreviewProcess.on("exit", () => {
        activePreviewProcess = null;
      });
      return true;
    }

    return false;
  };

  // Tool: preview_image
  pi.registerTool({
    name: "preview_image",
    label: "Preview Image",
    description: "Opens a sharp, borderless floating preview window by the mouse pointer outside the terminal, or opens in default system viewer",
    parameters: z.object({
      path: z.string().describe("Path to the image file (png, jpg, webp, bmp, gif)"),
      action: z
        .enum(["preview", "open", "close"])
        .optional()
        .default("preview")
        .describe("Action: 'preview' (floating window by cursor), 'open' (system viewer), or 'close'")
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const fullPath = path.isAbsolute(params.path) ? params.path : path.join(ctx.cwd, params.path);

      if (params.action === "close") {
        closeActivePreview();
        return {
          content: [{ type: "text", text: "Preview window closed." }],
          details: { action: "close" }
        };
      }

      if (params.action === "open") {
        openInSystemViewer(fullPath);
        return {
          content: [{ type: "text", text: `Opened ${path.basename(params.path)} in system default viewer.` }],
          details: { action: "open", path: fullPath }
        };
      }

      const ok = await launchPreview(fullPath, ctx);
      if (!ok) {
        return {
          content: [{ type: "text", text: `Unable to open preview for ${params.path}. File may not exist or window creation failed.` }],
          details: { error: "preview_failed", path: fullPath }
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Floating preview window opened beside pointer for ${path.basename(params.path)}. Use /open-image to open in system viewer.`
          }
        ],
        details: { action: "preview", path: fullPath }
      };
    }
  });

  // Slash command: /preview-image
  pi.registerCommand("preview-image", {
    description: "Open a floating preview window by the pointer (/preview-image <file.png>)",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const target = args.trim();
      if (!target) {
        ctx.ui.notify("Usage: /preview-image <path/to/image.png>", "warning");
        return;
      }

      const ok = await launchPreview(target, ctx);
      if (ok) {
        ctx.ui.notify(`🖼️ Floating preview window opened for ${path.basename(target)}`, "info");
      } else {
        ctx.ui.notify(`Failed to open preview for "${target}". Check if file exists.`, "error");
      }
    }
  });

  // Slash command: /open-image
  pi.registerCommand("open-image", {
    description: "Open the image in the system default viewer (Preview, Photos, xdg-open)",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const target = args.trim();
      if (!target) {
        ctx.ui.notify("Usage: /open-image <path/to/image.png>", "warning");
        return;
      }

      const fullPath = path.isAbsolute(target) ? target : path.join(ctx.cwd, target);
      openInSystemViewer(fullPath);
      ctx.ui.notify(`Opened ${path.basename(target)} in system default viewer`, "info");
    }
  });

  // Slash command: /close-preview
  pi.registerCommand("close-preview", {
    description: "Close active floating image preview window",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      closeActivePreview();
      ctx.ui.notify("Preview window closed", "info");
    }
  });

  // Hook: detect image references in prompts
  pi.on("input", async (event, ctx: ExtensionContext) => {
    const text = event.text;
    const imgMatch = text.match(/\[Image #\d+\]|[\w\-./\\]+\.(png|jpe?g|webp|bmp|gif)/i);
    if (imgMatch) {
      const matched = imgMatch[0] ?? "Image";
      ctx.ui.setStatus("image-preview", `🖼️ ${matched}: /preview-image to preview · /open-image to open`);

      // If it looks like a local file path, attempt automatic floating preview
      if (/\.(png|jpe?g|webp|bmp|gif)$/i.test(matched)) {
        await launchPreview(matched, ctx);
      }

      ctx.setTimeout?.(() => {
        ctx.ui.setStatus("image-preview", undefined);
      }, 8000);
    }
  });

  pi.on("session_shutdown", () => {
    closeActivePreview();
  });
}
