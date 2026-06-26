# Sandhi 🔗

> **Visual AI Workflow Automation Platform**  
> Compose, test, deploy, and manage generative AI pipelines with a drag-and-drop canvas.

---

## 🚀 Overview

**Sandhi** (Sanskrit for *conjunction* or *joining*) is an open-source, monorepo-based AI workflow automation platform. It enables both developers and non-technical users to visually construct complex multi-step AI pipelines (DAGs) using functional blocks. 

With Sandhi, you can easily connect LLMs, vector search (RAG), logic branches, custom code, and third-party APIs (Slack, Gmail, Notion, etc.) into a cohesive workflow, exposing the resulting pipeline as a production-ready REST API or scheduling it via cron triggers.

---

## ✨ Features

- **Visual Workflow Builder:** Drag-and-drop nodes, connect outputs to inputs with automatic type-checking, and configure parameters on a sleek canvas built with React Flow.
- **RAG & Knowledge Base:** Native support for ingestion, fixed/semantic chunking, embedding generation using `pgvector`, and similarity search with cross-encoder re-ranking.
- **Robust Execution Engine:** FastAPI/Python-powered engine that topologically sorts workflow DAGs, executes nodes in parallel where possible, handles retries, and supports state checkpoints.
- **Flexible Deployment:** Execute workflows manually from the canvas, run on cron schedules, trigger via webhooks, or deploy as standalone REST APIs with token/API key authentication.
- **Secure Sandbox:** Execute custom JS/Python scripting blocks within a secure, sandboxed environment.
- **Real-Time Monitoring:** View live execution feedback (node state colors, WebSocket log streaming, token usage, and intermediate JSON outputs).

---

## 🛠️ Tech Stack

### Backend (Python)
- **FastAPI:** High-performance asynchronous API framework.
- **SQLModel / SQLAlchemy:** Async database toolkit & ORM.
- **Alembic:** Database migrations management.
- **pgvector:** Postgres extension for vector storage and semantic search.
- **Redis & ARQ:** Task queue and job execution framework.

### Frontend (React)
- **Vite & TypeScript:** Ultra-fast bundling and development environment.
- **React Flow:** Advanced library for building node-based canvas editors.
- **Zustand:** Simple, fast, and scalable state management.
- **TailwindCSS & shadcn/ui:** Modern CSS design system and beautiful, accessible UI components.

---

## 📂 Project Structure

A simplified view of the Sandhi monorepo:

```
sandhi/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/              # API Route Handlers
│   │   ├── db/               # Database Engine & Sessions
│   │   ├── engine/           # DAG Executor & Node Runner Registry
│   │   ├── models/           # SQLModel Database Schemas
│   │   ├── rag/              # Vector Search & Document Ingestion
│   │   └── services/         # Business Logic Layer
│   └── alembic/              # Database Migration Scripts
│
├── frontend/                 # React Application (Vite + TS)
│   ├── src/
│   │   ├── components/       # Canvas, Node Config, Runs, KB components
│   │   ├── hooks/            # TanStack Query & Socket hooks
│   │   ├── pages/            # View Pages (Editor, Dashboard, Settings)
│   │   └── stores/           # Zustand State Management
│
├── docs/                     # Comprehensive Architecture & PRD Docs
└── Makefile                  # Development shortcuts
```

---

## ⚡ Quick Start

### 1. Prerequisites
Ensure you have the following installed:
- [Docker & Docker Compose](https://docs.docker.com/get-docker/)
- `make` utility (optional, but highly recommended)

### 2. Configuration
Copy the template environment file and adjust the values as needed:
```bash
cp .env.example .env
```

### 3. Spin Up Development Services
Start the full development stack (Postgres with `pgvector`, Redis, FastAPI backend, and Vite frontend):
```bash
make dev
```
Once spun up:
- The **Frontend** will be running at `http://localhost:5173`
- The **Backend API** will be running at `http://localhost:8000`

### 4. Database Migrations
To initialize the database and apply current migrations:
```bash
make migrate
```

If you make database model changes and need to generate a new migration:
```bash
make migration name="add_new_feature_table"
```

### 5. View Logs
Stream container logs in real time:
```bash
make logs
```

### 6. Tear Down
To stop and remove all services:
```bash
make down
```

---

## 📄 Documentation

For deep dives into the platform design and specifications, refer to the `docs/` folder:
- **[Product Requirements (PRD)](docs/PRD.md):** Detailed feature definitions, roadmap phases, and user personas.
- **[System Architecture](docs/ARCHITECTURE.md):** DAG execution mechanics, RAG architecture, and security design.
- **[Data Models](docs/DATA_MODELS.md):** Database schemas and field descriptions.
- **[API Contracts](docs/API_CONTRACTS.md):** HTTP & WebSocket API schemas.
