import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware with enhanced error logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// Start server and register routes
(async () => {
  try {
    console.log('Starting server initialization...');
    const server = registerRoutes(app);

    // Global error handler with detailed logging
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      console.error('Error stack:', err.stack);
      const status = err instanceof Error ? 500 : 400;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Setup development or production mode
    if (app.get("env") === "development") {
      console.log('Setting up Vite development server...');
      await setupVite(app, server);
    } else {
      console.log('Setting up static file serving...');
      serveStatic(app);
    }

    // Start listening
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`World simulation server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    console.error('Error stack:', err instanceof Error ? err.stack : '');
    process.exit(1);
  }
})();