import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@oh-my-pi/pi-coding-agent";

interface QueuedTask {
  id: number;
  text: string;
  createdAt: number;
}

export default function afterPlugin(pi: ExtensionAPI) {
  pi.setLabel("After Queue");

  const queue: QueuedTask[] = [];
  let nextId = 1;
  let isDispatching = false;

  const updateStatus = (ctx: ExtensionContext) => {
    if (queue.length === 0) {
      ctx.ui.setStatus("after-queue", undefined);
    } else {
      ctx.ui.setStatus("after-queue", `📋 Queue (${queue.length})`);
    }
  };

  const dispatchNext = async (ctx: ExtensionContext) => {
    if (isDispatching || queue.length === 0) return;
    if (!ctx.isIdle?.()) return;

    const next = queue.shift();
    if (!next) return;

    isDispatching = true;
    updateStatus(ctx);

    ctx.ui.notify(`▶ Running queued task #${next.id}: "${next.text.slice(0, 40)}${next.text.length > 40 ? "…" : ""}"`, "info");

    try {
      pi.sendUserMessage(next.text);
    } finally {
      isDispatching = false;
      updateStatus(ctx);
    }
  };

  pi.on("turn_end", async (_event, ctx: ExtensionContext) => {
    // Schedule check for next turn
    ctx.setTimeout?.(() => {
      void dispatchNext(ctx);
    }, 150);
  });

  pi.on("session_stop", async (_event, ctx: ExtensionContext) => {
    ctx.setTimeout?.(() => {
      void dispatchNext(ctx);
    }, 150);
  });

  const showQueueCard = (ctx: ExtensionContext) => {
    if (queue.length === 0) {
      ctx.ui.notify("Queue is empty. Use /after <task> to queue tasks.", "info");
      return;
    }

    const items = queue.map((t, idx) => `${idx + 1}. [ID: ${t.id}] ${t.text}`).join("\n");
    const card = [
      "### 📋 Queued Tasks",
      "",
      items,
      "",
      `*Total tasks waiting*: ${queue.length}`,
      "Commands: `/after <task>`, `/before <task>`, `/after clear`, `/after run`"
    ].join("\n");

    pi.sendMessage(
      {
        customType: "after-queue-card",
        content: card,
        display: true,
        attribution: "agent"
      },
      { triggerTurn: false }
    );
  };

  pi.registerCommand("after", {
    description: "Queue a task to run after the active task finishes (/after <prompt>)",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const trimmed = args.trim();

      if (!trimmed) {
        showQueueCard(ctx);
        return;
      }

      if (trimmed === "clear") {
        queue.length = 0;
        updateStatus(ctx);
        ctx.ui.notify("After queue cleared.", "info");
        return;
      }

      if (trimmed === "run") {
        if (queue.length === 0) {
          ctx.ui.notify("Queue is empty.", "info");
          return;
        }
        await dispatchNext(ctx);
        return;
      }

      const task: QueuedTask = {
        id: nextId++,
        text: trimmed,
        createdAt: Date.now()
      };
      queue.push(task);
      updateStatus(ctx);
      ctx.ui.notify(`Queued task #${task.id} (${queue.length} in queue)`, "info");

      if (ctx.isIdle?.()) {
        await dispatchNext(ctx);
      }
    }
  });

  pi.registerCommand("before", {
    description: "Prepend a task to the front of the queue (/before <prompt>)",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const trimmed = args.trim();
      if (!trimmed) {
        ctx.ui.notify("Specify a task to prepend: /before <prompt>", "warning");
        return;
      }

      const task: QueuedTask = {
        id: nextId++,
        text: trimmed,
        createdAt: Date.now()
      };
      queue.unshift(task);
      updateStatus(ctx);
      ctx.ui.notify(`Prepended task #${task.id} to front of queue (${queue.length} in queue)`, "info");

      if (ctx.isIdle?.()) {
        await dispatchNext(ctx);
      }
    }
  });
}
