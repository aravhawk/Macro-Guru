FROM python:3.11-slim

WORKDIR /Macro-Guru

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["streamlit", "run", "main.py", "--server.enableCORS", "false", "--browser.serverAddress", "0.0.0.0", "--browser.gatherUsageStats", "false", "--server.port", "8080"]
