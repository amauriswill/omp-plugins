import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export interface ResolvedImage {
  path: string;
  originalPath: string;
  name: string;
}

export function resolveImageTarget(
  tokenOrPath?: string,
  cwd?: string
): ResolvedImage | null {
  const clean = (tokenOrPath ?? "").trim();
  const numMatch = clean.match(/^\[?Image\s*#?(\d+)/i) ?? clean.match(/^#?(\d+)$/);
  const targetIndex = numMatch ? parseInt(numMatch[1] ?? "1", 10) : (clean ? null : 1);

  let candidate: string | null = null;

  // 1. Direct file path check
  if (clean) {
    const candidatePath = path.isAbsolute(clean) ? clean : path.resolve(cwd ?? process.cwd(), clean);
    if (fs.existsSync(candidatePath) && !fs.statSync(candidatePath).isDirectory()) {
      candidate = candidatePath;
    }
  }

  // 2. Scan newest session JSONL in ~/.omp/agent/sessions/
  if (!candidate) {
    const userHome = process.env.USERPROFILE ?? process.env.HOME ?? "";
    const sessionsDir = path.join(userHome, ".omp", "agent", "sessions");

    if (fs.existsSync(sessionsDir)) {
      let newestFile: string | null = null;
      let newestMtime = 0;

      for (const d of fs.readdirSync(sessionsDir)) {
        const fullDir = path.join(sessionsDir, d);
        try {
          if (!fs.statSync(fullDir).isDirectory()) continue;
          for (const f of fs.readdirSync(fullDir)) {
            if (f.endsWith(".jsonl")) {
              const fp = path.join(fullDir, f);
              const mt = fs.statSync(fp).mtimeMs;
              if (mt > newestMtime) {
                newestMtime = mt;
                newestFile = fp;
              }
            }
          }
        } catch {}
      }

      if (newestFile) {
        try {
          const lines = fs.readFileSync(newestFile, "utf-8").split("\n");
          let lastFound: string | null = null;
          let indexFound: string | null = null;

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const obj: unknown = JSON.parse(line);
              if (!obj || typeof obj !== "object") continue;

              // Check image-attachment custom_message
              if ("customType" in obj && obj.customType === "image-attachment" && "details" in obj) {
                const details = obj.details;
                if (details && typeof details === "object" && "path" in details && typeof details.path === "string") {
                  if (fs.existsSync(details.path)) {
                    if (targetIndex !== null && "index" in details && details.index === targetIndex) {
                      indexFound = details.path;
                    }
                    lastFound = details.path;
                  }
                }
              }

              // Check message content image blocks with blobs
              if ("message" in obj && obj.message && typeof obj.message === "object" && "content" in obj.message) {
                const content = obj.message.content;
                if (Array.isArray(content)) {
                  for (const block of content) {
                    if (block && typeof block === "object" && "type" in block && block.type === "image") {
                      if ("data" in block && typeof block.data === "string" && block.data.startsWith("blob:sha256:")) {
                        const hash = block.data.slice("blob:sha256:".length);
                        const blobDir = path.join(userHome, ".omp", "agent", "blobs");
                        for (const ext of [".png", ".jpg", ".webp", ""]) {
                          const bp = path.join(blobDir, hash + ext);
                          if (fs.existsSync(bp)) {
                            lastFound = bp;
                            break;
                          }
                        }
                      }
                    }
                  }
                }
              }
            } catch {}
          }

          candidate = indexFound ?? lastFound;
        } catch {}
      }
    }
  }

  // 3. Fallback to newest blob in ~/.omp/agent/blobs/
  if (!candidate) {
    const userHome = process.env.USERPROFILE ?? process.env.HOME ?? "";
    const blobDir = path.join(userHome, ".omp", "agent", "blobs");
    if (fs.existsSync(blobDir)) {
      let newestBlob: string | null = null;
      let newestBlobMtime = 0;
      for (const f of fs.readdirSync(blobDir)) {
        const fp = path.join(blobDir, f);
        try {
          const mt = fs.statSync(fp).mtimeMs;
          if (mt > newestBlobMtime) {
            newestBlobMtime = mt;
            newestBlob = fp;
          }
        } catch {}
      }
      if (newestBlob) candidate = newestBlob;
    }
  }

  if (!candidate) return null;

  // On Windows, if image is .webp, convert to temporary PNG for System.Drawing GDI+ compatibility
  if (candidate.toLowerCase().endsWith(".webp") && process.platform === "win32") {
    const tempPng = path.join(os.tmpdir(), `omp_converted_${path.basename(candidate, ".webp")}.png`);
    if (!fs.existsSync(tempPng)) {
      const res = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", candidate, tempPng]);
      if (res.status === 0 && fs.existsSync(tempPng)) {
        return { path: tempPng, originalPath: candidate, name: path.basename(candidate) };
      }
    } else {
      return { path: tempPng, originalPath: candidate, name: path.basename(candidate) };
    }
  }

  return { path: candidate, originalPath: candidate, name: path.basename(candidate) };
}
