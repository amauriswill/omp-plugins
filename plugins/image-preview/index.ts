import type { ChildProcess } from "node:child_process";
import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { resolveImageTarget } from "./resolver";
import { openInSystemViewer, spawnFloatingPreview } from "./window";

export default function imagePreviewPlugin(pi: ExtensionAPI) {
  pi.setLabel("Image Preview");
  const z = pi.zod;

  let activePreviewProcess: ChildProcess | null = null;

  const closeActivePreview = () => {
    if (activePreviewProcess) {
      try {
        activePreviewProcess.kill();
      } catch {}
      activePreviewProcess = null;
    }
  };

  const launchPreview = (tokenOrPath: string | undefined, ctx: ExtensionContext): boolean => {
    const resolved = resolveImageTarget(tokenOrPath, ctx.cwd);
    if (!resolved) return false;

    closeActivePreview();
    activePreviewProcess = spawnFloatingPreview(resolved.path, 800, 120);

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
    description: "Opens a sharp, borderless floating preview window by the mouse pointer outside the terminal, or opens in default system viewer. Accepts [Image #N] tokens or file paths.",
    parameters: z.object({
      path: z.string().optional().describe("Path to the image file, token [Image #1], or index 1 (defaults to latest image)"),
      action: z
        .enum(["preview", "open", "close"])
        .optional()
        .default("preview")
        .describe("Action: 'preview' (floating window by cursor), 'open' (system viewer), or 'close'")
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const resolved = resolveImageTarget(params.path, ctx.cwd);

      if (params.action === "close") {
        closeActivePreview();
        return {
          content: [{ type: "text", text: "Preview window closed." }],
          details: { action: "close" }
        };
      }

      if (!resolved) {
        return {
          content: [{ type: "text", text: `Unable to locate image for '${params.path ?? "latest"}'. No image attachment or file found.` }],
          details: { error: "not_found", target: params.path }
        };
      }

      if (params.action === "open") {
        openInSystemViewer(resolved.originalPath);
        return {
          content: [{ type: "text", text: `Opened ${resolved.name} in system default viewer.` }],
          details: { action: "open", path: resolved.originalPath }
        };
      }

      const ok = launchPreview(resolved.path, ctx);
      if (!ok) {
        return {
          content: [{ type: "text", text: `Failed to spawn floating preview window for ${resolved.name}.` }],
          details: { error: "preview_failed", path: resolved.path }
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Floating preview window opened beside cursor for ${resolved.name}. Use /open-image to open in system default viewer.`
          }
        ],
        details: { action: "preview", path: resolved.path, name: resolved.name }
      };
    }
  });

  // Slash command: /preview-image
  pi.registerCommand("preview-image", {
    description: "Open floating preview window by pointer for an image (/preview-image [Image #1] or path)",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const target = args.trim();
      const resolved = resolveImageTarget(target || undefined, ctx.cwd);

      if (!resolved) {
        ctx.ui.notify("No image found. Specify a path or [Image #N], or attach an image.", "warning");
        return;
      }

      const ok = launchPreview(resolved.path, ctx);
      if (ok) {
        ctx.ui.notify(`🖼️ Ventana flotante abierta junto al cursor: ${resolved.name}`, "info");
      } else {
        ctx.ui.notify(`Error al abrir previsualización de "${resolved.name}"`, "error");
      }
    }
  });

  // Slash command: /open-image
  pi.registerCommand("open-image", {
    description: "Open image in system default viewer (/open-image [Image #1] or path)",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const target = args.trim();
      const resolved = resolveImageTarget(target || undefined, ctx.cwd);

      if (!resolved) {
        ctx.ui.notify("No image found. Specify a path or [Image #N], or attach an image.", "warning");
        return;
      }

      openInSystemViewer(resolved.originalPath);
      ctx.ui.notify(`🖼️ Abierto en visor del sistema: ${resolved.name}`, "info");
    }
  });

  // Slash command: /close-preview
  pi.registerCommand("close-preview", {
    description: "Close active floating image preview window",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      closeActivePreview();
      ctx.ui.notify("Ventana de previsualización cerrada", "info");
    }
  });

  // Hook: detect image references or attachments in prompts
  pi.on("input", async (event, ctx: ExtensionContext) => {
    const text = event.text;
    const imgMatch = text.match(/\[Image\s*#?(\d+)[^\]]*\]/i) ?? text.match(/[\w\-./\\]+\.(png|jpe?g|webp|bmp|gif)/i);

    if (imgMatch) {
      const matchedToken = imgMatch[0] ?? "Image";
      const resolved = resolveImageTarget(matchedToken, ctx.cwd);

      if (resolved) {
        ctx.ui.setStatus("image-preview", `🖼️ ${resolved.name}: preview abierta junto al cursor`);
        ctx.ui.setWidget?.("aboveEditor", [
          `🖼️ [Image] ${resolved.name} · /preview-image para ver flotante · /open-image para visor del sistema`
        ]);

        // Automatically open the floating preview window beside the pointer!
        launchPreview(resolved.path, ctx);

        ctx.setTimeout?.(() => {
          ctx.ui.setStatus("image-preview", undefined);
          ctx.ui.setWidget?.("aboveEditor", undefined);
        }, 8000);
      }
    }
  });

  pi.on("session_shutdown", () => {
    closeActivePreview();
  });
}
