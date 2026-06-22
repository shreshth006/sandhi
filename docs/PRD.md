# Sandhi — Product Requirements Document (PRD)

> **Version:** 1.0  
> **Created:** 2026-03-07  
> **Status:** Draft  
> **Codename:** Sandhi

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Target Users & Personas](#3-target-users--personas)
4. [Product Vision & Principles](#4-product-vision--principles)
5. [Feature Specification](#5-feature-specification)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Release Phases](#7-release-phases)
8. [Success Metrics](#8-success-metrics)
9. [Risks & Mitigations](#9-risks--mitigations)
10. [Glossary](#10-glossary)

---

## 1. Executive Summary

Sandhi is an **AI workflow automation platform** that enables non-technical users to visually compose, test, deploy, and manage generative-AI pipelines. Users build pipelines by snapping functional blocks together on a drag-and-drop canvas; the platform handles execution, scheduling, integrations, and scaling.

**Core value proposition:** Turn any multi-step AI idea into a production-ready pipeline without writing code.

**Key differentiators:**
- Visual-first builder with real-time execution preview
- First-class RAG (Retrieval-Augmented Generation) knowledge base
- One-click deployment: run manually, schedule, or expose as API
- Template marketplace for sharing and reusing workflows
- Multi-agent orchestration with tool-calling support

---

## 2. Problem Statement

### Current Pain Points

| Pain Point | Who Feels It | Impact |
|---|---|---|
| Building AI pipelines requires Python/TS expertise | Marketers, PMs, founders | Bottlenecked on eng availability |
| Connecting LLMs to real tools (email, CRM, DBs) is fragile | Developers | Days lost to auth, error handling, retries |
| No unified way to run, schedule, and expose AI workflows | Teams | Scattered scripts, cron jobs, one-off notebooks |
| RAG setup is complex (chunking, embedding, retrieval tuning) | AI engineers | Weeks of infra work before first useful query |
| Sharing and reusing AI workflows is ad-hoc | Everyone | Duplicated effort across teams |

### Why Existing Tools Fall Short

| Tool | Gap |
|---|---|
| Zapier / Make | No native LLM / embedding nodes; no RAG; no multi-agent |
| LangChain / LangGraph (code) | Requires dev skill; no visual editor; no deployment layer |
| Flowise / Langflow | Limited integration catalog; weak scheduling & API deployment |
| Custom scripts | Zero reusability; no observability; no collaboration |

---

## 3. Target Users & Personas

### Primary: "The Automator" (Non-Technical)
- **Role:** Marketing lead, ops manager, founder, PM
- **Goal:** Automate repetitive AI tasks without waiting for engineering
- **Behavior:** Comfortable with drag-and-drop tools (Notion, Airtable, Canva)
- **Pain:** Can describe what they want but can't code it
- **Success:** Pipeline live in < 30 minutes

### Secondary: "The Builder" (Low-Code Developer)
- **Role:** Junior dev, data analyst
- **Goal:** Prototype AI features quickly and plug them into apps
- **Behavior:** Writes simple scripts; uses APIs; comfortable with JSON
- **Pain:** Stitching together LLM + integrations + deployment is too slow
- **Success:** API-deployed pipeline in < 1 hour

### Tertiary: "The Architect" (Technical)
- **Role:** Senior developer, ML engineer, platform lead
- **Goal:** Build complex multi-agent systems with custom logic
- **Behavior:** Writes custom code nodes; needs fine control
- **Pain:** Existing orchestrators lack production features (retry, auth, logging)
- **Success:** Multi-agent pipeline with observability, cost tracking, versioning

---

## 4. Product Vision & Principles

### Vision Statement
> Anyone with an idea should be able to build, deploy, and share an AI-powered workflow in minutes — no code required, production-ready from day one.

### Design Principles

| Principle | What It Means in Practice |
|---|---|
| **Blocks, not code** | Every capability is a visual block; code is always optional |
| **Instant feedback** | Run a workflow, see logs + output in real time on canvas |
| **Deploy anywhere** | One workflow → run manually, schedule, webhook, REST API |
| **Failsafe** | Built-in retries, fallbacks, dead-letter queues, error nodes |
| **Open by default** | Plugin system for custom nodes; templates are shareable |
| **Cost-aware** | Token counters, budget caps, model routing to cheapest viable option |

---

## 5. Feature Specification

### 5.1 Visual Workflow Builder

#### 5.1.1 Canvas

| Requirement | Details | Priority |
|---|---|---|
| Drag-and-drop node placement | Add nodes from sidebar palette; move freely on infinite canvas | P0 |
| Edge connections (wires) | Click output port → drag to input port; type-checked compatibility | P0 |
| Mini-map navigation | Thumbnail overview for large workflows | P1 |
| Snap-to-grid | Optional alignment grid for tidy layouts | P2 |
| Undo / Redo | Full action history (Ctrl+Z / Ctrl+Shift+Z) | P0 |
| Copy / Paste nodes | Duplicate individual nodes or groups | P1 |
| Group / Sub-workflow | Select multiple nodes → collapse into reusable group | P1 |
| Real-time collaboration | Multi-cursor editing (like Figma) | P2 |
| Keyboard shortcuts | Delete, select-all, zoom, run, save | P0 |
| Zoom & pan | Scroll to zoom, click-drag to pan, fit-to-view button | P0 |

#### 5.1.2 Node Types

**Category: Triggers**

| Node | Description | Inputs | Outputs |
|---|---|---|---|
| Manual Trigger | Run from UI button | — | `trigger_data` |
| Webhook Trigger | Incoming HTTP POST/GET | Endpoint URL (auto-generated) | `request.body`, `request.headers` |
| Schedule Trigger | Cron-based recurring execution | Cron expression or natural language schedule | `trigger_time`, `run_id` |
| Event Trigger | React to external events (new email, Slack message, DB change) | Integration + event type config | `event_payload` |

**Category: AI / LLM**

| Node | Description | Inputs | Outputs |
|---|---|---|---|
| LLM Call | Send prompt to any supported model | `model`, `system_prompt`, `user_prompt`, `temperature`, `max_tokens` | `response_text`, `token_usage`, `cost` |
| Structured Output | LLM call with JSON schema enforcement | Same as LLM Call + `output_schema` (JSON Schema) | Parsed JSON object |
| Multi-Turn Chat | Manage conversation history | `messages[]`, `model`, `system_prompt` | `response`, `updated_messages[]` |
| Embedding | Generate vector embeddings for text | `text`, `model` | `vector[]`, `dimensions` |
| Image Generation | Generate images from text | `prompt`, `model`, `size`, `quality` | `image_url`, `cost` |
| Speech-to-Text | Transcribe audio | `audio_file`, `model`, `language` | `transcript`, `segments[]` |
| Text-to-Speech | Generate audio from text | `text`, `model`, `voice` | `audio_url`, `duration` |

**Category: RAG (Retrieval-Augmented Generation)**

| Node | Description | Inputs | Outputs |
|---|---|---|---|
| Knowledge Base Query | Semantic search over uploaded docs | `query`, `kb_id`, `top_k`, `score_threshold` | `results[]` (text, score, metadata) |
| Knowledge Base Ingest | Add documents to a knowledge base | `kb_id`, `documents[]` or `file_upload` | `chunk_count`, `status` |
| Chunk & Embed | Manual chunking + embedding control | `text`, `chunk_size`, `chunk_overlap`, `model` | `chunks[]`, `vectors[]` |
| Re-Ranker | Re-rank retrieved results for relevance | `query`, `documents[]`, `model` | `ranked_results[]` |
| Contextual Formatter | Format retrieved docs into LLM context | `results[]`, `format_template` | `formatted_context` |

**Category: Logic & Control Flow**

| Node | Description | Inputs | Outputs |
|---|---|---|---|
| Condition (If/Else) | Branch workflow based on expression | `expression` (JS-like) | `true` branch, `false` branch |
| Switch | Multi-way branching | `value`, `cases[]` | One output per case + `default` |
| Loop | Iterate over array items | `items[]`, `max_iterations` | Per-item output, `all_results[]` |
| Merge | Combine multiple branches | Multiple inputs | Single merged output |
| Wait / Delay | Pause execution for duration | `duration` (seconds / minutes) | Passthrough |
| Human Approval | Pause and wait for human review | `message`, `assignee`, `timeout` | `approved` / `rejected` + `comment` |
| Error Handler | Catch errors from connected nodes | Error input | `error_message`, `failed_node`, `retry_count` |
| Sub-Workflow | Call another saved workflow | `workflow_id`, `inputs{}` | `outputs{}` from that workflow |

**Category: Data Transformation**

| Node | Description | Inputs | Outputs |
|---|---|---|---|
| JSON Transform | JMESPath / JSONata expression | `data`, `expression` | Transformed data |
| Text Template | Mustache / Handlebars template | `template`, `variables{}` | Rendered string |
| Code (Sandboxed) | Custom Python or JS snippet | `code`, `inputs{}` | `outputs{}` |
| Regex Extract | Extract patterns from text | `text`, `pattern`, `flags` | `matches[]` |
| Aggregate | Collect items into summary | `items[]`, `operation` (count, sum, concat, etc.) | Aggregated value |
| Split Text | Split text by delimiter / size | `text`, `delimiter` or `chunk_size` | `parts[]` |

**Category: Integrations (Third-Party)**

| Node | Description | Auth Method |
|---|---|---|
| Gmail (Send / Read / Search) | Email operations | OAuth 2.0 |
| Slack (Message / Channel / React) | Team messaging | OAuth 2.0 |
| Notion (Page / DB / Block) | Knowledge management | OAuth 2.0 |
| Google Sheets (Read / Write / Append) | Spreadsheet operations | OAuth 2.0 |
| Google Drive (Upload / Download / List) | File storage | OAuth 2.0 |
| Airtable (Record CRUD) | Structured data | API Key |
| HTTP Request | Generic REST API call | None / API Key / OAuth / Bearer |
| PostgreSQL | Database queries | Connection string |
| Webhook Out | Send HTTP POST to external URL | None / API Key |
| Discord (Message / Bot) | Community messaging | Bot Token |
| Twilio (SMS / Voice) | Communication | API Key |
| Stripe (Customer / Payment lookup) | Payment data | API Key |
| GitHub (Issue / PR / Repo) | Dev workflow | OAuth 2.0 / PAT |
| HubSpot (Contact / Deal / Note) | CRM operations | OAuth 2.0 |

**Category: Output**

| Node | Description | Inputs | Outputs |
|---|---|---|---|
| Response | Return result (API mode) | `body`, `status_code`, `headers` | HTTP response |
| Save to Variable | Store value for later use | `key`, `value` | — |
| Log | Write to execution log | `message`, `level` | — |
| File Output | Save to cloud storage | `data`, `filename`, `format` | `file_url` |

#### 5.1.3 Node Configuration Panel

When a node is selected, a right-side panel shows:
- **Header:** Node name (editable), type icon, description
- **Input fields:** Dynamic form based on node type; supports static values, expressions (`{{prev_node.output}}`), and variable references
- **Output preview:** After execution, shows output data in collapsible JSON tree
- **Test button:** Run this single node in isolation with sample data
- **Notes:** Free-text annotation area
- **Error display:** If last run failed, show error inline

#### 5.1.4 Expressions & Variables

- **Syntax:** `{{node_name.output.field}}` — references output of any upstream node
- **Built-in variables:** `{{run_id}}`, `{{trigger.data}}`, `{{env.VARIABLE}}`, `{{now}}`, `{{random}}`
- **JavaScript expressions:** `{{ items.length > 5 ? "many" : "few" }}`
- **Autocomplete:** Typing `{{` opens dropdown of available upstream node outputs
- **Type hints:** Warn if connecting incompatible types (e.g., array → expects string)

---

### 5.2 Workflow Execution Engine

#### 5.2.1 Execution Model

```
Workflow JSON (DAG) → Topological Sort → Execution Plan → Runner
```

| Property | Specification |
|---|---|
| Execution model | Asynchronous, event-driven DAG execution |
| Parallelism | Independent branches execute concurrently |
| Node timeout | Configurable per node (default: 60s) |
| Workflow timeout | Configurable per workflow (default: 300s) |
| Retry policy | Per-node: max retries, backoff strategy (fixed, exponential) |
| Error handling | Continue-on-error flag per node; Error Handler nodes catch failures |
| Idempotency | Each run gets unique `run_id`; nodes can be idempotent-safe |
| State persistence | Checkpoint state after each node for resume-on-failure |
| Concurrency limit | Max parallel node executions per workflow (configurable) |
| Loop guards | Max iterations per loop node (default: 1000, hard cap: 10000) |

#### 5.2.2 Execution Lifecycle

```
CREATED → QUEUED → RUNNING → [node-by-node] → COMPLETED | FAILED | TIMED_OUT | CANCELLED
```

Each node within a run follows:
```
PENDING → RUNNING → SUCCEEDED | FAILED | SKIPPED
```

#### 5.2.3 Real-Time Execution Feedback

- **Live canvas highlighting:** Running nodes pulse; completed nodes turn green; failed nodes turn red
- **Streaming logs:** Each node's logs stream to the UI via WebSocket
- **Token counter:** Live token usage display during LLM calls
- **Intermediate outputs:** Click any completed node mid-run to inspect its output
- **Cancel button:** Abort running workflow; partially completed data is preserved

---

### 5.3 Knowledge Base (RAG)

#### 5.3.1 Document Ingestion

| Feature | Details |
|---|---|
| Supported formats | PDF, DOCX, TXT, Markdown, HTML, CSV, JSON, EPUB |
| Upload methods | File upload, URL scrape, paste text, Google Drive import |
| Max file size | 50 MB per file |
| Chunking strategies | Fixed-size (default 512 tokens), sentence-based, paragraph-based, semantic |
| Chunk overlap | Configurable (default: 50 tokens) |
| Metadata extraction | Auto-extract: filename, page number, headings, creation date |
| Custom metadata | User-defined key-value tags per document |
| Deduplication | Content hash to prevent duplicate chunks |

#### 5.3.2 Vector Storage & Retrieval

| Feature | Details |
|---|---|
| Embedding models | OpenAI `text-embedding-3-small` (default), `text-embedding-3-large`, custom |
| Vector store | pgvector (default), optional Pinecone / Weaviate adapter |
| Similarity metric | Cosine similarity (default), dot product, L2 distance |
| Hybrid search | Vector similarity + BM25 keyword search, combined with RRF |
| Filtering | Metadata filters (date range, tags, source) applied pre-retrieval |
| Top-K | Configurable (default: 5, max: 50) |
| Score threshold | Minimum similarity score to include result (default: 0.7) |
| Re-ranking | Optional cross-encoder re-ranker for precision |

#### 5.3.3 Knowledge Base Management UI

- **Dashboard:** List all knowledge bases with doc count, chunk count, last updated
- **Document browser:** View uploaded docs, preview chunks, edit metadata
- **Test query:** Run a retrieval query and see ranked results with scores
- **Sync status:** Show ingestion progress, errors, re-index triggers
- **Access control:** Per-KB permissions (owner, editor, viewer)

---

### 5.4 Deployment & Execution Modes

| Mode | Description | Configuration |
|---|---|---|
| **Manual Run** | Execute from the builder UI; see results on canvas | Click "Run" button |
| **Scheduled** | Cron-based recurring execution | Cron expression or natural language (e.g., "every weekday at 9am") |
| **Webhook** | Trigger via incoming HTTP request | Auto-generated URL; optional secret for auth |
| **REST API** | Expose workflow as a callable API endpoint | Auto-generated endpoint; API key auth; request/response schema |
| **Background Worker** | Long-running / always-on process | Deploy as persistent worker; auto-restart on failure |
| **Event-Driven** | React to external events | Configure event source (email received, DB change, etc.) |

#### 5.4.1 API Deployment Details

When a workflow is deployed as API:
- Auto-generated OpenAPI/Swagger spec
- API key management (create, revoke, rotate)
- Rate limiting (configurable per key)
- Request validation against expected input schema
- Sync (wait for result) and async (get `run_id`, poll for result) modes
- CORS configuration
- Usage analytics per endpoint

---

### 5.5 Template System

#### 5.5.1 Template Creation

- **Save as Template:** Any workflow can be saved as a template
- **Parameterization:** Mark specific node fields as "template variables" — these become fillable form fields when someone uses the template
- **Metadata:** Title, description, category, tags, difficulty level, estimated run cost
- **Thumbnail:** Auto-generated from canvas layout; overridable

#### 5.5.2 Template Gallery

- **Browse:** Grid/list view with categories (Marketing, Engineering, HR, Sales, Support, etc.)
- **Search:** Full-text search on title, description, tags
- **Preview:** View workflow graph (read-only) before using
- **Use Template:** Click → new workflow is created with template structure; user fills in variables
- **Ratings & usage count:** Community feedback on templates
- **Official vs. Community:** Curated official templates + user-submitted

#### 5.5.3 Example Templates

| Template | Category | Nodes Used |
|---|---|---|
| Daily Standup Summarizer | Ops | Schedule → Slack Read → LLM Summarize → Gmail Send |
| Tech Resume Refiner | HR | Manual → File Input → LLM Analyze → LLM Rewrite → Response |
| Customer Feedback Analyzer | Support | Webhook → LLM Classify → Condition → Slack (urgent) / Sheet (log) |
| Blog Post from Research | Marketing | Manual → HTTP (search) → RAG Query → LLM Draft → LLM Edit → Notion Create |
| Meeting Notes → Action Items | Ops | Webhook (audio) → STT → LLM Extract Actions → Gmail Send → Notion Create |
| PR Review Assistant | Engineering | GitHub Event → Code Fetch → LLM Review → GitHub Comment |
| RAG Q&A Bot | Support | Webhook → KB Query → LLM Answer → Response |
| Lead Enrichment Pipeline | Sales | Webhook → HTTP (Clearbit) → LLM Summarize → HubSpot Update |

---

### 5.6 User Management & Collaboration

| Feature | Details | Priority |
|---|---|---|
| Authentication | Email + password, Google OAuth, GitHub OAuth | P0 |
| Workspaces | Multi-workspace support; switch between personal & team | P0 |
| Roles | Owner, Admin, Editor, Viewer per workspace | P0 |
| Workflow permissions | Per-workflow: private, workspace-shared, public (read-only) | P1 |
| Audit log | Who did what, when (create, edit, run, deploy, delete) | P1 |
| API keys | Per-user or per-workspace; scoped to specific workflows | P0 |
| Usage quotas | Configurable limits per workspace: runs/day, tokens/month, storage | P1 |

---

### 5.7 Observability & Monitoring

| Feature | Details |
|---|---|
| Execution history | Searchable list of all runs with status, duration, cost |
| Run inspector | Click any run → see DAG with per-node status, inputs, outputs, logs, timing |
| Token & cost dashboard | Daily/weekly/monthly token usage by model, workflow, user |
| Error alerting | Configurable alerts (email, Slack, webhook) on workflow failure |
| Performance metrics | p50/p95/p99 latency per node type; queue depth; worker utilization |
| Health checks | Platform-level health endpoint; integration connectivity checks |

---

### 5.8 Security

| Requirement | Implementation |
|---|---|
| Secrets management | Encrypted at rest (AES-256); never exposed in logs or UI; referenced by name |
| Code sandbox | Custom code nodes run in isolated containers (gVisor / Firecracker) |
| Data isolation | Row-level security per workspace; encrypted at rest |
| Network | HTTPS everywhere; internal services use mTLS |
| Auth tokens | Short-lived JWTs (15m access, 7d refresh); HttpOnly cookies |
| Rate limiting | Per-user, per-IP, per-API-key; configurable thresholds |
| Input validation | All user inputs sanitized; prompt injection guardrails on LLM nodes |
| Compliance | GDPR data export/delete; SOC 2 readiness from day one |
| Dependency security | Automated vulnerability scanning (Dependabot / Snyk) |

---

## 6. Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| Availability | Uptime SLA | 99.9% (monthly) |
| Latency | Workflow trigger to first-node start | < 500ms (p95) |
| Throughput | Concurrent workflow executions | 1,000+ per tenant |
| Scalability | Workers scale horizontally | Auto-scale on queue depth |
| Storage | Workflow definitions | Unlimited per workspace |
| Storage | Knowledge base documents | 10 GB default, expandable |
| Storage | Execution logs retention | 30 days default, configurable |
| Performance | Canvas rendering | 60fps with 200+ nodes |
| Performance | KB query latency | < 300ms (p95, excluding LLM) |
| Recovery | Data backup | Daily automated, 30-day retention |
| Recovery | Disaster recovery RPO/RTO | RPO: 1 hour, RTO: 4 hours |

---

## 7. Release Phases

### Phase 1 — MVP (Weeks 1–8)
**Goal:** One user can build and run an AI workflow end-to-end

| Deliverable | Details |
|---|---|
| Canvas Builder | Drag-drop nodes, connect edges, configure, save/load |
| Core Nodes | Manual Trigger, LLM Call, Structured Output, Condition, Text Template, HTTP Request, Response, Log |
| Execution Engine | Sequential DAG runner with retry and error handling |
| 2 Integrations | Gmail Send + Slack Message |
| Auth | Email/password + Google OAuth |
| Deployment | Manual run only |
| Template | Save/load workflow as template (local gallery) |
| Observability | Execution history with per-node logs |

### Phase 2 — Production (Weeks 9–16)
**Goal:** Teams can deploy workflows as APIs and use RAG

| Deliverable | Details |
|---|---|
| RAG Knowledge Base | Upload docs, chunk, embed, query, manage |
| RAG Nodes | KB Query, KB Ingest, Re-Ranker, Contextual Formatter |
| API Deployment | Expose any workflow as REST API with key auth |
| Scheduled Runs | Cron-based scheduling with natural language |
| Webhook Triggers | Auto-generated endpoints for external events |
| Parallel Execution | Independent branches run concurrently |
| 6 More Integrations | Notion, Google Sheets, Google Drive, Airtable, Discord, GitHub |
| Workspace & Roles | Multi-user workspaces with RBAC |
| Cost Dashboard | Token/cost tracking per workflow and user |

### Phase 3 — Scale (Weeks 17–24)
**Goal:** Enterprise-ready with advanced orchestration

| Deliverable | Details |
|---|---|
| Multi-Agent Nodes | Agent orchestration patterns (supervisor, debate, chain) |
| Human-in-the-Loop | Approval nodes with notification + timeout |
| Sub-Workflows | Call one workflow from another |
| Loop Node | Iterate with guards and parallelism |
| Template Marketplace | Public sharing, ratings, usage analytics |
| Background Workers | Always-on deployment mode |
| Advanced RAG | Hybrid search, custom chunking, multi-KB queries |
| Enterprise | SSO (SAML), audit logs, custom domains, SLA |
| Billing | Usage-based billing with plan tiers |

---

## 8. Success Metrics

### North Star Metric
**Weekly Active Workflows (WAW):** Number of distinct workflows executed at least once in the past 7 days.

### Supporting Metrics

| Metric | Target (6 months post-launch) | Measurement |
|---|---|---|
| Time to First Workflow | < 10 minutes | Onboarding funnel analytics |
| Workflow Creation → First Run | < 5 minutes | Event tracking |
| Daily Active Users | 1,000+ | Auth sessions |
| Workflows Deployed as API | 20% of all workflows | Deployment tracking |
| Template Usage Rate | 40% of new workflows start from template | Template analytics |
| KB Query Accuracy | > 85% relevance (user feedback) | In-app thumbs up/down |
| Execution Success Rate | > 98% | Run status tracking |
| Mean Time to Integration Setup | < 3 minutes per integration | Event tracking |
| NPS Score | > 50 | Quarterly survey |

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LLM API rate limits / outages | High | High | Multi-provider fallback; queue with backpressure; caching |
| Third-party integration breaking changes | High | Medium | Integration versioning; health checks; adapter pattern |
| Runaway costs from LLM usage | Medium | High | Per-workflow budget caps; admin alerts; model routing to cheapest viable |
| Prompt injection attacks | Medium | High | Input sanitization; output filtering; sandboxed execution |
| Canvas performance with large workflows | Medium | Medium | Virtualized rendering; lazy loading; sub-workflow pattern |
| Data breach / multi-tenant leak | Low | Critical | Row-level security; penetration testing; encrypted secrets |
| User builds infinite loop | High | Medium | Loop guards; execution timeouts; automatic kill |
| Vendor lock-in to specific LLM | Medium | Medium | Provider-agnostic model layer; standardized interface |

---

## 10. Glossary

| Term | Definition |
|---|---|
| **Workflow** | A directed acyclic graph (DAG) of nodes and edges that defines an automation pipeline |
| **Node** | A single functional block in a workflow (e.g., LLM Call, Gmail Send) |
| **Edge** | A connection between two nodes that carries data from output to input |
| **Run / Execution** | A single invocation of a workflow; produces logs, outputs, and status |
| **Knowledge Base (KB)** | A collection of documents indexed for semantic search (RAG) |
| **Chunk** | A segment of a document created during ingestion for embedding and retrieval |
| **Template** | A reusable workflow blueprint with parameterized fields |
| **Workspace** | An organizational unit containing workflows, KBs, integrations, and members |
| **Trigger** | The starting node of a workflow that initiates execution |
| **Deployment** | The configuration that makes a workflow accessible (API, schedule, webhook, etc.) |
| **DAG** | Directed Acyclic Graph — a graph with directed edges and no cycles |
| **RAG** | Retrieval-Augmented Generation — enhancing LLM output with retrieved context |
| **Embedding** | A vector representation of text used for semantic similarity search |
| **Idempotent** | An operation that produces the same result regardless of how many times it's executed |

---

*End of PRD*
