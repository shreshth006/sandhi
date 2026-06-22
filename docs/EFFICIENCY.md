# Sandhi — Efficiency & Code Minimization Guide

> How we keep ~18K lines of code doing the work of ~35K+.  
> Every pattern here is a deliberate architectural choice to reduce surface area.

---

## Philosophy

> **Write less code. Ship more features. Break fewer things.**

The most efficient code is code that doesn't exist. Every abstraction below eliminates a category of boilerplate so engineers can focus on actual business logic.

---

## 1. Backend Efficiency Patterns

### 1.1 SQLModel = One Class, Three Jobs

**Naive approach (3 classes per entity):**
```python
# models.py — SQLAlchemy table
class WorkflowORM(Base):
    __tablename__ = "workflows"
    id = Column(UUID, primary_key=True)
    name = Column(String(200))
    graph = Column(JSONB)
    # ... 15 more lines

# schemas.py — Pydantic request schema
class WorkflowCreate(BaseModel):
    name: str
    graph: dict
    # ... 10 more lines

# schemas.py — Pydantic response schema
class WorkflowRead(BaseModel):
    id: UUID
    name: str
    graph: dict
    created_at: datetime
    # ... 12 more lines
```
**Lines: ~37 per entity × 11 entities = ~407 lines**

**Sandhi approach (SQLModel):**
```python
class Workflow(BaseSQLModel, table=True):
    __tablename__ = "workflows"
    workspace_id: UUID = Field(foreign_key="workspaces.id")
    name: str = Field(max_length=200)
    graph: dict = Field(default_factory=lambda: {"nodes":[],"edges":[]}, sa_type=JSONB)
    # ... 8 more lines (IS the table AND the read schema)

class WorkflowCreate(SQLModel):  # Just the writable fields
    name: str
    description: str | None = None
    # 3 lines
```
**Lines: ~15 per entity × 11 entities = ~165 lines**

**Savings: ~240 lines (~60%)**

---

### 1.2 JSONB for Workflow Graphs = No Node/Edge Tables

**Naive approach:**
```sql
-- 3 tables, 6 indexes, complex JOINs
CREATE TABLE workflows (...);
CREATE TABLE workflow_nodes (id, workflow_id, type, config, position_x, position_y, ...);
CREATE TABLE workflow_edges (id, workflow_id, source_node_id, target_node_id, ...);
```
```python
# Saving a workflow = DELETE all nodes + edges + INSERT N nodes + M edges
# Loading = 3 queries + assembly
# Updating one node = find + update + validate edge integrity
```
**Lines: ~200 for CRUD endpoints + complex transaction logic**

**Sandhi approach:**
```python
# One column. One read. One write. Full graph in one operation.
graph: dict = Field(sa_type=JSONB)

# Save: workflow.graph = canvas_state; session.commit()
# Load: return workflow.graph
# Update: workflow.graph["nodes"][idx]["config"]["model"] = "gpt-4o"
```
**Lines: ~20 for CRUD endpoints**

**Savings: ~180 lines + zero JOIN complexity + much faster reads**

**Tradeoff:** Can't query individual nodes via SQL. For this app, we never need to — the canvas always loads the full graph.

---

### 1.3 Plugin Registry = One Decorator Per Node Type

**Naive approach (router per node type):**
```python
# nodes/llm_call.py — handler + validation + router
@router.post("/execute/llm-call")
async def execute_llm_call(config: LLMCallConfig, inputs: dict):
    validate_llm_config(config)
    result = await call_llm(config, inputs)
    return LLMCallResult(**result)

# nodes/condition.py — another handler + validation + router
@router.post("/execute/condition")
async def execute_condition(config: ConditionConfig, inputs: dict):
    ...

# ... repeat 25 times
```
**Lines: ~50 per node type × 25 = ~1,250 lines**

**Sandhi approach:**
```python
# ONE registry + generic executor
NODE_REGISTRY: dict[str, Callable] = {}

def register_node(node_type: str):
    def decorator(func):
        NODE_REGISTRY[node_type] = func
        return func
    return decorator

@register_node("llm_call")
async def run_llm_call(config: dict, inputs: dict, ctx: RunContext) -> dict:
    resp = await ctx.litellm.completion(model=config["model"], messages=[...])
    return {"response_text": resp.choices[0].message.content}

# Generic executor (used by the DAG engine):
async def execute_node(node: WorkflowNode, inputs: dict, ctx: RunContext) -> dict:
    runner = NODE_REGISTRY[node.type]
    return await runner(node.config, inputs, ctx)
```
**Lines: ~15 per node type × 25 + 10 (registry) = ~385 lines**

**Savings: ~865 lines (~70%)**

---

### 1.4 litellm = One LLM Client for All Providers

**Naive approach:**
```python
# Separate client per provider
if model.startswith("gpt"):
    client = openai.AsyncOpenAI(api_key=...)
    resp = await client.chat.completions.create(model=model, messages=messages)
elif model.startswith("claude"):
    client = anthropic.AsyncAnthropic(api_key=...)
    resp = await client.messages.create(model=model, messages=convert_messages(messages))
elif model.startswith("gemini"):
    # ... different API shape AGAIN
```
**Lines: ~40 per provider × 5 providers = ~200 lines + message format conversion**

**Sandhi approach:**
```python
import litellm

resp = await litellm.acompletion(model=model, messages=messages)
# Works for: OpenAI, Anthropic, Google, Mistral, Cohere, local models, ...
# Unified response format. Unified token counting. Unified cost tracking.
```
**Lines: 1 line. Literally one function call.**

**Savings: ~200+ lines**

---

### 1.5 FastAPI Dependencies = Zero Repeated Auth/Validation

**Naive approach:**
```python
@router.get("/workflows/")
async def list_workflows(request: Request, db: Session = Depends(get_db)):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = await verify_jwt(token, db)
    if not user:
        raise HTTPException(401)
    workspace_id = request.headers.get("X-Workspace-Id")
    workspace = await get_workspace(workspace_id, db)
    if not workspace:
        raise HTTPException(404)
    member = await get_membership(workspace.id, user.id, db)
    if not member:
        raise HTTPException(403)
    # FINALLY the actual logic
    return await db.execute(select(Workflow).where(Workflow.workspace_id == workspace.id))
```
**Lines: ~12 lines of boilerplate per endpoint × 40 endpoints = ~480 lines**

**Sandhi approach:**
```python
@router.get("/workflows/")
async def list_workflows(
    workspace: Workspace = Depends(get_current_workspace),  # Does ALL of the above
    db: AsyncSession = Depends(get_db),
):
    return await db.execute(select(Workflow).where(Workflow.workspace_id == workspace.id))
```
**Lines: 0 boilerplate per endpoint**

**Savings: ~480 lines**

---

### 1.6 Generic Integration Runner

**Naive approach:** Write an endpoint + handler + tests for every (provider × action) combination.

```
Gmail Send     → gmail_send.py      (~40 lines)
Gmail Search   → gmail_search.py    (~40 lines)
Slack Message  → slack_message.py   (~40 lines)
... × 40 actions = ~1,600 lines
```

**Sandhi approach:** One base class + one implementation per provider. The execution engine calls the same generic `integration.execute(action, params, creds)`.

```python
# Base: ~40 lines
# Per provider: ~30-50 lines
# Total for 12 providers: ~500 lines

# Even better: many integrations are simple REST calls → declarative config:
DECLARATIVE_ACTIONS = {
    "slack.send_message": {
        "method": "POST",
        "url": "https://slack.com/api/chat.postMessage",
        "body": {"channel": "{{channel}}", "text": "{{message}}"},
        "result": {"message_id": "$.ts"},
    }
}
# This handles ~60% of integration actions with ZERO custom code.
```

**Savings: ~1,100 lines**

---

## 2. Frontend Efficiency Patterns

### 2.1 Generic Node Component (Not Per-Type)

**Naive approach:** One React component per node type.
```
LLMCallNode.tsx      (~80 lines)
ConditionNode.tsx    (~60 lines)
HttpRequestNode.tsx  (~70 lines)
... × 25 types = ~1,750 lines
```

**Sandhi approach:** ONE `GenericNode` component + a config registry.
```typescript
// generic-node.tsx — ~50 lines (handles ALL 25+ types)
// node-registry.ts — ~15 lines per type definition = ~375 lines
// Total: ~425 lines
```

**Savings: ~1,325 lines**

---

### 2.2 Config-Driven Forms

**Naive approach:** Hand-code a form for each node type's configuration panel.
```
LLMCallConfig.tsx       (~100 lines)
ConditionConfig.tsx     (~60 lines)
... × 25 = ~2,000 lines
```

**Sandhi approach:** Define fields as data, render with one generic `FieldRenderer`.
```typescript
// In node-registry.ts (already exists):
fields: [
  { key: "model", type: "model-select", label: "Model", required: true },
  { key: "temperature", type: "slider", min: 0, max: 2, step: 0.1, default: 0.7 },
]

// field-renderer.tsx — ~100 lines (handles all field types)
// node-config-panel.tsx — ~50 lines (iterates fields, renders FieldRenderer)
// Total: ~150 lines + 15 lines per node type definition
```

**Savings: ~1,600+ lines**

---

### 2.3 Zustand Over Redux

**Redux approach (per store slice):**
```typescript
// workflowSlice.ts — actions, reducers, selectors, thunks
const workflowSlice = createSlice({
  name: "workflow",
  initialState: { nodes: [], edges: [], ... },
  reducers: {
    addNode: (state, action) => { ... },
    removeNode: (state, action) => { ... },
    updateNodeConfig: (state, action) => { ... },
    // 15 more reducers...
  },
});
export const { addNode, removeNode, ... } = workflowSlice.actions;
export const selectNodes = (state) => state.workflow.nodes;
// ~80+ lines per slice
```

**Zustand approach:**
```typescript
const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],
  addNode: (type, pos) => set(s => ({ nodes: [...s.nodes, createNode(type, pos)] })),
  removeNode: (id) => set(s => ({ nodes: s.nodes.filter(n => n.id !== id) })),
  updateNodeConfig: (id, config) => set(s => ({
    nodes: s.nodes.map(n => n.id === id ? { ...n, config: { ...n.config, ...config } } : n),
  })),
}));
// ~30 lines per store (no actions/reducers/selectors boilerplate)
```

**Savings: ~50 lines per store × 4 stores = ~200 lines**

---

### 2.4 TanStack Query = No Manual Loading/Error States

**Naive approach:**
```typescript
const [workflows, setWorkflows] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  setLoading(true);
  api.getWorkflows()
    .then(setWorkflows)
    .catch(setError)
    .finally(() => setLoading(false));
}, []);
// × 20 data-fetching components = a LOT of repeated state logic
```

**Sandhi approach:**
```typescript
const { data: workflows, isLoading, error } = useQuery({
  queryKey: ["workflows"],
  queryFn: () => api.getWorkflows(),
});
// Caching, dedup, refetch, pagination, optimistic updates — all built in.
// 3 lines vs 10+ lines per data fetch.
```

**Savings: ~7 lines per fetch × ~30 fetches = ~210 lines + eliminates cache bugs**

---

## 3. Infrastructure Efficiency

### 3.1 pgvector Instead of Separate Vector DB

| Approach | Components | Config Lines | Monthly Cost |
|---|---|---|---|
| Postgres + Pinecone | 2 services, 2 configs, 2 auth systems | ~100 | $70+ (Pinecone) |
| Postgres + pgvector | 1 service, reuse existing config | ~5 | $0 (extension) |

**Savings: One fewer service to manage, deploy, monitor, and pay for.**

### 3.2 Redis as Queue + Cache + PubSub (Not 3 Tools)

| Approach | Components |
|---|---|
| RabbitMQ (queue) + Memcached (cache) + separate PubSub | 3 services |
| Redis (all three) | 1 service |

### 3.3 Docker Compose for Dev = One Command Setup

```bash
# Instead of installing 5 services manually:
make dev
# Starts: postgres, redis, minio, backend (hot-reload), frontend (hot-reload), worker
```

---

## 4. Code Organization Efficiency

### 4.1 Thin Routes, Thick Services

```python
# Route handlers are MAX 10 lines — just parse input, call service, return output.
# All business logic lives in services.
# This means: routes are trivial to test, services are reusable.

@router.post("/{wf_id}/run", status_code=202)
async def run_workflow(
    wf_id: UUID,
    body: RunCreate,
    workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    run = await execution_service.trigger_run(db, wf_id, workspace.id, "manual", body.trigger_data)
    return {"run_id": run.id, "status": run.status}
```

### 4.2 Single-File Migrations

```bash
# Don't write SQL migrations by hand:
alembic revision --autogenerate -m "add knowledge_bases table"
# Alembic compares models to DB → generates migration file automatically
```

### 4.3 Auto-Generated API Client

```bash
# Backend generates OpenAPI spec automatically (FastAPI does this).
# Frontend API client can be generated from it:
npx openapi-typescript-codegen --input http://localhost:8000/openapi.json --output ./src/api/generated
# Zero hand-written API client code. Zero drift between backend and frontend types.
```

---

## 5. Testing Efficiency

### 5.1 Fixture-Based Test Setup

```python
# conftest.py — shared fixtures do all the heavy lifting
@pytest.fixture
async def test_client(test_db):
    """Full API client with auth, workspace, and clean DB."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Auto-creates user, workspace, sets auth headers
        yield client

# Tests are SHORT because setup is shared:
async def test_create_workflow(test_client):
    resp = await test_client.post("/api/v1/workflows/", json={"name": "Test"})
    assert resp.status_code == 201
    assert resp.json()["name"] == "Test"
# 3 lines per test vs 15+ with manual setup
```

### 5.2 Test Node Runners in Isolation

```python
# Node runners are pure functions — test without HTTP or DB:
async def test_llm_call_node():
    ctx = MockRunContext(litellm=MockLiteLLM(response="Hello"))
    result = await run_llm_call(
        config={"model": "gpt-4o-mini", "system_prompt": "test", "user_prompt": "hi"},
        inputs={},
        ctx=ctx,
    )
    assert result["response_text"] == "Hello"
# No mocking HTTP servers, no DB, no auth — just function in, result out.
```

---

## 6. Summary: Where the Lines Go

| Category | Naive Estimate | Sandhi Approach | Saved |
|---|---|---|---|
| DB models + schemas | ~400 | ~165 | 235 |
| CRUD endpoints (auth boilerplate) | ~480 | ~0 | 480 |
| Workflow graph storage | ~200 | ~20 | 180 |
| Node runners | ~1,250 | ~385 | 865 |
| LLM provider clients | ~200 | ~1 | 199 |
| Integration handlers | ~1,600 | ~500 | 1,100 |
| Frontend node components | ~1,750 | ~425 | 1,325 |
| Frontend config forms | ~2,000 | ~525 | 1,475 |
| State management | ~320 | ~120 | 200 |
| Data fetching | ~300 | ~90 | 210 |
| **Total** | **~8,500** | **~2,231** | **~6,269 (74%)** |

These savings compound — less code means fewer bugs, faster reviews, and easier onboarding.

---

## 7. Rules for Contributors

1. **Before adding a new file, check if an existing pattern handles it.** Most "new features" are a new entry in a registry, not a new module.
2. **If you're repeating 3+ lines, extract a helper.** If you're repeating a helper across files, move it to `utils/`.
3. **Use type hints everywhere.** They ARE the documentation. They ARE the validation. They ARE the API spec.
4. **JSONB over new tables** for flexible, nested, schema-evolving data. Normalize only when you need to query/join on the data.
5. **One integration, one file, one class.** No integration should be more than ~50 lines unless it has truly complex auth.
6. **Test the function, not the framework.** Test node runners, services, and utils directly. Integration tests cover the HTTP layer.
7. **No unused code.** If it's commented out or behind a flag nobody checks — delete it.

---

*End of Efficiency Guide*
