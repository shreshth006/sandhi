# Sandhi — Project Structure

> Monorepo layout using Turborepo. Every path listed below is a real file to create.

```
sandhi/
│
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── docker-compose.yml                     # Full dev stack (pg, redis, minio, api, worker, frontend)
├── docker-compose.prod.yml                # Production overrides
├── Makefile                               # Dev shortcuts: make dev, make test, make migrate, etc.
├── turbo.json                             # Turborepo pipeline config
├── package.json                           # Root workspace package.json
│
├── docs/
│   ├── PRD.md                             # Product Requirements Document
│   ├── ARCHITECTURE.md                    # System Architecture
│   ├── PROJECT_STRUCTURE.md               # This file
│   ├── DATA_MODELS.md                     # Data model reference
│   ├── API_CONTRACTS.md                   # API endpoint contracts
│   └── EFFICIENCY.md                      # Code efficiency guide
│
│
│ ═══════════════════════════════════════
│  BACKEND (Python — FastAPI)
│ ═══════════════════════════════════════
│
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml                     # Python deps (uv / pip)
│   ├── alembic.ini                        # Alembic migrations config
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/                      # Auto-generated migration files
│   │
│   └── app/
│       ├── __init__.py
│       ├── main.py                        # FastAPI app factory, middleware, CORS, lifespan
│       ├── config.py                      # Settings via pydantic-settings (env vars)
│       ├── deps.py                        # Shared FastAPI dependencies (auth, workspace, db session)
│       │
│       ├── db/
│       │   ├── __init__.py
│       │   ├── session.py                 # Async SQLAlchemy engine + session factory
│       │   └── base.py                    # Base model class with common fields (id, timestamps)
│       │
│       ├── models/                        # SQLModel models (DB schema + Pydantic in one)
│       │   ├── __init__.py                # Re-exports all models
│       │   ├── user.py                    # User, UserCreate, UserRead
│       │   ├── workspace.py               # Workspace, WorkspaceMember
│       │   ├── workflow.py                # Workflow (graph as JSONB)
│       │   ├── deployment.py              # Deployment configs
│       │   ├── run.py                     # Run + node results
│       │   ├── knowledge_base.py          # KnowledgeBase, Document, Chunk
│       │   ├── template.py                # Template, TemplateRating
│       │   ├── integration.py             # Integration credentials (encrypted)
│       │   ├── secret.py                  # User secrets (encrypted)
│       │   ├── api_key.py                 # API keys
│       │   └── audit_log.py               # Audit log entries
│       │
│       ├── schemas/                       # Pydantic schemas for API request/response
│       │   ├── __init__.py                # (Only needed when schema differs from model)
│       │   ├── workflow.py                # WorkflowGraph, WorkflowNode, WorkflowEdge
│       │   ├── run.py                     # RunCreate, RunDetail, NodeResult
│       │   ├── knowledge_base.py          # KBQuery, KBQueryResult, ChunkResult
│       │   └── analytics.py               # UsageSummary, RunStats
│       │
│       ├── api/                           # Route handlers (thin — delegate to services)
│       │   ├── __init__.py
│       │   ├── router.py                  # Mounts all sub-routers under /api/v1
│       │   ├── auth.py                    # /auth/* — register, login, OAuth, refresh
│       │   ├── users.py                   # /users/* — profile
│       │   ├── workspaces.py              # /workspaces/* — CRUD + members
│       │   ├── workflows.py               # /workflows/* — CRUD + run + deploy
│       │   ├── runs.py                    # /runs/* — history, detail, cancel, logs
│       │   ├── templates.py               # /templates/* — gallery, use, rate
│       │   ├── knowledge_bases.py         # /knowledge-bases/* — CRUD + docs + query
│       │   ├── integrations.py            # /integrations/* — connect, disconnect, test
│       │   ├── secrets.py                 # /secrets/* — CRUD (values never returned)
│       │   ├── api_keys.py                # /api-keys/* — CRUD
│       │   ├── analytics.py               # /analytics/* — usage, runs, top workflows
│       │   └── webhooks.py                # /webhook/{endpoint_id} — dynamic webhook handler
│       │
│       ├── services/                      # Business logic (no HTTP concerns)
│       │   ├── __init__.py
│       │   ├── workflow_service.py         # Workflow CRUD + validation
│       │   ├── execution_service.py        # Trigger runs, queue management
│       │   ├── template_service.py         # Template save/load/parameterize
│       │   ├── kb_service.py              # KB CRUD + ingestion orchestration
│       │   ├── integration_service.py      # OAuth flows + credential management
│       │   ├── secrets_service.py          # Encrypt/decrypt secrets
│       │   ├── deployment_service.py       # Deploy/undeploy + scheduler registration
│       │   ├── analytics_service.py        # Aggregate usage data
│       │   └── audit_service.py            # Write audit log entries
│       │
│       ├── engine/                         # Workflow execution engine (the core)
│       │   ├── __init__.py
│       │   ├── executor.py                 # DAG executor: topo-sort, wave execution, parallel gather
│       │   ├── context.py                  # RunContext: secrets, credentials, litellm client, logger
│       │   ├── registry.py                 # NODE_REGISTRY: maps node_type → runner function
│       │   ├── resolver.py                 # Template/variable resolution: {{node.output.field}}
│       │   ├── sandbox.py                  # Code node sandboxing (RestrictedPython / subprocess)
│       │   │
│       │   └── nodes/                      # One file per node category (~10-30 lines each)
│       │       ├── __init__.py             # Auto-imports all node files → populates registry
│       │       ├── triggers.py             # manual_trigger, webhook_trigger, schedule_trigger
│       │       ├── ai.py                   # llm_call, structured_output, multi_turn, embedding, image_gen, stt, tts
│       │       ├── rag.py                  # kb_query, kb_ingest, chunk_embed, reranker, contextual_format
│       │       ├── logic.py                # condition, switch, loop, merge, wait, human_approval, error_handler, sub_workflow
│       │       ├── transform.py            # json_transform, text_template, code, regex_extract, aggregate, split_text
│       │       ├── integrations.py         # Generic integration runner (delegates to integration adapters)
│       │       └── output.py               # response, save_variable, log, file_output
│       │
│       ├── integrations/                   # Third-party integration adapters
│       │   ├── __init__.py
│       │   ├── base.py                     # BaseIntegration ABC + ActionSchema + INTEGRATION_REGISTRY
│       │   ├── gmail.py                    # GmailIntegration (~40 lines)
│       │   ├── slack.py                    # SlackIntegration (~40 lines)
│       │   ├── notion.py                   # NotionIntegration (~50 lines)
│       │   ├── google_sheets.py            # GoogleSheetsIntegration (~40 lines)
│       │   ├── google_drive.py             # GoogleDriveIntegration (~40 lines)
│       │   ├── airtable.py                 # AirtableIntegration (~30 lines)
│       │   ├── discord.py                  # DiscordIntegration (~30 lines)
│       │   ├── github.py                   # GithubIntegration (~40 lines)
│       │   ├── hubspot.py                  # HubspotIntegration (~40 lines)
│       │   ├── twilio.py                   # TwilioIntegration (~30 lines)
│       │   ├── stripe.py                   # StripeIntegration (~30 lines)
│       │   └── http.py                     # GenericHTTPIntegration (~20 lines)
│       │
│       ├── rag/                            # RAG pipeline components
│       │   ├── __init__.py
│       │   ├── extractor.py                # Text extraction: PDF, DOCX, HTML, Markdown, CSV
│       │   ├── chunker.py                  # Chunking strategies: fixed, sentence, paragraph, semantic
│       │   ├── embedder.py                 # Batch embedding via litellm (rate-limited)
│       │   ├── retriever.py                # Vector search + hybrid (BM25) + metadata filtering
│       │   └── reranker.py                 # Cross-encoder re-ranking
│       │
│       ├── realtime/                       # WebSocket / real-time layer
│       │   ├── __init__.py
│       │   ├── server.py                   # Socket.IO server setup + auth
│       │   ├── events.py                   # Event handlers: join_run, leave_run
│       │   └── publisher.py                # Publish events to Redis pub/sub → relay to WS clients
│       │
│       ├── worker.py                       # ARQ worker settings + task definitions
│       ├── scheduler.py                    # Cron scheduler loop (checks due deployments)
│       │
│       └── utils/
│           ├── __init__.py
│           ├── crypto.py                   # Fernet encryption/decryption for secrets
│           ├── expressions.py              # Safe expression evaluator (for condition nodes)
│           ├── templates.py                # Mustache/Handlebars template renderer
│           ├── tokens.py                   # Token counting (tiktoken)
│           └── pagination.py               # Generic paginated response helper
│
│
│ ═══════════════════════════════════════
│  FRONTEND (React — TypeScript)
│ ═══════════════════════════════════════
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── index.html
│   │
│   └── src/
│       ├── main.tsx                        # React entry point
│       ├── App.tsx                         # Router + providers + layout
│       ├── vite-env.d.ts
│       │
│       ├── api/                            # API client (auto-generated or hand-written)
│       │   ├── client.ts                   # Axios/fetch instance with auth interceptor
│       │   ├── workflows.ts                # Workflow API calls
│       │   ├── runs.ts                     # Run API calls
│       │   ├── templates.ts                # Template API calls
│       │   ├── knowledge-bases.ts          # KB API calls
│       │   ├── integrations.ts             # Integration API calls
│       │   └── auth.ts                     # Auth API calls
│       │
│       ├── stores/                         # Zustand stores
│       │   ├── auth-store.ts               # User + JWT state
│       │   ├── workflow-store.ts           # Nodes, edges, selection, canvas state
│       │   ├── run-store.ts                # Active run status, node results, logs
│       │   └── ui-store.ts                 # Sidebar, panels, modals state
│       │
│       ├── hooks/                          # Custom React hooks
│       │   ├── use-workflow.ts             # TanStack Query wrapper for workflow CRUD
│       │   ├── use-run.ts                  # TanStack Query + WebSocket for run tracking
│       │   ├── use-templates.ts            # Template browsing + usage
│       │   ├── use-knowledge-base.ts       # KB management hooks
│       │   ├── use-socket.ts               # Socket.IO connection management
│       │   └── use-debounce.ts             # Generic debounce hook
│       │
│       ├── components/
│       │   ├── ui/                         # shadcn/ui primitives (button, input, dialog, etc.)
│       │   │   ├── button.tsx
│       │   │   ├── input.tsx
│       │   │   ├── dialog.tsx
│       │   │   ├── dropdown-menu.tsx
│       │   │   ├── tabs.tsx
│       │   │   ├── toast.tsx
│       │   │   ├── badge.tsx
│       │   │   ├── slider.tsx
│       │   │   ├── select.tsx
│       │   │   ├── textarea.tsx
│       │   │   ├── card.tsx
│       │   │   ├── skeleton.tsx
│       │   │   └── ... (standard shadcn components)
│       │   │
│       │   ├── layout/
│       │   │   ├── app-shell.tsx           # Main layout: sidebar + header + content area
│       │   │   ├── sidebar.tsx             # Navigation sidebar
│       │   │   ├── header.tsx              # Top bar with workspace switcher + user menu
│       │   │   └── protected-route.tsx     # Auth guard wrapper
│       │   │
│       │   ├── canvas/                     # Workflow editor canvas
│       │   │   ├── workflow-canvas.tsx      # React Flow canvas wrapper
│       │   │   ├── generic-node.tsx         # THE generic node component (renders all types)
│       │   │   ├── node-palette.tsx         # Left sidebar: draggable node types
│       │   │   ├── node-config-panel.tsx    # Right panel: config form for selected node
│       │   │   ├── edge-component.tsx       # Custom edge with animation
│       │   │   ├── minimap.tsx              # Canvas minimap
│       │   │   ├── toolbar.tsx              # Canvas toolbar: run, save, undo, zoom
│       │   │   └── execution-overlay.tsx    # Real-time run status overlay on nodes
│       │   │
│       │   ├── nodes/                       # Node-type-specific config renderers
│       │   │   ├── node-registry.ts         # NODE_TYPE_REGISTRY: metadata + field definitions
│       │   │   ├── field-renderer.tsx        # Generic field renderer (switch on field.type)
│       │   │   ├── model-select.tsx          # LLM model picker dropdown
│       │   │   ├── template-editor.tsx       # Expression-aware text editor (autocomplete {{...}})
│       │   │   ├── cron-input.tsx            # Cron expression builder
│       │   │   ├── json-schema-editor.tsx    # JSON schema builder (for structured output)
│       │   │   └── code-editor.tsx           # Monaco editor wrapper (for code nodes)
│       │   │
│       │   ├── runs/                        # Execution history & inspector
│       │   │   ├── run-list.tsx              # Table of workflow runs
│       │   │   ├── run-detail.tsx            # Run inspector: DAG + per-node results
│       │   │   ├── node-result-panel.tsx     # Individual node output/logs viewer
│       │   │   └── log-stream.tsx            # Real-time log stream
│       │   │
│       │   ├── templates/                   # Template gallery
│       │   │   ├── template-gallery.tsx      # Grid/list view of templates
│       │   │   ├── template-card.tsx         # Single template preview card
│       │   │   ├── template-detail.tsx       # Template detail + parameter form
│       │   │   └── template-preview.tsx      # Read-only canvas preview
│       │   │
│       │   ├── knowledge-base/              # RAG knowledge base
│       │   │   ├── kb-list.tsx               # List of knowledge bases
│       │   │   ├── kb-detail.tsx             # KB dashboard: docs, stats, test query
│       │   │   ├── document-list.tsx         # Documents in a KB
│       │   │   ├── upload-dialog.tsx         # File upload modal
│       │   │   └── query-tester.tsx          # Test retrieval query
│       │   │
│       │   ├── integrations/                # Integration management
│       │   │   ├── integration-list.tsx      # Available + connected integrations
│       │   │   └── connect-dialog.tsx        # OAuth/API key connection modal
│       │   │
│       │   ├── analytics/                   # Usage dashboards
│       │   │   ├── usage-dashboard.tsx       # Token/cost/run charts
│       │   │   └── cost-chart.tsx            # Cost breakdown chart component
│       │   │
│       │   └── settings/                    # Workspace settings
│       │       ├── workspace-settings.tsx    # General workspace settings
│       │       ├── members-list.tsx          # Member management
│       │       ├── secrets-list.tsx          # Secrets management
│       │       └── api-keys-list.tsx         # API key management
│       │
│       ├── pages/                           # Route pages (thin — compose components)
│       │   ├── login.tsx
│       │   ├── register.tsx
│       │   ├── dashboard.tsx                # Workspace home: recent workflows, quick stats
│       │   ├── workflows.tsx                # Workflow list
│       │   ├── workflow-editor.tsx           # Canvas editor (main working page)
│       │   ├── runs.tsx                     # Run history
│       │   ├── run-detail.tsx               # Single run inspector
│       │   ├── templates.tsx                # Template gallery
│       │   ├── knowledge-bases.tsx          # KB list
│       │   ├── knowledge-base-detail.tsx    # Single KB dashboard
│       │   ├── integrations.tsx             # Integration management
│       │   ├── analytics.tsx                # Usage analytics
│       │   └── settings.tsx                 # Workspace settings
│       │
│       ├── lib/                             # Shared utilities
│       │   ├── utils.ts                     # cn() helper, formatters, etc.
│       │   ├── constants.ts                 # App-wide constants
│       │   └── socket.ts                    # Socket.IO singleton instance
│       │
│       └── types/                           # TypeScript type definitions
│           ├── workflow.ts                  # WorkflowGraph, WorkflowNode, WorkflowEdge
│           ├── run.ts                       # Run, NodeResult, RunStatus
│           ├── template.ts                  # Template, TemplateParameter
│           ├── knowledge-base.ts            # KnowledgeBase, Document, Chunk, QueryResult
│           ├── integration.ts               # Integration, IntegrationAction
│           └── user.ts                      # User, Workspace, WorkspaceMember
│
│
│ ═══════════════════════════════════════
│  INFRASTRUCTURE
│ ═══════════════════════════════════════
│
├── infra/
│   ├── nginx/
│   │   └── nginx.conf                     # Reverse proxy config (or Caddy)
│   ├── prometheus/
│   │   └── prometheus.yml                 # Metrics scrape config
│   ├── grafana/
│   │   └── dashboards/
│   │       └── sandhi.json                # Pre-built monitoring dashboard
│   └── scripts/
│       ├── init-db.sql                    # pgvector extension + initial setup
│       ├── seed-templates.py              # Seed official templates
│       └── backup.sh                      # Database backup script
│
│
│ ═══════════════════════════════════════
│  CI / CD
│ ═══════════════════════════════════════
│
├── .github/
│   └── workflows/
│       ├── ci.yml                         # Lint + type-check + test on every PR
│       ├── deploy-staging.yml             # Auto deploy to staging on merge to main
│       └── deploy-production.yml          # Manual deploy to production (with approval)
│
│
│ ═══════════════════════════════════════
│  TESTS
│ ═══════════════════════════════════════
│
├── backend/tests/
│   ├── conftest.py                        # Fixtures: test DB, test client, auth helpers
│   ├── test_api/
│   │   ├── test_auth.py
│   │   ├── test_workflows.py
│   │   ├── test_runs.py
│   │   ├── test_templates.py
│   │   └── test_knowledge_bases.py
│   ├── test_engine/
│   │   ├── test_executor.py               # DAG execution tests
│   │   ├── test_nodes.py                  # Individual node runner tests
│   │   └── test_resolver.py               # Variable resolution tests
│   ├── test_integrations/
│   │   ├── test_gmail.py
│   │   └── test_slack.py
│   └── test_rag/
│       ├── test_chunker.py
│       ├── test_embedder.py
│       └── test_retriever.py
│
└── frontend/
    └── src/__tests__/                     # Vitest + React Testing Library
        ├── components/
        │   ├── canvas.test.tsx
        │   ├── node-config.test.tsx
        │   └── template-gallery.test.tsx
        ├── stores/
        │   └── workflow-store.test.ts
        └── hooks/
            └── use-run.test.ts
```

## File Count Summary

| Area | Files | Est. Lines |
|---|---|---|
| Backend: Core (API + Services + Models) | ~35 | ~3,000 |
| Backend: Engine (Executor + Nodes) | ~12 | ~1,200 |
| Backend: Integrations | ~14 | ~600 |
| Backend: RAG | ~6 | ~500 |
| Backend: Real-time + Utils | ~10 | ~400 |
| Frontend: Pages + Components | ~55 | ~5,500 |
| Frontend: Stores + Hooks + API | ~15 | ~1,200 |
| Frontend: Types + Utils | ~10 | ~400 |
| Infrastructure + CI | ~10 | ~400 |
| Tests | ~20 | ~2,500 |
| Docs | ~6 | ~2,500 |
| **Total** | **~193** | **~18,200** |
