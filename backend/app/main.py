import os
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import bcrypt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr

from .storage import connect, init_db, seed_demo
from . import gemini_service

SECRET_KEY = os.getenv("JWT_SECRET", "development-secret")
ALGORITHM = "HS256"

app = FastAPI(
    title="CoPlan AI API",
    description="Human-governed coordination system powered by 5 specialized agents and CARE governance",
    version="2.0.0",
)

cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env:
    cors_list = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:8000",
            "http://localhost:8000",
        ],
        allow_origin_regex=r"https://.*\.run\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "team_member"
    team_name: str = "CoPlan Capstone Team"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TaskPayload(BaseModel):
    title: str
    description: str = ""
    project_id: int = 1
    owner_id: int = 1
    status: str = "To Do"
    priority: str = "Medium"
    importance: int = 3
    estimated_hours: float = 2.0
    due_date: str
    required_skills: str = ""
    privacy_level: str = "Team"
    blocker_details: str = ""
    complexity: int = 3
    cognitive_load: int = 3
    task_type: str = "Implementation"


class RecommendationDecision(BaseModel):
    note: str | None = None
    modified_change: str | None = None


class CheckInStart(BaseModel):
    task_id: int


class CheckInMessage(BaseModel):
    message: str
    completion_status: str
    blocker_category: str | None = None
    permission_to_share: bool = False
    friction_type: str | None = None
    schedule_impact: str | None = None
    required_resource: str | None = None
    suggested_action: str | None = None


class SwitchPersonaRequest(BaseModel):
    user_id: int


class ApplyDailyPlanRequest(BaseModel):
    task_ids: list[int]


class RebalanceRequest(BaseModel):
    task_id: int
    new_owner_id: int
    pairing_note: str | None = None


class ResolveBlockerRequest(BaseModel):
    resolution_note: str = ""


class UpdateSettingsRequest(BaseModel):
    working_hours: str | None = None
    quiet_hours_start: str | None = None
    quiet_hours_end: str | None = None
    timezone: str | None = None


def row_to_dict(row: Any) -> dict[str, Any]:
    return dict(row) if row is not None else {}


def rows_to_list(rows: list[Any]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def create_token(user: dict[str, Any]) -> str:
    payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "role": user["role"],
        "exp": datetime.utcnow() + timedelta(minutes=1440),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def current_user(token: str = Depends(oauth2_scheme)) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    with connect() as db:
        row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return dict(row)


@app.on_event("startup")
def startup() -> None:
    init_db()
    seed_demo(hash_password("demo1234"))


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "system": "CoPlan AI Agentic Coordination Engine v2.0"}


@app.post("/api/auth/register")
def register(payload: RegisterRequest) -> dict[str, Any]:
    password_hash = hash_password(payload.password)
    with connect() as db:
        existing = db.execute("SELECT id FROM users WHERE email = ?", (payload.email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")
        cur = db.execute(
            """
            INSERT INTO users (name, email, password_hash, role, timezone, working_hours, quiet_hours_start, quiet_hours_end)
            VALUES (?, ?, ?, ?, 'Asia/Calcutta', '09:00-17:00', '21:00', '08:00')
            """,
            (payload.name, payload.email, password_hash, payload.role),
        )
        user_id = cur.lastrowid
        team = db.execute("SELECT id FROM teams WHERE name = ?", (payload.team_name,)).fetchone()
        if not team:
            team_cur = db.execute(
                "INSERT INTO teams (name, description, created_by) VALUES (?, ?, ?)",
                (payload.team_name, "Created during registration", user_id),
            )
            team_id = team_cur.lastrowid
        else:
            team_id = team["id"]
        db.execute(
            "INSERT INTO team_members (team_id, user_id, team_role, skills, interests, weekly_availability) VALUES (?, ?, ?, ?, ?, ?)",
            (team_id, user_id, payload.role, "Product Coordination, Ethics", "Human-AI Collaboration", 32),
        )
        db.commit()
        user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    user_dict = row_to_dict(user)
    return {"token": create_token(user_dict), "user": user_dict}


@app.post("/api/auth/login")
def login(payload: LoginRequest) -> dict[str, Any]:
    with connect() as db:
        row = db.execute("SELECT * FROM users WHERE email = ?", (payload.email,)).fetchone()
    if not row or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = row_to_dict(row)
    return {"token": create_token(user), "user": user}


@app.post("/api/auth/switch-persona")
def switch_persona(payload: SwitchPersonaRequest) -> dict[str, Any]:
    with connect() as db:
        user = db.execute("SELECT * FROM users WHERE id = ?", (payload.user_id,)).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_dict = row_to_dict(user)
    return {"token": create_token(user_dict), "user": user_dict}


@app.get("/api/auth/me")
def me(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return user


@app.get("/api/bootstrap")
def bootstrap(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with connect() as db:
        users = rows_to_list(
            db.execute(
                """
                SELECT u.id, u.name, u.email, u.role, tm.weekly_availability, tm.skills
                FROM users u
                LEFT JOIN team_members tm ON tm.user_id = u.id
                """
            ).fetchall()
        )
        return {
            "user": user,
            "users": users,
            "teams": rows_to_list(db.execute("SELECT * FROM teams").fetchall()),
            "projects": rows_to_list(db.execute("SELECT * FROM projects").fetchall()),
            "tasks": rows_to_list(db.execute("SELECT * FROM task_view ORDER BY ai_priority_score DESC").fetchall()),
            "recommendations": rows_to_list(db.execute("SELECT * FROM ai_recommendations ORDER BY created_at DESC").fetchall()),
            "notifications": rows_to_list(db.execute("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20").fetchall()),
            "checkins": rows_to_list(db.execute("SELECT * FROM check_ins ORDER BY created_at DESC LIMIT 20").fetchall()),
            "care_principles": {
                "Control": "Humans retain 100% authority over schedules and assignments (Approve / Modify / Reject).",
                "Accountability": "AI provides inspectable rationale and records an audit log of every decision.",
                "Respect": "Empathetic check-ins, private blocker notes, and strict quiet hours prevent surveillance.",
                "Equity": "Workload is reasoned over complexity, cognitive load, effort, and capacity—not raw task count.",
            },
            "agents": [
                {"name": "Planning Agent", "role": "Analyzes deadlines, dependencies, and recommends scheduling changes.", "status": "Active"},
                {"name": "Workload Agent", "role": "Identifies overload and equity imbalances using multi-factor cognitive scoring.", "status": "Active"},
                {"name": "Blocker Agent", "role": "Runs conversational check-ins to detect friction and suggest support actions.", "status": "Active"},
                {"name": "Communication Agent", "role": "Governs notification timing, gentle phrasing, and quiet hours.", "status": "Active"},
                {"name": "Insight Agent", "role": "Synthesizes team coordination patterns without individual surveillance scoring.", "status": "Active"},
            ],
            "ai_engine": gemini_service.get_engine_info(),
        }


@app.get("/api/tasks")
def list_tasks(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    with connect() as db:
        return rows_to_list(db.execute("SELECT * FROM task_view ORDER BY ai_priority_score DESC").fetchall())


@app.post("/api/tasks")
def create_task(payload: TaskPayload, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    score = calculate_priority(
        importance=payload.importance,
        due_date=payload.due_date,
        status_value=payload.status,
        blocked=bool(payload.blocker_details),
        estimated_hours=payload.estimated_hours,
        complexity=payload.complexity,
        cognitive_load=payload.cognitive_load,
    )
    with connect() as db:
        cur = db.execute(
            """
            INSERT INTO tasks (
                project_id, title, description, owner_id, status, priority, ai_priority_score,
                importance, estimated_hours, due_date, required_skills, privacy_level, blocker_details,
                complexity, cognitive_load, task_type
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.project_id,
                payload.title,
                payload.description,
                payload.owner_id,
                payload.status,
                payload.priority,
                score,
                payload.importance,
                payload.estimated_hours,
                payload.due_date,
                payload.required_skills,
                payload.privacy_level,
                payload.blocker_details,
                payload.complexity,
                payload.cognitive_load,
                payload.task_type,
            ),
        )
        db.commit()
        task = db.execute("SELECT * FROM task_view WHERE id = ?", (cur.lastrowid,)).fetchone()
    return row_to_dict(task)


@app.patch("/api/tasks/{task_id}")
def update_task(task_id: int, payload: dict[str, Any], user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    allowed = {
        "title", "description", "owner_id", "status", "priority", "importance",
        "estimated_hours", "due_date", "required_skills", "privacy_level",
        "blocker_details", "complexity", "cognitive_load", "task_type",
    }
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No supported updates")

    if {"importance", "due_date", "status", "blocker_details", "estimated_hours", "complexity", "cognitive_load"} & updates.keys():
        with connect() as db:
            existing = dict(db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone())
        score = calculate_priority(
            importance=int(updates.get("importance", existing["importance"])),
            due_date=str(updates.get("due_date", existing["due_date"])),
            status_value=str(updates.get("status", existing["status"])),
            blocked=bool(updates.get("blocker_details", existing["blocker_details"])),
            estimated_hours=float(updates.get("estimated_hours", existing["estimated_hours"])),
            complexity=int(updates.get("complexity", existing.get("complexity", 3))),
            cognitive_load=int(updates.get("cognitive_load", existing.get("cognitive_load", 3))),
        )
        updates["ai_priority_score"] = score

    set_clause = ", ".join([f"{key} = ?" for key in updates])
    values = list(updates.values()) + [datetime.utcnow().isoformat(), task_id]
    with connect() as db:
        db.execute(f"UPDATE tasks SET {set_clause}, updated_at = ? WHERE id = ?", values)
        db.commit()
        task = db.execute("SELECT * FROM task_view WHERE id = ?", (task_id,)).fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return row_to_dict(task)


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, str]:
    with connect() as db:
        db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        db.commit()
    return {"status": "deleted"}


@app.post("/api/ai/prioritize")
def prioritize(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    with connect() as db:
        tasks = rows_to_list(db.execute("SELECT * FROM task_view").fetchall())
    return [
        priority_explanation(task, index + 1)
        for index, task in enumerate(sorted(tasks, key=lambda item: item["ai_priority_score"], reverse=True))
    ]


@app.post("/api/ai/daily-plan")
def daily_plan(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with connect() as db:
        # Prioritize the active persona's assigned tasks
        user_tasks = rows_to_list(
            db.execute(
                "SELECT * FROM task_view WHERE owner_id = ? AND status != 'Completed' ORDER BY ai_priority_score DESC LIMIT 6",
                (user["id"],),
            ).fetchall()
        )
        if user_tasks:
            focus_tasks = user_tasks[:4]
            persona_label = f"{user.get('name', 'Team Member')}'s focus queue"
        else:
            team_tasks = rows_to_list(
                db.execute(
                    "SELECT * FROM task_view WHERE status != 'Completed' ORDER BY ai_priority_score DESC LIMIT 6"
                ).fetchall()
            )
            focus_tasks = team_tasks[:4]
            persona_label = f"Team focus queue for {user.get('name', 'Team Leader')}"

    total_hours = sum(float(task["estimated_hours"]) for task in focus_tasks)
    avg_cog_load = (
        round(sum(int(task.get("cognitive_load", 3)) for task in focus_tasks) / len(focus_tasks), 1)
        if focus_tasks
        else 0
    )

    plan_items = [priority_explanation(task, index + 1) for index, task in enumerate(focus_tasks)]

    # If Gemini is active, enrich plan with generative reasoning tailored to this persona
    gemini_reasons = gemini_service.generate_daily_plan_reasoning(focus_tasks, user.get("name", "Team Member"))
    if gemini_reasons:
        reason_map = {item.get("task_id"): item for item in gemini_reasons if isinstance(item, dict)}
        for p in plan_items:
            t_id = p["task_id"]
            if t_id in reason_map:
                g_item = reason_map[t_id]
                if g_item.get("reason"):
                    p["reason"] = g_item["reason"]
                if g_item.get("proposed_action"):
                    p["proposed_action"] = g_item["proposed_action"]
                if g_item.get("recommended_priority"):
                    p["recommended_priority"] = g_item["recommended_priority"]

    engine_info = gemini_service.get_engine_info()
    return {
        "summary": f"Focus plan for {persona_label} prepared by {engine_info['provider']}: {len(focus_tasks)} personalized tasks ({total_hours:.1f} hours, Avg cognitive load: {avg_cog_load}/5.0).",
        "plan": plan_items,
        "agent": "Planning Agent",
        "engine": engine_info,
        "requires_human_approval": True,
        "governance_rule": "Control Principle: Recommendations do not mutate schedules until approved.",
    }


@app.post("/api/ai/daily-plan/apply")
def apply_daily_plan(payload: ApplyDailyPlanRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with connect() as db:
        for index, task_id in enumerate(payload.task_ids):
            db.execute(
                """
                UPDATE tasks
                SET ai_priority_score = MAX(ai_priority_score, 8.5) - (? * 0.1),
                    status = CASE WHEN status = 'To Do' THEN 'In Progress' ELSE status END,
                    updated_at = ?
                WHERE id = ?
                """,
                (index, datetime.utcnow().isoformat(), task_id),
            )
        db.execute(
            """
            INSERT INTO ai_recommendations (
                user_id, agent_name, recommendation_type, proposed_change,
                explanation, confidence, status, decision_note, reviewed_at
            )
            VALUES (?, 'Planning Agent', 'Schedule Activation', ?, ?, 0.95, 'Accepted', 'Approved and applied by user to active schedule.', ?)
            """,
            (
                user["id"],
                f"Activated {len(payload.task_ids)} focus tasks for today's work block.",
                f"User {user['name']} explicitly approved the Planning Agent's recommended daily focus queue.",
                datetime.utcnow().isoformat(),
            ),
        )
        db.commit()
    return {"status": "applied", "applied_count": len(payload.task_ids)}


@app.post("/api/team/rebalance")
def rebalance_task(payload: RebalanceRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with connect() as db:
        task = db.execute("SELECT * FROM task_view WHERE id = ?", (payload.task_id,)).fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        new_owner = db.execute("SELECT * FROM users WHERE id = ?", (payload.new_owner_id,)).fetchone()
        if not new_owner:
            raise HTTPException(status_code=404, detail="Target user not found")

        old_owner_name = task["owner_name"]
        new_owner_name = new_owner["name"]
        pairing_note = payload.pairing_note or gemini_service.generate_rebalance_note(
            task["title"], old_owner_name, new_owner_name, task.get("cognitive_load", 4)
        )

        db.execute(
            "UPDATE tasks SET owner_id = ?, updated_at = ? WHERE id = ?",
            (payload.new_owner_id, datetime.utcnow().isoformat(), payload.task_id),
        )
        db.execute(
            """
            INSERT INTO ai_recommendations (
                user_id, task_id, agent_name, recommendation_type, proposed_change,
                explanation, confidence, status, decision_note, reviewed_at
            )
            VALUES (?, ?, 'Workload Agent', 'Task Delegation / Pairing', ?, ?, 0.94, 'Accepted', ?, ?)
            """,
            (
                user["id"],
                payload.task_id,
                f"Reassigned '{task['title']}' to {new_owner_name}.",
                f"Workload Agent detected cognitive load disparity. {pairing_note}",
                f"Approved by {user['name']}.",
                datetime.utcnow().isoformat(),
            ),
        )
        db.commit()
        updated_task = db.execute("SELECT * FROM task_view WHERE id = ?", (payload.task_id,)).fetchone()
    return row_to_dict(updated_task)


@app.post("/api/tasks/{task_id}/resolve-blocker")
def resolve_blocker(task_id: int, payload: ResolveBlockerRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with connect() as db:
        task = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        db.execute(
            """
            UPDATE tasks
            SET status = 'In Progress', blocker_details = '', updated_at = ?
            WHERE id = ?
            """,
            (datetime.utcnow().isoformat(), task_id),
        )
        db.execute(
            """
            INSERT INTO notifications (user_id, title, body, category)
            VALUES (?, 'Blocker Resolved', ?, 'blocker')
            """,
            (
                user["id"],
                f"Blocker on '{task['title']}' resolved by {user['name']}: {payload.resolution_note or 'Unblocked'}",
            ),
        )
        db.commit()
        updated_task = db.execute("SELECT * FROM task_view WHERE id = ?", (task_id,)).fetchone()
    return row_to_dict(updated_task)


@app.get("/api/audit-logs")
def audit_logs(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute(
            """
            SELECT * FROM ai_recommendations
            WHERE status IN ('Accepted', 'Modified', 'Rejected')
            ORDER BY COALESCE(reviewed_at, created_at) DESC
            LIMIT 50
            """
        ).fetchall()
        return rows_to_list(rows)


@app.patch("/api/user/settings")
def update_settings(payload: UpdateSettingsRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    updates: dict[str, Any] = {}
    if payload.working_hours is not None:
        updates["working_hours"] = payload.working_hours
    if payload.quiet_hours_start is not None:
        updates["quiet_hours_start"] = payload.quiet_hours_start
    if payload.quiet_hours_end is not None:
        updates["quiet_hours_end"] = payload.quiet_hours_end
    if payload.timezone is not None:
        updates["timezone"] = payload.timezone

    if updates:
        set_clause = ", ".join([f"{k} = ?" for k in updates])
        values = list(updates.values()) + [user["id"]]
        with connect() as db:
            db.execute(f"UPDATE users SET {set_clause} WHERE id = ?", values)
            db.commit()
            updated_user = db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
            return row_to_dict(updated_user)
    return user


@app.get("/api/ai/recommendations")
def recommendations(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    with connect() as db:
        return rows_to_list(db.execute("SELECT * FROM ai_recommendations ORDER BY created_at DESC").fetchall())


@app.post("/api/ai/recommendations/{rec_id}/accept")
def accept_recommendation(rec_id: int, payload: RecommendationDecision, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return set_recommendation_status(rec_id, "Accepted", payload)


@app.post("/api/ai/recommendations/{rec_id}/reject")
def reject_recommendation(rec_id: int, payload: RecommendationDecision, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return set_recommendation_status(rec_id, "Rejected", payload)


@app.post("/api/ai/recommendations/{rec_id}/modify")
def modify_recommendation(rec_id: int, payload: RecommendationDecision, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return set_recommendation_status(rec_id, "Modified", payload)


@app.post("/api/checkins/start")
def start_checkin(payload: CheckInStart, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with connect() as db:
        task = db.execute("SELECT * FROM tasks WHERE id = ?", (payload.task_id,)).fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    title = task["title"]
    return {
        "task_id": payload.task_id,
        "task_title": title,
        "agent": "Blocker Agent",
        "question": f"This task '{title}' looks like it is taking longer than originally planned. Is the main friction time, dependency, unclear requirements, technical difficulty, or something else?",
        "quick_responses": [
            "On track, completing soon",
            "Waiting on external dependency",
            "Technical complexity / uncertainty",
            "Requirements are unclear",
            "Workload / capacity overload",
            "Need teammate pairing",
        ],
    }


@app.post("/api/checkins/{task_id}/message")
def checkin_message(task_id: int, payload: CheckInMessage, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with connect() as db:
        task = dict(db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone() or {})

    # Empathetic Blocker Agent inference loop:
    # Uses Gemini API if configured; falls back gracefully to deterministic CARE co-pilot
    gemini_res = gemini_service.generate_empathetic_reply(
        task_title=task.get("title", "Task"),
        user_message=payload.message,
        completion_status=payload.completion_status,
        blocker_category=payload.blocker_category,
    )

    friction_type = payload.friction_type or gemini_res["friction_type"]
    schedule_impact = payload.schedule_impact or gemini_res["schedule_impact"]
    required_resource = payload.required_resource or gemini_res["required_resource"]
    suggested_action = payload.suggested_action or gemini_res["suggested_action"]

    with connect() as db:
        cur = db.execute(
            """
            INSERT INTO check_ins (
                task_id, user_id, completion_status, blocker_category, private_message,
                friction_type, schedule_impact, required_resource, suggested_action, permission_to_share
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                task_id,
                user["id"],
                payload.completion_status,
                payload.blocker_category,
                payload.message,
                friction_type,
                schedule_impact,
                required_resource,
                suggested_action,
                int(payload.permission_to_share),
            ),
        )
        checkin_id = cur.lastrowid

        is_friction = payload.completion_status in {
            "Blocked", "Need support", "Waiting on external dependency",
            "Technical complexity / uncertainty", "Requirements are unclear",
            "Workload / capacity overload", "Need teammate pairing"
        }

        if payload.completion_status in ["Completed", "On track, completing soon"]:
            if payload.completion_status == "Completed":
                db.execute("UPDATE tasks SET status = 'Completed', updated_at = ? WHERE id = ?", (datetime.utcnow().isoformat(), task_id))
            reply = f"Blocker Agent: Great progress! Task marked as '{payload.completion_status}'. Keep up the momentum."
        elif is_friction:
            # Respect principle: Only expose shared details if user consented
            privacy_note = "Consent granted to share support request with team." if payload.permission_to_share else "Private check-in: Friction details kept confidential to your dashboard."
            db.execute(
                "UPDATE tasks SET status = 'Blocked', blocker_details = ?, updated_at = ? WHERE id = ?",
                (f"{friction_type}: {payload.message[:60]}", datetime.utcnow().isoformat(), task_id),
            )
            # Create recommendation in Human Decision Layer
            db.execute(
                """
                INSERT INTO ai_recommendations (
                    user_id, task_id, agent_name, recommendation_type, proposed_change,
                    explanation, confidence, status, friction_type, schedule_impact,
                    required_resource, suggested_action
                )
                VALUES (?, ?, 'Blocker Agent', 'Friction Resolution', ?, ?, 0.88, 'Pending', ?, ?, ?, ?)
                """,
                (
                    user["id"],
                    task_id,
                    suggested_action,
                    f"Friction detected on '{task.get('title', 'Task')}': {friction_type}. Schedule impact: {schedule_impact}. {privacy_note}",
                    friction_type,
                    schedule_impact,
                    required_resource,
                    suggested_action,
                ),
            )
            reply = f"{gemini_res['reply']} ({privacy_note})"
        else:
            reply = "Blocker Agent: Update recorded safely in your coordination log."

        db.commit()
        item = db.execute("SELECT * FROM check_ins WHERE id = ?", (checkin_id,)).fetchone()

    return {
        "checkin": row_to_dict(item),
        "reply": reply,
        "inference": {
            "friction_type": friction_type,
            "schedule_impact": schedule_impact,
            "required_resource": required_resource,
            "suggested_action": suggested_action,
            "permission_to_share": payload.permission_to_share,
            "source": gemini_res.get("source", "fallback"),
        },
    }


@app.get("/api/analytics/personal")
def personal_analytics(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return analytics()


@app.get("/api/analytics/team/{team_id}")
def team_analytics(team_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return analytics()


@app.get("/api/notifications")
def notifications(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    with connect() as db:
        return rows_to_list(db.execute("SELECT * FROM notifications ORDER BY created_at DESC").fetchall())


def set_recommendation_status(rec_id: int, status_value: str, payload: RecommendationDecision) -> dict[str, Any]:
    with connect() as db:
        db.execute(
            """
            UPDATE ai_recommendations
            SET status = ?, reviewed_at = ?, decision_note = ?, proposed_change = COALESCE(?, proposed_change)
            WHERE id = ?
            """,
            (status_value, datetime.utcnow().isoformat(), payload.note, payload.modified_change, rec_id),
        )
        db.commit()
        row = db.execute("SELECT * FROM ai_recommendations WHERE id = ?", (rec_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    return row_to_dict(row)


def calculate_priority(
    importance: int,
    due_date: str,
    status_value: str,
    blocked: bool,
    estimated_hours: float,
    complexity: int = 3,
    cognitive_load: int = 3,
) -> float:
    try:
        due = date.fromisoformat(due_date)
        days = max((due - date.today()).days, 0)
    except Exception:
        days = 3
    urgency = max(0, 10 - days)
    importance_score = min(max(importance, 1), 5) * 2
    dependency = 8 if any(k in status_value for k in ["API", "Review", "Architecture", "Security"]) else 4
    blocker_val = 9 if blocked else 2
    workload_val = min(10, (complexity * 1.1) + (cognitive_load * 0.9))
    return round(
        0.25 * urgency
        + 0.20 * importance_score
        + 0.20 * dependency
        + 0.15 * blocker_val
        + 0.20 * workload_val,
        2,
    )


def priority_explanation(task: dict[str, Any], position: int) -> dict[str, Any]:
    reasons = []
    try:
        days = (date.fromisoformat(task["due_date"]) - date.today()).days
        if days <= 1:
            reasons.append("Due within 24 hours (Urgent)")
        elif days <= 3:
            reasons.append("Due this week")
    except Exception:
        pass

    if task.get("importance", 3) >= 4:
        reasons.append("High project importance")
    if task.get("cognitive_load", 3) >= 4:
        reasons.append(f"High cognitive load ({task.get('cognitive_load')}/5)")
    if task.get("complexity", 3) >= 4:
        reasons.append(f"High technical complexity ({task.get('complexity')}/5)")
    if task.get("status") == "Blocked":
        reasons.append("Needs unblock decision before dependent work slips")
    if not reasons:
        reasons.append("Fits current cognitive capacity")

    agent = "Planning Agent"
    return {
        "task_id": task["id"],
        "task_title": task["title"],
        "recommended_priority": "High" if task.get("ai_priority_score", 5) >= 7.5 else "Medium",
        "recommended_position": position,
        "reason": reasons,
        "proposed_action": f"Schedule at position {position} in focus queue",
        "confidence": min(0.96, 0.65 + float(task.get("ai_priority_score", 5)) / 28),
        "requires_human_approval": True,
        "agent_name": agent,
        "governance_rule": "Accountability: Transparent multi-factor explanation based on urgency, complexity, and cognitive load.",
    }


def analytics() -> dict[str, Any]:
    with connect() as db:
        status_rows = rows_to_list(db.execute("SELECT status, COUNT(*) count FROM tasks GROUP BY status").fetchall())
        all_users = rows_to_list(
            db.execute(
                """
                SELECT u.id, u.name, u.role, COALESCE(tm.weekly_availability, 30) availability
                FROM users u
                LEFT JOIN team_members tm ON tm.user_id = u.id
                """
            ).fetchall()
        )
        all_tasks = rows_to_list(db.execute("SELECT * FROM tasks").fetchall())
        rec_rows = rows_to_list(db.execute("SELECT agent_name, COUNT(*) count FROM ai_recommendations GROUP BY agent_name").fetchall())
        decisions = rows_to_list(db.execute("SELECT status name, COUNT(*) value FROM ai_recommendations GROUP BY status").fetchall())

    # Calculate Contextual Workload Equity Equation:
    # Workload = complexity + estimated effort + dependencies + urgency + cognitive load + current capacity
    workload_equity = []
    for u in all_users:
        user_tasks = [t for t in all_tasks if t["owner_id"] == u["id"] and t["status"] != "Completed"]
        task_count = len(user_tasks)
        total_hours = sum(float(t["estimated_hours"]) for t in user_tasks)
        avg_complexity = (
            round(sum(int(t.get("complexity", 3)) for t in user_tasks) / task_count, 1)
            if task_count > 0
            else 1.0
        )
        avg_cog_load = (
            round(sum(int(t.get("cognitive_load", 3)) for t in user_tasks) / task_count, 1)
            if task_count > 0
            else 1.0
        )

        # Contextual Workload Score: 0 - 100
        # Incorporates cognitive weight and complexity per hour
        cognitive_pressure = (avg_complexity * 0.5 + avg_cog_load * 0.5) / 5.0
        effective_load = total_hours * (0.6 + 0.8 * cognitive_pressure)
        availability = float(u["availability"])
        contextual_score = min(100, round((effective_load / max(availability * 0.5, 1.0)) * 100))

        if contextual_score >= 80:
            status_label = "Critical Overload Risk"
        elif contextual_score >= 50:
            status_label = "Optimal Focus"
        else:
            status_label = "Available Capacity"

        workload_equity.append({
            "name": u["name"].split(" ")[0],
            "full_name": u["name"],
            "role": u["role"],
            "task_count": task_count,
            "total_hours": round(total_hours, 1),
            "avg_complexity": avg_complexity,
            "avg_cognitive_load": avg_cog_load,
            "contextual_score": contextual_score,
            "status_label": status_label,
            "availability": availability,
        })

    # Blocker and friction breakdown
    friction_types = [
        {"category": "External Dependency", "count": 3},
        {"category": "Cognitive Overload", "count": 2},
        {"category": "Technical Complexity", "count": 2},
        {"category": "Unclear Requirements", "count": 1},
        {"category": "Timing / Quiet Hours", "count": 1},
    ]

    return {
        "status_distribution": status_rows,
        "weekly_completion": [
            {"week": "W1", "completed": 6, "rescheduled": 2},
            {"week": "W2", "completed": 9, "rescheduled": 3},
            {"week": "W3", "completed": 8, "rescheduled": 2},
            {"week": "W4", "completed": 12, "rescheduled": 1},
        ],
        "workload_equity": workload_equity,
        "blockers": friction_types,
        "ai_decisions": decisions if decisions else [
            {"name": "Accepted", "value": 14},
            {"name": "Modified", "value": 5},
            {"name": "Rejected", "value": 2},
        ],
        "agent_activity": rec_rows if rec_rows else [
            {"agent_name": "Planning Agent", "count": 4},
            {"agent_name": "Workload Agent", "count": 3},
            {"agent_name": "Blocker Agent", "count": 3},
            {"agent_name": "Communication Agent", "count": 2},
            {"agent_name": "Insight Agent", "count": 2},
        ],
    }


# Static files & SPA catch-all (mounted after all /api routes)
FRONTEND_DIST = Path(os.getenv(
    "FRONTEND_DIST",
    str(Path(__file__).resolve().parents[2] / "frontend" / "dist"),
))

if FRONTEND_DIST.is_dir():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = FRONTEND_DIST / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        index_file = FRONTEND_DIST / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Frontend index.html not found")
