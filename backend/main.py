import asyncio
import contextlib

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import (
    BASE_DIR,
    EXPIRY_ALERT_CHECK_INTERVAL_MINUTES,
    EXPIRY_ALERT_DAYS,
    EXPIRY_ALERT_ENABLED,
)
from database import close_db, connect_db, get_db
from routes import auth, config, fridge, inference, recipes
from services.expiry_alert_service import process_expiry_alerts

app = FastAPI(title="Sakedo Smart Fridge API")

expiry_alert_task: asyncio.Task | None = None

uploads_dir = BASE_DIR / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    global expiry_alert_task

    await connect_db()

    if EXPIRY_ALERT_ENABLED:
        expiry_alert_task = asyncio.create_task(_run_expiry_alert_scheduler())


@app.on_event("shutdown")
async def shutdown_event():
    global expiry_alert_task

    if expiry_alert_task:
        expiry_alert_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await expiry_alert_task
        expiry_alert_task = None

    await close_db()


async def _run_expiry_alert_scheduler() -> None:
    interval_seconds = EXPIRY_ALERT_CHECK_INTERVAL_MINUTES * 60

    while True:
        try:
            summary = await process_expiry_alerts(get_db(), EXPIRY_ALERT_DAYS)
            if summary["emails_sent"] > 0:
                print(
                    "[EXPIRY ALERT] Sent "
                    f"{summary['emails_sent']} email(s), "
                    f"{summary['items_in_email']} item(s)."
                )
        except Exception as exc:
            print(f"[EXPIRY ALERT] Scheduler error: {exc}")

        await asyncio.sleep(interval_seconds)


# Include routers
app.include_router(config.router, tags=["Config"])
app.include_router(auth.router, tags=["Authentication"])
app.include_router(inference.router, tags=["Inference"])
app.include_router(fridge.router, tags=["Fridge"])
app.include_router(recipes.router, tags=["Recipes"])


@app.get("/", tags=["Root"])
async def root():
    return {"message": "Sakedo Backend đang chạy ngon lành!"}