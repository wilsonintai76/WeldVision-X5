# 🚀 WeldVision X5 — Deployment Guide

This document provides instructions for deploying the WeldVision X5 system across two environments: the central management server (**Ubuntu Desktop**) and the field units (**Edge Device/RDK X5**).

---

## 🖥️ 1. Ubuntu Desktop (Central Server)

The central server hosts the Django REST API, PostgreSQL database, and the React-based instructor dashboard. It uses Docker Compose for rapid, containerized deployment.

### Prerequisites
*   Ubuntu 20.04/22.04 LTS
*   Docker & Docker Compose installed
*   Network access (Gigabit Ethernet recommended)

### Deployment Steps
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/wilsonintai76/WeldVision-X5.git
    cd WeldVision-X5
    ```

2.  **Start Services**:
    Run the automated startup script:
    ```bash
    chmod +x start-weldvision.sh
    ./start-weldvision.sh
    ```
    *Alternatively, manually start Docker Compose:*
    ```bash
    cd welding_server
    docker-compose up -d --build
    ```

3.  **Access the System**:
    *   **Instructor Dashboard**: `http://localhost:3000`
    *   **Backend API**: `http://localhost:8000/api/`
    *   **Admin Interface**: `http://localhost:8000/admin/`

---

## 🤖 2. Edge Device (Horizon RDK X5)

The Edge Device is installed at each welding station. it handles stereo capture, AI inference (BPU), and uploads results to the central server.

### Prerequisites
*   Horizon RDK X5 with official Ubuntu image
*   Stereo Camera Module
*   Gigabit Ethernet or 5G WiFi (Same network as Server)

### Deployment Steps
1.  **Clone the Repository**:
    ```bash
    cd /home/sunrise
    git clone https://github.com/wilsonintai76/WeldVision-X5.git
    cd WeldVision-X5/edge_device
    ```

2.  **Initialize Runtime Folder**:
    ```bash
    mkdir -p /home/sunrise/welding_app
    cp -r * /home/sunrise/welding_app/
    cd /home/sunrise/welding_app
    ```

3.  **Install Dependencies**:
    ```bash
    pip3 install -r requirements.txt
    ```

4.  **Configure Backend Link**:
    Edit the service file to point to your Server's IP address:
    ```bash
    nano weldvision.service
    ```
    Update the `BACKEND_URL`:
    ```ini
    Environment="BACKEND_URL=http://<SERVER_IP_ADDRESS>:8000"
    ```

5.  **Enable Auto-Start**:
    ```bash
    sudo cp weldvision.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable weldvision
    sudo systemctl start weldvision
    ```

### Verification
*   **Check Logs**: `tail -f /home/sunrise/welding_app/weldvision.log`
*   **Live View**: Open `http://<RDK_IP>:8080/stream.mjpg` on your workstation to verify the camera angle and ROI guide.

---

## 📶 Network Configuration
To ensure seamless communication between devices:
1.  **Static IP**: It is highly recommended to set a static IP for the **Ubuntu Desktop** server.
2.  **Firewall**: Ensure port `8000` (Backend) and `3000` (Frontend) are open on the Ubuntu Desktop.
3.  **Ping Test**: From the RDK, run `ping <SERVER_IP>` to verify connectivity before starting the service.
