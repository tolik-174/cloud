from typing import Optional, Literal
from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class UserMeResponse(BaseModel):
    id: int
    username: str
    email: EmailStr

    class Config:
        from_attributes = True


class EventResponse(BaseModel):
    id: int
    title: str
    location: str
    event_date: str
    image_url: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


class ReservationCreate(BaseModel):
    event_id: int
    ticket_type: Literal["standard", "vip"]
    quantity: int
    seat_label: str


class ReservationUpdate(BaseModel):
    ticket_type: Literal["standard", "vip"]
    quantity: int
    status: Literal["active", "cancelled"]
    seat_label: Optional[str] = None


class ReservationResponse(BaseModel):
    id: int
    ticket_type: str
    quantity: int
    status: str
    seat_label: Optional[str] = None
    user_id: int
    event_id: int

    class Config:
        from_attributes = True


class ReservationWithEvent(BaseModel):
    id: int
    ticket_type: str
    quantity: int
    status: str
    seat_label: Optional[str] = None
    user_id: int
    event_id: int
    event: EventResponse

    class Config:
        from_attributes = True