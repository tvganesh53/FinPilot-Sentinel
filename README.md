\# FinPilot Sentinel



FinPilot Sentinel is a financial insights dashboard built with React, Vite, FastAPI, and SQLite. It presents recorded transaction data, financial summaries, forecasts, alerts, and a rule-based financial assistant.



\## Features



\- Financial overview dashboard

\- Transaction listing and recording

\- Income and expense analytics

\- Rule-based forecasts and financial alerts

\- Financial Assistant that answers supported questions using saved SQLite data

\- FastAPI endpoints for transactions, analytics, forecasts, alerts, and assistant queries



\## Technology Stack



\- \*\*Frontend:\*\* React, Vite, JavaScript

\- \*\*Backend:\*\* Python, FastAPI, Uvicorn

\- \*\*Database:\*\* SQLite

\- \*\*Testing:\*\* Pytest, FastAPI TestClient



\## Prerequisites



\- Python 3.12 or compatible Python version

\- Node.js and npm

\- Git (optional, for version control)



\## Setup



\### 1. Clone or download the repository



Open a terminal in the project root directory.



\### 2. Set up the Python environment



On Windows PowerShell:



```powershell

python -m venv .venv

.\\.venv\\Scripts\\Activate.ps1

python -m pip install -r requirements.txt

```



\### 3. Configure environment variables



Review `.env.example` and create a local `.env` file if the backend requires environment variables.



Never commit real API keys or secrets. The current rule-based Financial Assistant does not require an external AI API call.



\### 4. Start the backend



From the project root:



```powershell

python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

```



API documentation is available at `http://127.0.0.1:8000/docs` while the backend is running.



\### 5. Start the frontend



Open a second terminal:



```powershell

npm --prefix .\\frontend install

npm --prefix .\\frontend run dev

```



Open the local URL printed by Vite, usually `http://localhost:5173`.



\### 6. Run tests



From the project root with the Python environment activated:



```powershell

python -m pytest .\\test\_api.py -v

```



\### 7. Build the frontend



```powershell

npm --prefix .\\frontend run build

```



\## Financial Assistant



The Financial Assistant sends questions to the backend endpoint `/db/assistant`. The current implementation uses deterministic, rule-based calculations against saved SQLite transactions. It is not an LLM-powered financial advisor and does not connect to a live bank account.



\## Database and Demo Data



The backend uses a local SQLite database. Depending on the database initialization and application setup, a fresh installation may need database initialization or seed data before the dashboard contains example transactions.



Do not upload personal financial records or a local database containing sensitive information to a public repository.



\## Current Limitations



\- Some dashboard sections may be prototypes rather than fully implemented features.

\- Forecasts and alerts are rule-based and should not be treated as professional financial advice.

\- The production frontend build currently reports a large JavaScript bundle warning; the build succeeds.



\## Testing Status



The project has passed nine backend tests in the development environment. Re-run the test suite after making changes or installing dependencies.



