import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.core.config import get_settings
from app.schemas.chat import ChatRequest
from app.services.llm import LLMProviderError, stream_completion

router = APIRouter()
logger = logging.getLogger(__name__)


def encode_event(event_type: str, **data: str) -> str:
    payload = json.dumps({"type": event_type, **data}, ensure_ascii=True)
    return f"data: {payload}\n\n"


@router.post("/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    settings = get_settings()
    if not settings.llm_api_key:
        raise HTTPException(
            status_code=503,
            detail="LLM_API_KEY is not configured on the backend.",
        )

    async def event_stream() -> AsyncIterator[str]:
        try:
            async for token in stream_completion(request.message, settings):
                yield encode_event("delta", content=token)
            yield encode_event("done")
        except LLMProviderError:
            logger.exception("Model provider request failed")
            yield encode_event(
                "error",
                message="The model provider could not complete this response. Check the backend logs and configuration.",
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
