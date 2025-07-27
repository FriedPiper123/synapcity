# Build frontend first
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY project/package*.json ./
RUN npm install
COPY project/ ./
RUN npm run build

# Main container
FROM python:3.10-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt

# Copy backend
COPY backend/ ./

# Copy built frontend and ensure directory exists
COPY --from=frontend-build /app/dist ./static
RUN ls -la ./static  # Debug line - remove after testing

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]