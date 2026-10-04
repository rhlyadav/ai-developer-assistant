from fastapi.testclient import TestClient

from app.api.routes import chat as chat_route
from app.core.config import Settings
from app.main import app

client = TestClient(app)


def test_settings_default_to_gemini() -> None:
    settings = Settings(_env_file=None)

    assert settings.llm_base_url == "https://generativelanguage.googleapis.com/v1beta/openai"
    assert settings.llm_model == "gemini-2.5-flash"


def test_chat_streams_normalized_events(monkeypatch) -> None:
    async def fake_stream_completion(message: str, settings: Settings):
        assert message == "Explain React useMemo"
        assert settings.llm_api_key == "test-key"
        yield "useMemo "
        yield "caches a value."

    monkeypatch.setattr(
        chat_route,
        "get_settings",
        lambda: Settings(llm_api_key="test-key"),
    )
    monkeypatch.setattr(chat_route, "stream_completion", fake_stream_completion)

    response = client.post("/api/chat", json={"message": "Explain React useMemo"})

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert '"type": "delta", "content": "useMemo "' in response.text
    assert '"type": "delta", "content": "caches a value."' in response.text
    assert '"type": "done"' in response.text


def test_chat_rejects_blank_message() -> None:
    response = client.post("/api/chat", json={"message": "   "})

    assert response.status_code == 422


def test_chat_reports_missing_provider_key(monkeypatch) -> None:
    monkeypatch.setattr(
        chat_route,
        "get_settings",
        lambda: Settings(llm_api_key="", _env_file=None),
    )

    response = client.post("/api/chat", json={"message": "Hello"})

    assert response.status_code == 503
    assert "LLM_API_KEY" in response.json()["detail"]
