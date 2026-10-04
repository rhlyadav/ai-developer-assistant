import json
from collections.abc import AsyncIterator

import httpx

from app.core.config import Settings


class LLMProviderError(Exception):
    """Raised when the configured model provider cannot complete a request."""


async def stream_completion(message: str, settings: Settings) -> AsyncIterator[str]:
    url = f"{settings.llm_base_url.rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {settings.llm_api_key}"}
    payload = {
        "model": settings.llm_model,
        "stream": True,
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful assistant for software developers. Be clear and accurate.",
            },
            {"role": "user", "content": message},
        ],
    }
    timeout = httpx.Timeout(connect=10.0, read=120.0, write=30.0, pool=10.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if not response.is_success:
                    raise LLMProviderError(
                        f"The model provider returned HTTP {response.status_code}."
                    )

                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue

                    data = line[len("data:") :].strip()
                    if data == "[DONE]":
                        break
                    if not data:
                        continue

                    try:
                        event = json.loads(data)
                    except json.JSONDecodeError:
                        continue

                    choices = event.get("choices", [])
                    if not choices:
                        continue
                    content = choices[0].get("delta", {}).get("content")
                    if isinstance(content, str) and content:
                        yield content
    except LLMProviderError:
        raise
    except httpx.HTTPError as error:
        raise LLMProviderError("Could not connect to the model provider.") from error
