# COLIN — Technology Stack & Package Manifest Specifications

**Document ID:** COLIN-EVID-002  
**Target:** Academic B.Tech Capstone Project Documentation  
**Repository Branch:** `colin-prototype-completion`  
**Package Manifest Source:** [package.json](file:///C:/Users/clsid/COLIN/package.json), [pnpm-lock.yaml](file:///C:/Users/clsid/COLIN/pnpm-lock.yaml)  

---

## 1. Stack Summary Table

| Architectural Tier | Primary Technology | Exact Manifest Version | Justification / Role in COLIN |
|---|---|---|---|
| **Frontend Framework** | React | `^18.3.1` | Concurrent rendering, declarative UI components, context providers |
| **Client Routing** | React Router DOM | `^6.28.0` | Client-side routing, protected route guards, deep-linking |
| **Styling & UI Design** | Tailwind CSS | `^3.4.15` | Utility-first CSS engine, responsive layouts, consistent design tokens |
| **Iconography & Motion** | Lucide React / Framer Motion | `^0.460.0` / `^11.11.17` | Accessible SVG iconography, modal transitions, smooth drawer animations |
| **Backend Runtime** | Node.js | `v20.18.0+` (LTS) | Asynchronous non-blocking runtime, native crypto primitives |
| **HTTP Web Framework** | Express | `^5.3.0` | Production HTTP middleware pipeline, versioned REST routing (`/api/v1`) |
| **Database Engine** | PostgreSQL | `18.4` (Port 5433) | ACID relational persistence, strict CHECK constraints, PL/pgSQL triggers |
| **Object-Relational Mapping** | Prisma ORM | `5.22.0` | Type-safe query generation, schema migrations, transactional batching |
| **Caching & Rate Limiting** | Redis | `7.2` (via `ioredis ^6.0.0`) | Sliding-window IP rate limiting, distributed session state |
| **Image Processing Engine** | Sharp | `^0.35.5` | High-performance C-libvips binary processing, WebP encoding, EXIF stripping |
| **Input Validation** | Zod | `^4.6.7` | Compile-time TypeScript inference and runtime HTTP schema parsing |
| **Authentication & Tokens** | JSON Web Tokens / Bcrypt | `^9.0.3` / `^3.0.3` | Cryptographic JWT signing (HS256), salted password hashing |
| **Unit & Integration Testing** | Vitest | `^2.1.5` | Fast Vite-native unit/integration runner, mock lifecycle, coverage |
| **Browser E2E Testing** | Playwright Test | `^1.65.0` | Headless Chromium cross-portal automated user journey verification |
| **Build & Compilation** | Vite / TypeScript | `^5.4.11` / `^5.6.3` | High-speed ESM development server, strict static type checking |

---

## 2. Frontend Technologies & Component Architecture

### 2.1 Core Framework & State Management
- **React (v18.3.1):** Single-page application architecture using functional components, standard hooks (`useState`, `useEffect`, `useCallback`, `useMemo`), and React Contexts for global state:
  - [AuthContext.tsx](file:///C:/Users/clsid/COLIN/src/context/AuthContext.tsx): Manages student and owner authentication state, JWT storage in local memory/cookies, and session validation.
  - [AdminAuthContext.tsx](file:///C:/Users/clsid/COLIN/src/context/AdminAuthContext.tsx): Strict administrative isolation context managing the Control Centre credentials.
  - [PropertyContext.tsx](file:///C:/Users/clsid/COLIN/src/context/PropertyContext.tsx): Coordinates property discovery filters, search queries, and listing details.
  - [StudentContext.tsx](file:///C:/Users/clsid/COLIN/src/context/StudentContext.tsx): Coordinates active student booking requests and visit history.
- **React Router DOM (v6.28.0):** Provides declarative client-side route hierarchies with dedicated boundary guards (`ProtectedRoute`, `AdminProtectedRoute`) redirecting unauthenticated or unauthorized users.

### 2.2 Styling, Design Tokens & Animation
- **Tailwind CSS (v3.4.15):** Custom theme defined in [tailwind.config.js](file:///C:/Users/clsid/COLIN/tailwind.config.js) specifying primary brand colors (`#00A896` Persian Green, `#0F2942` Deep Navy, `#F4A261` Sandy Accent), custom typography, and responsive breakpoints.
- **PostCSS (v8.4.49) & Autoprefixer (v10.4.20):** Cross-browser CSS prefixing and optimization.
- **Framer Motion (v11.11.17):** Micro-interactions on interactive cards, drawer sliding transitions, and confirmation dialogs.
- **Lucide React (v0.460.0):** Tree-shakable iconography for platform amenities, safety indicators, and status badges.

---

## 3. Backend Technologies & Middleware Pipeline

### 3.1 HTTP Server & Pipeline (`Express v5.3.0`)
Express 5.3 provides native promise error catching and robust routing. The request pipeline configured in [src/server/app.ts](file:///C:/Users/clsid/COLIN/src/server/app.ts) applies the following middleware order:
1. `requestIdMiddleware`: Injects a unique UUIDv4 correlation ID onto `req.id` and response headers (`X-Request-ID`).
2. `securityHeadersMiddleware`: Applies HTTP security headers (Content Security Policy, X-Content-Type-Options, X-Frame-Options).
3. `createCorsMiddleware`: Whitelists permitted client origins (`http://localhost:5173`, `http://localhost:3000`).
4. `express.json` & `express.urlencoded`: Configured with an upper memory ceiling of 10 MB.
5. `cookieParser`: Extracts HTTP-only session cookies (`accessToken`, `refreshToken`).
6. `requestLoggerMiddleware`: Redacted structured logging emitting request method, URL, status code, and latency in milliseconds.
7. `authContextMiddleware`: Decodes JWT tokens or session cookies and attaches the validated principal to `req.context`.
8. `csrfProtectionMiddleware`: Defense-in-depth CSRF token verification for state-mutating requests.

### 3.2 Relational Persistence: PostgreSQL 18 & Prisma ORM 5.22.0
- **PostgreSQL 18.4:** Running locally on port 5433 (`.pgdata_disposable`). Utilizes native `UUID` primary keys, `TIMESTAMPTZ` for UTC timestamps, `NUMERIC(12, 2)` for currency calculations, and PL/pgSQL database triggers.
- **Prisma Client (v5.22.0):** Dual-singleton client architecture configured in [src/server/database/prisma.ts](file:///C:/Users/clsid/COLIN/src/server/database/prisma.ts):
  - `getAppPrismaClient()`: Bound to database role `colin_app_runtime` (customer operations).
  - `getAdminPrismaClient()`: Bound to database role `colin_admin_runtime` (administrative operations and audit inspections).

### 3.3 Memory Store & Distributed Primitives (`Redis 7.2` via `ioredis v6.0.0`)
- **Redis Connection:** Managed via [src/server/redis/redis.client.ts](file:///C:/Users/clsid/COLIN/src/server/redis/redis.client.ts) connecting to `localhost:6379`.
- **Sliding-Window Rate Limiter:** Implemented via an atomic Lua script in [rateLimiter.service.ts](file:///C:/Users/clsid/COLIN/src/server/redis/rateLimiter.service.ts) calculating exact per-minute and per-hour request quotas per IP address or user ID.

### 3.4 Media Processing & Validation (`Sharp v0.35.5`)
- Configured in [src/server/storage/image.processor.ts](file:///C:/Users/clsid/COLIN/src/server/storage/image.processor.ts).
- Validates file header magic bytes (JPEG `ffd8ff`, PNG `89504e47`, WebP `52494646...57454250`).
- Rejects scripts disguised as images (`<svg`, `<?xml`, `<!doctype`, `<script`).
- Strips EXIF metadata to protect student and owner privacy.
- Downsamples images to maximum 4096×4096 px and generates 400×300 px WebP thumbnails.

---

## 4. Authentication, Cryptography & Validation

- **JSON Web Tokens (`jsonwebtoken v9.0.3`):** Issues short-lived access tokens (15-minute validity) and refresh tokens (7-day validity) signed using HMAC-SHA256 with distinct secret keys (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`).
- **Password Hashing (`bcryptjs v3.0.3`):** Passwords hashed with 12 salt rounds before persistence.
- **Runtime Validation (`Zod v4.6.7`):** Strict request schema validation in [src/server/api/v1/schemas/](file:///C:/Users/clsid/COLIN/src/server/api/v1/schemas/). Malformed payloads fail fast with structured 400 Bad Request responses.

---

## 5. Development, Build & Quality Assurance Tooling

- **Vite (v5.4.11):** High-speed bundler utilizing Rollup under the hood. Configured in [vite.config.ts](file:///C:/Users/clsid/COLIN/vite.config.ts) with React plugin and backend reverse proxy.
- **TypeScript (v5.6.3):** Compiler enforcing `"strict": true`, `"noImplicitAny": true`, and `"strictNullChecks": true` across all frontend and backend source files.
- **Vitest (v2.1.5):** Unit and integration testing harness running 58 test files.
- **Playwright Test (v1.65.0):** Browser E2E suite automating real user flows in Chromium with automatic failure screenshots and trace recording.
- **TSX (v4.23.15):** TypeScript execution engine for backend services and background daemons.
