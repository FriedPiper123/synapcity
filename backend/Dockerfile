# syntax=docker/dockerfile:1
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install pip dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Copy backend code and environment file
COPY backend/app ./app
COPY backend/credentials ./credentials
COPY backend/setup_firebase.py ./setup_firebase.py
COPY backend/.env ./.env

# Expose port
EXPOSE 8080

# Use a non-root user for security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

# Command to run the app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"] 