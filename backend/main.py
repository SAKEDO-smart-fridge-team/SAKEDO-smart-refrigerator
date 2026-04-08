from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import BASE_DIR
from database import close_db, connect_db
from routes import auth, config, fridge, inference, recipes

app = FastAPI(title="Sakedo Smart Fridge API")

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
    await connect_db()


@app.on_event("shutdown")
async def shutdown_event():
    await close_db()


# Include routers
app.include_router(config.router, tags=["Config"])
app.include_router(auth.router, tags=["Authentication"])
app.include_router(inference.router, tags=["Inference"])
app.include_router(fridge.router, tags=["Fridge"])
app.include_router(recipes.router, tags=["Recipes"])


@app.get("/", tags=["Root"])
async def root():
    return {"message": "Sakedo Backend đang chạy ngon lành!"}