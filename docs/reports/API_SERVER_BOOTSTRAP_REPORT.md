# COLIN — API SERVER BOOTSTRAP REPORT

**Phase:** Phase 4A.2.2.3 — Backend Core Service & API Architecture  
**Component Modules:** `src/server/app.ts`, `src/server/server.ts`, `src/server/config/serverConfig.ts`  
**Runtime:** Node.js 20+ / Express 5.3.0  
**Status:** FULL PASS  

---

## 1. Executive Summary

Phase 4A.2.2.3 establishes the core application factory and HTTP server bootstrap infrastructure for the COLIN marketplace backend. To maintain high maintainability and testability, the architecture cleanly decouples application configuration (`createApp()`) from network port binding (`server.listen()`). This ensures that integration test suites can execute high-speed, deterministic HTTP assertions in-memory via Supertest without binding physical TCP sockets or encountering `EADDRINUSE` port conflicts.

---

## 2. Server Configuration Architecture

The server configuration subsystem in `src/server/config/serverConfig.ts` provides centralized, environment-aware parameters:

```typescript
export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: 'development' | 'test' | 'production';
  apiPrefix: string;
  corsAllowedOrigins: string[];
  bodySizeLimit: string;
}
```

### 2.1 Key Configuration Parameters
- **`port`**: Binds to `process.env.PORT` (defaults to `3001` in development/production).
- **`host`**: Binds to `process.env.HOST` (defaults to `0.0.0.0` for container compatibility).
- **`apiPrefix`**: Enforces versioned routing prefix `/api/v1`.
- **`corsAllowedOrigins`**: Comma-separated whitelist supporting local frontend development origins (`http://localhost:5173`, `http://localhost:3000`) and production domains.
- **`bodySizeLimit`**: Strict ceiling of `1mb` to defend against denial-of-service memory exhaustion attacks.

---

## 3. Decoupled Application Factory (`createApp`)

Located in `src/server/app.ts`, `createApp()` constructs and configures the Express application pipeline in strict order:

```typescript
export function createApp(): Express {
  const app = express();
  const config = getServerConfig();

  // 1. Request correlation ID
  app.use(requestIdMiddleware);

  // 2. Production HTTP security headers
  app.use(securityHeadersMiddleware);

  // 3. Strict CORS origin policy
  app.use(createCorsMiddleware());

  // 4. Request payload parsers with bounded memory ceiling (1MB)
  app.use(express.json({ limit: config.bodySizeLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.bodySizeLimit }));

  // 5. Redacted request logging
  app.use(requestLoggerMiddleware);

  // 6. Security & authentication context extraction
  app.use(authContextMiddleware);

  // 7. Root-level observability probe aliases for container orchestration
  app.get('/health/live', healthController.getLive);
  app.get('/health/ready', healthController.getReady);

  // 8. Versioned API namespaces
  app.use(config.apiPrefix, v1Router);

  // 9. Standardized 404 Not Found catch-all handler
  app.use((req, res) => { ... });

  // 10. Centralized error handling pipeline
  app.use(errorHandlerMiddleware);

  return app;
}
```

### 3.1 Architectural Advantages
1. **Isolated Testing**: Integration tests instantiate `createApp()` and directly invoke routes via `supertest(app)` in under 5ms per test.
2. **Immutable Pipeline**: Middleware ordering is statically defined and deterministic.
3. **Container Compatibility**: Root-level `/health/live` and `/health/ready` aliases provide native Kubernetes/Docker health check targets while keeping versioned business routes isolated under `/api/v1`.

---

## 4. Server Lifecycle & Graceful Teardown

Located in `src/server/server.ts`, `startServer()` implements an explicit boot and teardown sequence:

### 4.1 Startup Sequence
1. **Database Pre-Initialization**: Dispatches `initializeDatabaseConnections()` from `src/server/database/lifecycle.ts`. Validates that both `colin_app_runtime` and `colin_admin_runtime` successfully connect to PostgreSQL 18.4 within acceptable latency boundaries.
2. **Fail-Fast Error Trapping**: If the database is unreachable or credentials fail, the server aborts immediately with an informative error log (passwords redacted) and exits with status 1.
3. **HTTP Socket Binding**: Calls `server.listen(port, host)` only after database verification succeeds.

### 4.2 Graceful Shutdown Procedure
`setupGracefulShutdown(server)` hooks into OS signals (`SIGINT`, `SIGTERM`):
1. **Stop Incoming Connections**: Invokes `server.close()`, refusing new HTTP connections while permitting existing in-flight requests to complete.
2. **Database Pool Drain**: Invokes `shutdownDatabaseConnections()`, gracefully disconnecting all active PrismaClient singletons and releasing backend connections.
3. **Safety Timeout**: A fallback timer (10s) guarantees process termination if hanging sockets refuse to close.

---

## 5. Verification Status

| Verification Check | Target | Observed Result | Status |
| :--- | :--- | :--- | :--- |
| Decoupled Factory | `createApp()` returns Express instance | Verified | **PASS** |
| Pipeline Middleware Ordering | RequestId -> Security -> CORS -> Parsers -> Routes -> ErrorHandler | Verified | **PASS** |
| Database Initialization Order | Database initialized before server listens | Verified | **PASS** |
| Graceful Teardown Handlers | `SIGINT`/`SIGTERM` handlers cleanly configured | Verified without errors | **PASS** |
| Memory Limits | Payloads >1MB rejected with HTTP 413 | Verified via integration tests | **PASS** |
