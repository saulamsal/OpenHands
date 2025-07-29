# OpenHands Guide for PHP/Laravel/React Developers

A comprehensive guide for developers coming from PHP/Laravel/React/Next.js/Expo backgrounds to understand and contribute to OpenHands.

## 🎯 Quick Orientation

If you're coming from Laravel/PHP/React, here's what you need to know:
- **OpenHands Backend** = FastAPI (Python) ≈ Laravel (PHP)
- **OpenHands Frontend** = React + Vite ≈ Next.js/Create React App
- **WebSockets** = Socket.IO ≈ Laravel Echo/Pusher
- **Storage** = File-based JSON ≈ Laravel's file storage (no Eloquent/DB)

## 📊 Architecture Comparison

### Laravel vs OpenHands Backend

| Laravel | OpenHands | Purpose |
|---------|-----------|---------|
| `routes/web.php` | `openhands/server/*.py` | Route definitions |
| `app/Http/Controllers/` | `openhands/server/` | Request handlers |
| `app/Models/` | `openhands/storage/` | Data layer |
| `config/` | `openhands/core/config/` | Configuration |
| `.env` | Environment variables | Config values |
| Artisan commands | Python scripts | CLI tools |
| Middleware | FastAPI middleware | Request processing |
| Jobs/Queues | Event system | Async processing |

### React/Next.js vs OpenHands Frontend

| Next.js/React | OpenHands | Purpose |
|---------------|-----------|---------|
| `pages/` or `app/` | `frontend/src/routes/` | Page components |
| `components/` | `frontend/src/components/` | Reusable components |
| `_app.tsx` | `frontend/src/root.tsx` | App wrapper |
| `getServerSideProps` | React Query hooks | Data fetching |
| `next.config.js` | `vite.config.ts` | Build config |
| CSS Modules/styled | Tailwind CSS | Styling |
| Context/Redux | Redux Toolkit | State management |

## 🚀 Getting Started

### Prerequisites Mind Shift
```bash
# Instead of:
composer install && npm install

# You'll use:
poetry install  # Python package manager (like Composer)
npm install     # Same for frontend
```

### Development Setup
```bash
# Backend (think of it as your Laravel server)
cd openhands
poetry install
poetry shell  # Activates virtual env (like vendor/bin)
python -m openhands.server  # Like `php artisan serve`

# Frontend (familiar territory)
cd frontend
npm install
npm run dev  # Like `next dev` or `npm start`
```

## 🏗️ Code Structure Navigation

### Backend Structure (FastAPI ≈ Laravel)

```python
# Route definition (like Laravel routes)
# openhands/server/conversations.py
@router.post("/api/conversations")  # Like Route::post()
async def create_conversation(request: Request):
    # Like a Laravel controller method
    return {"id": "123"}

# Dependency injection (like Laravel's container)
async def get_file_store(config: OpenHandsConfig = Depends(get_config)):
    # Like Laravel's app()->make()
    return get_file_store_from_config(config)
```

### Frontend Structure (Familiar React)

```typescript
// Route definition (like Next.js pages)
// frontend/src/routes/home.tsx
export default function HomePage() {
  // Standard React component
  return <div>Welcome</div>;
}

// API calls (like using Axios in Laravel/React apps)
// frontend/src/api/open-hands.ts
export async function createConversation() {
  return axios.post('/api/conversations');
}
```

## 🔧 Common Development Tasks

### 1. Adding a New Feature (Full Stack)

#### Backend (Like adding a Laravel feature)
```python
# 1. Create new route file: openhands/server/my_feature.py
from fastapi import APIRouter, Depends
from openhands.server.dependencies import get_file_store

router = APIRouter()

@router.get("/api/my-feature")
async def get_my_feature(
    store=Depends(get_file_store)  # Like Laravel DI
):
    # Your logic here
    data = await store.read("my-feature-data")
    return {"data": data}

# 2. Register in app.py (like RouteServiceProvider)
from openhands.server import my_feature
app.include_router(my_feature.router)
```

#### Frontend (Standard React)
```typescript
// 1. Create API client: frontend/src/api/my-feature.ts
export async function getMyFeature() {
  const response = await openHands.get("/api/my-feature");
  return response.data;
}

// 2. Create component with React Query (like SWR/React Query)
// frontend/src/components/MyFeature.tsx
import { useQuery } from "@tanstack/react-query";
import { getMyFeature } from "@/api/my-feature";

export function MyFeature() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-feature"],
    queryFn: getMyFeature,
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>{data?.data}</div>;
}
```

### 2. Working with Storage (No Eloquent/Database)

```python
# Instead of Eloquent models, use storage directly
# Think of it like Laravel's Storage facade

# Laravel way:
# $user = User::find($id);
# $user->settings = $data;
# $user->save();

# OpenHands way:
from openhands.storage import get_file_store

async def save_user_settings(user_id: str, settings: dict):
    store = get_file_store()
    path = f"users/{user_id}/settings.json"
    await store.write(path, json.dumps(settings))

async def get_user_settings(user_id: str):
    store = get_file_store()
    path = f"users/{user_id}/settings.json"
    data = await store.read(path)
    return json.loads(data)
```

### 3. WebSocket Implementation (Like Laravel Echo)

#### Backend WebSocket Handler
```python
# openhands/server/listen.py
# Like Laravel's broadcast events

@sio.on("user_message")
async def handle_user_message(sid, data):
    # Like broadcasting in Laravel
    await sio.emit("ai_response", {
        "message": "Received: " + data["message"]
    }, to=sid)
```

#### Frontend WebSocket Usage
```typescript
// Like using Laravel Echo in React
// frontend/src/hooks/use-ws-connection.ts
import { io } from "socket.io-client";

const socket = io();

// Listen for events (like Echo.channel().listen())
socket.on("ai_response", (data) => {
  console.log("Received:", data);
});

// Send events
socket.emit("user_message", { message: "Hello AI" });
```

### 4. Adding UI Components (React Native/Expo Knowledge Applies)

```typescript
// Component structure similar to React Native
// frontend/src/components/Button.tsx
interface ButtonProps {
  onPress: () => void;  // Like React Native
  title: string;
  variant?: "primary" | "secondary";
}

export function Button({ onPress, title, variant = "primary" }: ButtonProps) {
  return (
    <button
      onClick={onPress}  // onClick instead of onPress
      className={cn(
        "px-4 py-2 rounded",
        variant === "primary" ? "bg-blue-500" : "bg-gray-500"
      )}
    >
      {title}
    </button>
  );
}
```

## 🎨 Styling Guide (Tailwind CSS)

Instead of Laravel Mix/Vite with Sass, OpenHands uses Tailwind:

```typescript
// Instead of CSS modules or styled-components
// Use Tailwind classes directly

// React Native style
const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' }
});

// OpenHands/Tailwind way
<div className="p-4 bg-white">
  {/* p-4 = padding: 16px, bg-white = background: white */}
</div>
```

## 🔌 API Patterns

### RESTful Routes (Laravel-like)
```python
# Standard CRUD pattern you're familiar with
@router.get("/api/items")        # index
@router.post("/api/items")       # store
@router.get("/api/items/{id}")   # show
@router.put("/api/items/{id}")   # update
@router.delete("/api/items/{id}") # destroy
```

### Request Validation (Like Laravel Form Requests)
```python
from pydantic import BaseModel  # Like Laravel's validation

class CreateItemRequest(BaseModel):
    name: str
    description: str | None = None
    
@router.post("/api/items")
async def create_item(request: CreateItemRequest):
    # Automatically validated like Laravel Form Requests
    return {"name": request.name}
```

## 🧪 Testing Approach

### Backend Testing (Like PHPUnit)
```python
# tests/unit/test_my_feature.py
import pytest
from fastapi.testclient import TestClient

def test_my_endpoint(client: TestClient):
    # Like Laravel HTTP tests
    response = client.get("/api/my-feature")
    assert response.status_code == 200
    assert response.json()["data"] == "expected"
```

### Frontend Testing (Like Jest/React Testing Library)
```typescript
// __tests__/components/MyComponent.test.tsx
import { render, screen } from "@testing-library/react";
import { MyComponent } from "@/components/MyComponent";

test("renders correctly", () => {
  render(<MyComponent />);
  expect(screen.getByText("Hello")).toBeInTheDocument();
});
```

## 🚀 Deployment Concepts

### Docker (Like Laravel Sail)
```dockerfile
# Similar to Laravel Sail, everything is containerized
# But more explicit than Sail's magic

# Build
docker build -t my-openhands .

# Run (like `sail up`)
docker run -p 3000:3000 my-openhands
```

### Environment Configuration
```bash
# Like Laravel's .env
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4
FILE_STORE_TYPE=local
FILE_STORE_PATH=/data

# Access in code (like env() helper)
import os
api_key = os.getenv("LLM_API_KEY")
```

## 💡 Key Differences to Remember

1. **No Migrations**: No database means no migrations. Data structure is defined by your JSON schemas.

2. **No Eloquent ORM**: Direct file operations instead of ORM. Think Storage facade for everything.

3. **Async Everywhere**: Python's async/await is used extensively (like JavaScript).

4. **Type Safety**: Python type hints + Pydantic ≈ TypeScript interfaces.

5. **Event-Driven**: Instead of jobs/queues, events flow through the system.

## 🛠️ Practical Examples

### Adding a Dashboard Feature

```python
# Backend: openhands/server/dashboard.py
@router.get("/api/dashboard/stats")
async def get_dashboard_stats(
    store=Depends(get_file_store),
    current_user=Depends(get_current_user)  # Like Auth::user()
):
    conversations = await store.list(f"users/{current_user.id}/conversations")
    return {
        "total_conversations": len(conversations),
        "active_agents": await count_active_agents()
    }
```

```typescript
// Frontend: frontend/src/routes/dashboard.tsx
export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => openHands.get("/api/dashboard/stats"),
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard title="Conversations" value={stats?.total_conversations} />
      <StatCard title="Active Agents" value={stats?.active_agents} />
    </div>
  );
}
```

### Adding Real-time Notifications

```python
# Backend WebSocket event
@sio.on("connect")
async def on_connect(sid, environ):
    # Like joining a broadcast channel in Laravel
    user_id = await get_user_from_session(sid)
    sio.enter_room(sid, f"user-{user_id}")

async def send_notification(user_id: str, message: str):
    # Like broadcast(new NotificationEvent())
    await sio.emit("notification", {
        "message": message,
        "timestamp": datetime.now().isoformat()
    }, room=f"user-{user_id}")
```

## 🎯 Quick Wins for PHP/React Developers

1. **Start with Frontend**: It's standard React - you'll feel at home immediately.

2. **API Routes**: FastAPI routes work like Laravel routes - start by adding simple GET endpoints.

3. **Use Your React Native Knowledge**: Component patterns are the same, just web-specific APIs.

4. **Leverage TypeScript**: Similar to PHP 8 type hints, helps catch errors early.

5. **Think Events, Not Jobs**: Where you'd use Laravel jobs, think WebSocket events.

## 📚 Resources for PHP Developers

- **FastAPI**: Think of it as Laravel for Python
- **Pydantic**: Laravel validation rules in Python
- **Poetry**: Composer for Python
- **Pytest**: PHPUnit for Python
- **Type hints**: Like PHP 8+ type declarations

## 🤝 Contributing Tips

1. **Start Small**: Add a button, create an API endpoint, fix a bug.

2. **Follow Patterns**: Copy existing code patterns - they're consistent.

3. **Ask Questions**: The community is helpful for developers from all backgrounds.

4. **Document**: Your PHP/Laravel perspective is valuable - document what you learn.

Remember: The core concepts are the same across frameworks. You're still building web applications with APIs, frontends, and real-time features - just with different syntax!