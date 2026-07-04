# Product Requirements Document (PRD): ApexCRM

ApexCRM is a modern, high-performance Customer Relationship Management (CRM) platform designed for small-to-medium businesses (SMBs) and sales teams. It combines aesthetic excellence with powerful lead tracking, pipeline management, interaction logging, and real-time analytics to supercharge sales workflows.

---

## 1. Executive Summary & Vision

Traditional CRMs are often bloated, slow, and visually outdated. **ApexCRM** aims to redefine the CRM experience by offering a lightning-fast, visually stunning, and highly intuitive single-page application (SPA) or server-side rendered application. 

### Core Value Propositions:
- **Design-First Experience:** A gorgeous, responsive dashboard incorporating glassmorphism, tailored color palettes, and micro-animations.
- **Frictionless Lead Tracking:** Seamlessly move prospects through custom sales pipelines.
- **Unified Timeline:** A single, chronological activity feed for every lead, recording notes, emails, calls, and meetings.
- **Actionable Analytics:** Out-of-the-box charts for pipeline value, conversion rates, and monthly revenue forecasting.

---

## 2. Target Audience & Personas

### Persona A: Sarah - Sales Representative
* **Needs:** Needs to quickly log calls, view daily follow-up tasks, update deal stages, and see her progress towards monthly targets.
* **Pain Points:** Spends too much time navigating heavy CRM menus; finds existing tools confusing and ugly.

### Persona B: David - Sales Director / Owner
* **Needs:** A high-level overview of the sales pipeline, projected revenue, team activity, and conversion bottlenecks.
* **Pain Points:** Lacks clean visual reports; cannot easily identify which deals are stalling.

---

## 3. Core Feature Specifications

### 3.1. Interactive Dashboard (The "Command Center")
Using a premium grid layout inspired by Shadcn's dashboard-01:
- **Key Performance Indicators (KPIs):**
  - **Total Revenue / Closed-Won Value** (with trend indicators)
  - **Active Deals Count**
  - **Lead-to-Customer Conversion Rate**
  - **Open Tasks / Reminders**
- **Sales Pipeline Chart:** Visual representation of deal counts/values across stages.
- **Monthly Revenue Forecast:** A smooth area chart displaying actual vs. projected sales.
- **Recent Activities Feed:** Real-time log of the latest events (e.g., "Sarah created deal with Acme Corp").
- **Task List Quick Actions:** Instantly mark tasks as complete or create a new task.

### 3.2. Lead & Contact Management
- **Contact Database:** A filterable, searchable list of individuals and companies.
- **Detailed Profiles:**
  - Standard Fields: Name, Email, Phone, Company, Job Title, Source (e.g., Web, Referral).
  - Lifecycle Status: Lead, Marketing Qualified (MQL), Sales Qualified (SQL), Customer, Churned.
- **Activity Timeline:** An interactive timeline on each contact page displaying logged interactions (calls, emails, meetings, notes) in chronological order.

### 3.3. Sales Pipeline (Deals Board)
- **Kanban Board Layout:**
  - Columns represent sales stages: *Lead*, *Contacted*, *Demo Scheduled*, *Proposal Sent*, *Negotiation*, *Closed Won*, *Closed Lost*.
  - Drag-and-drop capability to move deals between stages.
- **Deal Details:** Deal value, expected close date, priority (Low, Medium, High), and associated contact.
- **Stage Totals:** Each column displays the sum of deal values within that stage.

### 3.4. Interaction & Activity Logger
- **Logging Interface:** Easy-to-use modals or forms to record:
  - **Notes:** Free-form text formatting.
  - **Calls:** Date, duration, brief summary, outcome (e.g., Busy, Connected).
  - **Meetings:** Date, participants, summary.
  - **Emails:** Subject line and body summary (or integrations mock).
- **Task & Follow-up Scheduler:** Set deadlines and assign tasks to team members directly linked to a contact or deal.

### 3.5. Analytics & Reports Section
- **Pipeline Velocity:** Time spent in each stage.
- **Lead Source Performance:** Bar chart identifying which marketing channels yield the highest-value deals.
- **Team Leaderboard:** Leaderboard showcasing closed-won deals by sales rep.

---

## 4. Technical Architecture & Tech Stack

The CRM platform is structured as a multi-container Dockerized application:
1. **Frontend**: Next.js (TypeScript, TailwindCSS, Shadcn UI, Recharts) serving the user interface.
2. **Backend**: Node.js + Express + TypeScript REST API managing business logic.
3. **Database**: PostgreSQL container for data persistence.

### Detailed Stack:
* **Frontend Framework:** Next.js (App Router)
* **Backend Framework:** Node.js, Express.js, TypeScript
* **Database & ORM:** PostgreSQL database with Prisma ORM
* **Styling & Components:** TailwindCSS and Shadcn UI
* **Charts:** Recharts (responsive, animated charts)
* **Containerization & Orchestration:** Docker & Docker Compose (`docker-compose.yml`) coordinating the local development environment.

---

## 5. Design System & Aesthetics

### Color Palette (Premium Theme):
* **Dark Mode (Default/Toggle):**
  - Background: Slate 950 (`#020617`) / Zinc 950 (`#09090b`)
  - Card Backgrounds: Glassmorphic borders with translucent Slate 900 (`rgba(15, 23, 42, 0.6)`)
  - Primary Accent: Indigo/Violet gradient (`from-indigo-500 to-purple-600`)
  - Highlights/Success: Emerald 500 (`#10b981`)
  - Warnings/Priority: Amber 500 (`#f59e0b`)
* **Typography:** Inter or Outfit (loaded via Google Fonts) for clean, high-readability headings and numbers.
* **Micro-Animations:** Framer Motion or custom Tailwind transitions for hover states, modal open/close, dragging Kanban cards, and tab transitions.

---

## 6. Project Roadmap

### Phase 1: Foundation & Dashboard (Current Scope)
- Project setup (Vite/Next.js + Tailwind + Shadcn).
- Install and configure `dashboard-01`.
- Setup mock data structures (Deals, Contacts, Activities, Tasks).
- Configure responsive layout with Dark/Light modes.

### Phase 2: Core Modules
- Lead/Contact view with list filters, creation modals, and detail page with timeline.
- Kanban Deals Board with drag-and-drop stage updates.
- Activity logger (log calls, tasks, notes on timeline).

### Phase 3: Analytics & Aesthetics Polish
- Integrate interactive charts (Recharts) on the dashboard and reporting pages.
- Add advanced search, filtering, and csv export.
- Apply high-fidelity UI polish (glassmorphic gradients, entry animations).
