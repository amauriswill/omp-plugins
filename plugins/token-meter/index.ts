import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";

interface TokenCounts {
  input: number;
  output: number;
  cached: number;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return `${count}`;
}

export default function tokenMeterPlugin(pi: ExtensionAPI) {
  pi.setLabel("Token Meter");

  let lastTurn: TokenCounts = { input: 0, output: 0, cached: 0 };
  let sessionTotal: TokenCounts = { input: 0, output: 0, cached: 0 };
  let turnCount = 0;

  pi.on("session_start", async (_event, ctx: ExtensionContext) => {
    lastTurn = { input: 0, output: 0, cached: 0 };
    sessionTotal = { input: 0, output: 0, cached: 0 };
    turnCount = 0;
    ctx.ui.setStatus("token-meter", undefined);
  });

  pi.on("turn_end", async (event: unknown, ctx: ExtensionContext) => {
    turnCount += 1;
    let turnInput = 0;
    let turnOutput = 0;
    let turnCached = 0;

    // Narrow event for usage metadata
    if (event && typeof event === "object" && "usage" in event) {
      const maybeUsage = event.usage;
      if (maybeUsage && typeof maybeUsage === "object") {
        if ("input_tokens" in maybeUsage && typeof maybeUsage.input_tokens === "number") {
          turnInput = maybeUsage.input_tokens;
        }
        if ("output_tokens" in maybeUsage && typeof maybeUsage.output_tokens === "number") {
          turnOutput = maybeUsage.output_tokens;
        }
        let readCache = 0;
        let createCache = 0;
        if ("cache_read_input_tokens" in maybeUsage && typeof maybeUsage.cache_read_input_tokens === "number") {
          readCache = maybeUsage.cache_read_input_tokens;
        }
        if ("cache_creation_input_tokens" in maybeUsage && typeof maybeUsage.cache_creation_input_tokens === "number") {
          createCache = maybeUsage.cache_creation_input_tokens;
        }
        turnCached = readCache + createCache;
      }
    }

    // Fall back to context usage if available
    const ctxUsage: unknown = ctx.getContextUsage?.();
    if (turnInput === 0 && ctxUsage && typeof ctxUsage === "object") {
      if ("inputTokens" in ctxUsage && typeof ctxUsage.inputTokens === "number") {
        turnInput = ctxUsage.inputTokens;
      }
      if ("outputTokens" in ctxUsage && typeof ctxUsage.outputTokens === "number") {
        turnOutput = ctxUsage.outputTokens;
      }
      if ("cachedTokens" in ctxUsage && typeof ctxUsage.cachedTokens === "number") {
        turnCached = ctxUsage.cachedTokens;
      } else if ("cacheReadTokens" in ctxUsage && typeof ctxUsage.cacheReadTokens === "number") {
        turnCached = ctxUsage.cacheReadTokens;
      }
    }

    // If still 0 but overall tokens exists, record approximation
    if (turnInput === 0 && turnOutput === 0 && ctxUsage && typeof ctxUsage === "object") {
      if ("tokens" in ctxUsage && typeof ctxUsage.tokens === "number") {
        turnInput = ctxUsage.tokens;
      }
    }

    lastTurn = { input: turnInput, output: turnOutput, cached: turnCached };
    sessionTotal.input += turnInput;
    sessionTotal.output += turnOutput;
    sessionTotal.cached += turnCached;

    const totalSum = sessionTotal.input + sessionTotal.output;
    const statusText = `📊 ↑ ${formatTokens(lastTurn.input)} · ↓ ${formatTokens(lastTurn.output)} · c: ${formatTokens(lastTurn.cached)} | Σ ${formatTokens(totalSum)}`;
    ctx.ui.setStatus("token-meter", statusText);
  });

  pi.registerCommand("tokens", {
    description: "Display token consumption and cache statistics for the current session",
    handler: async (_args: string, ctx: ExtensionContext) => {
      const totalAll = sessionTotal.input + sessionTotal.output;
      const cacheDenominator = sessionTotal.input + sessionTotal.cached;
      const cacheRate = cacheDenominator > 0 ? ((sessionTotal.cached / cacheDenominator) * 100).toFixed(1) : "0.0";

      const lines = [
        "### 📊 Session Token Metrics",
        "",
        `| Metric | Last Turn | Session Total |`,
        `| :--- | :--- | :--- |`,
        `| **Input** | ${lastTurn.input.toLocaleString()} | ${sessionTotal.input.toLocaleString()} |`,
        `| **Output** | ${lastTurn.output.toLocaleString()} | ${sessionTotal.output.toLocaleString()} |`,
        `| **Cache Read/Creation** | ${lastTurn.cached.toLocaleString()} | ${sessionTotal.cached.toLocaleString()} |`,
        `| **Total Tokens** | ${(lastTurn.input + lastTurn.output).toLocaleString()} | ${totalAll.toLocaleString()} |`,
        "",
        `- **Turns elapsed**: ${turnCount}`,
        `- **Cache hit rate**: ${cacheRate}%`
      ];

      pi.sendMessage(
        {
          customType: "token-metrics",
          content: lines.join("\n"),
          display: true,
          attribution: "agent"
        },
        { triggerTurn: false }
      );

      ctx.ui.notify(`Session tokens: ${formatTokens(totalAll)} (Cache rate: ${cacheRate}%)`, "info");
    }
  });
}
