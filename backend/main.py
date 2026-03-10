from fastapi import FastAPI
from generate import router

app = FastAPI()

app.include_router(router)

@app.get("/")
def root():
    return {"message": "Cover Letter Generator API running"}