from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine, SessionLocal
from app.models import Event
from app.routes.auth import router as auth_router
from app.routes.events import router as events_router
from app.routes.reservations import router as reservations_router
from app.routes.users import router as users_router


app = FastAPI(title="MotoCross Event Hub API")
app.include_router(users_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def seed_events():
    db = SessionLocal()
    try:
        existing = db.query(Event).count()
        if existing == 0:
            demo_events = [
                Event(
                    title="Slovak MotoCross Grand Prix",
                    location="Bratislava",
                    event_date="2026-05-10",
                    image_url="images/event1.jpg",
                    description="Top motocross riders competing on a challenging outdoor track."
                ),
                Event(
                    title="Night Ride Championship",
                    location="Košice",
                    event_date="2026-06-21",
                    image_url="images/event2.jpg",
                    description="Evening motocross event with lights, jumps and music."
                ),
                Event(
                    title="Junior MotoCross Cup",
                    location="Žilina",
                    event_date="2026-07-12",
                    image_url="images/event3.jpg",
                    description="Youth competition for emerging motocross talent."
                ),
            ]
            db.add_all(demo_events)
            db.commit()
    finally:
        db.close()


Base.metadata.create_all(bind=engine)
seed_events()

app.include_router(auth_router)
app.include_router(events_router)
app.include_router(reservations_router)


@app.get("/")
def root():
    return {"message": "MotoCross Event Hub API is running"}