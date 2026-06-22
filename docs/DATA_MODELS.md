# Sandhi — Data Models Reference

> Python SQLModel definitions — each class is BOTH a database table AND a Pydantic schema.  
> This is the single source of truth for all data types in the system.

---

## Design Principles

1. **One class, three roles:** DB table + API read schema + API create schema (via SQLModel)
2. **JSONB over normalization** for flexible structures (workflow graphs, node configs)
3. **UUIDs everywhere** — no auto-increment integers (distributed-safe, no enumeration attack)
4. **Soft conventions:** `created_at` and `updated_at` on every table via a `TimestampMixin`
5. **Workspace scoping:** Every resource has `workspace_id` for multi-tenant isolation

---

## Base Model

```python
# app/db/base.py — ~20 lines

from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, DateTime, func

class BaseSQLModel(SQLModel):
    """All tables inherit this. Provides id + timestamps."""
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    )
```

---

## User & Auth Models

```python
# app/models/user.py — ~30 lines

class User(BaseSQLModel, table=True):
    __tablename__ = "users"
    
    email: str = Field(unique=True, max_length=255, index=True)
    hashed_password: str | None = Field(default=None, max_length=255)
    display_name: str | None = Field(default=None, max_length=100)
    avatar_url: str | None = None
    is_active: bool = True
    is_verified: bool = False

# API schemas (no table=True → pure Pydantic)
class UserCreate(SQLModel):
    email: str
    password: str
    display_name: str | None = None

class UserRead(SQLModel):
    id: UUID
    email: str
    display_name: str | None
    avatar_url: str | None
    is_active: bool
    is_verified: bool
    created_at: datetime
```

---

## Workspace Models

```python
# app/models/workspace.py — ~35 lines

from enum import StrEnum

class WorkspaceRole(StrEnum):
    OWNER = "owner"
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"

class Workspace(BaseSQLModel, table=True):
    __tablename__ = "workspaces"
    
    name: str = Field(max_length=100)
    slug: str = Field(unique=True, max_length=100, index=True)
    owner_id: UUID = Field(foreign_key="users.id")
    settings: dict = Field(default_factory=dict, sa_type=JSONB)  # quotas, defaults

class WorkspaceMember(SQLModel, table=True):
    __tablename__ = "workspace_members"
    
    workspace_id: UUID = Field(foreign_key="workspaces.id", primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", primary_key=True)
    role: WorkspaceRole
    joined_at: datetime = Field(sa_column=Column(DateTime(timezone=True), server_default=func.now()))

# API schemas
class WorkspaceCreate(SQLModel):
    name: str
    slug: str

class WorkspaceRead(SQLModel):
    id: UUID
    name: str
    slug: str
    owner_id: UUID
    settings: dict
    created_at: datetime
```

---

## Workflow Models

```python
# app/models/workflow.py — ~40 lines

class Workflow(BaseSQLModel, table=True):
    __tablename__ = "workflows"
    
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True)
    name: str = Field(max_length=200)
    description: str | None = None
    
    # THE KEY FIELD: entire workflow graph in one JSONB column
    graph: dict = Field(
        default_factory=lambda: {"nodes": [], "edges": [], "variables": {}},
        sa_type=JSONB,
    )
    
    viewport: dict = Field(
        default_factory=lambda: {"x": 0, "y": 0, "zoom": 1},
        sa_type=JSONB,
    )
    
    is_active: bool = True
    version: int = 1
    tags: list[str] = Field(default_factory=list, sa_type=ARRAY(String))
    created_by: UUID | None = Field(default=None, foreign_key="users.id")

# API schemas
class WorkflowCreate(SQLModel):
    name: str
    description: str | None = None
    tags: list[str] = []

class WorkflowUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    graph: dict | None = None           # Full graph replacement on save
    viewport: dict | None = None
    tags: list[str] | None = None

class WorkflowRead(SQLModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: str | None
    graph: dict
    viewport: dict
    is_active: bool
    version: int
    tags: list[str]
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime
```

---

## Workflow Graph Schema (JSONB Structure)

```python
# app/schemas/workflow.py — ~50 lines
# These are pure Pydantic models for the JSONB graph structure.
# Used for validation when saving/loading graphs.

from pydantic import BaseModel

class NodePosition(BaseModel):
    x: float
    y: float

class WorkflowNode(BaseModel):
    id: str                                     # Unique within graph (e.g., "node_1")
    type: str                                   # Key into node registry (e.g., "llm_call")
    position: NodePosition
    label: str                                  # User-visible name
    config: dict = {}                           # Type-specific config (model, prompt, etc.)
    notes: str | None = None                    # User annotation

class WorkflowEdge(BaseModel):
    id: str                                     # Unique (e.g., "edge_1")
    source: str                                 # Source node ID
    target: str                                 # Target node ID
    source_handle: str | None = None            # Output port name (for branching nodes)
    target_handle: str | None = None            # Input port name

class WorkflowGraph(BaseModel):
    nodes: list[WorkflowNode] = []
    edges: list[WorkflowEdge] = []
    variables: dict = {}                        # Workflow-level variables/env refs
    
    def get_node(self, node_id: str) -> WorkflowNode | None:
        return next((n for n in self.nodes if n.id == node_id), None)
    
    def get_upstream(self, node_id: str) -> list[str]:
        """Return IDs of nodes that feed into this node."""
        return [e.source for e in self.edges if e.target == node_id]
    
    def get_downstream(self, node_id: str) -> list[str]:
        """Return IDs of nodes this node feeds into."""
        return [e.target for e in self.edges if e.source == node_id]
    
    def topological_sort(self) -> list[str]:
        """Kahn's algorithm — returns node IDs in execution order."""
        in_degree = {n.id: 0 for n in self.nodes}
        for e in self.edges:
            in_degree[e.target] += 1
        
        queue = [nid for nid, deg in in_degree.items() if deg == 0]
        order = []
        
        while queue:
            nid = queue.pop(0)
            order.append(nid)
            for downstream in self.get_downstream(nid):
                in_degree[downstream] -= 1
                if in_degree[downstream] == 0:
                    queue.append(downstream)
        
        if len(order) != len(self.nodes):
            raise ValueError("Cycle detected in workflow graph")
        
        return order
```

---

## Deployment Model

```python
# app/models/deployment.py — ~30 lines

from enum import StrEnum

class DeploymentType(StrEnum):
    API = "api"
    SCHEDULE = "schedule"
    WEBHOOK = "webhook"
    WORKER = "worker"

class Deployment(BaseSQLModel, table=True):
    __tablename__ = "deployments"
    
    workflow_id: UUID = Field(foreign_key="workflows.id", index=True)
    type: DeploymentType
    config: dict = Field(default_factory=dict, sa_type=JSONB)
    endpoint_id: str | None = Field(default=None, unique=True, index=True)
    is_active: bool = True

# Example config shapes:
# API:      {"path": "/summarize", "method": "POST", "auth": "api_key"}
# Schedule: {"cron": "0 9 * * 1-5", "timezone": "America/New_York"}
# Webhook:  {"secret": "whsec_...", "allowed_ips": []}
# Worker:   {"restart_policy": "always", "max_restarts": 3}

class DeploymentCreate(SQLModel):
    type: DeploymentType
    config: dict = {}

class DeploymentRead(SQLModel):
    id: UUID
    workflow_id: UUID
    type: DeploymentType
    config: dict
    endpoint_id: str | None
    is_active: bool
    created_at: datetime
```

---

## Run (Execution) Model

```python
# app/models/run.py — ~50 lines

from enum import StrEnum
from decimal import Decimal

class RunStatus(StrEnum):
    CREATED = "created"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMED_OUT = "timed_out"

class NodeStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    SKIPPED = "skipped"

class Run(BaseSQLModel, table=True):
    __tablename__ = "runs"
    
    workflow_id: UUID = Field(foreign_key="workflows.id", index=True)
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True)
    trigger_type: str                       # "manual", "schedule", "webhook", "api"
    status: RunStatus = RunStatus.CREATED
    
    graph_snapshot: dict = Field(sa_type=JSONB)         # Immutable copy of graph at run time
    trigger_data: dict = Field(default_factory=dict, sa_type=JSONB)
    
    # Per-node results: {"node_id": {"status": "...", "output": {...}, "started_at": "...", ...}}
    node_results: dict = Field(default_factory=dict, sa_type=JSONB)
    
    output: dict | None = Field(default=None, sa_type=JSONB)       # Final workflow output
    
    total_tokens: int = 0
    total_cost: Decimal = Decimal("0")
    
    started_at: datetime | None = None
    ended_at: datetime | None = None
    error_message: str | None = None

# API schemas
class RunCreate(SQLModel):
    trigger_data: dict = {}

class RunRead(SQLModel):
    id: UUID
    workflow_id: UUID
    trigger_type: str
    status: RunStatus
    node_results: dict
    output: dict | None
    total_tokens: int
    total_cost: float
    started_at: datetime | None
    ended_at: datetime | None
    error_message: str | None
    created_at: datetime

class NodeResult(BaseModel):
    """Schema for entries in Run.node_results."""
    status: NodeStatus
    output: dict | None = None
    error: str | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    duration_ms: int | None = None
    tokens_used: int = 0
    cost: float = 0
    retry_count: int = 0
```

---

## Knowledge Base Models

```python
# app/models/knowledge_base.py — ~55 lines

class KnowledgeBase(BaseSQLModel, table=True):
    __tablename__ = "knowledge_bases"
    
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True)
    name: str = Field(max_length=200)
    description: str | None = None
    embedding_model: str = "text-embedding-3-small"
    chunk_size: int = 512
    chunk_overlap: int = 50
    similarity_metric: str = "cosine"       # "cosine", "dot", "l2"
    metadata: dict = Field(default_factory=dict, sa_type=JSONB)

class DocumentStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"

class Document(BaseSQLModel, table=True):
    __tablename__ = "documents"
    
    kb_id: UUID = Field(foreign_key="knowledge_bases.id", index=True)
    filename: str = Field(max_length=500)
    mime_type: str | None = Field(default=None, max_length=100)
    file_size: int | None = None
    storage_path: str                       # S3/MinIO path
    content_hash: str | None = Field(default=None, max_length=64)
    status: DocumentStatus = DocumentStatus.PENDING
    chunk_count: int = 0
    custom_metadata: dict = Field(default_factory=dict, sa_type=JSONB)
    error_message: str | None = None

class Chunk(BaseSQLModel, table=True):
    __tablename__ = "chunks"
    
    document_id: UUID = Field(foreign_key="documents.id", index=True)
    kb_id: UUID = Field(foreign_key="knowledge_bases.id", index=True)
    content: str
    # pgvector column — handled via raw SQL or SQLAlchemy column type
    # embedding: Vector(1536)  — see pgvector-python integration
    chunk_index: int
    token_count: int | None = None
    metadata: dict = Field(default_factory=dict, sa_type=JSONB)

# API schemas
class KBCreate(SQLModel):
    name: str
    description: str | None = None
    embedding_model: str = "text-embedding-3-small"
    chunk_size: int = 512
    chunk_overlap: int = 50

class KBQuery(BaseModel):
    query: str
    top_k: int = 5
    score_threshold: float = 0.7
    metadata_filter: dict | None = None

class ChunkResult(BaseModel):
    chunk_id: UUID
    content: str
    score: float
    metadata: dict
    document_filename: str
```

---

## Template Models

```python
# app/models/template.py — ~40 lines

class Template(BaseSQLModel, table=True):
    __tablename__ = "templates"
    
    name: str = Field(max_length=200)
    description: str | None = None
    category: str | None = Field(default=None, max_length=50)
    tags: list[str] = Field(default_factory=list, sa_type=ARRAY(String))
    graph: dict = Field(sa_type=JSONB)                              # Same schema as Workflow.graph
    parameters: list[dict] = Field(default_factory=list, sa_type=JSONB)   # Parameterized fields
    thumbnail_url: str | None = None
    author_id: UUID | None = Field(default=None, foreign_key="users.id")
    workspace_id: UUID | None = Field(default=None, foreign_key="workspaces.id")
    is_public: bool = False
    use_count: int = 0
    avg_rating: float = 0

class TemplateRating(SQLModel, table=True):
    __tablename__ = "template_ratings"
    
    template_id: UUID = Field(foreign_key="templates.id", primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", primary_key=True)
    rating: int = Field(ge=1, le=5)
    created_at: datetime = Field(sa_column=Column(DateTime(timezone=True), server_default=func.now()))

# Template parameter schema
class TemplateParameter(BaseModel):
    """Defines a user-fillable field when using a template."""
    node_id: str                            # Which node this param belongs to
    field: str                              # Which config field (e.g., "model")
    label: str                              # Human-readable label
    type: str                               # "text", "select", "number", "textarea"
    default: str | None = None
    options: list[str] | None = None        # For "select" type
    required: bool = True

class TemplateUse(SQLModel):
    """Request to create a workflow from a template."""
    parameters: dict = {}                   # Filled-in template parameters
    workflow_name: str | None = None        # Override name
```

---

## Integration & Security Models

```python
# app/models/integration.py — ~25 lines

class Integration(BaseSQLModel, table=True):
    __tablename__ = "integrations"
    
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True)
    provider: str = Field(max_length=50)    # "gmail", "slack", "notion", etc.
    display_name: str | None = Field(default=None, max_length=100)
    credentials: bytes                       # Fernet-encrypted JSON
    status: str = "active"
    last_used_at: datetime | None = None
    expires_at: datetime | None = None

# app/models/secret.py — ~15 lines

class Secret(BaseSQLModel, table=True):
    __tablename__ = "secrets"
    
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True)
    name: str = Field(max_length=100)
    encrypted_value: bytes                   # Fernet-encrypted

    class Config:
        # Unique constraint: (workspace_id, name)
        pass

# app/models/api_key.py — ~20 lines

class ApiKey(BaseSQLModel, table=True):
    __tablename__ = "api_keys"
    
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True)
    name: str = Field(max_length=100)
    key_hash: str = Field(max_length=64, index=True)    # SHA-256 hash
    key_prefix: str = Field(max_length=12)               # "sk-sand-a1b2" for display
    scopes: list[str] = Field(default_factory=list, sa_type=ARRAY(String))
    rate_limit: int = 100                                # requests/minute
    is_active: bool = True
    last_used_at: datetime | None = None
    expires_at: datetime | None = None

# app/models/audit_log.py — ~15 lines

class AuditLog(BaseSQLModel, table=True):
    __tablename__ = "audit_logs"
    
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True)
    user_id: UUID | None = Field(default=None, foreign_key="users.id")
    action: str = Field(max_length=50)       # "workflow.created", "run.started", etc.
    resource_type: str | None = Field(default=None, max_length=50)
    resource_id: UUID | None = None
    details: dict = Field(default_factory=dict, sa_type=JSONB)
    ip_address: str | None = None
```

---

## Model Relationships Diagram

```
User ──1:N──▶ Workspace (via owner_id)
User ──M:N──▶ Workspace (via WorkspaceMember)
Workspace ──1:N──▶ Workflow
Workspace ──1:N──▶ KnowledgeBase
Workspace ──1:N──▶ Integration
Workspace ──1:N──▶ Secret
Workspace ──1:N──▶ ApiKey
Workspace ──1:N──▶ AuditLog
Workflow ──1:N──▶ Deployment
Workflow ──1:N──▶ Run
KnowledgeBase ──1:N──▶ Document
Document ──1:N──▶ Chunk
Template ──0:1──▶ Workspace (NULL = public)
Template ──1:N──▶ TemplateRating
```

---

*End of Data Models Reference*
