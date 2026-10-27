
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATABASE_PATH = PROJECT_ROOT / "finpilot.db"


def using_postgres():
    return bool(os.getenv("DATABASE_URL", "").strip())


@contextmanager
def get_connection():
    if using_postgres():
        connection = psycopg.connect(
            os.environ["DATABASE_URL"],
            sslmode="require",
            row_factory=dict_row,
        )
    else:
        connection = sqlite3.connect(DATABASE_PATH, timeout=10)
        connection.row_factory = sqlite3.Row

    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database():
    if using_postgres():
        create_table = """
            CREATE TABLE IF NOT EXISTS transactions (
                id BIGSERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                amount DOUBLE PRECISION NOT NULL CHECK (amount > 0),
                type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """
    else:
        create_table = """
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

    with get_connection() as connection:
        connection.execute(create_table)


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
    if using_postgres():
        query = """
            INSERT INTO transactions (name, category, date, amount, type)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """
    else:
        query = """
            INSERT INTO transactions (name, category, date, amount, type)
            VALUES (?, ?, ?, ?, ?)
        """

    with get_connection() as connection:
        cursor = connection.execute(
            query,
            (name, category, date, amount, transaction_type),
        )

        if using_postgres():
            transaction_id = cursor.fetchone()["id"]
        else:
            transaction_id = cursor.lastrowid

    return transaction_id
