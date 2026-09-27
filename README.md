# 🚀 ReachInbox - Full-Stack Email Job Scheduler

Production-grade email scheduler service and interactive dashboard built for ReachInbox (Outbox Labs).

---

## 🛠 Tech Stack Overview

### Backend
- **Framework**: Express.js with TypeScript
- **Queue Engine**: BullMQ (backed by Redis - zero cron jobs)
- **Database**: PostgreSQL / SQLite (managed via Prisma ORM)
- **Search Engine**: Elasticsearch (`@elastic/elasticsearch`) with automatic indexing & DB search fallback
- **Email Provider**: Ethereal Email (Fake SMTP for testing with live web preview URLs)
- **Queue Dashboard**: Live Bull Board mounted at `/admin/queues`
- **Integrations**: Slack Webhook & OAuth alert notifications

### Frontend
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS (custom Figma design replica)
- **Icons**: Lucide Icons
- **HTTP Client**: Axios

---

## 🚀 Quick Start Guide

### 1. Run via Docker Compose (Recommended)
```bash
# Start PostgreSQL, Redis, and Elasticsearch
docker compose up -d
```

### 2. Start Backend API & Worker
```bash
cd backend

# Install dependencies
npm install

# Push database schema (Prisma)
npx prisma db push

# Start backend server + BullMQ worker
npm run dev
```
- API Server: `http://localhost:5000`
- BullMQ Live Dashboard: `http://localhost:5000/admin/queues`

### 3. Start Frontend Dashboard
```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
- Next.js Dashboard: `http://localhost:3000`

---

## 🔐 Environment Variables (`backend/.env`)

```env
PORT=5000
DATABASE_URL="file:./dev.db"
REDIS_HOST="localhost"
REDIS_PORT=6379
ELASTICSEARCH_NODE="http://localhost:9200"

# Throttling & Rate Limiting Defaults
WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
DEFAULT_MAX_EMAILS_PER_HOUR=50

# Ethereal SMTP Credentials (If empty, dynamic accounts generate on-the-fly)
ETHEREAL_USER=""
ETHEREAL_PASS=""

# Slack Integration Webhook
SLACK_WEBHOOK_URL=""
```

---

## 📐 Architecture & Core Concepts

### 1. Job Scheduling & Persistence
- **No Cron Jobs**: Scheduling is executed exclusively via BullMQ delayed jobs (`emailQueue.add(..., { delay })`).
- **Idempotency**: Every job uses `jobId: emailScheduleId` generated prior to queue insertion. Re-submitting duplicate payload will not enqueue duplicate jobs.
- **Server Restart Resilience**: All pending delayed jobs reside in persistent Redis storage. If the backend process crashes or restarts:
  1. No jobs are lost.
  2. Future scheduled emails execute at their precise appointed time.
  3. Already sent emails remain marked `SENT` in DB.

### 2. Rate Limiting, Throttling & Concurrency
- **Worker Concurrency**: Worker runs with `WORKER_CONCURRENCY` parallel execution slots.
- **Inter-Email Minimum Delay**: Throttled by `MIN_EMAIL_DELAY_MS` (e.g. 2 seconds minimum between consecutive email sends) to mimic real ISP throttling.
- **Hourly Rate Limiter**:
  - Redis fixed-window counter: `rate_limit:{sender_email}:{YYYY-MM-DD-HH}`.
  - When hourly quota is reached:
    - Jobs are **NOT dropped or failed**.
    - The worker calculates the delay until the next hour window (`nextWindow - Date.now()`).
    - Job is deferred into the next hour window maintaining execution order.
    - Status is updated to `RESCHEDULED`.
    - **Live Slack Alert**: Dispatches a Slack notification detailing sender email, hourly limit, and pending job counts.

### 3. Elasticsearch Search Indexing
- Every scheduled, sent, or rescheduled email is indexed in Elasticsearch (`emails` index).
- Search input in the top header executes full-text search against subject, recipient email, and HTML body content.

---

## ✨ Features Implemented Matrix

| Component | Feature | Details |
| :--- | :--- | :--- |
| **Backend** | BullMQ Delayed Queue | Persistent queue without OS or Node cron libraries |
| **Backend** | Idempotency | `jobId` strategy preventing duplicate sends |
| **Backend** | Restart Resilience | Jobs persist in Redis; server restart resumes execution seamlessly |
| **Backend** | Rate Limiting | Redis-backed hourly counter per sender + auto-reschedule to next hour |
| **Backend** | Slack Alerts | Live Slack Webhook alert fired when rate limit threshold is hit |
| **Backend** | Ethereal Email | Sends real SMTP emails + returns clickable web preview URLs |
| **Backend** | Bull Board UI | Mounted at `http://localhost:5000/admin/queues` |
| **Backend** | Elasticsearch | Indexing + full-text search API with DB fallback |
| **Backend** | CSV Lead Extractor | `/api/emails/parse-csv` parses CSV files and extracts unique lead emails |
| **Frontend** | Google Login Page | Figma replica page with Google Sign In & email form |
| **Frontend** | Sidebar Layout | Brand ONB logo, user card avatar, "+ Compose" button, CORE navigation |
| **Frontend** | Scheduled Tab | Table of pending emails with orange scheduled date badges & search |
| **Frontend** | Sent Tab | Table of completed emails with "Sent" badges & search |
| **Frontend** | Email Detail View | Full screen preview with formatted HTML body & attachment cards |
| **Frontend** | Compose Modal | Rich text editor, sender selector, lead email tag pills, CSV file drag-and-drop |
| **Frontend** | Send Later Picker | Date/time picker popover with quick preset buttons ("Tomorrow, 10:00 AM", etc.) |
