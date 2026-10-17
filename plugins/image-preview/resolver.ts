import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export interface ResolvedImage {
  path: string;
  originalPath: string;
  name: string;
}

function isWebP(filePath: string): boolean {
  try {
    if (filePath.toLowerCase().endsWith(".webp")) return true;
    const buf = Buffer.alloc(12);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    return buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
  } catch {
    return false;
  }
}

function ensureCompatibleImage(filePath: string): string {
  if (process.platform !== "win32") return filePath;

  // On Windows, GDI+ cannot natively decode WebP: convert to temporary PNG
  if (isWebP(filePath)) {
    const tempPng = path.join(os.tmpdir(), `omp_converted_${path.basename(filePath, path.extname(filePath))}.png`);
    if (fs.existsSync(tempPng)) {
      return tempPng;
    }
    const res = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", filePath, tempPng]);
    if (res.status === 0 && fs.existsSync(tempPng)) {
      return tempPng;
    }
  }

  // If file has no extension, detect format and copy with proper extension so GDI+ can load it
  if (!path.extname(filePath)) {
    try {
      const buf = Buffer.alloc(8);
      const fd = fs.openSync(filePath, "r");
      fs.readSync(fd, buf, 0, 8, 0);
      fs.closeSync(fd);

      let ext = ".png";
      if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) ext = ".jpg";
      else if (buf.toString("ascii", 0, 4) === "RIFF") ext = ".webp";
      else if (buf.toString("ascii", 0, 2) === "BM") ext = ".bmp";
      else if (buf.toString("ascii", 0, 3) === "GIF") ext = ".gif";

      if (ext === ".webp") {
        const tempPng = path.join(os.tmpdir(), `omp_converted_${path.basename(filePath)}.png`);
        const res = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", filePath, tempPng]);
        if (res.status === 0 && fs.existsSync(tempPng)) return tempPng;
      } else {
        const tempFile = path.join(os.tmpdir(), `omp_img_${path.basename(filePath)}${ext}`);
        if (!fs.existsSync(tempFile)) {
          fs.copyFileSync(filePath, tempFile);
        }
        return tempFile;
      }
    } catch {}
  }

  return filePath;
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

  // 2. Scan recent session JSONL files in ~/.omp/agent/sessions/
  if (!candidate) {
    const userHome = process.env.USERPROFILE ?? process.env.HOME ?? "";
    const sessionsDir = path.join(userHome, ".omp", "agent", "sessions");

    if (fs.existsSync(sessionsDir)) {
      const sessionFiles: { path: string; mtime: number }[] = [];
      for (const d of fs.readdirSync(sessionsDir)) {
        const fullDir = path.join(sessionsDir, d);
        try {
          if (!fs.statSync(fullDir).isDirectory()) continue;
          for (const f of fs.readdirSync(fullDir)) {
            if (f.endsWith(".jsonl")) {
              const fp = path.join(fullDir, f);
              const mt = fs.statSync(fp).mtimeMs;
              sessionFiles.push({ path: fp, mtime: mt });
            }
          }
        } catch {}
      }

      sessionFiles.sort((a, b) => b.mtime - a.mtime);

      for (const s of sessionFiles.slice(0, 5)) {
        try {
          const lines = fs.readFileSync(s.path, "utf-8").split("\n");
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

              // Check content text for "Source path: `...`"
              if ("content" in obj && typeof obj.content === "string") {
                const sourceMatch = obj.content.match(/Source path:\s*`([^`]+)`/i);
                if (sourceMatch && sourceMatch[1] && fs.existsSync(sourceMatch[1])) {
                  lastFound = sourceMatch[1];
                  if (targetIndex !== null && obj.content.includes(`[Image #${targetIndex}]`)) {
                    indexFound = sourceMatch[1];
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

          if (indexFound || lastFound) {
            candidate = indexFound ?? lastFound;
            break;
          }
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

  const compatiblePath = ensureCompatibleImage(candidate);
  return {
    path: compatiblePath,
    originalPath: candidate,
    name: path.basename(candidate)
  };
}
