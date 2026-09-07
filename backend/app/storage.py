import os
import sqlite3
from datetime import date, timedelta
from pathlib import Path

DB_ENV = os.getenv("DATABASE_PATH")
DB_PATH = Path(DB_ENV) if DB_ENV else Path(__file__).resolve().parents[1] / "coplan.db"


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def init_db() -> None:
    with connect() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                timezone TEXT NOT NULL,
                working_hours TEXT NOT NULL,
                quiet_hours_start TEXT NOT NULL,
                quiet_hours_end TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                created_by INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS team_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                team_role TEXT NOT NULL,
                skills TEXT,
                interests TEXT,
                weekly_availability REAL
            );
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                start_date TEXT,
                deadline TEXT,
                status TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                owner_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                priority TEXT NOT NULL,
                ai_priority_score REAL NOT NULL,
                importance INTEGER NOT NULL,
                estimated_hours REAL NOT NULL,
                due_date TEXT NOT NULL,
                required_skills TEXT,
                privacy_level TEXT NOT NULL,
                blocker_details TEXT DEFAULT '',
                complexity INTEGER DEFAULT 3,
                cognitive_load INTEGER DEFAULT 3,
                task_type TEXT DEFAULT 'Implementation',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS task_dependencies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                depends_on_task_id INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS check_ins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                completion_status TEXT NOT NULL,
                blocker_category TEXT,
                private_message TEXT,
                friction_type TEXT DEFAULT '',
                schedule_impact TEXT DEFAULT '',
                required_resource TEXT DEFAULT '',
                suggested_action TEXT DEFAULT '',
                permission_to_share INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS ai_recommendations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                task_id INTEGER,
                agent_name TEXT NOT NULL DEFAULT 'Planning Agent',
                recommendation_type TEXT NOT NULL,
                proposed_change TEXT NOT NULL,
                explanation TEXT NOT NULL,
                confidence REAL NOT NULL,
                status TEXT NOT NULL,
                friction_type TEXT DEFAULT '',
                schedule_impact TEXT DEFAULT '',
                required_resource TEXT DEFAULT '',
                suggested_action TEXT DEFAULT '',
                decision_note TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TEXT
            );
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                category TEXT NOT NULL,
                read INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        migrate_db(db)
        db.execute("DROP VIEW IF EXISTS task_view")
        db.execute(
            """
            CREATE VIEW task_view AS
                SELECT tasks.*, projects.name project_name, users.name owner_name
                FROM tasks
                JOIN projects ON projects.id = tasks.project_id
                JOIN users ON users.id = tasks.owner_id;
            """
        )
        db.commit()


def migrate_db(db: sqlite3.Connection) -> None:
    task_cols = {row["name"] for row in db.execute("PRAGMA table_info(tasks)").fetchall()}
    if "complexity" not in task_cols:
        db.execute("ALTER TABLE tasks ADD COLUMN complexity INTEGER DEFAULT 3")
    if "cognitive_load" not in task_cols:
        db.execute("ALTER TABLE tasks ADD COLUMN cognitive_load INTEGER DEFAULT 3")
    if "task_type" not in task_cols:
        db.execute("ALTER TABLE tasks ADD COLUMN task_type TEXT DEFAULT 'Implementation'")

    rec_cols = {row["name"] for row in db.execute("PRAGMA table_info(ai_recommendations)").fetchall()}
    if "agent_name" not in rec_cols:
        db.execute("ALTER TABLE ai_recommendations ADD COLUMN agent_name TEXT DEFAULT 'Planning Agent'")
    if "friction_type" not in rec_cols:
        db.execute("ALTER TABLE ai_recommendations ADD COLUMN friction_type TEXT DEFAULT ''")
    if "schedule_impact" not in rec_cols:
        db.execute("ALTER TABLE ai_recommendations ADD COLUMN schedule_impact TEXT DEFAULT ''")
    if "required_resource" not in rec_cols:
        db.execute("ALTER TABLE ai_recommendations ADD COLUMN required_resource TEXT DEFAULT ''")
    if "suggested_action" not in rec_cols:
        db.execute("ALTER TABLE ai_recommendations ADD COLUMN suggested_action TEXT DEFAULT ''")

    checkin_cols = {row["name"] for row in db.execute("PRAGMA table_info(check_ins)").fetchall()}
    if "friction_type" not in checkin_cols:
        db.execute("ALTER TABLE check_ins ADD COLUMN friction_type TEXT DEFAULT ''")
    if "schedule_impact" not in checkin_cols:
        db.execute("ALTER TABLE check_ins ADD COLUMN schedule_impact TEXT DEFAULT ''")
    if "required_resource" not in checkin_cols:
        db.execute("ALTER TABLE check_ins ADD COLUMN required_resource TEXT DEFAULT ''")
    if "suggested_action" not in checkin_cols:
        db.execute("ALTER TABLE check_ins ADD COLUMN suggested_action TEXT DEFAULT ''")


def seed_demo(password_hash: str) -> None:
    with connect() as db:
        # Check if Priya Sharma exists; if so, already seeded with the new model
        exists = db.execute("SELECT id FROM users WHERE email = 'priya@coplan.ai'").fetchone()
        if exists:
            return

        # Clean existing demo tables to cleanly apply new seed
        db.executescript(
            """
            DELETE FROM check_ins;
            DELETE FROM ai_recommendations;
            DELETE FROM notifications;
            DELETE FROM task_dependencies;
            DELETE FROM tasks;
            DELETE FROM projects;
            DELETE FROM team_members;
            DELETE FROM teams;
            DELETE FROM users;
            """
        )

        users = [
            ("Maya Srinivasan", "demo@coplan.ai", password_hash, "team_leader", "Coordination, Product, AI Ethics", 35),
            ("Priya Sharma", "priya@coplan.ai", password_hash, "team_member", "Architecture, Security, Database Internals", 35),
            ("Arjun Mehta", "arjun@coplan.ai", password_hash, "team_member", "Frontend, UI Polish, Documentation", 30),
            ("Nila Kapoor", "nila@coplan.ai", password_hash, "team_member", "Research Synthesis, Evaluation Metrics", 25),
            ("Rohan Iyer", "rohan@coplan.ai", password_hash, "team_member", "FastAPI, DevOps, Infrastructure", 32),
        ]
        user_ids = []
        for name, email, pwd, role, skills, availability in users:
            cur = db.execute(
                """
                INSERT INTO users (name, email, password_hash, role, timezone, working_hours, quiet_hours_start, quiet_hours_end)
                VALUES (?, ?, ?, ?, 'Asia/Calcutta', '09:00-17:00', '21:00', '08:00')
                """,
                (name, email, pwd, role),
            )
            user_ids.append(cur.lastrowid)

        team_id = db.execute(
            "INSERT INTO teams (name, description, created_by) VALUES ('CoPlan Capstone Team', 'Human-governed agentic coordination team', ?)",
            (user_ids[0],),
        ).lastrowid

        for index, user_id in enumerate(user_ids):
            db.execute(
                "INSERT INTO team_members (team_id, user_id, team_role, skills, interests, weekly_availability) VALUES (?, ?, ?, ?, ?, ?)",
                (team_id, user_id, users[index][3], users[index][4], "Human-governed AI and workload equity", users[index][5]),
            )

        today = date.today()
        project_id = db.execute(
            "INSERT INTO projects (team_id, name, description, start_date, deadline, status) VALUES (?, 'CoPlan AI Production Prototype', 'Human-centered coordination system with 5 specialized agents and CARE governance', ?, ?, 'Active')",
            (team_id, str(today - timedelta(days=10)), str(today + timedelta(days=20))),
        ).lastrowid

        # Tasks demonstrating the critical contrast:
        # Priya has 3 tasks: extremely high complexity & cognitive load (Auth, Security, DB Migration).
        # Arjun has 6 tasks: light documentation, copy, and UI polish.
        # Task count: Priya=3, Arjun=6. Real Workload: Priya=Critical Overload, Arjun=Balanced.
        task_specs = [
            # Priya's 3 intensive tasks
            ("Design authentication architecture", "Architect OAuth2 token rotation, PKCE, and session invalidation for zero-trust security.", user_ids[1], "In Progress", "High", 9.4, 5, 6.0, 2, "Architecture, Security", "Team", "", 5, 5, "Architecture & Security"),
            ("Resolve production security vulnerability", "Patch critical CVE in upstream token parser and execute verification suite under load.", user_ids[1], "In Progress", "High", 9.2, 5, 4.5, 1, "Security, Cryptography", "Team", "", 5, 5, "Production Incident"),
            ("Migrate legacy database schema", "Zero-downtime partitioning migration of multi-tenant tables with foreign key verification.", user_ids[1], "To Do", "High", 8.9, 5, 7.0, 4, "Database Internals, SQL", "Team", "", 5, 4, "Core Infrastructure"),

            # Arjun's 6 lightweight tasks
            ("Update API docs styling", "Fix markdown code block contrast and response schemas in Swagger UI.", user_ids[2], "To Do", "Low", 4.2, 2, 1.5, 3, "CSS, Markdown", "Team", "", 1, 1, "Documentation"),
            ("Fix footer navigation links", "Correct broken legal and privacy policy routes in footer component.", user_ids[2], "In Progress", "Low", 4.0, 2, 1.0, 4, "React, HTML", "Team", "", 1, 1, "UI Polish"),
            ("Polish onboarding tooltip copy", "Clarify step 2 wording in first-time user tour modal.", user_ids[2], "To Do", "Medium", 5.1, 3, 2.0, 5, "UX Writing", "Team", "", 2, 2, "Copywriting"),
            ("Update README repository links", "Replace stale community links and badge endpoints.", user_ids[2], "Completed", "Low", 3.0, 1, 0.5, 6, "Documentation", "Team", "", 1, 1, "Maintenance"),
            ("Add high-resolution favicon", "Generate SVG and ICO variants for modern browser tabs and PWA manifests.", user_ids[2], "To Do", "Low", 4.3, 2, 1.0, 6, "Graphics, HTML", "Team", "", 1, 1, "UI Polish"),
            ("Update release changelog", "Collate closed PR notes and tag version 1.2 milestones.", user_ids[2], "To Do", "Low", 4.5, 2, 1.5, 7, "Release Management", "Team", "", 2, 2, "Documentation"),

            # Maya's tasks
            ("Research synthesis & CARE framework", "Document experimental findings validating Control, Accountability, Respect, and Equity.", user_ids[0], "In Progress", "High", 8.5, 5, 3.5, 2, "Research, Ethics", "Team", "", 3, 4, "Strategic Planning"),
            ("Demo pitch walkthrough", "Rehearse capstone presentation emphasizing human governance vs surveillance.", user_ids[0], "To Do", "Medium", 6.8, 4, 2.5, 5, "Presentation", "Team", "", 2, 2, "Product"),

            # Nila's task (Blocked on external approval)
            ("Evaluation rubric for human-in-the-loop AI", "Formulate metrics for decision overrides, cognitive load, and perceived fairness.", user_ids[3], "Blocked", "High", 7.9, 4, 3.0, 3, "Evaluation, Data", "Private", "Waiting for advisor ethics approval", 3, 4, "Evaluation"),

            # Rohan's tasks
            ("FastAPI recommendation endpoints", "Integrate multi-agent coordination pipeline with structured recommendation schemas.", user_ids[4], "In Progress", "High", 8.4, 5, 4.5, 2, "FastAPI, Python", "Team", "", 4, 4, "Backend"),
            ("Notification quiet-hours scheduler", "Implement background timing rules ensuring non-emergency pings respect rest windows.", user_ids[4], "To Do", "Medium", 6.0, 3, 3.0, 6, "AsyncIO, Scheduler", "Team", "", 2, 2, "Infrastructure"),
        ]

        task_ids = []
        for (
            title,
            desc,
            owner_id,
            status,
            priority,
            score,
            importance,
            hours,
            due_offset,
            skills,
            privacy,
            blocker,
            complexity,
            cog_load,
            task_type,
        ) in task_specs:
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
                    project_id,
                    title,
                    desc,
                    owner_id,
                    status,
                    priority,
                    score,
                    importance,
                    hours,
                    str(today + timedelta(days=due_offset)),
                    skills,
                    privacy,
                    blocker,
                    complexity,
                    cog_load,
                    task_type,
                ),
            )
            task_ids.append(cur.lastrowid)

        # Dependencies
        db.execute("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)", (task_ids[10], task_ids[0]))  # FastAPI depends on Auth Arch
        db.execute("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)", (task_ids[9], task_ids[8]))   # Pitch depends on Research Synthesis

        # Recommendations explicitly attributed to the 5 Human-Governed Agents
        recs = [
            (
                user_ids[0],
                task_ids[0],
                "Planning Agent",
                "Deep-Work Focus Block",
                "Schedule 3.5h uninterrupted focus block for Auth Architecture tomorrow morning.",
                "Auth Architecture carries maximum complexity (5/5) and cognitive load (5/5). The Planning Agent detects downstream dependency from Backend endpoints.",
                0.94,
                "Pending",
                "Cognitive Overload",
                "Protects timeline",
                "Focus window (09:00-12:30)",
                "Reserve calendar focus block and snooze low-priority alerts.",
            ),
            (
                user_ids[0],
                task_ids[2],
                "Workload Agent",
                "Workload Rebalancing Proposal",
                "Pair Rohan Iyer with Priya on database migration scripts or shift execution by 48 hours.",
                "Priya's contextual workload score is 92% (Auth + Security + DB Migration). Naive task count (3) conceals severe cognitive overload. Rohan has backend bandwidth.",
                0.91,
                "Pending",
                "Capacity Overload",
                "+2 days buffer",
                "Rohan Iyer (Backend Co-Pilot)",
                "Offer Priya the option to co-assign migration or defer non-urgent verification.",
            ),
            (
                user_ids[0],
                task_ids[9],
                "Blocker Agent",
                "External Dependency Unblock",
                "Send expedited clearance request to Institutional Ethics Advisor.",
                "Nila's Evaluation Rubric is blocked waiting on advisor sign-off. The Blocker Agent classified this as an External Dependency rather than delay in effort.",
                0.87,
                "Pending",
                "External Dependency",
                "+2 days if unresolved",
                "Institutional Ethics Advisor",
                "Send pre-drafted summary email to ethics advisor for accelerated sign-off.",
            ),
            (
                user_ids[0],
                task_ids[11],
                "Communication Agent",
                "Quiet Hours Batching",
                "Suppress non-critical notification pings until 08:30 tomorrow; batch into morning digest.",
                "Communication Agent respects user working boundaries (quiet hours 21:00-08:00). Empathetic coordination prevents alert fatigue.",
                0.96,
                "Accepted",
                "Notification Fatigue",
                "Zero schedule impact",
                "Morning digest pipeline",
                "Hold alerts in staging queue until morning window.",
            ),
            (
                user_ids[0],
                task_ids[10],
                "Insight Agent",
                "Contract Synchronization",
                "Hold a 15-minute API contract review between Rohan (Backend) and Arjun (Frontend).",
                "Insight Agent observes frontend mockups evolving ahead of backend payload specifications. A brief sync avoids estimated 3+ hours of endpoint rework.",
                0.88,
                "Pending",
                "Coordination Gap",
                "Saves 3h rework",
                "15-min sync meeting",
                "Invite Rohan and Arjun to quick interface alignment.",
            ),
        ]
        db.executemany(
            """
            INSERT INTO ai_recommendations (
                user_id, task_id, agent_name, recommendation_type, proposed_change, explanation,
                confidence, status, friction_type, schedule_impact, required_resource, suggested_action
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            recs,
        )

        notes = [
            (user_ids[0], "Workload Agent Alert", "Priya's cognitive workload is 92% despite only having 3 tasks. Rebalance suggested.", "equity"),
            (user_ids[0], "Blocker Agent Insight", "Evaluation Rubric paused on external advisor dependency.", "blocker"),
            (user_ids[0], "Communication Agent", "2 notifications held for quiet hours delivery after 08:00.", "respect"),
            (user_ids[0], "Planning Agent Ready", "Daily focus queue calculated with human review required.", "control"),
        ]
        db.executemany("INSERT INTO notifications (user_id, title, body, category) VALUES (?, ?, ?, ?)", notes)

        # Seed initial check-in demo
        db.execute(
            """
            INSERT INTO check_ins (task_id, user_id, completion_status, blocker_category, private_message, friction_type, schedule_impact, required_resource, suggested_action, permission_to_share)
            VALUES (?, ?, 'Need support', 'External dependency', 'Waiting on API credentials from backend team before payment flow can be tested.', 'External Dependency', '1-2 days', 'Backend API credentials', 'Request access credentials from Rohan and adjust downstream task date', 1)
            """,
            (task_ids[10], user_ids[2]),
        )
        db.commit()
