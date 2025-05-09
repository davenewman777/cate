# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import SLARequest, SLAResponse
from sla_data import SLA_DATA, get_sla

app = FastAPI()

# Enable CORS (adjust origin as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # replace with your frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/sla")
def get_sla_data():
    return SLA_DATA

@app.post("/api/composite-sla", response_model=SLAResponse)
def calculate_composite_sla(request: SLARequest):
    sla_values = []
    for service in request.services:
        sla = get_sla(service)
        if sla is None:
            raise HTTPException(status_code=400, detail=f"Unknown service: {service}")
        sla_values.append(sla)

    composite = 1.0
    for val in sla_values:
        composite *= val

    return {"composite_sla": round(composite, 10)}
