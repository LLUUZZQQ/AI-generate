import "dotenv/config";
import http from "http";
import "./image-worker";
import "./video-worker";
import "./swap-worker";
import "./suggestion-worker";
import "./bg-replace-worker";

// Auto-shutdown after 5 minutes of inactivity
let idleTimer: ReturnType<typeof setTimeout> | null = null;
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    console.log("[Worker] Idle timeout, shutting down...");
    process.exit(0);
  }, IDLE_TIMEOUT);
}

// Simple HTTP server for Railway sleep/wake
const PORT = parseInt(process.env.PORT || "3000");
const server = http.createServer((_req, res) => {
  resetIdleTimer();
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
});

server.listen(PORT, () => {
  console.log(`[Worker] Listening on port ${PORT}, idle timeout: ${IDLE_TIMEOUT / 60000}min`);
  resetIdleTimer();
});
