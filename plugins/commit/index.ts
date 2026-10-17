import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

export default function commitPlugin(pi: ExtensionAPI) {
  pi.setLabel("Conventional Commit");

  pi.registerCommand("commit", {
    description: "Semantic Conventional Commits: choose push, commit-only, or new branch",
    handler: async (_args, ctx) => {
      const gitStatus = await pi.exec("git status --short", { cwd: ctx.cwd });
      if (!gitStatus.stdout || !gitStatus.stdout.trim()) {
        ctx.ui.notify("Working tree clean. No changes to commit.", "info");
        return;
      }

      let choice: string = "Commit + push (Recommended)";
      if (ctx.hasUI && ctx.ui.select) {
        try {
          const selected = await ctx.ui.select("What would you like to do with these changes?", [
            "Commit + push (Recommended)",
            "Commit only",
            "Commit on a new branch"
          ]);
          if (selected) choice = selected;
        } catch {
          choice = "Commit + push (Recommended)";
        }
      }

      const prompt = [
        `Execute a semantic conventional commit flow.`,
        `Selected strategy: **${choice}**.`,
        `- Inspect \`git status --short\` and \`git diff HEAD\`.`,
        choice.includes("new branch")
          ? `- Create an appropriate branch first with \`git switch -c <type/name>\` before staging.`
          : `- Stay on the current branch.`,
        `- Group changes into atomic logical commits.`,
        `- Stage files selectively with \`git add\` (never stage secrets or .env*).`,
        `- Commit each group with standard Conventional Commits (\`feat:\`, \`fix:\`, \`refactor:\`, \`test:\`, \`chore:\`, etc.) under 72 chars.`,
        choice.includes("push")
          ? `- Push the commits to the remote tracking branch (\`git push -u origin HEAD\`).`
          : `- Do NOT push to remote; commit locally only.`,
        `- Summarize all commits created and their status.`
      ].join("\n");

      pi.sendUserMessage(prompt, { deliverAs: "steer" });
    }
  });
}
