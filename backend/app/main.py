
import logging
import os
from datetime import date as date_type
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI, APIStatusError
from pydantic import BaseModel, Field

from backend.app.database import (
    add_transaction,
    initialize_database,
    list_transactions,
)


# --------------------------------------------------
# Configuration
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("finpilot")

app = FastAPI(
    title="FinPilot Sentinel",
    description="Proactive financial agent",
    version="0.2.0",
)

# Create the SQLite database and its table.
initialize_database()

# Allow requests from the local React development server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Request model for SQLite transactions
# --------------------------------------------------

class TransactionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=50)
    date: date_type
    amount: float = Field(gt=0, le=1_000_000_000)
    type: Literal["income", "expense"]
class AssistantQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=500)

# --------------------------------------------------
# Health endpoint
# --------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "project": "FinPilot Sentinel",
        "stage": 2,
    }


# --------------------------------------------------
# Mesh API connection test
# This endpoint requires available Mesh API credits.
# --------------------------------------------------

@app.post("/mesh-test")
def mesh_test():
    api_key = os.getenv("MESH_API_KEY", "").strip()
    model = os.getenv("MESH_MODEL", "openai/gpt-4o").strip()

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="MESH_API_KEY is missing. Check the root .env file.",
        )

    if not model:
        raise HTTPException(
            status_code=503,
            detail="MESH_MODEL is empty. Check the root .env file.",
        )

    try:
        client = OpenAI(
            base_url="https://api.meshapi.ai/v1",
            api_key=api_key,
            timeout=30.0,
            max_retries=0,
        )

        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a connectivity test assistant. "
                        "Reply briefly without giving financial advice."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Reply with: FinPilot Sentinel Mesh connection works."
                    ),
                },
            ],
            max_tokens=40,
        )

        return {
            "status": "success",
            "gateway": "Mesh API",
            "model_requested": model,
            "response": response.choices[0].message.content or "",
            "request_id": getattr(response, "_request_id", None),
        }

    except APIStatusError as exc:
        logger.error(
            "Mesh API returned HTTP %s: %s",
            exc.status_code,
            exc.message,
        )

        raise HTTPException(
            status_code=502,
            detail={
                "error": "Mesh API rejected the request",
                "mesh_status": exc.status_code,
                "message": exc.message,
            },
        ) from None

    except Exception as exc:
        logger.error(
            "Mesh API connection failed: %s",
            type(exc).__name__,
        )

        raise HTTPException(
            status_code=502,
            detail={
                "error": "Mesh API connection failed",
                "exception_type": type(exc).__name__,
            },
        ) from None


# --------------------------------------------------
# Demo data for the original dashboard endpoints


# --------------------------------------------------
# Transaction-grounded financial assistant
# Deterministic answers; no external API calls.
# --------------------------------------------------

@app.post("/db/assistant")
def financial_assistant(request: AssistantQuestion):
    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=422,
            detail="Please enter a financial question.",
        )

    transactions = list_transactions()

    income = sum(
        float(t["amount"])
        for t in transactions
        if t["type"] == "income"
    )
    expenses = sum(
        float(t["amount"])
        for t in transactions
        if t["type"] == "expense"
    )
    remaining = income - expenses

    categories = {}
    for transaction in transactions:
        if transaction["type"] == "expense":
            category = transaction["category"]
            categories[category] = (
                categories.get(category, 0)
                + float(transaction["amount"])
            )

    lower = question.lower()

    if any(word in lower for word in ("income", "earned", "earnings")):
        answer = f"Your recorded income totals ₹{income:,.2f}."

    elif any(word in lower for word in ("expense", "expenses", "spend", "spent", "spending")):
        answer = f"Your recorded expenses total ₹{expenses:,.2f}."

    elif any(word in lower for word in ("category", "categories", "food", "largest")):
        if categories:
            largest = max(categories, key=categories.get)
            answer = (
                f"Your largest recorded expense category is "
                f"{largest}, totalling ₹{categories[largest]:,.2f}."
            )
        else:
            answer = "There are no recorded expense categories yet."

    elif any(word in lower for word in ("transaction", "transactions", "records", "count")):
        answer = f"You have {len(transactions)} recorded transactions."

    elif any(word in lower for word in ("balance", "remaining", "cash flow", "net")):
        answer = (
            f"Your recorded net cash flow is ₹{remaining:,.2f} "
            f"(income minus expenses). This is not necessarily your bank balance."
        )

    else:
        answer = (
            "I can answer questions about your recorded income, expenses, "
            "largest spending category, transaction count, and net cash flow. "
            "Try asking: 'How much did I spend?'"
        )

    return {
        "answer": answer,
        "data_source": "sqlite",
        "ai_used": False,
        "calculations": {
            "income": round(income, 2),
            "expenses": round(expenses, 2),
            "remaining": round(remaining, 2),
            "transaction_count": len(transactions),
            "expense_categories": {
                key: round(value, 2)
                for key, value in categories.items()
            },
        },
    }

# These values are illustrative, not real bank data.
# --------------------------------------------------

DEMO_TRANSACTIONS = [
    {
        "id": 1,
        "name": "Monthly Salary",
        "category": "Income",
        "date": "2026-10-20",
        "amount": 35000,
        "type": "income",
    },
    {
        "id": 2,
        "name": "Grocery Store",
        "category": "Food",
        "date": "2026-10-19",
        "amount": 1250,
        "type": "expense",
    },
    {
        "id": 3,
        "name": "College Transport",
        "category": "Transport",
        "date": "2026-10-18",
        "amount": 600,
        "type": "expense",
    },
    {
        "id": 4,
        "name": "Internet Recharge",
        "category": "Bills",
        "date": "2026-10-17",
        "amount": 799,
        "type": "expense",
    },
    {
        "id": 5,
        "name": "Restaurant",
        "category": "Food",
        "date": "2026-10-16",
        "amount": 450,
        "type": "expense",
    },
]


@app.get("/transactions")
def get_transactions():
    return {
        "data_source": "demo",
        "notice": "Illustrative data only; not connected to a real bank.",
        "transactions": DEMO_TRANSACTIONS,
    }


@app.get("/analytics")
def get_analytics():
    income = sum(
        transaction["amount"]
        for transaction in DEMO_TRANSACTIONS
        if transaction["type"] == "income"
    )

    expenses = sum(
        transaction["amount"]
        for transaction in DEMO_TRANSACTIONS
        if transaction["type"] == "expense"
    )

    category_totals = {}

    for transaction in DEMO_TRANSACTIONS:
        if transaction["type"] == "expense":
            category = transaction["category"]
            category_totals[category] = (
                category_totals.get(category, 0)
                + transaction["amount"]
            )

    return {
        "data_source": "demo",
        "income": income,
        "expenses": expenses,
        "remaining": income - expenses,
        "expense_categories": category_totals,
    }


# --------------------------------------------------
# SQLite endpoints
# --------------------------------------------------

@app.get("/db/transactions")
def get_db_transactions():
    return {
        "data_source": "sqlite",
        "transactions": list_transactions(),
    }


@app.post("/db/transactions", status_code=201)
def create_db_transaction(transaction: TransactionCreate):
    name = transaction.name.strip()
    category = transaction.category.strip()

    if not name or not category:
        raise HTTPException(
            status_code=422,
            detail="Transaction name and category cannot be blank.",
        )

    transaction_id = add_transaction(
        name=name,
        category=category,
        date=transaction.date.isoformat(),
        amount=transaction.amount,
        transaction_type=transaction.type,
    )

    return {
        "message": "Transaction saved successfully.",
        "id": transaction_id,
        "data_source": "sqlite",
    }

@app.get("/db/analytics")
def get_db_analytics():
    transactions = list_transactions()

    income = sum(
        t["amount"]
        for t in transactions
        if t["type"] == "income"
    )

    expenses = sum(
        t["amount"]
        for t in transactions
        if t["type"] == "expense"
    )

    category_totals = {}

    for transaction in transactions:
        if transaction["type"] == "expense":
            category = transaction["category"]
            category_totals[category] = (
                category_totals.get(category, 0)
                + transaction["amount"]
            )

    return {
        "data_source": "sqlite",
        "income": income,
        "expenses": expenses,
        "remaining": income - expenses,
        "expense_categories": category_totals,
        "transaction_count": len(transactions),
    }

@app.get("/db/forecast")
def get_financial_forecast():
    """
    Create a simple 7-day cash-flow forecast using saved transactions.
    This is a rule-based estimate, not an AI-generated prediction.
    """
    from datetime import date, timedelta
    from collections import defaultdict

    from backend.app.database import list_transactions

    transactions = list_transactions()

    if not transactions:
        return {
            "data_source": "sqlite",
            "forecast_type": "rule_based",
            "message": "Add transactions to generate a forecast.",
            "historical_transaction_count": 0,
            "daily_forecast": [],
        }

    # Separate income and expenses by date.
    daily_income = defaultdict(float)
    daily_expenses = defaultdict(float)

    for transaction in transactions:
        raw_date = str(transaction.get("date", ""))[:10]

        try:
            transaction_date = date.fromisoformat(raw_date)
        except (ValueError, TypeError):
            continue

        amount = float(transaction.get("amount", 0))
        transaction_type = str(transaction.get("type", "")).lower()

        if transaction_type == "income":
            daily_income[transaction_date] += amount
        elif transaction_type == "expense":
            daily_expenses[transaction_date] += amount

    valid_dates = sorted(set(daily_income) | set(daily_expenses))

    if not valid_dates:
        return {
            "data_source": "sqlite",
            "forecast_type": "rule_based",
            "message": "No transactions have valid dates.",
            "historical_transaction_count": len(transactions),
            "daily_forecast": [],
        }

    # Use the most recent 30 calendar days available in the data.
    last_date = valid_dates[-1]
    window_start = last_date - timedelta(days=29)

    recent_income = sum(
        amount for day, amount in daily_income.items()
        if window_start <= day <= last_date
    )
    recent_expenses = sum(
        amount for day, amount in daily_expenses.items()
        if window_start <= day <= last_date
    )

    # Average per calendar day, including days with no transactions.
    average_daily_income = recent_income / 30
    average_daily_expenses = recent_expenses / 30

    current_balance = sum(daily_income.values()) - sum(daily_expenses.values())
    daily_forecast = []

    for offset in range(1, 8):
        forecast_date = last_date + timedelta(days=offset)
        projected_income = round(average_daily_income, 2)
        projected_expenses = round(average_daily_expenses, 2)

        current_balance += projected_income - projected_expenses

        daily_forecast.append({
            "date": forecast_date.isoformat(),
            "projected_income": projected_income,
            "projected_expenses": projected_expenses,
            "projected_balance": round(current_balance, 2),
        })

    return {
        "data_source": "sqlite",
        "forecast_type": "rule_based",
        "historical_transaction_count": len(transactions),
        "historical_window_days": 30,
        "forecast_horizon_days": 7,
        "average_daily_income": round(average_daily_income, 2),
        "average_daily_expenses": round(average_daily_expenses, 2),
        "current_balance": round(
            sum(daily_income.values()) - sum(daily_expenses.values()), 2
        ),
        "daily_forecast": daily_forecast,
        "warning": (
            "Estimate based on historical transaction averages. "
            "It is not a guarantee of future cash flow."
        ),
    }

@app.get("/db/alerts")
def get_financial_alerts():
    """Generate transparent, rule-based alerts from saved transactions."""
    transactions = list_transactions()
    alerts = []

    income = sum(
        float(t.get("amount", 0) or 0)
        for t in transactions
        if str(t.get("type", "")).lower() == "income"
    )
    expenses = sum(
        float(t.get("amount", 0) or 0)
        for t in transactions
        if str(t.get("type", "")).lower() == "expense"
    )
    balance = income - expenses

    if balance < 0:
        alerts.append({
            "id": "negative-balance",
            "level": "warning",
            "title": "Recorded expenses exceed income",
            "message": f"Your recorded balance is {balance:.2f}. Review your expenses and transaction records."
        })

    category_totals = {}
    expense_amounts = []

    for transaction in transactions:
        if str(transaction.get("type", "")).lower() != "expense":
            continue

        amount = float(transaction.get("amount", 0) or 0)
        category = transaction.get("category") or "Uncategorized"
        category_totals[category] = category_totals.get(category, 0) + amount
        expense_amounts.append(amount)

    if expenses > 0 and category_totals:
        category, amount = max(
            category_totals.items(), key=lambda item: item[1]
        )
        share = amount / expenses * 100

        if share >= 50:
            alerts.append({
                "id": "concentrated-spending",
                "level": "warning",
                "title": "Spending concentrated in one category",
                "message": (
                    f"{category} accounts for {share:.1f}% "
                    "of your recorded expenses. Review this category."
                )
            })

    # Flag a large expense relative to the user's own recorded history.
    if len(expense_amounts) >= 3:
        average = sum(expense_amounts) / len(expense_amounts)
        largest = max(expense_amounts)

        if average > 0 and largest >= average * 3:
            alerts.append({
                "id": "large-expense",
                "level": "info",
                "title": "A large expense was recorded",
                "message": (
                    f"Your largest recorded expense is {largest:.2f}, "
                    f"compared with an average of {average:.2f}. "
                    "Check that this transaction is correct."
                )
            })

    if not alerts:
        alerts.append({
            "id": "cashflow-ok",
            "level": "success",
            "title": "No rule-based warnings detected",
            "message": (
                "Current transaction records did not trigger "
                "these alert rules. This does not guarantee financial safety."
            )
        })

    return {
        "data_source": "sqlite",
        "alert_count": len(alerts),
        "alerts": alerts
    }
