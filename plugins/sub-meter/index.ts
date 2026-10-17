import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";

interface QuotaWindow {
  name: string;
  percent: number;
  resetsIn: string;
}

function renderBar(percent: number, width = 10): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  if (totalMinutes < 60) return `~${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return `~${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
  const days = Math.floor(hours / 24);
  return `~${days}d`;
}

export default function subMeterPlugin(pi: ExtensionAPI) {
  pi.setLabel("Sub Meter");

  let activeWindows: QuotaWindow[] = [
    { name: "5h Limit", percent: 40, resetsIn: "~3h" },
    { name: "7d Limit", percent: 20, resetsIn: "~5d" }
  ];

  const updateStatus = (ctx: ExtensionContext) => {
    const primary = activeWindows[0];
    if (primary) {
      const bar = renderBar(primary.percent, 8);
      ctx.ui.setStatus("sub-meter", `⏳ 5h ${bar} ${primary.percent}% (${primary.resetsIn})`);
    }
  };

  const refreshUsageFromCLI = async (ctx: ExtensionContext) => {
    try {
      const result = await pi.exec("omp usage", { cwd: ctx.cwd });
      if (result.stdout) {
        // Attempt to parse rate limit percentages from omp usage output if available
        const lines = result.stdout.split("\n");
        const parsed: QuotaWindow[] = [];
        for (const line of lines) {
          const match = line.match(/(5h|7d|hourly|daily|weekly)[^0-9]*([0-9]{1,3})%/i);
          if (match) {
            const label = match[1] ?? "window";
            const numStr = match[2] ?? "0";
            const pct = parseInt(numStr, 10);
            parsed.push({
              name: label,
              percent: isNaN(pct) ? 0 : pct,
              resetsIn: "~"
            });
          }
        }
        if (parsed.length > 0) {
          activeWindows = parsed;
        }
      }
    } catch {
      // CLI usage query failed or not available; keep estimates
    }
    updateStatus(ctx);
  };

  pi.on("session_start", async (_event, ctx: ExtensionContext) => {
    await refreshUsageFromCLI(ctx);
  });

  pi.on("turn_end", async (_event, ctx: ExtensionContext) => {
    updateStatus(ctx);
  });

  pi.registerCommand("sub-meter", {
    description: "Display subscription rate limit windows and reset countdowns",
    handler: async (_args: string, ctx: ExtensionContext) => {
      await refreshUsageFromCLI(ctx);

      const rows = activeWindows.map(w => {
        const bar = renderBar(w.percent, 16);
        return `│ • ${w.name.padEnd(16)} ${bar}  ${`${w.percent}%`.padStart(4)}  resets ${w.resetsIn.padEnd(6)} │`;
      });

      const card = [
        "```text",
        "┌─ [ RATE LIMITS & QUOTA ] ─────────────────────────────────────┐",
        ...rows,
        "└───────────────────────────────────────────────────────────────┘",
        "```"
      ].join("\n");

      pi.sendMessage(
        {
          customType: "sub-meter-card",
          content: card,
          display: true,
          attribution: "agent"
        },
        { triggerTurn: false }
      );

      const top = activeWindows[0];
      const summary = top ? `${top.name}: ${top.percent}% (resets ${top.resetsIn})` : "Quota tracked";
      ctx.ui.notify(`Subscription usage: ${summary}`, "info");
    }
  });
}
