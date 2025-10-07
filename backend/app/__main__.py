from __future__ import annotations

import argparse
import sys

import uvicorn


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run YDL backend API server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host")
    parser.add_argument("--port", type=int, default=8000, help="Bind port")
    parser.add_argument(
        "--reload", action="store_true", help="Enable auto-reload (development only)"
    )
    return parser.parse_args()


def _load_app():
    if getattr(sys, "frozen", False):
        from app.main import app as fastapi_app
    else:
        from backend.app.main import app as fastapi_app
    return fastapi_app


def main() -> None:
    args = parse_args()
    uvicorn.run(
        _load_app(),
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
    )


if __name__ == "__main__":
    main()
