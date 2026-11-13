# Academic Project Report: Technology Stack & Dependency Inventory

## 1. Architectural Overview of Technology Stack

The COLIN platform is engineered as a unified TypeScript repository utilizing modern enterprise frameworks, strictly type-safe object-relational mappings, concurrent client rendering, and dual-layer test harnesses.

```mermaid
graph LR
    subgraph Frontend Tier
        React["React v18.3.1"]
        Router["React Router v6.28.0"]
        Vite["Vite v5.4.11"]
        Tailwind["Tailwind CSS v3.4.15"]
        Framer["Framer Motion v11.11.17"]
        Lucide["Lucide React v0.460.0"]
    end

    subgraph Backend Tier
        Express["Express v5.3.0"]
        TypeScript["TypeScript v5.6.3"]
        Prisma["Prisma ORM v5.22.0"]
        Zod["Zod v4.6.7"]
        Bcrypt["BcryptJS v3.0.3"]
        JWT["JSONWebToken v9.0.3"]
        Sharp["Sharp v0.35.5"]
    end

    subgraph Persistence & Infrastructure
        Postgres["PostgreSQL v18 / pg v8.13.1"]
        Redis["Redis v7 / ioredis v6.0.0"]
        S3["AWS S3 SDK v3.1163.0"]
    end

    subgraph Verification & QA Tier
        Vitest["Vitest v2.1.9"]
        Playwright["Playwright v1.65.0"]
        TestingLib["React Testing Library v16.0.1"]
        Supertest["Supertest v7.3.1"]
    end

    Frontend Tier --> Backend Tier
    Backend Tier --> Persistence & Infrastructure
    Verification & QA Tier -.-> Frontend Tier
    Verification & QA Tier -.-> Backend Tier
```

---

## 2. Complete Dependency Inventory (`package.json`)

### 2.1 Production Dependencies (`dependencies`)

| Package Name | Exact Version | Architectural Classification | Functional Purpose in System |
|---|---|---|---|
| `react` | `^18.3.1` | Frontend Framework | Declarative UI rendering, hook state management, concurrent root rendering |
| `react-dom` | `^18.3.1` | DOM Renderer | Browser DOM reconciliation and event delegation |
| `react-router-dom` | `^6.28.0` | Routing Engine | Client-side routing, nested layouts, parameter unwrapping, route guards |
| `express` | `^5.3.0` | HTTP Application Server | Next-gen REST API gateway with native Promise rejection capture in middleware |
| `@prisma/client` | `5.22.0` | Database ORM | Auto-generated type-safe database queries, schema migrations, and transactions |
| `pg` | `8.13.1` | PostgreSQL Driver | Direct connection pool management and custom constraint verification |
| `ioredis` | `^6.0.0` | In-Memory Data Store | Sliding-window rate limiting, token revocation blacklists, and session caching |
| `jsonwebtoken` | `^9.0.3` | Cryptographic Tokens | Issuing and verifying HMAC-SHA256 authenticated session tokens |
| `bcryptjs` | `^3.0.3` | Cryptographic Hashing | One-way hashing of user passwords with adaptive salt round generation |
| `cookie-parser` | `^1.4.7` | HTTP Middleware | Parsing HTTP-only session cookies and CSRF verification tokens |
| `cors` | `^2.8.6` | HTTP Middleware | Cross-Origin Resource Sharing whitelist governance |
| `zod` | `^4.6.7` | Schema Validation | Runtime request body, query parameter, and payload contract validation |
| `sharp` | `^0.35.5` | Image Pipeline | High-performance image transformation, resizing, and WebP transcoding |
| `multer` | `^2.5.0` | Multipart Parser | Streaming multipart file uploads with memory ceiling enforcement |
| `@aws-sdk/client-s3` | `^3.1163.0` | Cloud Storage SDK | Amazon S3 / Cloudflare R2 object storage client for verified property images |
| `@aws-sdk/s3-request-presigner` | `^3.1163.0` | Cloud Storage SDK | Generation of secure, time-limited presigned upload URLs |
| `clsx` | `^2.1.1` | Utility | Conditional CSS class name concatenation |
| `tailwind-merge` | `^2.5.4` | Utility | Conflict-free Tailwind CSS utility class merging |
| `framer-motion` | `^11.11.17` | Animation Library | Micro-interactions, modal transitions, and dashboard widget animations |
| `lucide-react` | `^0.460.0` | Iconography | Accessible SVG icons across all four portal interfaces |

### 2.2 Development & Quality Dependencies (`devDependencies`)

| Package Name | Exact Version | Architectural Classification | Functional Purpose in System |
|---|---|---|---|
| `typescript` | `^5.6.3` | Compiler / Type Checker | Static typing across full stack enforcing strict null checks and no-any rules |
| `vite` | `^5.4.11` | Build Tool & Bundler | Development HMR server and optimized Rollup production asset bundler |
| `@vitejs/plugin-react` | `^4.3.3` | Bundler Plugin | Fast Refresh Babel/JSX transformation support |
| `tailwindcss` | `^3.4.15` | CSS Framework | Utility-first design system implementing custom COLIN brand color palette |
| `postcss` | `^8.4.49` | CSS Preprocessor | CSS tool pipeline for vendor prefixing and Tailwind optimization |
| `autoprefixer` | `^10.4.20` | CSS Preprocessor | Automatic browser vendor prefix injection |
| `vitest` | `^2.1.5` | Test Runner | High-speed unit and integration testing engine with native TypeScript parsing |
| `@playwright/test` | `^1.65.0` | Browser E2E Runner | Automated headless Chromium user journey testing against real DOM and network |
| `@testing-library/react` | `^16.0.1` | Component Test Tool | React DOM interaction testing following accessibility-first selectors |
| `@testing-library/jest-dom` | `^6.6.3` | Assertion Library | Custom DOM matchers (`toBeVisible`, `toHaveTextContent`, `toBeInTheDocument`) |
| `supertest` | `^7.3.1` | HTTP Test Client | Programmatic HTTP request dispatching against Express application instances |
| `jsdom` | `^25.0.1` | Headless DOM | In-memory DOM emulation for fast component test execution in Vitest |
| `prisma` | `5.22.0` | Database CLI | Schema management, SQL migrations, and client code generation |
| `tsx` | `^4.23.15` | TypeScript Runtime | High-performance on-the-fly TypeScript execution for backend servers and workers |

---

## 3. Key Architectural Decisions & Rationale

1. **Express 5 over Express 4:** Express 5 handles asynchronous Promise rejections in route handlers natively without requiring `express-async-errors` wrapper patches, eliminating unhandled promise crashes.
2. **Prisma ORM over Raw SQL / TypeORM:** Prisma provides compile-time type safety: every query result is strictly typed based on `schema.prisma`. It also enables atomic transactions (`prisma.$transaction`) essential for the double-entry financial ledger.
3. **Playwright alongside Vitest:** Vitest executes hundreds of unit tests rapidly in JSDOM, while Playwright provides genuine multi-portal browser execution in headless Chromium to test real CSS layouts, modals, and route transitions.
4. **Tailwind CSS with Scoped CSS Modules:** Global utilities handle structural design, while isolated CSS Modules (`ColinLoader.module.css`) encapsulate full-viewport overlay animations without risking style leakage.
