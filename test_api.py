from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["project"] == "FinPilot Sentinel"


def test_transactions_endpoint_uses_sqlite():
    response = client.get("/db/transactions")
    assert response.status_code == 200

    body = response.json()
    assert body["data_source"] == "sqlite"
    assert isinstance(body["transactions"], list)

    for transaction in body["transactions"]:
        assert {"id", "name", "category", "date", "amount", "type"} <= set(transaction)
        assert transaction["type"] in {"income", "expense"}
        assert transaction["amount"] > 0


def test_analytics_endpoint():
    response = client.get("/db/analytics")
    assert response.status_code == 200

    body = response.json()
    assert body["data_source"] == "sqlite"
    assert body["income"] >= 0
    assert body["expenses"] >= 0
    assert body["remaining"] == body["income"] - body["expenses"]
    assert body["transaction_count"] >= 0
    assert isinstance(body["expense_categories"], dict)


def test_forecast_endpoint():
    response = client.get("/db/forecast")
    assert response.status_code == 200

    body = response.json()
    assert body["data_source"] == "sqlite"
    assert body["forecast_type"] == "rule_based"
    assert isinstance(body["daily_forecast"], list)

    if body["daily_forecast"]:
        assert len(body["daily_forecast"]) == 7
        for day in body["daily_forecast"]:
            assert "date" in day
            assert "projected_income" in day
            assert "projected_expenses" in day
            assert "projected_balance" in day


def test_alerts_endpoint():
    response = client.get("/db/alerts")
    assert response.status_code == 200

    body = response.json()
    assert body["data_source"] == "sqlite"
    assert body["alert_count"] == len(body["alerts"])

    for alert in body["alerts"]:
        assert {"id", "level", "title", "message"} <= set(alert)


def test_invalid_transaction_is_rejected():
    response = client.post(
        "/db/transactions",
        json={
            "name": "Invalid test",
            "category": "Testing",
            "date": "2026-10-27",
            "amount": -100,
            "type": "expense",
        },
    )
    assert response.status_code == 422

def test_assistant_endpoint_answers_valid_question():
    response = client.post(
        "/db/assistant",
        json={"question": "How much did I spend?"},
    )

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body["answer"], str)
    assert body["answer"].strip()
    assert body["data_source"] == "sqlite"
    assert body["ai_used"] is False


def test_assistant_endpoint_rejects_empty_question():
    response = client.post(
        "/db/assistant",
        json={"question": ""},
    )

    assert response.status_code == 422


def test_assistant_endpoint_returns_expense_total():
    response = client.post(
        "/db/assistant",
        json={"question": "How much did I spend?"},
    )

    assert response.status_code == 200
    body = response.json()

    assert "calculations" in body
    assert body["calculations"]["expenses"] >= 0

