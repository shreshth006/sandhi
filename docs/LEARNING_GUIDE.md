# Sandhi — Step-by-Step Learning & Build Guide

> **Goal:** You finish this guide knowing every piece of Sandhi well enough to build it, debug it, optimise it, and out-think any AI generating code for it.
>
> **Approach:** Learn → Build → Test → Break → Fix. Every step ends with working code you understand.
>
> **Time estimate:** ~8–12 weeks if you spend 2–3 hours/day.

---

## Table of Contents

0. [Before You Start — Mindset & Setup](#phase-0-before-you-start)
1. [Learn the Foundations](#phase-1-learn-the-foundations-weeks-12)
2. [Set Up the Monorepo & Dev Environment](#phase-2-set-up-the-monorepo--dev-environment-week-3)
3. [Build the Database Layer](#phase-3-build-the-database-layer-week-4)
4. [Build the Core API](#phase-4-build-the-core-api-weeks-56)
5. [Build the Workflow Execution Engine](#phase-5-build-the-workflow-execution-engine-week-7)
6. [Build the Frontend Shell](#phase-6-build-the-frontend-shell-week-8)
7. [Build the Workflow Canvas](#phase-7-build-the-workflow-canvas-weeks-910)
8. [Connect Frontend ↔ Backend (Real-Time)](#phase-8-connect-frontend--backend-weeks-1011)
9. [Build the RAG Pipeline](#phase-9-build-the-rag-pipeline-week-12)
10. [Add Integrations](#phase-10-add-integrations-week-13)
11. [Deployment, Scheduling & Advanced Features](#phase-11-deployment-scheduling--advanced-week-14)
12. [Testing, Debugging & Optimisation](#phase-12-testing-debugging--optimisation-ongoing)
13. [Thinking Like an Engineer — Edge Cases & Failure Modes](#phase-13-thinking-like-an-engineer)

---

## Phase 0: Before You Start

### What You Need Installed

| Tool | Why | Install |
|---|---|---|
| **Git** | Version control — track every change, revert mistakes | `sudo apt install git` |
| **Docker & Docker Compose** | Run Postgres, Redis, MinIO without installing them on your OS | [docs.docker.com/engine/install](https://docs.docker.com/engine/install/) |
| **Python 3.12+** | Backend language | `sudo apt install python3.12 python3.12-venv` or use [pyenv](https://github.com/pyenv/pyenv) |
| **Node.js 20+** | Frontend tooling | Use [nvm](https://github.com/nvm-sh/nvm): `nvm install 20` |
| **VS Code** | Your editor (you're already here!) | You have it |
| **uv** (recommended) | Fast Python package manager (replacement for pip) | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |

### Your Mindset

1. **Type everything by hand**. Don't copy-paste code until you've typed it once. Muscle memory builds understanding.
2. **Break things on purpose**. After every working step, try to break it — wrong input, missing env var, killed database. See what error you get. Learn to read stack traces.
3. **Read error messages fully**. The answer is almost always in the error. Python and TypeScript have excellent error messages.
4. **Use `git commit` after every working step**. Small, frequent commits. You can always go back.
5. **Ask "what would happen if…"** — this is how you find edge cases before users do.

### Recommended VS Code Extensions

| Extension | Why |
|---|---|
| Python (Microsoft) | Python IntelliSense, linting, debugging |
| Pylance | Fast, smart Python autocomplete |
| ESLint | JavaScript/TypeScript linting |
| Prettier | Auto-format frontend code |
| Tailwind CSS IntelliSense | Autocomplete for Tailwind classes |
| Docker | Manage containers from VS Code |
| Thunder Client or REST Client | Test API endpoints without leaving VS Code |
| GitLens | See who changed what and when |
| Error Lens | See errors inline in your code |

---

## Phase 1: Learn the Foundations (Weeks 1–2)

> **Don't skip this.** If the foundation is shaky, everything built on top will be fragile. You don't have to master everything — just get comfortable enough to read code and documentation.

### 1.1 Python Fundamentals (if you're new)

**What to learn:**
- Variables, data types (str, int, float, bool, list, dict, tuple, set)
- Functions, `*args`, `**kwargs`
- Classes, inheritance, `__init__`, `self`
- f-strings: `f"Hello {name}"`
- List/dict comprehensions: `[x*2 for x in items if x > 0]`
- Type hints: `def greet(name: str) -> str:`
- `async`/`await` (crucial for FastAPI)
- Exception handling: `try/except/finally`
- Context managers: `with open(...) as f  :`
- Modules and imports

**Resources:**
- [Python Official Tutorial](https://docs.python.org/3/tutorial/) — the gold standard
- [Real Python](https://realpython.com/) — practical tutorials

**Exercise:** Write a Python script that:
1. Reads a JSON file
2. Filters items by a condition
3. Writes the result to a new JSON file
4. Has proper type hints on every function
5. Handles `FileNotFoundError` gracefully

### 1.2 Async Python (Critical for FastAPI)

**What to learn:**
- What "blocking" vs "non-blocking" means
- `async def` vs `def`
- `await` — what it actually does (gives up control while waiting)
- `asyncio.gather()` — run multiple async things in parallel
- Why async matters for a web server (1 thread can handle 1000 requests)

**The mental model:**
```
Sync (blocking):
  Request 1: [---wait for DB---][process][respond]
  Request 2:                                      [---wait for DB---][process][respond]
  → 2 requests take 2x time

Async (non-blocking):
  Request 1: [---wait for DB---]                   [process][respond]
  Request 2:    [---wait for DB---]                 [process][respond]
  → While Request 1 waits for DB, Request 2 starts. Both finish ~1x time.
```

**Exercise:** Write an async script that fetches 5 URLs concurrently using `httpx` (not `requests` — it's not async). Time it. Then do the same synchronously. Compare the times.

```python
import asyncio
import httpx
import time

async def fetch(client, url):
    resp = await client.get(url)
    return len(resp.text)

async def main():
    urls = ["https://httpbin.org/delay/1"] * 5
    async with httpx.AsyncClient() as client:
        start = time.time()
        results = await asyncio.gather(*[fetch(client, url) for url in urls])
        print(f"Async: {time.time() - start:.2f}s")  # ~1s, not 5s!

asyncio.run(main())
```

### 1.3 FastAPI Basics

**What to learn:**
- What a REST API is (URLs + HTTP methods = actions on resources)
- How FastAPI routes work (`@app.get("/items/{id}")`)
- Request body parsing with Pydantic models
- Response models
- Dependency injection (`Depends()`) — this is FastAPI's superpower
- Middleware
- How FastAPI auto-generates OpenAPI docs at `/docs`

**Resources:**
- [FastAPI Official Tutorial](https://fastapi.tiangolo.com/tutorial/) — one of the best docs in all of software

**Exercise:** Build a tiny REST API with FastAPI:
```
POST /todos/        → Create a todo (title, done=false)
GET  /todos/        → List all todos
GET  /todos/{id}    → Get one todo
PATCH /todos/{id}   → Update a todo
DELETE /todos/{id}  → Delete a todo
```
Store them in a Python dict (no database yet). Use Pydantic models for request/response. Visit `http://localhost:8000/docs` to see the auto-generated Swagger UI.

### 1.4 SQL & PostgreSQL Basics

**What to learn:**
- Tables, rows, columns
- `CREATE TABLE`, `INSERT`, `SELECT`, `UPDATE`, `DELETE`
- `WHERE`, `JOIN`, `ORDER BY`, `LIMIT`
- Primary keys, foreign keys, indexes
- JSONB columns (Postgres superpower — store JSON in a relational DB)
- UUIDs vs auto-increment IDs

**Resources:**
- [SQLBolt](https://sqlbolt.com/) — interactive SQL tutorial
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)

**Exercise:** Using a Postgres container:
```bash
docker run --name learn-pg -e POSTGRES_PASSWORD=secret -p 5432:5432 -d postgres:16
docker exec -it learn-pg psql -U postgres
```

Create a `workflows` table with a JSONB `graph` column. Insert a workflow. Query it. Update just one field inside the JSONB.

### 1.5 SQLModel / SQLAlchemy ORM

**What to learn:**
- What an ORM does (maps Python classes ↔ database tables)
- SQLModel = SQLAlchemy + Pydantic in one class
- Defining models: `class User(SQLModel, table=True):`
- Creating, reading, updating, deleting via Python (not raw SQL)
- Async sessions (`AsyncSession`)
- Relationships between models

**Resources:**
- [SQLModel docs](https://sqlmodel.tiangolo.com/)

**Exercise:** Rewrite your todo API from 1.3 to use SQLModel + a real Postgres database instead of an in-memory dict. This is the exact pattern Sandhi uses.

### 1.6 TypeScript Fundamentals

**What to learn:**
- Types: `string`, `number`, `boolean`, arrays, objects
- Interfaces and type aliases
- Generics: `Array<T>`, `Promise<T>`
- Union types: `string | null`
- Optional properties: `name?: string`
- Enums
- Type narrowing (how TS gets smarter after `if` checks)

**Resources:**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

**Exercise:** Define TypeScript types for a `WorkflowNode` and `WorkflowEdge` as described in our DATA_MODELS.md. Then write a function `topologicalSort(nodes, edges)` that returns node IDs in execution order.

### 1.7 React Fundamentals

**What to learn:**
- Components (function components, not class components)
- JSX
- Props and children
- `useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`
- Conditional rendering
- Lists and keys
- Event handling
- Custom hooks

**Resources:**
- [React Official Docs (new)](https://react.dev/learn) — excellent, updated docs

**Exercise:** Build a simple Kanban board (3 columns: Todo, In Progress, Done). Cards can be dragged between columns. This teaches you state management and drag-and-drop — both crucial for the workflow canvas.

### 1.8 Docker Basics

**What to learn:**
- What containers are (isolated, lightweight, reproducible environments)
- `Dockerfile` — recipe for building an image
- `docker build`, `docker run`, `docker ps`, `docker logs`
- `docker-compose.yml` — define multiple services that work together
- Volumes (persist data), ports (expose services), networks (connect containers)

**Resources:**
- [Docker Getting Started](https://docs.docker.com/get-started/)

**Exercise:** Write a `docker-compose.yml` that runs:
1. PostgreSQL on port 5432
2. Redis on port 6379
3. A simple Python FastAPI app that connects to both

This is literally what Sandhi's dev environment looks like.

---

## Phase 2: Set Up the Monorepo & Dev Environment (Week 3)

> Now you start building Sandhi for real.

### 2.1 Understand What a Monorepo Is

A **monorepo** means the frontend and backend live in one git repository. Why?
- **Shared types**: Frontend TypeScript types can be generated from backend Python models
- **Atomic changes**: One PR can update both the API and the UI that calls it
- **Simpler CI**: One repo = one pipeline

We use **Turborepo** to manage the monorepo. It knows how to build/test/lint each package in the right order.

### 2.2 Step-by-Step: Create the Monorepo Root

```bash
cd ~/Desktop/Sandhi
git init

# Create root package.json — this makes it a Node.js workspace
# (needed for Turborepo and the frontend)
```

**Files to create (and understand each one):**

#### `package.json` (root)
```json
{
  "name": "sandhi",
  "private": true,
  "workspaces": ["frontend"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```
**What this does:** Declares "sandhi" as a workspace root. The `workspaces` array tells npm that `frontend/` has its own `package.json`. Turborepo uses this to orchestrate tasks.

#### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "persistent": true, "cache": false },
    "build": { "outputs": ["dist/**", ".next/**"] },
    "lint": {},
    "test": {}
  }
}
```
**What this does:** Tells Turborepo what tasks exist and how they relate. `persistent: true` means "this runs forever" (like a dev server). `cache: false` means don't cache dev runs.

#### `.gitignore`
```
node_modules/
__pycache__/
*.pyc
.env
.venv/
dist/
*.egg-info/
.turbo/
```

#### `.env.example`
```bash
# Database
DATABASE_URL=postgresql+asyncpg://sandhi:sandhi@localhost:5432/sandhi

# Redis
REDIS_URL=redis://localhost:6379/0

# MinIO (S3-compatible storage)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=sandhi

# Auth
JWT_SECRET=change-me-in-production-use-a-64-char-random-string
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Encryption (for secrets/credentials)
FERNET_KEY=generate-with-python-cryptography-fernet

# LLM (via litellm — supports all providers)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# App
APP_ENV=development
LOG_LEVEL=DEBUG
CORS_ORIGINS=http://localhost:5173
```
**Why every variable matters:**
- `DATABASE_URL`: Connection string for Postgres. The `asyncpg` part means we use the async driver.
- `REDIS_URL`: Redis connection. `/0` means database 0 (Redis has 16 logical databases).
- `JWT_SECRET`: Used to sign authentication tokens. If someone knows this, they can forge tokens. NEVER commit the real value.
- `FERNET_KEY`: Symmetric encryption key for user secrets (API keys, OAuth tokens stored in our DB).

### 2.3 Step-by-Step: Docker Compose for Dev

#### `docker-compose.yml`
```yaml
version: "3.9"

services:
  postgres:
    image: pgvector/pgvector:pg16       # Postgres 16 WITH pgvector pre-installed
    environment:
      POSTGRES_USER: sandhi
      POSTGRES_PASSWORD: sandhi
      POSTGRES_DB: sandhi
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data  # Persist data across restarts
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sandhi"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine                # Alpine = tiny image
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"                      # S3 API
      - "9001:9001"                      # Web console
    volumes:
      - miniodata:/data

volumes:
  pgdata:
  redisdata:
  miniodata:
```

**Understanding each service:**

| Service | What It Is | Why We Need It | Port |
|---|---|---|---|
| `postgres` | Relational database + vector search | Stores everything: users, workflows, runs, KB chunks + embeddings | 5432 |
| `redis` | In-memory data store | Task queue (run workflows), cache, real-time pub/sub | 6379 |
| `minio` | S3-compatible object storage | Store uploaded files (PDFs, images, audio) locally | 9000/9001 |

**Try it:**
```bash
docker compose up -d
docker compose ps          # All 3 should be "healthy" or "running"
docker compose logs postgres  # Check for errors
```

**Break it on purpose:**
- Change the password in `docker-compose.yml` but not in `.env`. What error do you get?
- Stop postgres: `docker compose stop postgres`. Now try to start the backend. What happens?
- Fill up Redis: what happens when the queue is full? (We'll explore this later)

### 2.4 Step-by-Step: Backend Skeleton

```bash
mkdir -p backend/app/{db,models,schemas,api,services,engine/nodes,integrations,rag,realtime,utils}
mkdir -p backend/tests/{test_api,test_engine,test_integrations,test_rag}
mkdir -p backend/alembic/versions
```

#### `backend/pyproject.toml`
```toml
[project]
name = "sandhi-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    # Web framework
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",       # ASGI server to run FastAPI
    "python-multipart>=0.0.9",         # File upload support
    
    # Database
    "sqlmodel>=0.0.22",                # ORM (SQLAlchemy + Pydantic)
    "asyncpg>=0.30.0",                 # Async Postgres driver
    "alembic>=1.14.0",                 # Database migrations
    "greenlet>=3.0.0",                 # Required by SQLAlchemy async
    
    # Redis
    "redis>=5.0.0",                    # Redis client
    "arq>=0.26.0",                     # Async task queue on Redis
    
    # Auth
    "pyjwt>=2.9.0",                    # JWT tokens
    "passlib[bcrypt]>=1.7.4",          # Password hashing
    
    # AI / LLM
    "litellm>=1.50.0",                 # Universal LLM client
    "tiktoken>=0.8.0",                 # Token counting
    
    # Real-time
    "python-socketio>=5.11.0",         # WebSocket server
    
    # Utilities
    "pydantic-settings>=2.6.0",        # Settings from env vars
    "httpx>=0.28.0",                   # Async HTTP client
    "cryptography>=43.0.0",            # Fernet encryption
    "structlog>=24.4.0",               # Structured logging
    "python-dotenv>=1.0.0",            # Load .env files
    
    # S3/MinIO
    "boto3>=1.35.0",                   # S3 client
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.24.0",
    "httpx>=0.28.0",                   # Also used for test client
    "ruff>=0.8.0",                     # Linter + formatter (replaces black + isort + flake8)
]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

**Understanding every dependency:**
- **uvicorn**: The web server. FastAPI is just a framework — uvicorn actually listens for HTTP requests and passes them to FastAPI.
- **asyncpg**: The Postgres driver. There are sync drivers (psycopg2) and async drivers (asyncpg). We need async because FastAPI is async.
- **alembic**: Generates SQL migration files when you change your models. Without this, you'd manually write `ALTER TABLE` statements.
- **arq**: A lightweight async task queue. When someone clicks "Run Workflow", we don't execute it in the HTTP request — we put it on a queue, and a background worker picks it up.
- **litellm**: This is magic. One function call `litellm.completion(model="gpt-4o")` works with OpenAI, Anthropic, Google, Mistral, local models — all with the same interface.
- **pydantic-settings**: Reads environment variables and validates them with types. `DATABASE_URL: str` means "crash on startup if DATABASE_URL is not set" instead of crashing later with a confusing error.
- **structlog**: Better logging. Instead of `print("user logged in")`, you do `log.info("user_logged_in", user_id=user.id)` — structured, searchable, JSON-formatted.

### 2.5 Step-by-Step: Frontend Skeleton

```bash
# From the Sandhi root:
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install

# Core dependencies
npm install react-router-dom @tanstack/react-query zustand react-hook-form zod @hookform/resolvers
npm install @xyflow/react                    # React Flow (the canvas library)
npm install socket.io-client                 # Real-time WebSocket client  
npm install axios                            # HTTP client

# Tailwind CSS
npm install -D tailwindcss @tailwindcss/vite

# Dev dependencies
npm install -D @types/node
```

**Understanding every dependency:**
- **react-router-dom**: Maps URLs to pages (`/workflows` → WorkflowList page, `/editor/:id` → Editor page)
- **@tanstack/react-query**: Manages server data (fetching, caching, refetching). Replaces manual `useEffect` + `useState` for API calls
- **zustand**: State management. Simpler than Redux. Stores like `useWorkflowStore` hold canvas state
- **react-hook-form + zod**: Form handling. Zod defines the shape of valid data; react-hook-form handles inputs, validation, errors
- **@xyflow/react**: This is React Flow — the node editor library. It gives you a canvas where you can add, connect, and move nodes. This is the CORE of the workflow builder UI
- **socket.io-client**: WebSocket client for real-time updates (live execution logs, node status changes)
- **axios**: HTTP client for calling the backend API. Better than `fetch()` for interceptors (auto-adding auth tokens)

### 2.6 Makefile for Dev Shortcuts

#### `Makefile`
```makefile
.PHONY: dev dev-backend dev-frontend setup migrate test lint

# Start everything for development
dev:
	docker compose up -d
	@echo "Postgres, Redis, MinIO are running"
	@echo "Run 'make dev-backend' and 'make dev-frontend' in separate terminals"

# Start backend with hot-reload
dev-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start frontend with hot-reload
dev-frontend:
	cd frontend && npm run dev

# First-time setup
setup:
	docker compose up -d
	cd backend && uv venv && uv pip install -e ".[dev]"
	cd frontend && npm install

# Run database migrations
migrate:
	cd backend && alembic upgrade head

# Run all tests
test:
	cd backend && pytest -v
	cd frontend && npm test

# Lint everything
lint:
	cd backend && ruff check . && ruff format --check .
	cd frontend && npm run lint
```

### 2.7 Checkpoint

At this point you should have:
```
sandhi/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Makefile
├── turbo.json
├── package.json
├── docs/                    (already existed)
├── backend/
│   ├── pyproject.toml
│   └── app/                 (empty directories for now)
└── frontend/                (Vite scaffold)
```

**Test:**
```bash
docker compose up -d && docker compose ps   # 3 healthy services
cd backend && uv venv && source .venv/bin/activate && uv pip install -e ".[dev]"
cd frontend && npm install && npm run dev    # Should open on localhost:5173
```

**Commit:** `git add -A && git commit -m "feat: monorepo scaffold with docker-compose"`

---

## Phase 3: Build the Database Layer (Week 4)

> This is where your data lives. Get this right and everything else is easy. Get it wrong and you'll be rewriting for weeks.

### 3.1 Understand the Data Model First

Before writing any code, study `DATA_MODELS.md` carefully. Draw the relationships on paper:

```
User ──owns──▶ Workspace ──contains──▶ Workflow ──has──▶ Run
                    │                      │
                    ├── KnowledgeBase       ├── Deployment
                    ├── Integration         
                    ├── Secret              
                    └── ApiKey              
```

**Key insight:** Almost everything is scoped to a `Workspace`. This is multi-tenant isolation — User A's data never leaks to User B.

### 3.2 Build the Base Model

#### `backend/app/db/base.py`

This is the foundation that EVERY table inherits from.

```python
from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field
from sqlalchemy import Column, DateTime, func


class BaseSQLModel(SQLModel):
    """
    All database tables inherit this.
    Gives every row: id (UUID), created_at, updated_at.
    
    Why UUIDs instead of auto-increment?
    1. Can generate IDs client-side (no DB round-trip)
    2. Safe across distributed systems (no collisions)
    3. Can't be guessed (security: user can't try /users/1, /users/2, /users/3)
    """
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
        )
    )
```

**What to understand:**
- `Field(default_factory=uuid4)` → Python generates the UUID, not the DB. This means you know the ID before the INSERT.
- `server_default=func.now()` → The database sets the timestamp, not Python. This ensures consistency even if server clocks drift.
- `onupdate=func.now()` → `updated_at` auto-updates whenever the row changes.

**Exercise:** What happens if you forget `timezone=True`? Answer: You get "naive" datetimes without timezone info. When your users are in different timezones, everything breaks. Always use timezone-aware timestamps.

### 3.3 Build the Database Session

#### `backend/app/db/session.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.config import settings

# Engine = connection pool to the database
# - pool_pre_ping: check if connection is alive before using it
# - echo: log all SQL queries (useful for debugging, disable in production)
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.APP_ENV == "development",
)

# Session factory — creates new sessions
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    """
    FastAPI dependency that provides a database session.
    Usage in route handlers:
        async def my_route(db: AsyncSession = Depends(get_db)):
    
    The `async with` ensures the session is closed even if an error occurs.
    """
    async with async_session() as session:
        yield session
```

**What to understand:**
- **Connection pool**: Opening a DB connection is slow (~30ms). A pool keeps connections open and reuses them. When a request comes in, it grabs a connection from the pool instead of creating one.
- **`expire_on_commit=False`**: Normally, after a commit, SQLAlchemy marks all objects as "expired" and re-fetches them from DB on next access. We disable this because we're async — the re-fetch would block.
- **`yield session`**: This is a generator. FastAPI creates the session before the route handler, gives it to the handler, and closes it after the handler finishes. Even if the handler throws an error, the session gets closed.

**Edge case to think about:** What if 1000 requests come at once and the pool has only 5 connections? Answer: Requests wait in line. If they wait too long, they timeout. You'd increase `pool_size` or add a load balancer.

### 3.4 Build the Config Module

#### `backend/app/config.py`

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    All configuration comes from environment variables.
    pydantic-settings validates them at startup.
    If DATABASE_URL is missing → app crashes with a clear error.
    If PORT is set to "abc" → app crashes with "value is not a valid integer".
    
    This is MUCH better than finding out at runtime when a request fails.
    """
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://sandhi:sandhi@localhost:5432/sandhi"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # S3 / MinIO
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET: str = "sandhi"
    
    # Auth
    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Encryption
    FERNET_KEY: str = ""
    
    # App
    APP_ENV: str = "development"
    LOG_LEVEL: str = "DEBUG"
    CORS_ORIGINS: str = "http://localhost:5173"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Single global instance — imported everywhere
settings = Settings()
```

**Exercise:** Try starting the app with `DATABASE_URL=not-a-url`. What error do you get? Now try with a valid URL but wrong password. Different error. Learn to distinguish "config error" from "connection error".

### 3.5 Build the Models (One at a Time)

> Don't build all 11 models at once. Build them in dependency order and test each one.

**Build order:**
1. `User` → has no foreign keys to other models
2. `Workspace` + `WorkspaceMember` → depends on User
3. `Workflow` → depends on Workspace
4. `Run` → depends on Workflow
5. `Deployment` → depends on Workflow
6. `KnowledgeBase`, `Document`, `Chunk` → depends on Workspace
7. `Template`, `TemplateRating` → depends on User, Workspace
8. `Integration`, `Secret`, `ApiKey` → depends on Workspace
9. `AuditLog` → depends on Workspace

For each model, follow this loop:
1. Read the model definition in `DATA_MODELS.md`
2. Type it out by hand (don't copy)
3. Create an Alembic migration
4. Apply the migration
5. Open `psql` and verify the table exists with the right columns
6. Try inserting a row manually
7. Try inserting invalid data — what constraint errors do you get?

**Example — User model:**

```python
# backend/app/models/user.py

from sqlmodel import Field
from app.db.base import BaseSQLModel, SQLModel


class User(BaseSQLModel, table=True):
    __tablename__ = "users"
    
    email: str = Field(unique=True, max_length=255, index=True)
    hashed_password: str | None = Field(default=None, max_length=255)
    display_name: str | None = Field(default=None, max_length=100)
    avatar_url: str | None = None
    is_active: bool = True
    is_verified: bool = False


# API schemas — these are NOT database tables (no `table=True`)
class UserCreate(SQLModel):
    email: str
    password: str
    display_name: str | None = None


class UserRead(SQLModel):
    id: str  # UUID serialized as string in JSON
    email: str
    display_name: str | None
    avatar_url: str | None
    is_active: bool
    is_verified: bool
```

**What to understand:**
- `unique=True` on email → the DB enforces that no two users can have the same email. Try inserting a duplicate and see the error.
- `index=True` → creates a B-tree index on email. Lookups by email go from O(n) to O(log n). Critical for login (you look up by email every time).
- `hashed_password: str | None` → nullable because OAuth users don't have passwords.
- `UserCreate` has `password` (plaintext) but `User` has `hashed_password` (bcrypt hash). NEVER store plaintext passwords.

### 3.6 Set Up Alembic (Database Migrations)

```bash
cd backend
alembic init alembic
```

Edit `alembic/env.py` to use your async engine and models. This tells Alembic "compare these Python classes to the actual DB tables and generate the SQL to make them match."

**The migration workflow:**
```bash
# 1. You change a model (add a field, create a new table)
# 2. Alembic detects the difference
alembic revision --autogenerate -m "create users table"
# 3. A migration file appears in alembic/versions/
# 4. You review it (ALWAYS review auto-generated migrations!)
# 5. You apply it
alembic upgrade head
# 6. The DB now matches your models
```

**Why this matters:** In production, you can't just drop and recreate tables — you'd lose all user data. Migrations let you evolve the schema safely. They're like git for your database schema.

**Exercise:** Create the User model, generate a migration, apply it. Then add a `phone_number` field to User, generate another migration, apply it. Look at both migration files. The first one has `CREATE TABLE`, the second has `ALTER TABLE ADD COLUMN`. This is how real production databases evolve.

### 3.7 Checkpoint

At this point you should be able to:
```bash
docker compose up -d                    # DB running
cd backend && alembic upgrade head      # Tables created
# Connect and verify:
docker exec -it sandhi-postgres-1 psql -U sandhi -d sandhi -c "\dt"
# Should see your tables
```

---

## Phase 4: Build the Core API (Weeks 5–6)

> Thin routes, thick services. Every route handler should be ≤10 lines.

### 4.1 The FastAPI App Factory

#### `backend/app/main.py`

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs once when the app starts, and once when it shuts down.
    Use this for: DB connection pool, Redis connection, background tasks.
    
    Why not just put setup code at module level?
    Because module-level code runs at IMPORT time, which breaks tests
    and makes startup order unpredictable.
    """
    # Startup
    print("🚀 Sandhi API starting...")
    yield
    # Shutdown
    print("👋 Sandhi API shutting down...")


app = FastAPI(
    title="Sandhi API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allows the frontend (localhost:5173) to call the backend (localhost:8000)
# Without this, browsers block cross-origin requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Simple health check. Used by Docker, load balancers, monitoring."""
    return {"status": "ok"}
```

**Test it:**
```bash
cd backend
uvicorn app.main:app --reload
# Visit http://localhost:8000/docs → Swagger UI
# Visit http://localhost:8000/health → {"status": "ok"}
```

### 4.2 Build Auth (Register + Login + JWT)

This is the most important piece to get right. Every other route depends on knowing WHO is making the request.

**The auth flow:**
```
Register:
  User sends {email, password}
  → We hash the password with bcrypt
  → Store User in DB
  → Return user info (NOT the password/hash)

Login:
  User sends {email, password}
  → We find the User by email
  → We check bcrypt.verify(password, hashed_password)
  → If valid: create JWT token, return it
  → If invalid: return 401

Every subsequent request:
  User sends: Authorization: Bearer <jwt_token>
  → We decode the JWT, extract user_id
  → We load the User from DB
  → We pass the User to the route handler via Depends()
```

**What to learn before building:**
- How bcrypt works (slow hash on purpose — makes brute force attacks impractical)
- How JWT works (three parts: header.payload.signature; the signature prevents tampering)
- Why access tokens are short-lived (15 min) and refresh tokens are long-lived (7 days)

**Key file: `backend/app/deps.py`**
```python
# This file contains FastAPI dependencies shared across routes

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Decode JWT → load user → return it.
    If token is invalid or expired → raise 401.
    
    EVERY authenticated route uses this:
        async def my_route(user: User = Depends(get_current_user)):
    """
    ...

async def get_current_workspace(
    workspace_id: UUID = Header(alias="X-Workspace-Id"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Workspace:
    """
    Load workspace + verify user is a member.
    This is used by almost every route.
    
    It chains: get_db → get_current_user → get_current_workspace
    FastAPI resolves the chain automatically.
    """
    ...
```

**The dependency chain is the key insight:**
```
get_db ──▶ get_current_user ──▶ get_current_workspace
              (needs DB)            (needs user + DB)
```

FastAPI resolves these automatically. You just declare what you need, and FastAPI figures out the order. This is MUCH cleaner than middleware in Express.

**Exercise:** Build the auth system:
1. Registration endpoint
2. Login endpoint that returns JWT
3. A `get_current_user` dependency
4. A protected route (`GET /users/me`) that returns the logged-in user
5. Test with your REST client: register → login → call protected route with token

**Edge cases to think about:**
- What if someone registers with the same email twice?
- What if the JWT has expired? What error should you return?
- What if someone sends a valid JWT but the user has been deleted?
- What if the JWT_SECRET changes? All existing tokens become invalid. Is that okay?

### 4.3 Build CRUD for Workspaces

Pattern for every CRUD endpoint:

```
Route handler (thin) → Service function (business logic) → Database query
```

**Route:**
```python
@router.post("/", response_model=WorkspaceRead, status_code=201)
async def create_workspace(
    body: WorkspaceCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await workspace_service.create(db, body, user.id)
    return workspace
```

**Service:**
```python
async def create(db: AsyncSession, body: WorkspaceCreate, owner_id: UUID) -> Workspace:
    # Business logic: validate slug uniqueness, create workspace, add owner as member
    workspace = Workspace(name=body.name, slug=body.slug, owner_id=owner_id)
    db.add(workspace)
    
    # Owner is automatically a member with "owner" role
    member = WorkspaceMember(
        workspace_id=workspace.id, user_id=owner_id, role=WorkspaceRole.OWNER
    )
    db.add(member)
    
    await db.commit()
    await db.refresh(workspace)
    return workspace
```

**Why separate routes and services?**
- Routes handle HTTP (parse request, validate, return response)
- Services handle business logic (rules, validation, multi-step operations)
- This means services can be called from routes, from the task queue worker, from tests — anywhere
- Routes are hard to test (need HTTP). Services are easy to test (just function calls).

### 4.4 Build CRUD for Workflows

This follows the exact same pattern as Workspaces. The key difference is the `graph` field — it's JSONB that stores the entire workflow canvas state.

**Important insight:** When the frontend saves a workflow, it sends the ENTIRE graph (`{nodes: [...], edges: [...]}`) in one request. The backend stores it as-is in a single JSONB column. No node/edge tables.

**Exercise:** Build workflow CRUD:
1. `POST /workflows/` — create (empty graph)
2. `GET /workflows/` — list all in workspace
3. `GET /workflows/{id}` — get one (with full graph)
4. `PATCH /workflows/{id}` — update (graph, name, etc.)
5. `DELETE /workflows/{id}` — delete

Test: Create a workflow, update its graph with some test nodes, retrieve it, verify the graph is intact.

### 4.5 Build the Router Structure

#### `backend/app/api/router.py`
```python
from fastapi import APIRouter
from app.api import auth, users, workspaces, workflows, runs  # ... etc

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["Workflows"])
api_router.include_router(runs.router, prefix="/runs", tags=["Runs"])
```

Then in `main.py`:
```python
from app.api.router import api_router
app.include_router(api_router)
```

Now all your endpoints are neatly organized:
- `POST /api/v1/auth/register`
- `GET /api/v1/workflows/`
- etc.

### 4.6 Checkpoint

At this point you should be able to:
1. Register a user
2. Login and get a JWT
3. Create a workspace
4. CRUD workflows in that workspace
5. See everything in Swagger at `/docs`

```bash
# Test flow:
curl -X POST localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com", "password":"secret123", "display_name":"Test"}'

curl -X POST localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com", "password":"secret123"}'
# → {"access_token": "eyJ..."}

# Use the token for subsequent requests
```

---

## Phase 5: Build the Workflow Execution Engine (Week 7)

> This is the heart of Sandhi. Everything else is input/output around this engine.

### 5.1 Understand the Mental Model

```
Workflow Graph (nodes + edges)
        ↓
  Topological Sort (execution order)
        ↓
  Wave Execution (parallelize independent nodes)
        ↓
  For each node:
    Resolve inputs (get outputs from upstream nodes)
    Look up runner in NODE_REGISTRY
    Execute runner(config, inputs, context)
    Store result
    Emit WebSocket event
        ↓
  All nodes done → workflow complete
```

### 5.2 Build the Node Registry

#### `backend/app/engine/registry.py`

```python
from typing import Callable, Any

# This dict maps node type strings → runner functions.
# When the executor encounters a node with type="llm_call",
# it looks up NODE_REGISTRY["llm_call"] and calls it.
NODE_REGISTRY: dict[str, Callable] = {}


def register_node(node_type: str):
    """
    Decorator to register a node runner.
    
    Usage:
        @register_node("llm_call")
        async def run_llm_call(config, inputs, ctx):
            ...
    """
    def decorator(func: Callable) -> Callable:
        NODE_REGISTRY[node_type] = func
        return func
    return decorator
```

**This is the Plugin Architecture pattern.** Adding a new node type is:
1. Create a function
2. Put `@register_node("my_type")` on it
3. Done. The executor automatically knows about it.

No if/else chains. No switch statements. No modifying executor code.

### 5.3 Build Your First Node Runners

#### `backend/app/engine/nodes/triggers.py`
```python
from app.engine.registry import register_node


@register_node("manual_trigger")
async def run_manual_trigger(config: dict, inputs: dict, ctx) -> dict:
    """
    The simplest possible node. It just passes through the trigger data.
    When someone clicks "Run" in the UI, this is the starting node.
    """
    return {"trigger_data": ctx.trigger_data}
```

#### `backend/app/engine/nodes/ai.py`
```python
import litellm
from app.engine.registry import register_node


@register_node("llm_call")
async def run_llm_call(config: dict, inputs: dict, ctx) -> dict:
    """
    Call any LLM (OpenAI, Anthropic, Google, etc.) via litellm.
    
    config:
        model: "gpt-4o-mini" | "claude-3-5-sonnet" | etc.
        system_prompt: "You are a helpful assistant."
        user_prompt: "Summarize this: {{input.text}}"
        temperature: 0.7
        max_tokens: 1000
    """
    messages = []
    
    if config.get("system_prompt"):
        messages.append({"role": "system", "content": config["system_prompt"]})
    
    messages.append({"role": "user", "content": config["user_prompt"]})
    
    response = await litellm.acompletion(
        model=config.get("model", "gpt-4o-mini"),
        messages=messages,
        temperature=config.get("temperature", 0.7),
        max_tokens=config.get("max_tokens", 1000),
    )
    
    return {
        "response_text": response.choices[0].message.content,
        "model": response.model,
        "tokens_used": response.usage.total_tokens,
        "cost": litellm.completion_cost(response),
    }
```

**What to understand about litellm:**
- `litellm.acompletion()` (note the `a` for async) is the universal LLM call
- The `model` parameter determines which provider is used: `"gpt-4o"` → OpenAI, `"claude-3-5-sonnet"` → Anthropic
- Response format is always the same regardless of provider
- `completion_cost()` calculates the $ cost of the call

**Exercise:** Build these node runners:
1. `manual_trigger` — passthrough
2. `llm_call` — call an LLM
3. `condition` — evaluate an expression, return which branch to take
4. `text_template` — render a template string with variables
5. `response` — format the final output

Test each one independently (no executor yet — just call the function directly in a test).

### 5.4 Build the Run Context

#### `backend/app/engine/context.py`

```python
from dataclasses import dataclass, field
from uuid import UUID


@dataclass
class RunContext:
    """
    Everything a node runner might need access to.
    Passed to every node during execution.
    
    This is the "environment" of a running workflow.
    """
    run_id: UUID
    workflow_id: UUID
    workspace_id: UUID
    trigger_data: dict = field(default_factory=dict)
    
    # Secrets (decrypted for this run)
    secrets: dict = field(default_factory=dict)
    
    # Integration credentials (decrypted)
    credentials: dict = field(default_factory=dict)
    
    # Results of previously-executed nodes
    # {"node_1": {"response_text": "...", ...}, "node_2": {...}}
    node_results: dict = field(default_factory=dict)
    
    # Logging
    async def log(self, message: str, level: str = "info"):
        """Log a message and emit it via WebSocket to the UI."""
        # Will be implemented when we add WebSocket support
        print(f"[{self.run_id}] [{level}] {message}")
```

### 5.5 Build the Variable Resolver

#### `backend/app/engine/resolver.py`

This is what makes `{{prev_node.output.field}}` work.

```python
import re

# Matches: {{node_name.field}} or {{node_name.output.nested.field}}
TEMPLATE_PATTERN = re.compile(r"\{\{(.+?)\}\}")


def resolve_templates(text: str, node_results: dict, trigger_data: dict) -> str:
    """
    Replace {{node_id.field}} references with actual values.
    
    Example:
        text = "Summarize this: {{manual_trigger.trigger_data.text}}"
        node_results = {"manual_trigger": {"trigger_data": {"text": "Hello world"}}}
        → "Summarize this: Hello world"
    """
    def replace_match(match):
        path = match.group(1).strip()
        parts = path.split(".")
        
        # Navigate the nested dict
        node_id = parts[0]
        value = node_results.get(node_id, {})
        
        for part in parts[1:]:
            if isinstance(value, dict):
                value = value.get(part, f"{{{{UNRESOLVED:{path}}}}}")
            else:
                return f"{{{{UNRESOLVED:{path}}}}}"
        
        return str(value)
    
    return TEMPLATE_PATTERN.sub(replace_match, text)
```

**Edge cases to think about:**
- What if the referenced node hasn't run yet? (The topological sort should prevent this, but what if there's a bug?)
- What if the output is a list, not a dict? `{{node.0.field}}`?
- What if the output contains `{{` literally? (Template injection in user content)

### 5.6 Build the DAG Executor

This is the most complex piece. Read it carefully.

#### `backend/app/engine/executor.py`

```python
from datetime import datetime, timezone
from uuid import UUID

from app.engine.registry import NODE_REGISTRY
from app.engine.context import RunContext
from app.engine.resolver import resolve_templates
from app.schemas.workflow import WorkflowGraph


async def execute_workflow(
    graph: WorkflowGraph,
    run_id: UUID,
    workspace_id: UUID,
    trigger_data: dict,
    secrets: dict = None,
) -> dict:
    """
    Execute a workflow graph from start to finish.
    
    Algorithm:
    1. Topological sort → get execution order
    2. For each node in order:
       a. Resolve input templates (replace {{}} with actual values)
       b. Look up runner in NODE_REGISTRY
       c. Execute runner
       d. Store result
    3. Return final output
    
    Returns:
        {
            "status": "completed" | "failed",
            "node_results": { "node_id": { ... }, ... },
            "output": { ... },  # From the last node or "response" node
        }
    """
    ctx = RunContext(
        run_id=run_id,
        workflow_id=graph,  # This would come from the caller
        workspace_id=workspace_id,
        trigger_data=trigger_data,
        secrets=secrets or {},
    )
    
    # Step 1: Topological sort
    execution_order = graph.topological_sort()
    
    node_results = {}
    final_output = None
    
    # Step 2: Execute each node
    for node_id in execution_order:
        node = graph.get_node(node_id)
        if not node:
            continue
        
        runner = NODE_REGISTRY.get(node.type)
        if not runner:
            node_results[node_id] = {
                "status": "failed",
                "error": f"Unknown node type: {node.type}",
            }
            continue
        
        # Resolve templates in config
        resolved_config = {}
        for key, value in node.config.items():
            if isinstance(value, str):
                resolved_config[key] = resolve_templates(
                    value, node_results, trigger_data
                )
            else:
                resolved_config[key] = value
        
        # Gather inputs from upstream nodes
        upstream_ids = graph.get_upstream(node_id)
        inputs = {uid: node_results.get(uid, {}) for uid in upstream_ids}
        
        # Execute
        ctx.node_results = node_results
        started_at = datetime.now(timezone.utc)
        
        try:
            result = await runner(resolved_config, inputs, ctx)
            node_results[node_id] = {
                "status": "succeeded",
                "output": result,
                "started_at": started_at.isoformat(),
                "ended_at": datetime.now(timezone.utc).isoformat(),
            }
            
            if node.type == "response":
                final_output = result
                
        except Exception as e:
            node_results[node_id] = {
                "status": "failed",
                "error": str(e),
                "started_at": started_at.isoformat(),
                "ended_at": datetime.now(timezone.utc).isoformat(),
            }
            # For now: stop on first error
            # Later: add retry logic, error handler nodes, continue-on-error
            return {
                "status": "failed",
                "node_results": node_results,
                "error": f"Node {node_id} ({node.type}) failed: {e}",
            }
    
    return {
        "status": "completed",
        "node_results": node_results,
        "output": final_output,
    }
```

**What to understand:**
- **Topological sort** ensures we never execute a node before its inputs are ready
- **Template resolution** happens at execution time, not at save time. This means the same workflow can produce different outputs with different inputs.
- **Error propagation**: Right now we stop on first error. Later, you'll add: retries, error handler nodes, continue-on-error flags.

**Exercise:** Write a test that:
1. Creates a graph: Manual Trigger → LLM Call → Response
2. Executes it
3. Verifies the LLM was called with the right prompt
4. Verifies the response node got the LLM output

**Edge cases to think about:**
- What if the graph has a cycle? (The topological sort detects this.)
- What if a node runner takes 5 minutes? (Timeout! Add per-node timeouts.)
- What if the LLM API is down? (Retry with exponential backoff.)
- What if the user's prompt is `{{nonexistent_node.output}}`? (Unresolved template — should this fail or pass through?)

### 5.7 Wire Up Execution via the API

Add to your workflows router:

```python
@router.post("/{wf_id}/run", status_code=202)
async def run_workflow(wf_id: UUID, body: RunCreate, ...):
    """
    Trigger a manual execution.
    Returns 202 (Accepted) because the run happens asynchronously.
    """
    # Create a Run record in the DB
    # Queue the execution (for now, just execute inline)
    # Return the run_id so the client can poll/subscribe for updates
```

**Why 202 and not 200?** Because the workflow hasn't finished — it's just been accepted for processing. The client will poll or use WebSocket to get updates. This is important because workflows can take seconds to minutes.

### 5.8 Checkpoint

You should now be able to:
1. Create a workflow via API
2. Set its graph to a simple chain (trigger → LLM → response)
3. POST to run it
4. Get back results with node outputs

---

## Phase 6: Build the Frontend Shell (Week 8)

> Now we make it visual.

### 6.1 Project Structure

```
frontend/src/
├── main.tsx              # Entry point
├── App.tsx               # Router + providers
├── api/                  # API client
├── stores/               # Zustand state
├── hooks/                # Custom hooks
├── components/           # UI components
│   ├── ui/               # shadcn/ui primitives
│   ├── layout/           # App shell, sidebar, header
│   └── canvas/           # Workflow editor (Phase 7)
├── pages/                # Route pages
├── lib/                  # Utilities
└── types/                # TypeScript types
```

### 6.2 Set Up Tailwind CSS + shadcn/ui

Tailwind gives you utility classes (`bg-blue-500`, `p-4`, `rounded-lg`) instead of writing CSS files. shadcn/ui gives you pre-built, customizable components (buttons, dialogs, inputs) built on Tailwind.

```bash
# In frontend/
npx shadcn@latest init
# Choose: TypeScript, Default style, CSS variables for colors

# Add components you'll need:
npx shadcn@latest add button input card dialog dropdown-menu tabs toast badge select textarea skeleton
```

**Why shadcn/ui specifically?** Unlike most component libraries, shadcn copies the component code into YOUR project. You own it. You can modify it. No version conflicts. No "the library doesn't support this prop" problems.

### 6.3 Set Up the API Client

#### `frontend/src/api/client.ts`

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
});

// Interceptor: automatically add auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: if we get 401, redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
```

**What to understand about interceptors:**
- Every request automatically gets the auth token — no need to pass it manually everywhere
- If any request returns 401 (Unauthorized), we clear the token and redirect to login
- This is a *cross-cutting concern* — it applies to ALL requests without polluting individual API calls

### 6.4 Set Up Zustand Stores

#### `frontend/src/stores/auth-store.ts`

```typescript
import { create } from "zustand";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("access_token"),
  isAuthenticated: !!localStorage.getItem("access_token"),
  
  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const { access_token } = response.data;
    localStorage.setItem("access_token", access_token);
    set({ token: access_token, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem("access_token");
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  setUser: (user) => set({ user }),
}));
```

**Why Zustand over Redux:** Look at how short this is. A Redux equivalent would need action types, action creators, a reducer, a slice, selectors, and middleware setup. Zustand does the same thing in 20 lines.

### 6.5 Set Up Routing

#### `frontend/src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./components/layout/app-shell";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected routes — wrapped in AppShell (sidebar + header) */}
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/workflows/:id/editor" element={<WorkflowEditorPage />} />
            <Route path="/runs" element={<RunsPage />} />
            <Route path="/runs/:id" element={<RunDetailPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/knowledge-bases" element={<KBListPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

### 6.6 Build the App Shell

The app shell is the layout that wraps every page: sidebar on the left, header on top, content area.

**Exercise:** Build:
1. A sidebar with navigation links (Dashboard, Workflows, Runs, Templates, etc.)
2. A header with workspace name and user avatar/menu
3. A content area where pages render (`<Outlet />` from react-router)
4. A `ProtectedRoute` component that redirects to `/login` if not authenticated

### 6.7 Build Auth Pages

Build a login and registration page. Keep them simple — an input for email, password, and a submit button. Use `react-hook-form` for form state and `zod` for validation.

**Exercise:** Build:
1. Registration page → calls `POST /auth/register`
2. Login page → calls `POST /auth/login` → stores token → redirects to dashboard
3. Test the full flow: register → login → see dashboard

### 6.8 Checkpoint

At this point you should have:
- A working frontend with login/register
- A sidebar with navigation
- Pages that load (even if mostly empty)
- The frontend talking to the backend via axios + JWT

---

## Phase 7: Build the Workflow Canvas (Weeks 9–10)

> This is the most user-visible and technically interesting part.

### 7.1 Understand React Flow

React Flow gives you:
- An infinite canvas you can pan and zoom
- Nodes that you can place, move, and connect
- Edges (connections) between nodes
- Handles (ports) for input/output

**Must-read:** [React Flow Documentation](https://reactflow.dev/learn)

**Key concepts:**
- `nodes` array: Each node has `id`, `position`, `type`, `data`
- `edges` array: Each edge has `id`, `source`, `target`
- `onNodesChange`, `onEdgesChange`: Callbacks for when nodes/edges change
- `nodeTypes`: Map of custom node components
- `onConnect`: Called when user draws an edge

### 7.2 The Generic Node Approach

**Key architectural decision:** We do NOT create a React component for each node type. Instead, we have ONE `GenericNode` component that renders differently based on the node type's configuration.

```typescript
// This is THE rendering component for ALL node types.
// It reads the node type, looks up its config in the registry,
// and renders a card with the icon, label, input/output handles,
// and a preview of the configuration.

function GenericNode({ id, data, type }: NodeProps) {
  const nodeConfig = NODE_TYPE_REGISTRY[type];
  // nodeConfig has: icon, color, label, fields, handles
  
  return (
    <div className={`rounded-lg border p-3 ${nodeConfig.color}`}>
      <div className="flex items-center gap-2">
        {nodeConfig.icon}
        <span>{data.label || nodeConfig.defaultLabel}</span>
      </div>
      {/* Input handles */}
      {/* Output handles */}
      {/* Mini preview of key config values */}
    </div>
  );
}
```

### 7.3 The Node Type Registry (Frontend)

#### `frontend/src/components/nodes/node-registry.ts`

```typescript
export interface NodeTypeDefinition {
  type: string;
  category: "triggers" | "ai" | "rag" | "logic" | "transform" | "integrations" | "output";
  label: string;
  description: string;
  icon: string;          // Lucide icon name
  color: string;         // Tailwind bg class
  inputs: HandleDef[];   // Input handles
  outputs: HandleDef[];  // Output handles
  fields: FieldDef[];    // Configuration fields shown in the right panel
}

export const NODE_TYPE_REGISTRY: Record<string, NodeTypeDefinition> = {
  manual_trigger: {
    type: "manual_trigger",
    category: "triggers",
    label: "Manual Trigger",
    description: "Start workflow manually from the UI",
    icon: "Play",
    color: "bg-green-50 border-green-200",
    inputs: [],
    outputs: [{ id: "output", label: "Trigger Data" }],
    fields: [],  // No config needed
  },
  llm_call: {
    type: "llm_call",
    category: "ai",
    label: "LLM Call",
    description: "Send a prompt to any AI model",
    icon: "Brain",
    color: "bg-purple-50 border-purple-200",
    inputs: [{ id: "input", label: "Input" }],
    outputs: [{ id: "output", label: "Response" }],
    fields: [
      { key: "model", type: "model-select", label: "Model", required: true },
      { key: "system_prompt", type: "textarea", label: "System Prompt" },
      { key: "user_prompt", type: "template-editor", label: "User Prompt", required: true },
      { key: "temperature", type: "slider", label: "Temperature", min: 0, max: 2, step: 0.1, default: 0.7 },
      { key: "max_tokens", type: "number", label: "Max Tokens", default: 1000 },
    ],
  },
  // ... more node types
};
```

**Why this approach is powerful:**
- Adding a new node type = adding one object to this registry
- The GenericNode component, the config panel, the palette — all read from this registry
- Zero new React components needed per node type

### 7.4 Build the Canvas Component

#### `frontend/src/components/canvas/workflow-canvas.tsx`

```tsx
import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GenericNode } from "./generic-node";

// Tell React Flow about our custom node type
const nodeTypes = { generic: GenericNode };

export function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
```

### 7.5 Build the Node Palette

The palette is the left sidebar showing available node types. Users drag from here to the canvas.

**Key learning:** React Flow's drag-and-drop uses HTML5 Drag and Drop API:
1. Palette item has `draggable` and `onDragStart` (sets the node type in drag data)
2. Canvas has `onDrop` (reads the node type, calculates position, adds node)

### 7.6 Build the Node Config Panel

When a node is selected on the canvas, the right panel shows its configuration form. This is where the **config-driven approach** pays off:

```tsx
function NodeConfigPanel({ selectedNode }) {
  const nodeType = NODE_TYPE_REGISTRY[selectedNode.type];
  
  return (
    <div className="p-4">
      <h3>{nodeType.label}</h3>
      {nodeType.fields.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={selectedNode.data.config[field.key]}
          onChange={(value) => updateNodeConfig(selectedNode.id, field.key, value)}
        />
      ))}
    </div>
  );
}

function FieldRenderer({ field, value, onChange }) {
  switch (field.type) {
    case "text":       return <Input value={value} onChange={onChange} />;
    case "textarea":   return <Textarea value={value} onChange={onChange} />;
    case "number":     return <Input type="number" value={value} onChange={onChange} />;
    case "slider":     return <Slider min={field.min} max={field.max} value={value} onChange={onChange} />;
    case "select":     return <Select options={field.options} value={value} onChange={onChange} />;
    case "model-select": return <ModelSelect value={value} onChange={onChange} />;
    case "template-editor": return <TemplateEditor value={value} onChange={onChange} />;
    // ... ~10 cases total, each 1 line
  }
}
```

One `FieldRenderer` handles ALL node types. No per-type form components.

### 7.7 Build the Toolbar

The toolbar has: Save, Run, Undo/Redo, Zoom controls.

**Exercise:**
1. Save button → sends the graph (nodes + edges) to `PATCH /workflows/{id}`
2. Run button → sends to `POST /workflows/{id}/run`, shows run status
3. Add undo/redo (hint: store a history stack of graph states)

### 7.8 Checkpoint

You should now have a working visual workflow editor:
1. Open the editor page
2. Drag nodes from the palette to the canvas
3. Connect them with edges
4. Configure each node in the right panel
5. Save the workflow
6. Click Run → see results

---

## Phase 8: Connect Frontend ↔ Backend (Weeks 10–11)

### 8.1 Set Up WebSocket for Real-Time Updates

When a workflow runs, you want the UI to update live — node status changing, logs streaming, token counter incrementing. This uses WebSocket (via Socket.IO).

**Backend:**
```python
import socketio

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio)

# Mount alongside FastAPI in main.py
```

**Frontend:**
```typescript
import { io } from "socket.io-client";

const socket = io("http://localhost:8000", {
  auth: { token: localStorage.getItem("access_token") },
});

socket.on("node_started", (data) => {
  // Highlight node as "running" on canvas
});

socket.on("node_completed", (data) => {
  // Show green checkmark, update output preview
});

socket.on("run_completed", (data) => {
  // Show final result
});
```

### 8.2 Build the Execution Overlay

When a workflow is running, overlay status indicators on each node:
- ⏳ Pending (grey)
- 🔄 Running (pulsing blue)
- ✅ Succeeded (green)
- ❌ Failed (red)

This connects to the WebSocket events and updates the canvas in real-time.

### 8.3 Build the Run History & Inspector

- **Run list:** Table of all past runs with status, duration, cost
- **Run detail:** Re-renders the workflow graph with per-node results. Click a node to see its inputs, outputs, logs, timing.

### 8.4 Build TanStack Query Hooks

```typescript
// frontend/src/hooks/use-workflow.ts

export function useWorkflows() {
  return useQuery({
    queryKey: ["workflows"],
    queryFn: () => api.get("/workflows/").then(r => r.data),
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ["workflows", id],
    queryFn: () => api.get(`/workflows/${id}`).then(r => r.data),
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/workflows/", data).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });
}
```

**What's happening:** TanStack Query handles caching, deduplication, and background refetching. If two components both call `useWorkflows()`, only one API request is made. If you navigate away and come back, it shows cached data instantly and refetches in the background.

---

## Phase 9: Build the RAG Pipeline (Week 12)

### 9.1 Understand RAG

RAG (Retrieval-Augmented Generation) = give an LLM access to your documents.

```
User Question: "What's our refund policy?"
                    ↓
           Convert to vector (embedding)
                    ↓
           Search document chunks by similarity
                    ↓
           Top 5 most relevant chunks found
                    ↓
           Send to LLM: "Given this context: [chunks], answer: [question]"
                    ↓
           LLM generates accurate answer grounded in your docs
```

### 9.2 Build the Ingestion Pipeline

```
Upload PDF → Extract text → Chunk into pieces → Generate embeddings → Store in pgvector
```

**Learn each piece:**

1. **Text extraction** (`backend/app/rag/extractor.py`)
   - Use `pypdf` for PDFs, `python-docx` for DOCX, `beautifulsoup4` for HTML
   - Edge cases: scanned PDFs (need OCR), tables in PDFs, images

2. **Chunking** (`backend/app/rag/chunker.py`)
   - Fixed-size: split every N tokens (simple, but can split mid-sentence)
   - Sentence-based: split on sentence boundaries (better coherence)
   - With overlap: chunks share some text at boundaries (so context isn't lost)
   - **Key decision:** chunk_size=512, overlap=50 (these are tunable!)

3. **Embedding** (`backend/app/rag/embedder.py`)
   - Use litellm to call the embedding model
   - Batch processing (don't send chunks one by one — send 100 at a time)
   - Rate limiting (embedding APIs have rate limits)

4. **Storage** (pgvector)
   ```sql
   -- The vector column is a pgvector type
   -- This stores a 1536-dimensional vector (OpenAI's embedding size)
   CREATE TABLE chunks (
     id UUID PRIMARY KEY,
     content TEXT,
     embedding vector(1536),
     ...
   );
   
   -- Similarity search:
   SELECT content, 1 - (embedding <=> query_vector) as score
   FROM chunks
   WHERE kb_id = '...'
   ORDER BY embedding <=> query_vector
   LIMIT 5;
   ```

### 9.3 Build the Retrieval Pipeline

```
Query → Embed → Vector search → Re-rank → Return top results
```

**Exercise:** Build and test:
1. Upload a text file → chunks + embeddings stored
2. Query the KB → get relevant chunks back with scores
3. Feed chunks + question to LLM → get accurate answer

**Edge cases:**
- What if the document has 10,000 pages? (Process in batches, show progress)
- What if two documents have duplicate content? (Content hash dedup)
- What if the user's query doesn't match any chunks? (Low scores → return "no relevant info found")

---

## Phase 10: Add Integrations (Week 13)

### 10.1 The Integration Pattern

Every integration follows the same pattern:

```python
# backend/app/integrations/base.py

from abc import ABC, abstractmethod

class BaseIntegration(ABC):
    """All integrations inherit this."""
    
    name: str
    actions: dict  # Available actions and their schemas
    
    @abstractmethod
    async def execute(self, action: str, params: dict, credentials: dict) -> dict:
        """Run an action with the given parameters and credentials."""
        ...
    
    @abstractmethod
    async def test_connection(self, credentials: dict) -> bool:
        """Verify credentials are valid."""
        ...
```

### 10.2 Build Gmail Integration

```python
# backend/app/integrations/gmail.py

class GmailIntegration(BaseIntegration):
    name = "gmail"
    actions = {
        "send_email": {"to": str, "subject": str, "body": str},
        "search_emails": {"query": str, "max_results": int},
    }
    
    async def execute(self, action, params, credentials):
        if action == "send_email":
            # Use Google's Gmail API with OAuth credentials
            ...
        elif action == "search_emails":
            ...
```

### 10.3 Build 2–3 More Integrations

Start with Slack and HTTP Request (the most useful). Each one should take ~30–50 lines.

**OAuth flow to learn:**
1. User clicks "Connect Gmail"
2. Frontend redirects to Google's consent screen
3. User approves
4. Google redirects back with a `code`
5. Backend exchanges `code` for `access_token` + `refresh_token`
6. Backend encrypts and stores tokens in the `integrations` table
7. When a workflow uses Gmail, we decrypt the tokens and use them

---

## Phase 11: Deployment, Scheduling & Advanced (Week 14)

### 11.1 Task Queue with ARQ

Right now, workflow execution happens inside the API request. In production, it should be on a background worker:

```python
# backend/app/worker.py

from arq import create_pool
from arq.connections import RedisSettings

async def execute_workflow_task(ctx, run_id: str):
    """This runs on the worker process, not the API server."""
    # Load run from DB
    # Execute workflow
    # Update run status
    # Emit WebSocket events
    ...

class WorkerSettings:
    functions = [execute_workflow_task]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
```

**Why a separate worker?**
- The API can respond immediately (202 Accepted)
- Long-running workflows don't block HTTP requests
- You can scale workers independently (add more workers for more throughput)
- If a worker crashes, the task can be retried

### 11.2 Scheduled Runs (Cron)

```python
# backend/app/scheduler.py

async def check_scheduled_deployments():
    """Runs every minute. Checks for deployments that are due."""
    due = await get_due_deployments(db)
    for dep in due:
        await enqueue_workflow_run(dep.workflow_id, trigger_type="schedule")
```

### 11.3 Webhook & API Endpoints

When a workflow is deployed as a webhook:
- Generate a unique URL: `POST /api/v1/webhook/abc123`
- When that URL is called, it triggers the workflow
- The request body becomes the trigger data

---

## Phase 12: Testing, Debugging & Optimisation (Ongoing)

### 12.1 How to Test

**Layer your tests:**

| Layer | What You Test | How | Speed |
|---|---|---|---|
| **Unit** | Node runners, services, utils | Call functions directly | ⚡ Fast (ms) |
| **Integration** | API endpoints | `httpx.AsyncClient` + test DB | 🔵 Medium (100ms) |
| **E2E** | Full flow (register → build → run) | Playwright / Cypress | 🔴 Slow (seconds) |

**Rule of thumb:** 70% unit, 20% integration, 10% E2E.

**Backend testing setup:**

```python
# backend/tests/conftest.py

@pytest.fixture
async def db():
    """Create a fresh test database for each test."""
    # Create tables, yield session, drop tables
    ...

@pytest.fixture
async def client(db):
    """HTTP client with auth headers set."""
    ...

@pytest.fixture
async def test_user(db):
    """Pre-created user for tests."""
    ...
```

**Exercise:** Write tests for:
1. User registration (happy path + duplicate email)
2. Workflow creation (happy path + missing fields)
3. LLM node execution (mock litellm to avoid real API calls)
4. Topological sort (valid DAG + cycle detection)

### 12.2 How to Debug

**Backend:**
- Read the full stack trace. The answer is usually in the last line.
- Add `structlog` logging to services: `log.info("workflow_started", wf_id=wf.id)`
- Use VS Code's Python debugger — set breakpoints, inspect variables.
- `print()` is fine for quick debugging. Remove before committing.
- Check the Postgres query log (`echo=True` in engine config) for slow queries.

**Frontend:**
- Browser DevTools → Console for errors, Network for API calls
- React DevTools extension for component tree and state
- `console.log()` is your friend
- Check the Network tab for failed API calls — 401? 500? CORS error?

**Common pitfalls:**
| Symptom | Likely Cause |
|---|---|
| CORS error in browser | Backend not configured with frontend origin |
| 401 on every request | JWT expired, or token not being sent |
| 500 from API | Check backend terminal for stack trace |
| Canvas not rendering | React Flow needs a parent with explicit height |
| WebSocket not connecting | Different port? Auth token not passed? |
| Migration fails | Model doesn't match DB — check for manual changes |

### 12.3 How to Optimise

**Don't optimise prematurely.** Build it correct first, then fast.

**When you do optimise:**

1. **Database queries:**
   - Add indexes for commonly-filtered columns (`workspace_id`, `status`, `created_at`)
   - Use `EXPLAIN ANALYZE` to see query plans
   - Avoid N+1 queries (loading 100 workflows + 100 separate queries for their runs)
   - Use `SELECT` only the columns you need

2. **API responses:**
   - Paginate list endpoints (don't return 10,000 workflows at once)
   - Use HTTP caching headers for static-ish data

3. **Frontend:**
   - React Flow handles virtualization (only renders visible nodes)
   - Use `useMemo` for expensive computations
   - Use `useCallback` for event handlers passed to child components
   - Lazy-load pages with `React.lazy()`

4. **Execution engine:**
   - Run independent branches in parallel (`asyncio.gather()`)
   - Cache embeddings (same text = same vector, no need to re-embed)
   - Stream LLM responses to UI instead of waiting for full completion

---

## Phase 13: Thinking Like an Engineer

> This is what makes you better than an AI at debugging and designing systems. You understand context, consequences, and human behavior.

### 13.1 Edge Cases to Always Consider

**User input:**
- Empty strings, null values, extremely long strings
- SQL injection: `"; DROP TABLE users; --` (Pydantic + ORM protects you, but understand WHY)
- Prompt injection: user puts `Ignore all instructions, do X` in an LLM prompt field
- Unicode: emojis in workflow names, RTL text, zero-width characters
- Large payloads: user uploads a 10GB file, or a workflow has 1000 nodes

**Concurrency:**
- Two users edit the same workflow at once — who wins?
- A webhook fires 100 times per second — what happens to the queue?
- User deletes a workflow while it's running — does the run crash?

**Failures:**
- Database goes down mid-transaction — is data consistent?
- Redis goes down — can workflows still run? (They shouldn't be lost)
- LLM API returns 429 (rate limited) — do you retry? With backoff?
- Network timeout after 30 seconds — is the LLM still processing? Do you retry and get charged twice?

### 13.2 Security Thinking

For every feature, ask:
1. **Authentication:** Can this be called without logging in? Should it be?
2. **Authorization:** Can User A access User B's data? Check workspace_id on EVERY query.
3. **Input validation:** Can the user send unexpected types/values?
4. **Secrets:** Are credentials ever exposed in logs, error messages, or API responses?
5. **Rate limiting:** Can someone abuse this endpoint to run up costs or crash the server?

### 13.3 Performance Thinking

For every feature, ask:
1. **What happens at 10x scale?** 10 workflows → fine. 10,000 workflows → does the list page freeze?
2. **What's the hottest path?** Workflow execution is the core loop — optimise there first.
3. **What can be cached?** Node type registry, user sessions, KB embeddings (same text = same vector)
4. **What can run in parallel?** Independent branches in a DAG, multiple LLM calls, batch embeddings

### 13.4 How to Read Other People's Code

You'll learn MOST by reading real open-source projects similar to Sandhi:

| Project | What to Learn | GitHub |
|---|---|---|
| **n8n** | Workflow automation architecture | github.com/n8n-io/n8n |
| **Langflow** | LLM workflow builder | github.com/langflow-ai/langflow |
| **Flowise** | Visual LLM chain builder | github.com/FlowiseAI/Flowise |
| **FastAPI Full-Stack Template** | FastAPI project structure | github.com/fastapi/full-stack-fastapi-template |
| **React Flow examples** | Canvas interactions | reactflow.dev/examples |

**How to read code efficiently:**
1. Start with `README.md` and docs
2. Find the entry point (`main.py`, `index.tsx`)
3. Trace a single request from start to finish
4. Read tests to understand expected behavior
5. Don't try to understand everything — focus on the part relevant to what you're building

### 13.5 Daily Practice Checklist

When working on Sandhi each day:

- [ ] **Before coding:** What am I building today? What's the smallest piece I can ship?
- [ ] **While coding:** Am I typing this or understanding it? If I changed one line, would I know what breaks?
- [ ] **After each feature:** What happens if I give it bad input? What happens under load? What happens when an external service is down?
- [ ] **Before committing:** Does this code make sense without comments? Are sensitive values out of the code?
- [ ] **End of session:** `git commit` with a meaningful message. What did I learn? What was confusing?

---

## Quick Reference: Build Order Checklist

| # | What | Depends On | You're Done When |
|---|---|---|---|
| 1 | Docker Compose (Postgres + Redis + MinIO) | Nothing | `docker compose up` shows 3 healthy services |
| 2 | Backend skeleton (FastAPI + config + DB session) | #1 | `/health` returns `{"status": "ok"}` |
| 3 | User model + migration | #2 | `users` table exists in Postgres |
| 4 | Auth (register + login + JWT) | #3 | You can register, login, and call a protected route |
| 5 | Workspace model + CRUD | #4 | You can create and list workspaces |
| 6 | Workflow model + CRUD | #5 | You can create, update, and save workflow graphs |
| 7 | Node registry + first 3 nodes | #2 | You can call node runners independently in tests |
| 8 | DAG executor | #7 | You can execute a simple 3-node chain |
| 9 | Run model + execution API | #6, #8 | `POST /workflows/{id}/run` returns results |
| 10 | Frontend scaffold (Vite + Tailwind + Router) | Nothing (parallel with backend) | Login page renders |
| 11 | Auth pages + API client | #10, #4 | You can login from the frontend |
| 12 | App shell + navigation | #11 | Sidebar, header, page routing all work |
| 13 | Workflow list page | #12, #6 | See your workflows in the UI |
| 14 | Workflow canvas (React Flow) | #12 | Can place and connect nodes on canvas |
| 15 | Node palette + drag-and-drop | #14 | Can drag nodes from palette to canvas |
| 16 | Node config panel | #14 | Can configure nodes in the right panel |
| 17 | Save/load workflows | #14, #6 | Canvas state persists to DB and back |
| 18 | Run workflow from canvas | #17, #9 | Click Run → see results on canvas nodes |
| 19 | WebSocket + real-time updates | #18 | See nodes light up as they execute |
| 20 | Run history + inspector | #19 | See past runs, click to inspect |
| 21 | Knowledge base CRUD | #5 | Create/list KBs in the API |
| 22 | RAG ingestion (upload → embed) | #21 | Upload a PDF, see chunks in DB |
| 23 | RAG retrieval (query → results) | #22 | Query returns relevant chunks |
| 24 | RAG nodes in canvas | #23, #14 | Use KB Query node in a workflow |
| 25 | Integrations (Gmail, Slack) | #5 | Send an email/message from a workflow |
| 26 | Deployment (API, webhook, schedule) | #9 | Expose workflow as API endpoint |
| 27 | Template system | #6 | Save/use/browse templates |
| 28 | Analytics dashboard | #9 | See token usage + cost charts |
| 29 | Settings, secrets, API keys | #5 | Manage workspace settings in UI |
| 30 | Testing & polish | Everything | >80% test coverage, smooth UX |

---

## You've Got This

Building Sandhi is a serious project — but you have detailed blueprints (your docs), a clear build order, and you'll learn more from building this ONE project than from 100 tutorials.

**The secret:** Every senior engineer you'll ever meet built their skills by building things that were slightly too hard for them, getting stuck, and figuring it out. You're doing exactly that now.

Start with Phase 2 (monorepo scaffold). Get your first `git commit`. Then keep going.

---

*End of Learning Guide*
