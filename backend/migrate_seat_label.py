from sqlalchemy import text
from app.db import engine


def migrate():
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE reservations
            ADD COLUMN IF NOT EXISTS seat_label VARCHAR(255);
        """))
        conn.commit()

    print("seat_label column added successfully.")


if __name__ == "__main__":
    migrate()