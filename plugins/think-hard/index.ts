import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max" | "auto";

export default function thinkHardPlugin(pi: ExtensionAPI) {
  pi.setLabel("Think Hard");

  let isHardTurn = false;
  let previousLevel: ThinkingLevel = "auto";

  pi.on("input", async (event, ctx) => {
    const raw = event.text.trimStart();
    if (raw.startsWith("+") && !raw.startsWith("++")) {
      const stripped = raw.slice(1).trimStart();
      if (!stripped) return; // Lone plus

      try {
        previousLevel = (pi.getThinkingLevel?.() as ThinkingLevel) || "auto";
        pi.setThinkingLevel?.("max");
      } catch {
        // Fallback if thinking level API varies
      }

      isHardTurn = true;
      ctx.ui.setStatus("think-hard", "🧠 Think Hard: MAX");
      ctx.ui.notify("🧠 Think Hard active: thinking set to MAX for this turn", "info");

      return { text: stripped };
    }
  });

  pi.on("turn_end", async (_event, ctx) => {
    if (isHardTurn) {
      isHardTurn = false;
      try {
        pi.setThinkingLevel?.(previousLevel);
      } catch {
        // Ignore
      }
      ctx.ui.setStatus("think-hard", undefined);
    }
  });

  pi.registerCommand("think-hard", {
    description: "Check or set thinking level for reasoning models",
    handler: async (args, ctx) => {
      const target = args.trim().toLowerCase() as ThinkingLevel;
      const valid: ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh", "max", "auto"];

      if (!target) {
        const current = pi.getThinkingLevel?.() || "unknown";
        ctx.ui.notify(`Current thinking level: ${current}. Prefix any prompt with + to think at MAX for that turn.`, "info");
        return;
      }

      if (valid.includes(target)) {
        pi.setThinkingLevel?.(target);
        ctx.ui.notify(`Thinking level set to: ${target}`, "info");
      } else {
        ctx.ui.notify(`Invalid level "${target}". Valid levels: ${valid.join(", ")}`, "error");
      }
    }
  });
}
