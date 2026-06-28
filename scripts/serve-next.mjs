import { createServer } from "node:http";
import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import next from "next";

const workspace = process.cwd();
const hostname = "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);
const logPath = join(workspace, "server.combined.log");

writeFileSync(logPath, "", "utf8");

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  appendFileSync(logPath, `${line}\n`, "utf8");
  console.log(line);
}

const app = next({ dev: false, dir: workspace, hostname, port });
const handle = app.getRequestHandler();

try {
  await app.prepare();
  const server = createServer((request, response) => {
    handle(request, response);
  });

  server.listen(port, hostname, () => {
    log(`Promptoteca GIANT ready at http://${hostname}:${port}`);
  });

  process.on("SIGTERM", () => {
    log("SIGTERM received; closing server.");
    server.close(() => process.exit(0));
  });

  setInterval(() => {
    log("heartbeat");
  }, 60_000).unref();
} catch (error) {
  log(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
