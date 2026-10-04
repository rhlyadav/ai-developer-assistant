# Prompt 1: Foundation and AI Chat

Use this prompt as the first milestone for the AI Developer Knowledge Assistant. Work on this milestone only; do not implement later features yet.

---

I want to build a production-quality AI Developer Knowledge Assistant as a learning project.

My background:

- I am an experienced frontend developer.
- I know React and TypeScript.
- I am learning Python, FastAPI, LLMs, RAG, embeddings, vector databases, and AI agents.

## Important

Do not build the entire project at once. For this step only, build the foundation and a basic AI chat.

## Tech stack

- Frontend: React + TypeScript + Vite
- Backend: Python + FastAPI
- LLM: use an LLM API configured through an environment variable
- HTTP: REST
- Use TypeScript strict mode
- Use a clean, production-style folder structure
- Do not introduce LangChain yet. I want to understand the fundamentals first.

## Requirements

### Project structure

Create:

```text
ai-developer-assistant/
  frontend/
  backend/
  README.md
  .gitignore
```

### Frontend

- Create a clean chat UI.
- Display user and assistant messages in a message list.
- Include a text input and send button.
- Show loading and error states.
- Use proper TypeScript types.
- Keep API communication in a separate service layer; do not put API calls directly inside UI components.

### Backend

Create a FastAPI application with this endpoint:

```http
POST /api/chat
Content-Type: application/json
```

Request body:

```json
{
  "message": "Explain React useMemo"
}
```

The response must stream the answer incrementally so the frontend can display it as it arrives.

### Configuration and errors

- Use `.env` files for configuration.
- Never hardcode or expose API keys in frontend code.
- Create `.env.example` files.
- Configure CORS for the local frontend.
- Add basic request validation and error handling.

## Teach as you build

Before writing code, explain the important implementation decisions and why they fit this learning milestone.

After implementation, explain:

- How React communicates with FastAPI.
- What happens when I click Send.
- What HTTP request is generated.
- How FastAPI receives and validates it.
- How the backend calls the LLM API.
- How streaming works from the LLM to FastAPI and then to React.
- Why API keys must stay on the backend.

Give me commands to run the frontend and backend locally, plus a short list of manual tests to perform.

## Do not implement in this milestone

- RAG
- Embeddings
- PostgreSQL
- pgvector
- GitHub integration
- AI agents
- Authentication

The goal is to understand this complete request flow:

```text
React
  -> FastAPI
  -> LLM
  -> streaming response
  -> React
```

Do not move to another milestone until I understand that flow.
