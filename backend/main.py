from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import close_db, connect_db
from routes import auth, config

app = FastAPI(title="Sakedo Smart Fridge API")

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


@app.get("/", tags=["Root"])
async def root():
    return {"message": "Sakedo Backend đang chạy ngon lành!"}