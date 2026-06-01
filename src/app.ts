import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const startTime = Date.now();

import analyzeRoutes from "./routes/analyze";
import fetchRepoRoutes from "./routes/fetch-repo";
import uploadZipRoutes from "./routes/upload-zip";
import jobRoutes from "./routes/jobs";

const app = express();
const PORT = process.env.PORT; // Default to 8005 as per conversation context for microservices

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN, // Update with Gateway/Frontend URL in production
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "50mb" })); // Increase limit for file contents in JSON
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Routes
app.use("/api/analyze", analyzeRoutes);
app.use("/api/fetch-repo", fetchRepoRoutes);
app.use("/api/upload-zip", uploadZipRoutes);
app.use("/api/jobs", jobRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "code-scanner-ai" });
});

// Prometheus Metrics
app.get('/metrics', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = (Date.now() - startTime) / 1000;
  const cpuUsage = process.cpuUsage();
  
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.end(`# HELP process_uptime_seconds Uptime of the process in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${uptime}
# HELP process_memory_bytes Memory usage in bytes
# TYPE process_memory_bytes gauge
process_memory_bytes{type="rss"} ${memoryUsage.rss}
process_memory_bytes{type="heapTotal"} ${memoryUsage.heapTotal}
process_memory_bytes{type="heapUsed"} ${memoryUsage.heapUsed}
# HELP process_cpu_user_seconds CPU user time in seconds
# TYPE process_cpu_user_seconds counter
process_cpu_user_seconds ${cpuUsage.user / 1000000}
# HELP process_cpu_system_seconds CPU system time in seconds
# TYPE process_cpu_system_seconds counter
process_cpu_system_seconds ${cpuUsage.system / 1000000}
`);
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!", details: err.message });
});

export default app;
export { PORT };
