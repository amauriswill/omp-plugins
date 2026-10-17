import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";

interface ModelRecord {
  id?: string;
  name?: string;
}

function extractModelId(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    if ("id" in value && typeof value.id === "string") return value.id;
    if ("name" in value && typeof value.name === "string") return value.name;
  }
  return undefined;
}

export default function useSmolPlugin(pi: ExtensionAPI) {
  pi.setLabel("Use Smol");

  let isSmolTurn = false;
  let previousModel: string | undefined;

  const resolveSmolModel = (ctx: ExtensionContext): string | undefined => {
    if (!ctx.models?.resolve) return undefined;

    const smolRole = ctx.models.resolve("@smol");
    const smolId = extractModelId(smolRole);
    if (smolId) return smolId;

    const candidates = [
      "claude-haiku-3-5",
      "claude-3-5-haiku",
      "gemini-2.5-flash",
      "gemini-1.5-flash",
      "gpt-4o-mini",
      "smol"
    ];
    for (const cand of candidates) {
      const found = ctx.models.resolve(cand);
      const id = extractModelId(found);
      if (id) return id;
    }
    return undefined;
  };

  pi.on("input", async (event, ctx) => {
    const raw = event.text.trimStart();
    if (raw.startsWith("_") && !raw.startsWith("__")) {
      const stripped = raw.slice(1).trimStart();
      if (!stripped) return;

      const current = ctx.models?.current?.();
      const currentId = extractModelId(current);
      const targetSmol = resolveSmolModel(ctx);

      if (targetSmol && currentId) {
        previousModel = currentId;

        try {
          pi.setModel?.(targetSmol);
          isSmolTurn = true;
          ctx.ui.setStatus("use-smol", `⚡ Smol: ${targetSmol}`);
          ctx.ui.notify(`⚡ Fast turn active on ${targetSmol}`, "info");
        } catch {
          // Model switch fallback
        }
      }

      return { text: stripped };
    }
  });

  pi.on("turn_end", async (_event, ctx) => {
    if (isSmolTurn && previousModel) {
      isSmolTurn = false;
      try {
        pi.setModel?.(previousModel);
      } catch {
        // Ignore
      }
      previousModel = undefined;
      ctx.ui.setStatus("use-smol", undefined);
    }
  });

  const commandHandler = async (_args: string, ctx: ExtensionContext) => {
    const smol = resolveSmolModel(ctx) ?? "none configured";
    ctx.ui.notify(
      `Prefix any prompt with _ to run on fast model (${smol}) for that single turn.`,
      "info"
    );
  };

  pi.registerCommand("use-smol", {
    description: "Show information about the fast/smol turn prefix (_)",
    handler: commandHandler
  });

  pi.registerCommand("use-haiku", {
    description: "Alias for /use-smol (Claude Haiku fast turn)",
    handler: commandHandler
  });
}
