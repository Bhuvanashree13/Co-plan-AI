# CoPlan AI

> **"Current project-management systems optimize task visibility, while CoPlan AI optimizes human–AI collaboration and team coordination."**

CoPlan AI is a human-centered coordination platform powered by **5 specialized, human-governed agents** and the **CARE Governance Framework** (*Control, Accountability, Respect, Equity*). It shifts team management from punitive ledger tracking to empathetic friction detection, cognitive workload balance, and human-supervised replanning.

---

## The Core Thesis

- **Existing systems understand the state of work.** (e.g. *Task assigned → overdue flag → manager alerted*)
- **CoPlan AI understands the context around work.** (e.g. *Task assigned → detect friction → offer support → recommend adjustment → human decides*)

### Task Count ≠ Workload (The Priya vs. Arjun Principle)
- **Priya (Principal Architect)** has **3 tasks**: Design Authentication Architecture, Resolve Production CVE, Migrate Legacy Database. All carry maximum complexity (5/5) and deep cognitive load (4.7/5).
- **Arjun (Frontend Developer)** has **5 active tasks**: Documentation styling, footer navigation links, onboarding copy, and minor polish.
- Conventional dashboards flag Arjun as "overloaded" and Priya as "underutilized".
- **CoPlan AI's Workload Agent** evaluates:
  $$\text{Workload} = \text{complexity} + \text{estimated effort} + \text{dependencies} + \text{urgency} + \text{cognitive load} + \text{capacity}$$
  Revealing that **Priya is at 100% (Critical Overload Risk)** while **Arjun is at 38% (Available Capacity)**.

---

## Architecture: 5 Human-Governed Agents

1. **Planning Agent**: Recommends schedule and focus blocks based on critical path dependencies and cognitive weight.
2. **Workload Agent**: Identifies hidden cognitive overload and recommends peer pairing or task delegation.
3. **Blocker Agent**: Conducts empathetic check-ins with structured friction inference (category, resource, impact, action).
4. **Communication Agent**: Governs tone, quiet hours (21:00-08:00), and morning digest batching (zero nagging).
5. **Insight Agent**: Identifies team coordination patterns and API contract mismatches without employee surveillance ranking.

**Human Decision Layer**: Every AI suggestion requires human action (**Approve / Modify / Reject**) with inspectable rationale.

---

## Tech Stack

- **Backend**: Python 3.11+ / FastAPI, SQLite, Pydantic, Python-JOSE (JWT), BCrypt
- **Frontend**: React 18, TypeScript, Vite, Custom Vanilla CSS Design System, Recharts, Lucide Icons
- **Documentation**: See [CAPSTONE_STRATEGY.md](file:///c:/Users/ASUS/Documents/Co-plan%20AI/CAPSTONE_STRATEGY.md) and [DEMO.md](file:///c:/Users/ASUS/Documents/Co-plan%20AI/DEMO.md)

---

## Quickstart

### 1. Backend

```powershell
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
*(If multiple Python versions are installed, ensure Python 3.11 is used via `py -3.11 -m uvicorn app.main:app --reload --port 8000`)*

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173` in your browser.

### Demo Credentials

- **Email**: `demo@coplan.ai`
- **Password**: `demo1234`
*(Seed data initializes automatically with Maya, Priya, Arjun, Nila, and Rohan)*
