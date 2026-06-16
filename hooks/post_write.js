import { query } from "@anthropic-ai/claude-agent-sdk";
import fs from "fs";
import path from "path";

const LOG_FILE = path.resolve(process.cwd(), "hooks/post_write.log");

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  process.stderr.write(msg + "\n");
}

async function main() {
  const input = await new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });

  const hookData = JSON.parse(input);
  const toolInput = hookData.tool_input;

  const filePath = toolInput.file_path || toolInput.path;
  if (!filePath) {
    log("[post_write] No file path found, skipping.");
    process.exit(0);
  }

  log(`[post_write] Running on: ${filePath}`);

  // Only run on source files, skip generated/prisma/lock files
  const normalizedPath = path.resolve(filePath);
  const ignored = ["/node_modules/", "/generated/", ".prisma", ".lock", "prisma/dev.db"];
  if (ignored.some((pattern) => normalizedPath.includes(pattern))) {
    log(`[post_write] Skipping ignored path: ${filePath}`);
    process.exit(0);
  }

  let newContent = toolInput.content || toolInput.contents;
  if (!newContent) {
    // Edit tool doesn't carry content — read the file after the edit was applied
    log(`[post_write] Edit tool detected, reading file from disk.`);
    try {
      newContent = fs.readFileSync(path.resolve(filePath), "utf8");
    } catch {
      log(`[post_write] Could not read file, skipping.`);
      process.exit(0);
    }
  }

  log(`[post_write] Sending to Claude for review...`);

  let claudeMd = "";
  try {
    claudeMd = fs.readFileSync(path.resolve(process.cwd(), "CLAUDE.md"), "utf8");
  } catch {
    log(`[post_write] CLAUDE.md not found, skipping review.`);
    process.exit(0);
  }

  const prompt = `You are a code reviewer enforcing the project's coding conventions after a file was written.

The project conventions are defined in CLAUDE.md:
<claude_md>
${claudeMd}
</claude_md>

A file was just written at: ${filePath}

Written content:
<file_content>
${newContent}
</file_content>

Review the written content strictly against the CLAUDE.md conventions. Focus on:
1. Comments — are there unnecessary comments explaining WHAT the code does instead of WHY?
2. Over-engineering — are there abstractions, error handlers, or features beyond what's needed?
3. Security — are there obvious vulnerabilities (SQL injection, XSS, unvalidated input at boundaries)?
4. Backwards-compatibility hacks — unused variables, re-exports of removed code, etc.

If the file follows the conventions, respond with exactly: "File looks good."
If there are violations, list each one concisely with the line or pattern involved.`;

  const messages = [];
  for await (const message of query({
    prompt,
    abortController: new AbortController(),
  })) {
    messages.push(message);
  }

  const resultMessage = messages.find((m) => m.type === "result");
  if (!resultMessage || resultMessage.subtype !== "success") {
    log(`[post_write] Review did not return a usable result, skipping.`);
    process.exit(0);
  }

  if (resultMessage.result.includes("File looks good")) {
    log(`[post_write] ✓ ${filePath} passed convention check.`);
    process.exit(0);
  }

  log(`[post_write] ✗ Violations found in ${filePath}, blocking.`);
  log(`CLAUDE.md convention violations detected:\n\n${resultMessage.result}`);
  process.exit(2);
}

main().catch((err) => {
  log(`[post_write] Hook error: ${err.message}`);
  process.exit(1);
});
