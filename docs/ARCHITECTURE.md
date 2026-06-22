# Sandhi — System Architecture Document

> **Version:** 1.0  
> **Created:** 2026-03-07  
> **Companion to:** [PRD.md](PRD.md)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack Decisions](#2-tech-stack-decisions)
3. [System Components Deep Dive](#3-system-components-deep-dive)
4. [Data Architecture](#4-data-architecture)
5. [Workflow Execution Engine](#5-workflow-execution-engine)
6. [Integration Framework](#6-integration-framework)
7. [RAG Pipeline Architecture](#7-rag-pipeline-architecture)
8. [API & Deployment Layer](#8-api--deployment-layer)
9. [Real-Time Communication](#9-real-time-communication)
10. [Security Architecture](#10-security-architecture)
11. [Infrastructure & Deployment](#11-infrastructure--deployment)
12. [Efficiency & Code Minimization Strategies](#12-efficiency--code-minimization-strategies)

---

## 1. Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Web App      │  │  API Clients │  │  Webhook Callers  │  │
│  │  (React SPA)  │  │  (REST/SDK)  │  │  (External)       │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
└─────────┼─────────────────┼────────────────────┼────────────┘
          │                 │                    │
          ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      GATEWAY LAYER                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Gateway (rate limit, auth, routing, CORS)         │ │
│  └────────────────────────┬───────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────────┐
          ▼                 ▼                     ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Core API    │  │  Workflow Engine  │  │  WebSocket Server│
│  (FastAPI)   │  │  (Workers)       │  │  (Live updates)  │
│              │  │                  │  │                  │
│ • CRUD ops   │  │ • DAG executor   │  │ • Execution logs │
│ • Auth/users │  │ • Node runners   │  │ • Canvas sync    │
│ • Templates  │  │ • Retry logic    │  │ • Notifications  │
│ • KB mgmt    │  │ • Sandboxing     │  │                  │
└──────┬───────┘  └────────┬─────────┘  └──────────────────┘
       │                   │
       ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Postgres │  │  Redis   │  │ pgvector │  │  Object    │  │
│  │ (main DB)│  │ (cache + │  │ (vectors)│  │  Storage   │  │
│  │          │  │  queue)  │  │          │  │  (S3/Minio)│  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐  │
│  │ OpenAI │ │ Anthro │ │ Gmail  │ │ Slack  │ │ 40+ more │  │
│  │ API    │ │ pic    │ │ API    │ │ API    │ │ integ.   │  │
│  └────────┘ └────────┘ └────────┘ └────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Monorepo vs Polyrepo | **Monorepo** (Turborepo) | Shared types, atomic changes, simpler CI |
| API style | **REST + WebSocket** | REST for CRUD, WS for real-time execution |
| Backend language | **Python (FastAPI)** | Best AI/ML ecosystem; async native; fast enough |
| Frontend framework | **React + React Flow** | Mature node editor; huge ecosystem |
| Database | **PostgreSQL + pgvector** | One DB for relational + vector = less infra |
| Task queue | **Redis + BullMQ-like (ARQ / Celery)** | Proven, simple, observable |
| Execution isolation | **Docker containers (gVisor)** | Security for custom code nodes |
| Auth | **Built-in (JWT) + OAuth providers** | Full control; no vendor lock-in |

---

## 2. Tech Stack Decisions

### Why This Stack Minimizes Code

| Layer | Technology | Lines-of-Code Advantage |
|---|---|---|
| **Backend** | FastAPI + Pydantic | Auto-generates OpenAPI docs, validation, serialization from type hints. ~60% less boilerplate than Express/NestJS |
| **ORM** | SQLModel (SQLAlchemy + Pydantic) | Single model class = DB schema + API schema + validation. No separate DTOs |
| **Migrations** | Alembic (auto-generate) | `alembic revision --autogenerate` detects model changes automatically |
| **Task Queue** | ARQ (async Redis queue) | ~10 lines to define a worker vs. ~50+ for Celery setup |
| **Frontend** | React + React Flow | Node editor is a library, not custom code. ~200 lines for full canvas vs ~2000 from scratch |
| **Styling** | Tailwind CSS | Utility-first = no CSS files; co-located styles |
| **State** | Zustand | ~5 lines for a store vs ~30 for Redux slice + actions + reducer |
| **Forms** | React Hook Form + Zod | Schema-driven forms with validation in ~10 lines per form |
| **Auth** | FastAPI-Users | Complete auth system (register, login, OAuth, JWT, password reset) in ~20 lines of config |
| **Vector Search** | pgvector | No separate vector DB service; SQL queries for vectors |

### Full Stack Map

```
Frontend (SPA)
├── React 18+ (UI framework)
├── TypeScript (type safety)
├── React Flow (node editor canvas)
├── Zustand (state management)
├── TanStack Query (server state / caching)
├── React Hook Form + Zod (forms + validation)
├── Tailwind CSS (styling)
├── shadcn/ui (component library — copy-paste, no dependency)
├── Monaco Editor (code node editor)
├── Vite (build tool)
└── Socket.IO Client (real-time)

Backend (API + Workers)
├── Python 3.12+
├── FastAPI (HTTP framework)
├── SQLModel (ORM — SQLAlchemy + Pydantic hybrid)
├── Alembic (database migrations)
├── ARQ (async task queue on Redis)
├── Pydantic v2 (validation + serialization)
├── FastAPI-Users (auth + user management)
├── httpx (async HTTP client for integrations)
├── litellm (universal LLM API client — one interface for all providers)
├── tiktoken (token counting)
├── Socket.IO Server (real-time)
├── python-multipart (file uploads)
├── cryptography (Fernet — secret encryption)
└── structlog (structured logging)

Data
├── PostgreSQL 16+ (primary database)
├── pgvector extension (vector similarity search)
├── Redis 7+ (cache, queue, pub/sub, rate limiting)
└── MinIO / S3 (file & document storage)

Infrastructure
├── Docker + Docker Compose (containerization)
├── Caddy or Traefik (reverse proxy + auto TLS)
├── GitHub Actions (CI/CD)
└── Prometheus + Grafana (monitoring)
```

---

## 3. System Components Deep Dive

### 3.1 Core API Server

The central FastAPI application handles all CRUD operations, auth, and orchestrates workflow execution.

**Router Structure (URL → Handler mapping):**

```
/api/v1/
├── /auth/                          # Authentication
│   ├── POST   /register            # Create account
│   ├── POST   /login               # Get JWT tokens
│   ├── POST   /logout              # Invalidate refresh token
│   ├── POST   /refresh             # Refresh access token
│   ├── GET    /oauth/{provider}    # Start OAuth flow
│   └── GET    /oauth/{provider}/cb # OAuth callback
│
├── /users/                         # User management
│   ├── GET    /me                  # Current user profile
│   └── PATCH  /me                  # Update profile
│
├── /workspaces/                    # Workspace management
│   ├── GET    /                    # List user's workspaces
│   ├── POST   /                    # Create workspace
│   ├── GET    /{ws_id}             # Get workspace details
│   ├── PATCH  /{ws_id}             # Update workspace
│   ├── DELETE /{ws_id}             # Delete workspace
│   └── /members/                   # Workspace members
│       ├── GET    /                # List members
│       ├── POST   /               # Invite member
│       ├── PATCH  /{user_id}      # Update role
│       └── DELETE /{user_id}      # Remove member
│
├── /workflows/                     # Workflow CRUD
│   ├── GET    /                    # List workflows in workspace
│   ├── POST   /                    # Create workflow
│   ├── GET    /{wf_id}            # Get workflow (with full graph JSON)
│   ├── PATCH  /{wf_id}           # Update workflow (graph, name, etc.)
│   ├── DELETE /{wf_id}           # Delete workflow
│   ├── POST   /{wf_id}/run       # Trigger manual execution
│   ├── POST   /{wf_id}/deploy    # Deploy (API, schedule, webhook)
│   ├── DELETE /{wf_id}/deploy    # Undeploy
│   ├── POST   /{wf_id}/duplicate # Clone workflow
│   └── POST   /{wf_id}/template  # Save as template
│
├── /runs/                          # Execution history
│   ├── GET    /                    # List runs (filterable)
│   ├── GET    /{run_id}           # Get run details + per-node results
│   ├── POST   /{run_id}/cancel   # Cancel running execution
│   └── GET    /{run_id}/logs     # Stream execution logs
│
├── /templates/                     # Template gallery
│   ├── GET    /                    # Browse templates
│   ├── GET    /{tmpl_id}         # Template details
│   ├── POST   /{tmpl_id}/use     # Create workflow from template
│   ├── POST   /                   # Submit community template
│   └── POST   /{tmpl_id}/rate    # Rate a template
│
├── /knowledge-bases/               # RAG knowledge bases
│   ├── GET    /                    # List KBs
│   ├── POST   /                    # Create KB
│   ├── GET    /{kb_id}            # KB details + stats
│   ├── PATCH  /{kb_id}           # Update KB settings
│   ├── DELETE /{kb_id}           # Delete KB
│   ├── POST   /{kb_id}/documents # Upload documents
│   ├── GET    /{kb_id}/documents # List documents
│   ├── DELETE /{kb_id}/documents/{doc_id}  # Remove document
│   ├── POST   /{kb_id}/query     # Test query (semantic search)
│   └── POST   /{kb_id}/reindex   # Re-embed all documents
│
├── /integrations/                  # Third-party connections
│   ├── GET    /available          # List all available integrations
│   ├── GET    /connected          # List user's connected integrations
│   ├── POST   /{provider}/connect    # Start OAuth or save API key
│   ├── DELETE /{provider}/disconnect # Revoke connection
│   └── POST   /{provider}/test      # Test connection health
│
├── /secrets/                       # Encrypted secrets
│   ├── GET    /                    # List secret names (not values)
│   ├── POST   /                    # Create secret
│   ├── PATCH  /{secret_id}       # Update secret value
│   └── DELETE /{secret_id}       # Delete secret
│
├── /api-keys/                      # API key management
│   ├── GET    /                    # List API keys
│   ├── POST   /                    # Create API key
│   ├── PATCH  /{key_id}          # Update key (name, scope)
│   └── DELETE /{key_id}          # Revoke key
│
├── /analytics/                     # Usage analytics
│   ├── GET    /usage              # Token/cost usage summary
│   ├── GET    /runs               # Run count / success rate over time
│   └── GET    /top-workflows      # Most executed workflows
│
└── /webhook/{endpoint_id}          # Dynamic webhook endpoints
    └── POST   /                    # Receive webhook → trigger workflow
```

### 3.2 Workflow Execution Engine (Worker)

The heart of the platform — runs workflow DAGs asynchronously.

**Architecture Pattern: Actor-per-Node**

```
                    ┌─────────────────┐
                    │  Run Request     │
                    │  (from API)      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Orchestrator    │
                    │                 │
                    │ 1. Load graph   │
                    │ 2. Topo-sort    │
                    │ 3. Dispatch     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  Node A  │  │  Node B  │  │  Node C  │
        │  Runner  │  │  Runner  │  │  Runner  │
        └─────┬────┘  └─────┬────┘  └──────────┘
              │              │          (waits for A+B)
              ▼              ▼              │
        ┌─────────────────────┐            │
        │  Results Store      │◄───────────┘
        │  (Redis hash)       │
        └─────────────────────┘
```

**Execution Algorithm (Pseudocode):**

```python
async def execute_workflow(run_id: str, graph: WorkflowGraph, inputs: dict):
    """
    Core execution loop — ~80 lines of real code.
    Efficiency: uses asyncio.gather for parallel branches.
    """
    # 1. Build dependency map
    deps = {node.id: set(node.input_edges) for node in graph.nodes}
    results = {}
    completed = set()
    
    # 2. Find ready nodes (no unmet dependencies)
    def get_ready():
        return [n for n in graph.nodes 
                if n.id not in completed 
                and deps[n.id].issubset(completed)]
    
    # 3. Execute in waves until all done
    while len(completed) < len(graph.nodes):
        ready = get_ready()
        if not ready:
            raise CyclicGraphError(run_id)
        
        # Run all ready nodes in parallel
        wave_results = await asyncio.gather(*[
            execute_node(run_id, node, results) 
            for node in ready
        ], return_exceptions=True)
        
        for node, result in zip(ready, wave_results):
            if isinstance(result, Exception):
                await handle_node_error(run_id, node, result)
            else:
                results[node.id] = result
                completed.add(node.id)
                await emit_node_complete(run_id, node.id, result)
    
    return results
```

**Node Runner Pattern (Plugin-based):**

```python
# Each node type is a simple async function registered in a registry.
# Adding a new node type = ONE function + ONE registry entry.

NODE_REGISTRY: dict[str, NodeRunner] = {}

def register_node(node_type: str):
    """Decorator — register a node runner in ~1 line per node type."""
    def decorator(func):
        NODE_REGISTRY[node_type] = func
        return func
    return decorator

@register_node("llm_call")
async def run_llm_call(config: dict, inputs: dict, ctx: RunContext) -> dict:
    response = await ctx.litellm.completion(
        model=config["model"],
        messages=[
            {"role": "system", "content": config["system_prompt"]},
            {"role": "user", "content": resolve_template(config["user_prompt"], inputs)}
        ],
        temperature=config.get("temperature", 0.7),
        max_tokens=config.get("max_tokens", 1024),
    )
    return {
        "response_text": response.choices[0].message.content,
        "token_usage": response.usage.dict(),
        "cost": response._hidden_params.get("response_cost", 0),
    }

@register_node("condition")
async def run_condition(config: dict, inputs: dict, ctx: RunContext) -> dict:
    result = safe_eval(config["expression"], inputs)
    return {"branch": "true" if result else "false", "value": result}

@register_node("http_request")
async def run_http_request(config: dict, inputs: dict, ctx: RunContext) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.request(
            method=config["method"],
            url=resolve_template(config["url"], inputs),
            headers=config.get("headers", {}),
            json=config.get("body"),
            timeout=config.get("timeout", 30),
        )
    return {"status": resp.status_code, "body": resp.json(), "headers": dict(resp.headers)}

# ... each new node type is ~10-20 lines
```

### 3.3 Frontend Canvas Architecture

**State Management (Zustand — minimal boilerplate):**

```typescript
// ONE store file manages entire workflow editor state

interface WorkflowStore {
  // State
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  runStatus: RunStatus | null;
  
  // Actions
  addNode: (type: string, position: XYPosition) => void;
  removeNode: (id: string) => void;
  updateNodeConfig: (id: string, config: Record<string, any>) => void;
  connectNodes: (source: string, target: string) => void;
  
  // Execution
  startRun: () => Promise<void>;
  cancelRun: () => void;
  
  // Serialization
  toJSON: () => WorkflowGraph;
  fromJSON: (graph: WorkflowGraph) => void;
}
```

**Node Component Pattern (1 component per node category, not per node type):**

```typescript
// EFFICIENCY: Generic node component renders ALL node types.
// Node-type-specific behavior comes from a config registry.
// ~50 lines for the generic component vs ~50 lines PER type.

const GenericNode: React.FC<NodeProps> = ({ id, data }) => {
  const config = NODE_TYPE_REGISTRY[data.type];  // Lookup metadata
  
  return (
    <div className={cn("rounded-lg border-2 shadow-sm", config.colorClass)}>
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2 p-2 border-b">
        <config.Icon className="w-4 h-4" />
        <span className="font-medium text-sm">{data.label}</span>
      </div>
      <div className="p-2 text-xs text-muted-foreground">
        {config.summary(data.config)}  {/* e.g., "GPT-4o • 0.7 temp" */}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};
```

---

## 4. Data Architecture

### 4.1 Database Schema (PostgreSQL)

**Design Principle:** Workflow graphs stored as JSONB — not as normalized node/edge tables. This is critical for efficiency: one read/write per workflow instead of N+M reads for N nodes + M edges.

```sql
-- ============================================================
-- CORE TABLES
-- ============================================================

-- Users (managed by FastAPI-Users, extended here)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255),
    display_name    VARCHAR(100),
    avatar_url      TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    is_verified     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces (multi-tenant boundary)
CREATE TABLE workspaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    owner_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    settings        JSONB DEFAULT '{}',          -- quotas, defaults, etc.
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace membership
CREATE TABLE workspace_members (
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    joined_at       TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

-- ============================================================
-- WORKFLOWS
-- ============================================================

-- Workflow definitions
CREATE TABLE workflows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    -- THE GRAPH: entire workflow structure in one JSONB column
    -- Schema: { nodes: [...], edges: [...], variables: {...} }
    graph           JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[],"variables":{}}',
    -- Canvas viewport state (position, zoom)
    viewport        JSONB DEFAULT '{"x":0,"y":0,"zoom":1}',
    is_active       BOOLEAN DEFAULT TRUE,
    version         INTEGER DEFAULT 1,
    tags            TEXT[] DEFAULT '{}',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflows_workspace ON workflows(workspace_id);
CREATE INDEX idx_workflows_tags ON workflows USING GIN(tags);

-- Workflow deployments (how a workflow is exposed)
CREATE TABLE deployments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id     UUID REFERENCES workflows(id) ON DELETE CASCADE,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('api', 'schedule', 'webhook', 'worker')),
    -- Type-specific config:
    -- api:      { "path": "/summarize", "method": "POST", "auth": "api_key" }
    -- schedule: { "cron": "0 9 * * 1-5", "timezone": "America/New_York" }
    -- webhook:  { "secret": "whsec_...", "allowed_ips": [] }
    -- worker:   { "restart_policy": "always", "max_restarts": 3 }
    config          JSONB NOT NULL DEFAULT '{}',
    endpoint_id     VARCHAR(50) UNIQUE,          -- for webhook/API URL routing
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deployments_workflow ON deployments(workflow_id);
CREATE INDEX idx_deployments_endpoint ON deployments(endpoint_id);

-- ============================================================
-- EXECUTION
-- ============================================================

-- Workflow runs (execution instances)
CREATE TABLE runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id     UUID REFERENCES workflows(id) ON DELETE CASCADE,
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    trigger_type    VARCHAR(20) NOT NULL,         -- 'manual', 'schedule', 'webhook', 'api'
    status          VARCHAR(20) NOT NULL DEFAULT 'created'
                    CHECK (status IN ('created','queued','running','completed','failed','cancelled','timed_out')),
    -- Snapshot of the graph at execution time (immutable)
    graph_snapshot  JSONB NOT NULL,
    -- Input data that triggered this run
    trigger_data    JSONB DEFAULT '{}',
    -- Per-node results: { "node_id": { status, output, started_at, ended_at, error } }
    node_results    JSONB DEFAULT '{}',
    -- Final output of the workflow
    output          JSONB,
    -- Aggregate metrics
    total_tokens    INTEGER DEFAULT 0,
    total_cost      DECIMAL(10,6) DEFAULT 0,
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_runs_workflow ON runs(workflow_id);
CREATE INDEX idx_runs_workspace ON runs(workspace_id);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_created ON runs(created_at DESC);

-- ============================================================
-- KNOWLEDGE BASE (RAG)
-- ============================================================

-- Knowledge bases
CREATE TABLE knowledge_bases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    chunk_size      INTEGER DEFAULT 512,
    chunk_overlap   INTEGER DEFAULT 50,
    similarity_metric VARCHAR(20) DEFAULT 'cosine',
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Documents in a knowledge base
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kb_id           UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    filename        VARCHAR(500) NOT NULL,
    mime_type       VARCHAR(100),
    file_size       BIGINT,
    storage_path    TEXT NOT NULL,                -- S3/MinIO path
    content_hash    VARCHAR(64),                  -- SHA-256 for dedup
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','ready','failed')),
    chunk_count     INTEGER DEFAULT 0,
    custom_metadata JSONB DEFAULT '{}',
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_kb ON documents(kb_id);
CREATE UNIQUE INDEX idx_documents_hash ON documents(kb_id, content_hash);

-- Document chunks with embeddings (pgvector)
CREATE TABLE chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID REFERENCES documents(id) ON DELETE CASCADE,
    kb_id           UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    -- pgvector column: 1536 dimensions for text-embedding-3-small
    embedding       vector(1536),
    chunk_index     INTEGER NOT NULL,             -- order within document
    token_count     INTEGER,
    metadata        JSONB DEFAULT '{}',           -- page_number, heading, etc.
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX idx_chunks_embedding ON chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_chunks_kb ON chunks(kb_id);
CREATE INDEX idx_chunks_doc ON chunks(document_id);

-- ============================================================
-- TEMPLATES
-- ============================================================

CREATE TABLE templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    category        VARCHAR(50),
    tags            TEXT[] DEFAULT '{}',
    -- The workflow graph (same schema as workflows.graph)
    graph           JSONB NOT NULL,
    -- Which fields are parameterized
    -- [{ "node_id": "...", "field": "model", "label": "Choose Model", "type": "select", "options": [...] }]
    parameters      JSONB DEFAULT '[]',
    thumbnail_url   TEXT,
    author_id       UUID REFERENCES users(id),
    workspace_id    UUID REFERENCES workspaces(id),  -- NULL = public/official
    is_public       BOOLEAN DEFAULT FALSE,
    use_count       INTEGER DEFAULT 0,
    avg_rating      DECIMAL(3,2) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_public ON templates(is_public);
CREATE INDEX idx_templates_search ON templates USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Template ratings
CREATE TABLE template_ratings (
    template_id     UUID REFERENCES templates(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (template_id, user_id)
);

-- ============================================================
-- INTEGRATIONS & SECRETS
-- ============================================================

-- Connected integrations (OAuth tokens, API keys)
CREATE TABLE integrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    provider        VARCHAR(50) NOT NULL,         -- 'gmail', 'slack', 'notion', etc.
    display_name    VARCHAR(100),
    -- Encrypted credentials
    credentials     BYTEA NOT NULL,               -- Fernet-encrypted JSON
    status          VARCHAR(20) DEFAULT 'active',
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,                  -- For OAuth tokens that expire
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_integrations_workspace ON integrations(workspace_id);

-- User-defined secrets (encrypted environment variables)
CREATE TABLE secrets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    encrypted_value BYTEA NOT NULL,               -- Fernet-encrypted
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, name)
);

-- API keys for deployed workflow endpoints
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    key_hash        VARCHAR(64) NOT NULL,         -- SHA-256 hash (never store plaintext)
    key_prefix      VARCHAR(12) NOT NULL,         -- e.g., "sk-sand-a1b2" for display
    scopes          TEXT[] DEFAULT '{}',           -- workflow IDs this key can access
    rate_limit      INTEGER DEFAULT 100,          -- requests per minute
    is_active       BOOLEAN DEFAULT TRUE,
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id),
    action          VARCHAR(50) NOT NULL,          -- 'workflow.created', 'run.started', etc.
    resource_type   VARCHAR(50),
    resource_id     UUID,
    details         JSONB DEFAULT '{}',
    ip_address      INET,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_workspace ON audit_logs(workspace_id, created_at DESC);
```

### 4.2 Redis Data Structures

```
# Task Queue (ARQ)
arq:queue:default         — LIST of pending workflow execution tasks
arq:queue:priority        — LIST of priority tasks (API-triggered)
arq:results:{job_id}      — STRING with job result (TTL: 1 hour)

# Live Execution State (per run)
run:{run_id}:status       — STRING: "running", "completed", etc.
run:{run_id}:nodes        — HASH: { node_id: JSON(status, output) }
run:{run_id}:logs         — LIST: append-only log entries

# Rate Limiting
ratelimit:{api_key}:{window}  — STRING with counter (TTL: window size)

# Caching
cache:workflow:{wf_id}    — STRING: serialized workflow graph (TTL: 5m)
cache:template:list       — STRING: template gallery cache (TTL: 1h)

# Pub/Sub Channels (for WebSocket relay)
ws:run:{run_id}           — Channel for execution updates
ws:workspace:{ws_id}      — Channel for workspace-level notifications

# Scheduled Jobs
schedule:{deployment_id}  — HASH: { cron, next_run, workflow_id }
```

### 4.3 Object Storage Structure (S3 / MinIO)

```
sandhi-storage/
├── documents/
│   └── {workspace_id}/
│       └── {kb_id}/
│           └── {document_id}/{filename}
├── uploads/
│   └── {workspace_id}/
│       └── {run_id}/
│           └── {filename}                 # Files generated during runs
├── exports/
│   └── {workspace_id}/
│       └── {workflow_id}_v{version}.json  # Exported workflow files
└── thumbnails/
    └── templates/
        └── {template_id}.png              # Template preview images
```

---

## 5. Workflow Execution Engine

### 5.1 DAG Execution — Detailed Flow

```
User clicks "Run" or API call received
         │
         ▼
┌─────────────────────────────────────┐
│  1. VALIDATE                        │
│  • Parse graph JSON                 │
│  • Check for cycles (Kahn's algo)  │
│  • Validate node configs            │
│  • Resolve variable references      │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  2. SNAPSHOT & QUEUE                │
│  • Snapshot graph (immutable copy)  │
│  • Create run record (status=queued)│
│  • Push to Redis task queue         │
│  • Return run_id to caller          │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  3. WORKER PICKS UP                 │
│  • Dequeue task                     │
│  • Set run status = running         │
│  • Build execution plan (topo sort) │
│  • Set up RunContext (secrets, etc.) │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  4. EXECUTE WAVE BY WAVE            │
│  • Find ready nodes (deps met)      │
│  • Execute batch via asyncio.gather │
│  • Store results in Redis hash      │
│  • Publish updates via pub/sub      │
│  • Handle errors (retry/skip/fail)  │
│  • Repeat until all nodes done      │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  5. FINALIZE                        │
│  • Aggregate token usage + costs    │
│  • Persist node_results to Postgres │
│  • Set run status = completed/failed│
│  • Publish completion event         │
│  • Clean up Redis ephemeral data    │
└─────────────────────────────────────┘
```

### 5.2 Retry & Error Handling Strategy

```python
# Per-node retry configuration
class RetryConfig:
    max_retries: int = 3
    backoff: Literal["fixed", "exponential"] = "exponential"
    base_delay: float = 1.0        # seconds
    max_delay: float = 60.0
    retry_on: list[str] = ["timeout", "rate_limit", "5xx"]  # error categories

# Error handling hierarchy:
# 1. Node retries (automatic, per retry config)
# 2. Error Handler node (if connected — user-defined recovery)
# 3. Workflow-level on_error policy: "stop" | "continue" | "fallback"
# 4. Dead letter: persist failed run for manual inspection
```

### 5.3 Custom Code Sandbox

For "Code" nodes where users write Python/JS:

```
User's code snippet
       │
       ▼
┌──────────────────────┐
│  Container (gVisor)  │
│  • No network access │
│  • 256MB RAM limit   │
│  • 30s timeout       │
│  • Read-only FS      │
│  • Stdin: inputs     │
│  • Stdout: outputs   │
└──────────────────────┘
```

For MVP (simpler): use RestrictedPython or a subprocess with resource limits.

---

## 6. Integration Framework

### 6.1 Adapter Pattern (Minimal Code Per Integration)

```python
# Base class: ~40 lines. Every integration extends this.
# Adding a new integration = ONE class with ~30-50 lines.

class BaseIntegration(ABC):
    """All integrations implement this interface."""
    
    provider: str                          # e.g., "gmail"
    auth_type: Literal["oauth2", "api_key", "bearer", "none"]
    
    @abstractmethod
    async def execute(self, action: str, params: dict, credentials: dict) -> dict:
        """Run an integration action. Returns result dict."""
        ...
    
    @abstractmethod
    def get_actions(self) -> list[ActionSchema]:
        """List available actions with input/output schemas."""
        ...
    
    # Optional: OAuth helpers (default implementations provided)
    def get_oauth_url(self, redirect_uri: str) -> str: ...
    async def exchange_code(self, code: str) -> dict: ...
    async def refresh_token(self, refresh_token: str) -> dict: ...


# Example: Gmail integration in ~40 lines
class GmailIntegration(BaseIntegration):
    provider = "gmail"
    auth_type = "oauth2"
    
    def get_actions(self):
        return [
            ActionSchema(name="send_email", inputs={"to", "subject", "body"}, outputs={"message_id"}),
            ActionSchema(name="search_emails", inputs={"query", "max_results"}, outputs={"emails"}),
            ActionSchema(name="read_email", inputs={"message_id"}, outputs={"subject", "body", "from", "date"}),
        ]
    
    async def execute(self, action: str, params: dict, credentials: dict) -> dict:
        client = await self._get_client(credentials)  # handles token refresh
        
        match action:
            case "send_email":
                msg = self._build_message(params["to"], params["subject"], params["body"])
                result = await client.send(msg)
                return {"message_id": result["id"]}
            
            case "search_emails":
                results = await client.search(params["query"], max_results=params.get("max_results", 10))
                return {"emails": results}
            
            case "read_email":
                email = await client.get(params["message_id"])
                return {"subject": email.subject, "body": email.body, "from": email.sender, "date": email.date}


# Registration is automatic via __init_subclass__ or a decorator:
INTEGRATION_REGISTRY: dict[str, BaseIntegration] = {}

# The node runner for ANY integration is generic:
@register_node("integration")
async def run_integration(config: dict, inputs: dict, ctx: RunContext) -> dict:
    integration = INTEGRATION_REGISTRY[config["provider"]]
    credentials = await ctx.get_credentials(config["provider"])
    return await integration.execute(config["action"], {**config["params"], **inputs}, credentials)
```

### 6.2 OAuth Flow

```
User clicks "Connect Gmail"
    │
    ▼
Frontend redirects to → /api/v1/integrations/gmail/connect
    │
    ▼
Backend generates OAuth URL → redirects user to Google consent screen
    │
    ▼
User authorizes → Google redirects to → /api/v1/auth/oauth/gmail/callback?code=...
    │
    ▼
Backend exchanges code for tokens → encrypts → stores in `integrations` table
    │
    ▼
Frontend shows "Gmail Connected ✓"
```

---

## 7. RAG Pipeline Architecture

### 7.1 Ingestion Pipeline

```
File upload / URL
       │
       ▼
┌──────────────────┐
│  1. EXTRACT TEXT  │  — PDF: pymupdf, DOCX: python-docx, HTML: beautifulsoup
│                   │  — Unified text output
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  2. CHUNK         │  — Strategy based on KB config
│                   │  — Attach metadata: page, heading, source
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  3. EMBED         │  — Batch embedding via litellm
│                   │  — Rate-limited to stay under API limits
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  4. STORE         │  — Upsert chunks + vectors into pgvector
│                   │  — Update document status = 'ready'
└──────────────────┘
```

### 7.2 Retrieval Pipeline

```
User query
    │
    ▼
┌──────────────────┐
│  1. EMBED QUERY   │  — Same model as ingestion
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  2. VECTOR SEARCH │  — pgvector: ORDER BY embedding <=> query_vec LIMIT top_k
│                   │  — Apply metadata filters (WHERE clauses)
└────────┬─────────┘
         │
         ▼ (optional)
┌──────────────────┐
│  3. HYBRID SEARCH │  — BM25 keyword search via pg_trgm or tsvector
│                   │  — Combine with vector results using RRF
└────────┬─────────┘
         │
         ▼ (optional)
┌──────────────────┐
│  4. RE-RANK       │  — Cross-encoder model for precision
│                   │  — Useful when top_k is large
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  5. FORMAT        │  — Build context string for LLM
│                   │  — Include source citations
└──────────────────┘
```

### 7.3 Key Query (SQL)

```sql
-- Semantic search with metadata filtering (~5 lines of SQL)
SELECT c.id, c.content, c.metadata,
       1 - (c.embedding <=> $1::vector) AS similarity
FROM chunks c
WHERE c.kb_id = $2
  AND ($3::jsonb IS NULL OR c.metadata @> $3)         -- metadata filter
  AND 1 - (c.embedding <=> $1::vector) >= $4           -- score threshold
ORDER BY c.embedding <=> $1::vector
LIMIT $5;
```

---

## 8. API & Deployment Layer

### 8.1 Dynamic API Routing

When a workflow is deployed as API, a dynamic route is created:

```python
# Dynamic routing — NO new code per deployed workflow.
# One catch-all route handles all deployed workflow APIs.

@app.post("/api/v1/run/{endpoint_id}")
async def handle_deployed_workflow(
    endpoint_id: str,
    request: Request,
    api_key: str = Depends(verify_api_key),
):
    # 1. Look up deployment by endpoint_id
    deployment = await get_deployment(endpoint_id)
    if not deployment or not deployment.is_active:
        raise HTTPException(404, "Endpoint not found")
    
    # 2. Validate API key scope
    if deployment.workflow_id not in api_key.scopes:
        raise HTTPException(403, "Key not authorized for this workflow")
    
    # 3. Rate limit check
    await check_rate_limit(api_key)
    
    # 4. Parse request body as workflow inputs
    body = await request.json()
    
    # 5. Trigger execution
    run_id = await trigger_workflow_run(
        workflow_id=deployment.workflow_id,
        trigger_type="api",
        trigger_data=body,
    )
    
    # 6. Wait for result (sync mode) or return run_id (async mode)
    if request.headers.get("X-Sandhi-Async") == "true":
        return {"run_id": run_id, "status": "queued"}
    else:
        result = await wait_for_run(run_id, timeout=300)
        return result.output
```

### 8.2 Scheduler

```python
# Cron scheduler — checks Redis every 30 seconds for due jobs

async def scheduler_loop():
    while True:
        now = datetime.utcnow()
        due_deployments = await get_due_scheduled_deployments(now)
        
        for dep in due_deployments:
            await trigger_workflow_run(
                workflow_id=dep.workflow_id,
                trigger_type="schedule",
                trigger_data={"scheduled_time": now.isoformat()},
            )
            await update_next_run(dep.id)  # Calculate next cron occurrence
        
        await asyncio.sleep(30)
```

---

## 9. Real-Time Communication

### WebSocket Architecture

```
Browser (Socket.IO Client)
    │
    ▼
┌─────────────────────────┐
│  WebSocket Server       │
│  (FastAPI + Socket.IO)  │
│                         │
│  Rooms:                 │
│  • run:{run_id}         │  ← Execution updates
│  • workspace:{ws_id}    │  ← Notifications
│  • editor:{wf_id}       │  ← Collaborative editing
└────────────┬────────────┘
             │ subscribes to
             ▼
┌─────────────────────────┐
│  Redis Pub/Sub          │
│                         │
│  Channels:              │
│  • ws:run:{run_id}      │  ← Workers publish node completions
│  • ws:workspace:{ws_id} │  ← API server publishes events
└─────────────────────────┘
```

**Event Types:**

```typescript
// Server → Client events
interface RunEvents {
  "run:started":       { run_id: string; workflow_id: string };
  "node:started":      { run_id: string; node_id: string };
  "node:completed":    { run_id: string; node_id: string; output: any; duration_ms: number };
  "node:failed":       { run_id: string; node_id: string; error: string; will_retry: boolean };
  "node:log":          { run_id: string; node_id: string; level: string; message: string };
  "run:completed":     { run_id: string; output: any; total_tokens: number; total_cost: number };
  "run:failed":        { run_id: string; error: string };
  "run:cancelled":     { run_id: string };
}
```

---

## 10. Security Architecture

### 10.1 Authentication Flow

```
┌───────┐     ┌──────────┐     ┌──────────┐
│Browser│────▶│  API GW  │────▶│ Auth Svc  │
│       │     │          │     │          │
│       │◀────│ JWT check│◀────│ Issue JWT│
└───────┘     └──────────┘     └──────────┘

Access Token:  15 min TTL, in memory (not localStorage)
Refresh Token: 7 day TTL, HttpOnly secure cookie
API Key:       No expiry by default, SHA-256 hashed in DB
```

### 10.2 Multi-Tenant Data Isolation

```python
# Every DB query automatically scoped to workspace via middleware.
# Uses SQLAlchemy event hooks — ZERO extra code per query.

@event.listens_for(Session, "do_orm_execute")
def _add_workspace_filter(execute_state):
    if execute_state.is_select:
        mapper = execute_state.bind_arguments.get("mapper")
        if hasattr(mapper.class_, "workspace_id"):
            execute_state.statement = execute_state.statement.filter(
                mapper.class_.workspace_id == g.current_workspace_id
            )
```

### 10.3 Secrets Handling

```python
# Secrets are Fernet-encrypted at rest.
# Decrypted only inside worker process, never logged.

from cryptography.fernet import Fernet

class SecretsManager:
    def __init__(self, master_key: str):
        self.fernet = Fernet(master_key.encode())
    
    def encrypt(self, value: str) -> bytes:
        return self.fernet.encrypt(value.encode())
    
    def decrypt(self, encrypted: bytes) -> str:
        return self.fernet.decrypt(encrypted).decode()
```

---

## 11. Infrastructure & Deployment

### 11.1 Docker Compose (Development)

```yaml
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [postgres, redis]
    environment:
      DATABASE_URL: postgresql+asyncpg://sandhi:sandhi@postgres:5432/sandhi
      REDIS_URL: redis://redis:6379
      
  worker:
    build: ./backend
    command: arq app.worker.WorkerSettings
    depends_on: [postgres, redis]
    
  scheduler:
    build: ./backend
    command: python -m app.scheduler
    depends_on: [postgres, redis]
    
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    
  postgres:
    image: pgvector/pgvector:pg16
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: sandhi
      POSTGRES_USER: sandhi
      POSTGRES_PASSWORD: sandhi
      
  redis:
    image: redis:7-alpine
    volumes: [redisdata:/data]
    
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    volumes: [miniodata:/data]

volumes:
  pgdata:
  redisdata:
  miniodata:
```

### 11.2 Production Architecture

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │  (Caddy/Nginx)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  API Pod │  │  API Pod │  │  WS Pod  │
        │  (x2+)  │  │  (x2+)  │  │  (x1+)   │
        └──────────┘  └──────────┘  └──────────┘
              │              │              │
              ▼              ▼              ▼
        ┌────────────────────────────────────────┐
        │  Managed PostgreSQL (HA)               │
        │  + pgvector extension                  │
        ├────────────────────────────────────────┤
        │  Managed Redis Cluster                 │
        ├────────────────────────────────────────┤
        │  S3 / Cloud Storage                    │
        └────────────────────────────────────────┘
              │
              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Worker   │  │ Worker   │  │ Worker   │
        │ Pod (x3+)│  │ Pod      │  │ Pod      │
        └──────────┘  └──────────┘  └──────────┘
        (auto-scales based on queue depth)
```

### 11.3 CI/CD Pipeline

```
Push to main
    │
    ├── Lint (ruff + eslint)
    ├── Type check (pyright + tsc)
    ├── Unit tests (pytest + vitest)
    │
    ▼ (all pass)
    ├── Build Docker images
    ├── Integration tests (docker-compose test env)
    │
    ▼ (all pass)
    ├── Push images to registry
    ├── Deploy to staging (auto)
    │
    ▼ (manual approval)
    └── Deploy to production (blue-green)
```

---

## 12. Efficiency & Code Minimization Strategies

### 12.1 Architecture-Level Efficiency

| Strategy | Lines Saved | How |
|---|---|---|
| **JSONB for workflow graphs** | ~500 lines | No node/edge CRUD endpoints; one column stores entire graph |
| **Generic node runner** | ~30 lines/node | One function per node type vs. separate handler+router+schema |
| **Plugin registry pattern** | ~200 lines | Decorator-based registration vs. manual switch/case routing |
| **SQLModel (Pydantic+SQLAlchemy)** | ~300 lines | Single model class = DB + API + validation (no separate DTOs) |
| **litellm for LLM calls** | ~400 lines | One interface for all LLM providers vs. per-provider clients |
| **Auto-generated OpenAPI** | ~500 lines | FastAPI generates full API docs from type hints |
| **Workspace scoping middleware** | ~200 lines | Auto-filter all queries vs. manual workspace_id in every query |
| **Dynamic API routing** | ~100 lines/deployment | One catch-all route vs. code-generating new routes |

**Estimated total: ~3,000+ fewer lines** compared to a naive implementation.

### 12.2 Code-Level Patterns

**Pattern 1: Config-Driven Node Forms (Frontend)**

```typescript
// Instead of writing a custom form component for each node type (~100 lines each),
// define node types as config objects (~15 lines each).
// ONE generic form renderer handles ALL node types.

const NODE_TYPES = {
  llm_call: {
    label: "LLM Call",
    icon: BrainIcon,
    color: "purple",
    category: "ai",
    fields: [
      { key: "model", type: "model-select", label: "Model", required: true },
      { key: "system_prompt", type: "textarea", label: "System Prompt" },
      { key: "user_prompt", type: "template-editor", label: "User Prompt", required: true },
      { key: "temperature", type: "slider", label: "Temperature", min: 0, max: 2, step: 0.1, default: 0.7 },
      { key: "max_tokens", type: "number", label: "Max Tokens", default: 1024 },
    ],
    outputs: ["response_text", "token_usage", "cost"],
  },
  // ... 15 lines per node type instead of 100
};
```

**Pattern 2: Schema-Driven Integration Actions (Backend)**

```python
# Instead of writing action handlers per integration per action,
# define actions declaratively and use a generic HTTP executor.

INTEGRATION_ACTIONS = {
    "slack": {
        "send_message": {
            "method": "POST",
            "url": "https://slack.com/api/chat.postMessage",
            "body_map": {"channel": "{{channel}}", "text": "{{message}}"},
            "result_map": {"message_id": "$.ts"},
        },
        "list_channels": {
            "method": "GET",
            "url": "https://slack.com/api/conversations.list",
            "result_map": {"channels": "$.channels[*].{id: id, name: name}"},
        },
    },
    # Many integrations are just REST calls — declarative config handles them.
}
```

**Pattern 3: Composable Middleware (Backend)**

```python
# Stack concerns as middleware instead of repeating in every endpoint.
# FastAPI dependencies make this trivial.

# These 4 lines replace ~5 lines of boilerplate in EVERY endpoint:
async def authenticated_workspace_endpoint(
    user: User = Depends(current_active_user),        # Auth
    workspace: Workspace = Depends(get_workspace),      # Tenant scope
    _: None = Depends(check_workspace_access),          # RBAC
    __: None = Depends(rate_limit),                     # Throttling
):
    return user, workspace
```

**Pattern 4: Shared TypeScript Types (Monorepo)**

```typescript
// packages/shared-types/src/workflow.ts
// SINGLE SOURCE OF TRUTH — used by both frontend and backend API client.
// Eliminates type duplication and drift.

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: string;                      // key into NODE_TYPES registry
  position: { x: number; y: number };
  config: Record<string, unknown>;   // type-specific config
  label: string;
}

export interface WorkflowEdge {
  id: string;
  source: string;                    // source node ID
  target: string;                    // target node ID
  sourceHandle?: string;             // for nodes with multiple outputs (e.g., condition → true/false)
}
```

### 12.3 Development Efficiency

| Practice | Impact |
|---|---|
| **Monorepo (Turborepo)** | Shared types, one PR for full-stack changes, unified CI |
| **Code generation from OpenAPI** | Auto-gen TypeScript API client from FastAPI spec |
| **Database migrations auto-generated** | `alembic revision --autogenerate` vs. hand-writing SQL |
| **Pre-commit hooks (ruff, eslint, prettier)** | Catch issues before CI; consistent formatting |
| **Docker Compose for dev** | One command to start entire stack |
| **Hot reload everywhere** | Vite (frontend) + uvicorn --reload (backend) |
| **Structured logging (structlog)** | JSON logs; easy to search/filter; no custom log formatting |
| **Feature flags** | Ship code behind flags; no long-lived branches |

### 12.4 Performance Optimization Targets

| Area | Technique | Expected Gain |
|---|---|---|
| Canvas rendering | React Flow virtualization (only render visible nodes) | 60fps with 500+ nodes |
| API responses | Redis cache for workflow reads (5m TTL) | 10x faster repeated reads |
| KB query | pgvector HNSW index | < 50ms for 1M vectors |
| Workflow execution | asyncio.gather for parallel branches | 2-5x faster complex workflows |
| File ingestion | Batch embedding (send 100 chunks per API call) | 10x fewer API calls |
| Template gallery | CDN-cached, paginated | < 100ms load time |
| WebSocket | Redis pub/sub fan-out | Handles 10K concurrent connections |

---

## Appendix A: File Count Estimate

| Component | Estimated Files | Estimated Lines |
|---|---|---|
| Backend (API + Workers + Integrations) | ~60 files | ~6,000 lines |
| Frontend (SPA + Canvas + Components) | ~80 files | ~8,000 lines |
| Shared types | ~5 files | ~300 lines |
| Infrastructure (Docker, CI, configs) | ~15 files | ~500 lines |
| Database migrations | ~10 files | ~400 lines |
| Tests | ~40 files | ~3,000 lines |
| **Total** | **~210 files** | **~18,200 lines** |

This is roughly **40-50% less code** than a typical implementation of this scope, achieved through the patterns described above.

---

## Appendix B: Key Library Versions (as of 2026-03)

| Library | Version | Purpose |
|---|---|---|
| Python | 3.12+ | Runtime |
| FastAPI | 0.115+ | HTTP framework |
| SQLModel | 0.0.22+ | ORM |
| Pydantic | 2.10+ | Validation |
| ARQ | 0.26+ | Task queue |
| litellm | 1.55+ | LLM gateway |
| React | 19+ | UI |
| React Flow | 12+ | Node editor |
| TypeScript | 5.7+ | Type safety |
| Vite | 6+ | Build tool |
| PostgreSQL | 16+ | Database |
| pgvector | 0.8+ | Vector extension |
| Redis | 7+ | Cache/queue |

---

*End of Architecture Document*
