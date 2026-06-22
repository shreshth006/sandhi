# Sandhi — API Contracts Reference

> Every endpoint, its purpose, request/response shapes, and auth requirements.  
> Base URL: `/api/v1`  
> Auth: JWT Bearer token (unless marked ✦ = API Key, ○ = Public)

---

## Authentication

### `POST /auth/register` ○
Create a new account.

```
Request:  { "email": "user@example.com", "password": "...", "display_name": "Alice" }
Response: { "id": "uuid", "email": "...", "display_name": "...", "is_active": true, "created_at": "..." }
Status:   201 Created
```

### `POST /auth/login` ○
Get access + refresh tokens.

```
Request:  { "email": "user@example.com", "password": "..." }
Response: { "access_token": "eyJ...", "token_type": "bearer" }
Cookies:  Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
Status:   200 OK
```

### `POST /auth/refresh` ○
Refresh access token using refresh cookie.

```
Request:  (refresh_token cookie sent automatically)
Response: { "access_token": "eyJ..." }
Status:   200 OK
```

### `POST /auth/logout`
Invalidate refresh token.

```
Response: { "ok": true }
Cookies:  Set-Cookie: refresh_token=; Max-Age=0
Status:   200 OK
```

### `GET /auth/oauth/{provider}` ○
Start OAuth flow (provider: `google`, `github`).

```
Redirects to provider's consent screen.
```

### `GET /auth/oauth/{provider}/callback` ○
OAuth callback — exchanges code for tokens, creates/links user.

```
Redirects to frontend with access_token in URL fragment.
```

---

## Users

### `GET /users/me`
Get current user profile.

```
Response: {
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "Alice",
  "avatar_url": "https://...",
  "is_active": true,
  "is_verified": true,
  "created_at": "2026-03-01T..."
}
```

### `PATCH /users/me`
Update current user profile.

```
Request:  { "display_name": "Alice B.", "avatar_url": "https://..." }
Response: (updated user object)
```

---

## Workspaces

### `GET /workspaces/`
List workspaces the current user belongs to.

```
Response: [
  {
    "id": "uuid",
    "name": "My Team",
    "slug": "my-team",
    "owner_id": "uuid",
    "role": "owner",
    "member_count": 3,
    "created_at": "..."
  }
]
```

### `POST /workspaces/`
Create a new workspace.

```
Request:  { "name": "My Team", "slug": "my-team" }
Response: { "id": "uuid", "name": "My Team", "slug": "my-team", ... }
Status:   201 Created
```

### `GET /workspaces/{ws_id}`
Get workspace details.

### `PATCH /workspaces/{ws_id}`
Update workspace (name, settings). Requires `admin+`.

### `DELETE /workspaces/{ws_id}`
Delete workspace. Requires `owner`.

### `GET /workspaces/{ws_id}/members`
List workspace members.

```
Response: [
  { "user_id": "uuid", "email": "...", "display_name": "...", "role": "editor", "joined_at": "..." }
]
```

### `POST /workspaces/{ws_id}/members`
Invite a member. Requires `admin+`.

```
Request:  { "email": "bob@example.com", "role": "editor" }
Response: { "user_id": "uuid", "role": "editor", "joined_at": "..." }
```

### `PATCH /workspaces/{ws_id}/members/{user_id}`
Update member role. Requires `admin+`.

```
Request:  { "role": "viewer" }
```

### `DELETE /workspaces/{ws_id}/members/{user_id}`
Remove member. Requires `admin+`.

---

## Workflows

All workflow endpoints are scoped to the current workspace (sent via `X-Workspace-Id` header).

### `GET /workflows/`
List workflows in workspace.

```
Query: ?page=1&per_page=20&search=standup&tags=marketing
Response: {
  "items": [
    {
      "id": "uuid",
      "name": "Daily Standup Summarizer",
      "description": "...",
      "tags": ["ops", "daily"],
      "is_active": true,
      "version": 3,
      "node_count": 5,                    # Computed from graph
      "last_run_at": "2026-03-06T...",     # From latest run
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 20
}
```

### `POST /workflows/`
Create empty workflow.

```
Request:  { "name": "My Workflow", "description": "...", "tags": ["test"] }
Response: { "id": "uuid", "name": "...", "graph": {"nodes":[],"edges":[],"variables":{}}, ... }
Status:   201 Created
```

### `GET /workflows/{wf_id}`
Get workflow with full graph.

```
Response: {
  "id": "uuid",
  "name": "Daily Standup Summarizer",
  "graph": {
    "nodes": [
      { "id": "node_1", "type": "schedule_trigger", "position": {"x": 100, "y": 200}, "label": "Every morning", "config": {"cron": "0 9 * * 1-5"} },
      { "id": "node_2", "type": "integration", "position": {"x": 300, "y": 200}, "label": "Read Slack", "config": {"provider": "slack", "action": "read_messages", "channel": "#standup"} },
      { "id": "node_3", "type": "llm_call", "position": {"x": 500, "y": 200}, "label": "Summarize", "config": {"model": "gpt-4o-mini", "system_prompt": "Summarize these standup notes concisely.", "user_prompt": "{{node_2.output.messages}}"} },
      { "id": "node_4", "type": "integration", "position": {"x": 700, "y": 200}, "label": "Email Team", "config": {"provider": "gmail", "action": "send_email", "to": "team@company.com", "subject": "Daily Standup Summary", "body": "{{node_3.output.response_text}}"} }
    ],
    "edges": [
      { "id": "e1", "source": "node_1", "target": "node_2" },
      { "id": "e2", "source": "node_2", "target": "node_3" },
      { "id": "e3", "source": "node_3", "target": "node_4" }
    ],
    "variables": {}
  },
  "viewport": {"x": 0, "y": 0, "zoom": 1},
  ...
}
```

### `PATCH /workflows/{wf_id}`
Update workflow (typically saves the full graph from the canvas editor).

```
Request:  {
  "graph": { ... },          # Full graph replacement
  "viewport": { ... },       # Canvas position/zoom
  "name": "Updated Name"     # Optional
}
Response: (updated workflow)
```

### `DELETE /workflows/{wf_id}`
Delete workflow and all runs/deployments.

### `POST /workflows/{wf_id}/run`
Trigger a manual execution.

```
Request:  { "trigger_data": {"input_text": "Hello"} }   # Optional input data
Response: { "run_id": "uuid", "status": "queued" }
Status:   202 Accepted
```

### `POST /workflows/{wf_id}/deploy`
Deploy workflow (API, schedule, webhook, or worker).

```
Request:  {
  "type": "api",
  "config": { "method": "POST" }
}
Response: {
  "id": "uuid",
  "type": "api",
  "endpoint_id": "ep_a1b2c3d4",
  "endpoint_url": "https://api.sandhi.app/api/v1/run/ep_a1b2c3d4",
  "is_active": true
}
Status:   201 Created
```

### `DELETE /workflows/{wf_id}/deploy/{deployment_id}`
Undeploy.

### `POST /workflows/{wf_id}/duplicate`
Clone workflow (new ID, same graph).

```
Response: { "id": "new-uuid", "name": "Daily Standup Summarizer (Copy)", ... }
```

### `POST /workflows/{wf_id}/template`
Save workflow as template.

```
Request:  {
  "name": "Standup Summarizer",
  "description": "Summarize daily standups and email the team",
  "category": "ops",
  "tags": ["standup", "slack", "email"],
  "parameters": [
    { "node_id": "node_2", "field": "channel", "label": "Slack Channel", "type": "text", "required": true },
    { "node_id": "node_4", "field": "to", "label": "Email Recipients", "type": "text", "required": true }
  ],
  "is_public": false
}
Response: { "id": "template-uuid", ... }
```

---

## Runs

### `GET /runs/`
List runs (filterable).

```
Query: ?workflow_id=uuid&status=failed&page=1&per_page=50
Response: {
  "items": [
    {
      "id": "uuid",
      "workflow_id": "uuid",
      "workflow_name": "Daily Standup Summarizer",
      "trigger_type": "schedule",
      "status": "completed",
      "total_tokens": 1523,
      "total_cost": 0.004,
      "started_at": "2026-03-07T09:00:01Z",
      "ended_at": "2026-03-07T09:00:12Z",
      "duration_ms": 11000,
      "created_at": "..."
    }
  ],
  "total": 156,
  "page": 1
}
```

### `GET /runs/{run_id}`
Get full run details with per-node results.

```
Response: {
  "id": "uuid",
  "workflow_id": "uuid",
  "trigger_type": "manual",
  "status": "completed",
  "trigger_data": {"input_text": "Hello"},
  "node_results": {
    "node_1": {
      "status": "succeeded",
      "output": {"trigger_data": {}},
      "started_at": "...",
      "ended_at": "...",
      "duration_ms": 2,
      "tokens_used": 0,
      "cost": 0
    },
    "node_2": {
      "status": "succeeded",
      "output": {"messages": [...]},
      "started_at": "...",
      "ended_at": "...",
      "duration_ms": 450,
      "tokens_used": 0,
      "cost": 0
    },
    "node_3": {
      "status": "succeeded",
      "output": {"response_text": "Here's the summary...", "token_usage": {"prompt": 800, "completion": 200}, "cost": 0.003},
      "started_at": "...",
      "ended_at": "...",
      "duration_ms": 3200,
      "tokens_used": 1000,
      "cost": 0.003
    }
  },
  "output": {"response_text": "Here's the summary..."},
  "total_tokens": 1000,
  "total_cost": 0.003,
  "started_at": "...",
  "ended_at": "...",
  "error_message": null
}
```

### `POST /runs/{run_id}/cancel`
Cancel a running execution.

```
Response: { "status": "cancelled" }
```

### `GET /runs/{run_id}/logs`
Stream execution logs (SSE or WebSocket).

```
Content-Type: text/event-stream

data: {"node_id": "node_1", "level": "info", "message": "Trigger fired", "timestamp": "..."}
data: {"node_id": "node_2", "level": "info", "message": "Fetching Slack messages...", "timestamp": "..."}
data: {"node_id": "node_3", "level": "info", "message": "Calling GPT-4o-mini (800 tokens)", "timestamp": "..."}
data: {"node_id": "node_3", "level": "info", "message": "Response received (200 tokens)", "timestamp": "..."}
```

---

## Templates

### `GET /templates/`
Browse template gallery.

```
Query: ?category=ops&search=standup&page=1&per_page=20
Response: {
  "items": [
    {
      "id": "uuid",
      "name": "Daily Standup Summarizer",
      "description": "...",
      "category": "ops",
      "tags": ["standup", "slack"],
      "author": {"id": "uuid", "display_name": "Sandhi Team"},
      "is_public": true,
      "use_count": 342,
      "avg_rating": 4.5,
      "node_count": 4,
      "thumbnail_url": "https://..."
    }
  ]
}
```

### `GET /templates/{tmpl_id}`
Get template details with parameter form and graph preview.

```
Response: {
  "id": "uuid",
  "name": "...",
  "graph": { ... },            # Read-only preview
  "parameters": [
    { "node_id": "node_2", "field": "channel", "label": "Slack Channel", "type": "text", "required": true, "default": "#standup" }
  ],
  ...
}
```

### `POST /templates/{tmpl_id}/use`
Create a new workflow from a template, filling in parameters.

```
Request:  {
  "parameters": {
    "node_2.channel": "#engineering-standup",
    "node_4.to": "eng-team@company.com"
  },
  "workflow_name": "Eng Standup Summary"
}
Response: { "workflow_id": "new-uuid", "name": "Eng Standup Summary", ... }
Status:   201 Created
```

### `POST /templates/{tmpl_id}/rate`
Rate a template.

```
Request:  { "rating": 5 }
Response: { "avg_rating": 4.6, "total_ratings": 50 }
```

---

## Knowledge Bases

### `GET /knowledge-bases/`
List knowledge bases in workspace.

```
Response: [
  {
    "id": "uuid",
    "name": "Product Docs",
    "description": "All product documentation",
    "document_count": 23,
    "chunk_count": 1456,
    "embedding_model": "text-embedding-3-small",
    "created_at": "..."
  }
]
```

### `POST /knowledge-bases/`
Create a knowledge base.

```
Request:  {
  "name": "Product Docs",
  "description": "...",
  "embedding_model": "text-embedding-3-small",
  "chunk_size": 512,
  "chunk_overlap": 50
}
Response: { "id": "uuid", ... }
Status:   201 Created
```

### `GET /knowledge-bases/{kb_id}`
Get KB details + stats.

### `PATCH /knowledge-bases/{kb_id}`
Update KB settings (triggers re-index if embedding model changes).

### `DELETE /knowledge-bases/{kb_id}`
Delete KB and all docs/chunks.

### `POST /knowledge-bases/{kb_id}/documents`
Upload documents (multipart form).

```
Content-Type: multipart/form-data
Body: files[]=doc1.pdf&files[]=doc2.md&custom_metadata={"source": "website"}
Response: {
  "documents": [
    { "id": "uuid", "filename": "doc1.pdf", "status": "processing", "file_size": 245000 },
    { "id": "uuid", "filename": "doc2.md", "status": "processing", "file_size": 3200 }
  ]
}
Status:   202 Accepted (processing happens async)
```

### `GET /knowledge-bases/{kb_id}/documents`
List documents in KB.

```
Response: [
  { "id": "uuid", "filename": "doc1.pdf", "status": "ready", "chunk_count": 45, "file_size": 245000, "created_at": "..." }
]
```

### `DELETE /knowledge-bases/{kb_id}/documents/{doc_id}`
Remove document and its chunks.

### `POST /knowledge-bases/{kb_id}/query`
Test semantic search.

```
Request:  {
  "query": "How do I reset my password?",
  "top_k": 5,
  "score_threshold": 0.7,
  "metadata_filter": {"source": "support-docs"}
}
Response: {
  "results": [
    {
      "chunk_id": "uuid",
      "content": "To reset your password, go to Settings > Security > Change Password...",
      "score": 0.92,
      "metadata": {"source": "support-docs", "page": 12, "heading": "Account Security"},
      "document_filename": "support-guide.pdf"
    },
    ...
  ],
  "query_embedding_time_ms": 45,
  "search_time_ms": 12,
  "total_results": 3
}
```

### `POST /knowledge-bases/{kb_id}/reindex`
Re-embed all documents (useful after changing model or chunk settings).

```
Response: { "status": "reindexing", "document_count": 23 }
Status:   202 Accepted
```

---

## Integrations

### `GET /integrations/available`
List all available integration types.

```
Response: [
  {
    "provider": "gmail",
    "display_name": "Gmail",
    "auth_type": "oauth2",
    "icon_url": "https://...",
    "actions": ["send_email", "search_emails", "read_email"],
    "is_connected": true
  },
  {
    "provider": "slack",
    "display_name": "Slack",
    "auth_type": "oauth2",
    "actions": ["send_message", "read_messages", "list_channels"],
    "is_connected": false
  }
]
```

### `GET /integrations/connected`
List user's connected integrations.

### `POST /integrations/{provider}/connect`
Start OAuth flow or save API key.

```
# For OAuth:
Response: { "redirect_url": "https://accounts.google.com/o/oauth2/v2/auth?..." }

# For API key:
Request:  { "api_key": "sk-..." }
Response: { "id": "uuid", "provider": "openai", "status": "active" }
```

### `DELETE /integrations/{provider}/disconnect`
Revoke integration, delete stored credentials.

### `POST /integrations/{provider}/test`
Test if integration credentials are still valid.

```
Response: { "status": "healthy", "details": "Connected as alice@company.com" }
```

---

## Secrets

### `GET /secrets/`
List secret names (values are NEVER returned).

```
Response: [
  { "id": "uuid", "name": "OPENAI_API_KEY", "created_at": "...", "updated_at": "..." }
]
```

### `POST /secrets/`
Create a secret.

```
Request:  { "name": "OPENAI_API_KEY", "value": "sk-..." }
Response: { "id": "uuid", "name": "OPENAI_API_KEY", "created_at": "..." }
```

### `PATCH /secrets/{secret_id}`
Update secret value.

```
Request:  { "value": "sk-new-value..." }
Response: { "id": "uuid", "name": "OPENAI_API_KEY", "updated_at": "..." }
```

### `DELETE /secrets/{secret_id}`
Delete a secret.

---

## API Keys

### `GET /api-keys/`
List API keys (hash is never returned; only prefix shown).

```
Response: [
  {
    "id": "uuid",
    "name": "Production Key",
    "key_prefix": "sk-sand-a1b2",
    "scopes": ["workflow-uuid-1", "workflow-uuid-2"],
    "rate_limit": 100,
    "is_active": true,
    "last_used_at": "...",
    "created_at": "..."
  }
]
```

### `POST /api-keys/`
Create API key. **Full key is returned ONCE here only.**

```
Request:  { "name": "Production Key", "scopes": ["workflow-uuid-1"], "rate_limit": 100 }
Response: {
  "id": "uuid",
  "name": "Production Key",
  "key": "sk-sand-a1b2c3d4e5f6g7h8i9j0...",    ← ONLY TIME full key is shown
  "key_prefix": "sk-sand-a1b2",
  ...
}
Status:   201 Created
```

### `PATCH /api-keys/{key_id}`
Update key name, scopes, rate limit.

### `DELETE /api-keys/{key_id}`
Revoke API key.

---

## Analytics

### `GET /analytics/usage`
Token and cost usage summary.

```
Query: ?period=30d&group_by=model
Response: {
  "total_tokens": 1250000,
  "total_cost": 12.50,
  "by_model": {
    "gpt-4o-mini": { "tokens": 1000000, "cost": 3.00 },
    "gpt-4o": { "tokens": 250000, "cost": 9.50 }
  },
  "daily": [
    { "date": "2026-03-07", "tokens": 45000, "cost": 0.45 },
    ...
  ]
}
```

### `GET /analytics/runs`
Run count and success rate over time.

```
Query: ?period=30d
Response: {
  "total_runs": 1523,
  "success_rate": 0.97,
  "avg_duration_ms": 8500,
  "daily": [
    { "date": "2026-03-07", "total": 52, "completed": 50, "failed": 2 },
    ...
  ]
}
```

### `GET /analytics/top-workflows`
Most executed workflows.

```
Response: [
  { "workflow_id": "uuid", "name": "Daily Standup Summarizer", "run_count": 150, "success_rate": 0.99 },
  ...
]
```

---

## Deployed Workflow Execution ✦

### `POST /run/{endpoint_id}` ✦ (API Key auth)
Execute a deployed workflow via its API endpoint.

```
Headers:  Authorization: Bearer sk-sand-a1b2c3d4...
Request:  { "input_text": "Summarize this meeting..." }

# Synchronous mode (default):
Response: { "response_text": "Here's the summary..." }

# Async mode (X-Sandhi-Async: true):
Response: { "run_id": "uuid", "status": "queued" }
# Then poll GET /runs/{run_id} for result
```

---

## WebSocket Events

Connection: `wss://api.sandhi.app/ws?token=JWT`

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join:run` | `{ "run_id": "uuid" }` | Subscribe to run execution updates |
| `leave:run` | `{ "run_id": "uuid" }` | Unsubscribe |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `run:started` | `{ "run_id": "uuid" }` | Workflow execution began |
| `node:started` | `{ "run_id": "uuid", "node_id": "..." }` | Node began executing |
| `node:completed` | `{ "run_id": "uuid", "node_id": "...", "output": {...}, "duration_ms": 200 }` | Node finished successfully |
| `node:failed` | `{ "run_id": "uuid", "node_id": "...", "error": "...", "will_retry": true }` | Node failed |
| `node:log` | `{ "run_id": "uuid", "node_id": "...", "level": "info", "message": "..." }` | Log entry from node |
| `run:completed` | `{ "run_id": "uuid", "output": {...}, "total_tokens": 1000, "total_cost": 0.003 }` | Workflow completed |
| `run:failed` | `{ "run_id": "uuid", "error": "..." }` | Workflow failed |

---

## Error Response Format

All errors follow a consistent shape:

```json
{
  "detail": {
    "code": "WORKFLOW_NOT_FOUND",
    "message": "Workflow with ID abc-123 not found",
    "field": null
  }
}
```

### Standard Error Codes

| HTTP Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid request body |
| 400 | `CYCLE_DETECTED` | Workflow graph has a cycle |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT / API key |
| 403 | `FORBIDDEN` | Insufficient workspace role |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 409 | `DUPLICATE` | Unique constraint violated (e.g., slug, secret name) |
| 422 | `UNPROCESSABLE` | Valid JSON but semantically invalid |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Pagination Convention

All list endpoints support cursor-based or offset pagination:

```
Query:    ?page=1&per_page=20
Response: {
  "items": [...],
  "total": 42,
  "page": 1,
  "per_page": 20,
  "total_pages": 3
}
```

---

## Common Headers

| Header | Where | Purpose |
|---|---|---|
| `Authorization: Bearer <JWT>` | All authenticated endpoints | User authentication |
| `X-Workspace-Id: <uuid>` | All workspace-scoped endpoints | Current workspace context |
| `X-API-Key: <key>` | Deployed workflow endpoints | API key authentication |
| `X-Sandhi-Async: true` | `POST /run/{endpoint_id}` | Return immediately with run_id |
| `X-Request-Id: <uuid>` | Any | Client-generated request ID for tracing |

---

*End of API Contracts Reference*
