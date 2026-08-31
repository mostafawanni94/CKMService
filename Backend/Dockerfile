# syntax=docker/dockerfile:1
FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Build tools for pillow/reportlab wheels that lack a manylinux build.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev libjpeg-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt gunicorn psycopg[binary]

COPY . .

# Never run as root in a container.
RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /app/staticfiles /app/media /app/logs \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Three workers is a starting point; tune to the host's core count.
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
