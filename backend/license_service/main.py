from __future__ import annotations

from fastapi import FastAPI

from .routers.licenses import router as license_router
from .routers.updates import router as update_router

app = FastAPI(title="YDL License Service")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(license_router, prefix="/license", tags=["license"])
app.include_router(update_router, prefix="/updates", tags=["updates"])
