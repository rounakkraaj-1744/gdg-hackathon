from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.analyze import router as analyze_router
from routers.analyze_pdf import router as analyze_pdf_router

app = FastAPI(title="T&C Risk Analyzer API")

# CORS (hackathon safe)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(analyze_router)
app.include_router(analyze_pdf_router)


@app.get("/")
def root():
    return {"status": "Backend is running"}
