import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

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

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!", details: err.message });
});

export default app;
export { PORT };
