from fastapi import FastAPI
import asyncpg
import os

app = FastAPI(title="Parking Python Service PPS")

async def get_db():
	return await asyncpg.connect(os.getenv('DATABASE_URL'))

@app.get("/")
async def root():
	return {"service": "Python service", "status": "running"}

@app.get("/health")
async def health():
	return {"status": "healthy"}
