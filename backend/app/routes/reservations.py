from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.db import get_db
from app.models import Reservation, Event, User
from app.schemas import ReservationCreate, ReservationUpdate, ReservationWithEvent

router = APIRouter(prefix="/reservations", tags=["reservations"])


def parse_seat_labels(seat_label: str) -> list[str]:
    if not seat_label:
        return []
    return [seat.strip() for seat in seat_label.split(",") if seat.strip()]


def get_taken_seat_set(db: Session, event_id: int, exclude_reservation_id: int | None = None) -> set[str]:
    query = db.query(Reservation).filter(
        Reservation.event_id == event_id,
        Reservation.status == "active"
    )

    if exclude_reservation_id is not None:
        query = query.filter(Reservation.id != exclude_reservation_id)

    reservations = query.all()

    taken_seats = set()
    for reservation in reservations:
        seats = parse_seat_labels(reservation.seat_label or "")
        taken_seats.update(seats)

    return taken_seats


@router.get("/taken/{event_id}")
def get_taken_seats(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    taken_seats = sorted(list(get_taken_seat_set(db, event_id)))
    return {"taken_seats": taken_seats}


@router.get("/", response_model=list[ReservationWithEvent])
def get_reservations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reservations = (
        db.query(Reservation)
        .options(joinedload(Reservation.event))
        .filter(Reservation.user_id == current_user.id)
        .all()
    )
    return reservations


@router.get("/{reservation_id}", response_model=ReservationWithEvent)
def get_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reservation = (
        db.query(Reservation)
        .options(joinedload(Reservation.event))
        .filter(Reservation.id == reservation_id, Reservation.user_id == current_user.id)
        .first()
    )

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    return reservation


@router.post("/", response_model=ReservationWithEvent, status_code=status.HTTP_201_CREATED)
def create_reservation(
    reservation_data: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(Event).filter(Event.id == reservation_data.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if reservation_data.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    requested_seats = parse_seat_labels(reservation_data.seat_label)

    if len(requested_seats) != reservation_data.quantity:
        raise HTTPException(
            status_code=400,
            detail="Number of selected seats must match quantity"
        )

    taken_seats = get_taken_seat_set(db, reservation_data.event_id)
    conflicts = sorted(list(set(requested_seats).intersection(taken_seats)))

    if conflicts:
        raise HTTPException(
            status_code=409,
            detail=f"Selected seats are already taken: {', '.join(conflicts)}"
        )

    new_reservation = Reservation(
        ticket_type=reservation_data.ticket_type,
        quantity=reservation_data.quantity,
        status="active",
        seat_label=",".join(requested_seats),
        user_id=current_user.id,
        event_id=reservation_data.event_id,
    )

    db.add(new_reservation)
    db.commit()
    db.refresh(new_reservation)

    reservation = (
        db.query(Reservation)
        .options(joinedload(Reservation.event))
        .filter(Reservation.id == new_reservation.id)
        .first()
    )
    return reservation


@router.put("/{reservation_id}", response_model=ReservationWithEvent)
def update_reservation(
    reservation_id: int,
    reservation_data: ReservationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reservation = (
        db.query(Reservation)
        .filter(Reservation.id == reservation_id, Reservation.user_id == current_user.id)
        .first()
    )

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if reservation_data.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    new_seat_label = reservation_data.seat_label if reservation_data.seat_label is not None else reservation.seat_label
    requested_seats = parse_seat_labels(new_seat_label or "")

    if len(requested_seats) != reservation_data.quantity:
        raise HTTPException(
            status_code=400,
            detail="Number of selected seats must match quantity"
        )

    taken_seats = get_taken_seat_set(db, reservation.event_id, exclude_reservation_id=reservation.id)
    conflicts = sorted(list(set(requested_seats).intersection(taken_seats)))

    if conflicts:
        raise HTTPException(
            status_code=409,
            detail=f"Selected seats are already taken: {', '.join(conflicts)}"
        )

    reservation.ticket_type = reservation_data.ticket_type
    reservation.quantity = reservation_data.quantity
    reservation.status = reservation_data.status
    reservation.seat_label = ",".join(requested_seats)

    db.commit()
    db.refresh(reservation)

    updated_reservation = (
        db.query(Reservation)
        .options(joinedload(Reservation.event))
        .filter(Reservation.id == reservation.id)
        .first()
    )
    return updated_reservation


@router.delete("/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reservation = (
        db.query(Reservation)
        .filter(Reservation.id == reservation_id, Reservation.user_id == current_user.id)
        .first()
    )

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    db.delete(reservation)
    db.commit()
    return None