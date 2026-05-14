# RDK X5 Simulator Dockerfile
FROM python:3.10-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Set work directory
WORKDIR /app

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy project
COPY . /app/

# Environment defaults for Simulation Mode
ENV WELDVISION_SIMULATION=1
ENV BACKEND_URL=https://api.weldvision-x5.com
ENV WELDVISION_STREAM_HOST=0.0.0.0
ENV WELDVISION_STREAM_PORT=8080

# Expose MJPEG stream port
EXPOSE 8080

# Run main application
CMD ["python", "main.py"]
