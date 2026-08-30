FROM python:3.12-slim

WORKDIR /app

# Copied and installed before the source so a code edit doesn't reinstall the
# dependency tree on every rebuild.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
