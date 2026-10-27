
import sqlite3
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATABASE_PATH = PROJECT_ROOT / "finpilot.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                amount REAL NOT NULL CHECK (amount > 0),
                type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.commit()


def list_transactions():
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, name, category, date, amount, type
            FROM transactions
            ORDER BY date DESC, id DESC
            """
        ).fetchall()

    return [dict(row) for row in rows]


def add_transaction(name, category, date, amount, transaction_type):
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO transactions (name, category, date, amount, type)
            VALUES (?, ?, ?, ?, ?)
            """,
            (name, category, date, amount, transaction_type),
        )
        connection.commit()
        return cursor.lastrowid
