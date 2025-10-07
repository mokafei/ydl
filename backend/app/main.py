from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import youtube, favorites, downloads
from license_service.routers import licenses as license_router
from .database import Base, engine
from license_service.database import Base as LicenseBase, engine as license_engine

app = FastAPI(title="YT Study Backend")


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.on_event("startup")
async def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    async with license_engine.begin() as conn:
        await conn.run_sync(LicenseBase.metadata.create_all)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def include_routers() -> None:
    app.include_router(youtube.router, prefix="/api/youtube", tags=["youtube"])
    app.include_router(favorites.router, prefix="/api/favorites", tags=["favorites"])
    app.include_router(downloads.router, prefix="/api/downloads", tags=["downloads"])
    app.include_router(license_router.router, prefix="/license", tags=["license"])


include_routers()
