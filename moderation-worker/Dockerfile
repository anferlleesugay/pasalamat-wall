# ---------- Base: Python + production dependencies (cached until requirements.txt changes) ----------
FROM python:3.12.7-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---------- Test stage (Jenkins runs: docker build --target test) ----------
FROM base AS test
COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY app ./app
COPY tests ./tests
RUN python -m pytest -q

# ---------- Runtime: no tests, no pytest, non-root user ----------
FROM base AS runtime
RUN useradd --create-home --uid 10001 app
COPY app ./app
USER app
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health', timeout=3).status == 200 else 1)"
CMD ["python", "-m", "app.main"]
