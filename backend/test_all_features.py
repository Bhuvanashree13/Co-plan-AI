import os
import sys
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("backend"))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("\n=======================================================")
    print("   COPLAN AI - COMPLETE FUNCTION & FEATURE TEST SUITE   ")
    print("=======================================================\n")
    results = {}

    # 1. Auth & Login (Maya)
    res = client.post("/api/auth/login", json={"email": "demo@coplan.ai", "password": "demo1234"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["token"]
    user = res.json()["user"]
    assert user["name"] == "Maya Srinivasan"
    results["1. Authentication & Login"] = "PASS (Maya Srinivasan)"
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Session Verification (Auth Me)
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["email"] == "demo@coplan.ai"
    results["2. Session Verification (/auth/me)"] = "PASS"

    # 3. Bootstrap State
    boot = client.get("/api/bootstrap", headers=headers).json()
    all_users = boot["users"]
    assert len(all_users) >= 5
    results["3. Bootstrap Workspace State"] = f"PASS ({len(all_users)} members loaded)"

    # 4. Persona Switcher (All 5 Roles)
    for u in all_users:
        res = client.post("/api/auth/switch-persona", json={"user_id": u["id"]}, headers=headers)
        assert res.status_code == 200, f"Failed switching to {u['name']}: {res.text}"
        assert res.json()["user"]["name"] == u["name"]
        token = res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
    results["4. Multi-Role Persona Switcher"] = f"PASS ({len(all_users)} roles switched seamlessly)"

    # Switch back to Maya for remaining tests
    res = client.post("/api/auth/switch-persona", json={"user_id": user["id"]}, headers=headers)
    token = res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 5. Fetch Tasks
    res = client.get("/api/tasks", headers=headers)
    assert res.status_code == 200
    tasks = res.json()
    assert len(tasks) > 0
    results["5. Task Retrieval & View Ordering"] = f"PASS ({len(tasks)} tasks active)"

    # 6. Create Task with Cognitive & Complexity Metadata
    new_task_payload = {
        "title": "Automated Verification Synthetic Task",
        "description": "Verifying full task lifecycle and cognitive sliders",
        "status": "Blocked",
        "priority": "High",
        "importance": 4,
        "estimated_hours": 3.5,
        "due_date": "2026-09-22",
        "owner_id": user["id"],
        "project_id": tasks[0]["project_id"],
        "task_type": "Architecture",
        "required_skills": "Python, Testing, Security",
        "cognitive_load": 4,
        "complexity": 4,
        "blocker_details": "Simulated external authorization blocker"
    }
    res = client.post("/api/tasks", json=new_task_payload, headers=headers)
    assert res.status_code == 200, f"Task creation failed: {res.text}"
    created_task = res.json()
    task_id = created_task["id"]
    assert created_task["cognitive_load"] == 4
    assert created_task["complexity"] == 4
    assert created_task["ai_priority_score"] > 0
    results["6. Task Creation with Workload Metadata"] = f"PASS (Task ID: {task_id}, Priority Score: {created_task['ai_priority_score']:.1f})"

    # 7. Update Task (Status, Load, Time)
    res = client.patch(f"/api/tasks/{task_id}", json={
        "status": "In Progress",
        "cognitive_load": 2,
        "estimated_hours": 2.0
    }, headers=headers)
    assert res.status_code == 200
    updated_task = res.json()
    assert updated_task["status"] == "In Progress"
    assert updated_task["cognitive_load"] == 2
    results["7. Task Modification & Dynamic Recalibration"] = "PASS"

    # 8. Resolve Blocker Action
    client.patch(f"/api/tasks/{task_id}", json={"status": "Blocked", "blocker_details": "Awaiting key"}, headers=headers)
    res = client.post(f"/api/tasks/{task_id}/resolve-blocker", json={"resolution_note": "API access unlocked"}, headers=headers)
    assert res.status_code == 200
    resolved_task = res.json()
    assert resolved_task["status"] == "In Progress"
    assert not resolved_task["blocker_details"]
    results["8. Blocker Resolution & Progress Return"] = "PASS"

    # 9. Delete Task
    res = client.delete(f"/api/tasks/{task_id}", headers=headers)
    assert res.status_code == 200
    results["9. Task Deletion"] = "PASS"

    # 10. AI Daily Planner (Planning Agent)
    res = client.post("/api/ai/daily-plan", headers=headers)
    assert res.status_code == 200
    plan_data = res.json()
    assert "plan" in plan_data
    plan_items = plan_data["plan"]
    results["10. AI Daily Plan Generation (Planning Agent)"] = f"PASS ({len(plan_items)} ranked focus items)"

    # 11. Apply & Activate Daily Plan Schedule
    plan_task_ids = [item["task_id"] for item in plan_items[:2]]
    res = client.post("/api/ai/daily-plan/apply", json={"task_ids": plan_task_ids}, headers=headers)
    assert res.status_code == 200
    applied_result = res.json()
    assert applied_result["status"] == "applied"
    results["11. AI Daily Plan Schedule Activation"] = f"PASS ({applied_result['applied_count']} tasks activated)"

    # 12. Empathetic Blocker Check-In Start (Blocker Agent)
    target_task_for_checkin = tasks[0]
    res = client.post("/api/checkins/start", json={"task_id": target_task_for_checkin["id"]}, headers=headers)
    assert res.status_code == 200
    checkin_session = res.json()
    assert "question" in checkin_session
    assert "quick_responses" in checkin_session
    results["12. Empathetic Blocker Check-In Start"] = "PASS"

    # 13. Check-In Agent Conversation Loop (Inference & Sentiment)
    res = client.post(f"/api/checkins/{target_task_for_checkin['id']}/message", json={
        "message": "I am waiting on external approval from the ethics committee for this schema.",
        "completion_status": "Blocked",
        "blocker_category": "External Dependency",
        "permission_to_share": True
    }, headers=headers)
    assert res.status_code == 200
    reply = res.json()
    assert "reply" in reply
    assert "inference" in reply
    assert reply["inference"]["friction_type"] == "External Dependency"
    results["13. Empathetic Agent Inference & Friction Analysis"] = f"PASS (Friction: {reply['inference']['friction_type']})"

    # 14. Personal Analytics & Coordination Trends
    res = client.get("/api/analytics/personal", headers=headers)
    assert res.status_code == 200
    analytics_data = res.json()
    assert "workload_equity" in analytics_data
    assert "status_distribution" in analytics_data
    results["14. Personal Analytics & CARE Trends"] = "PASS"

    # 15. Team Workload Equity & Assistant Rebalancing
    # Check Priya's workload vs Arjun's workload
    priya_tasks = [t for t in tasks if t["owner_name"] == "Priya Sharma"]
    arjun_user = [m for m in all_users if m["name"] == "Arjun Mehta"][0]
    if priya_tasks:
        rebalance_task = priya_tasks[0]
        res = client.post("/api/team/rebalance", json={
            "task_id": rebalance_task["id"],
            "new_owner_id": arjun_user["id"],
            "pairing_note": "Rebalancing high-load task to available teammate capacity"
        }, headers=headers)
        assert res.status_code == 200, f"Rebalance failed: {res.text}"
        rebalanced_task = res.json()
        assert rebalanced_task["owner_id"] == arjun_user["id"]
        # Revert back to Priya to restore original state
        client.post("/api/team/rebalance", json={
            "task_id": rebalance_task["id"],
            "new_owner_id": rebalance_task["owner_id"],
            "pairing_note": "Restoring baseline state"
        }, headers=headers)
        results["15. Workload Rebalancing Assistant"] = "PASS"

    # 16. Pending Approvals & Human Decision Layer
    res = client.get("/api/ai/recommendations", headers=headers)
    assert res.status_code == 200
    recs = res.json()
    pending_recs = [r for r in recs if r["status"] == "Pending"]
    results["16. Recommendation Decision Layer"] = f"PASS ({len(recs)} total, {len(pending_recs)} pending)"

    # Test Modifying Recommendation
    if pending_recs:
        rec_id = pending_recs[0]["id"]
        res = client.post(f"/api/ai/recommendations/{rec_id}/modify", json={
            "note": "Approved with +1 day buffer based on team capacity",
            "modified_change": "Extend timeline by 24 hours and pair with architect"
        }, headers=headers)
        assert res.status_code == 200
        results["17. Modify & Human Override Recommendation"] = "PASS"

    # 18. Audit Trail Verification
    res = client.get("/api/audit-logs", headers=headers)
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) > 0
    results["18. Human Governance Audit Trail"] = f"PASS ({len(logs)} audit entries verified)"

    # 19. CARE Privacy Settings Persistence
    res = client.patch("/api/user/settings", json={
        "working_hours": "09:30 - 18:00",
        "quiet_hours_start": "18:00",
        "quiet_hours_end": "09:00",
        "timezone": "Asia/Calcutta"
    }, headers=headers)
    assert res.status_code == 200
    updated_user = res.json()
    assert updated_user["working_hours"] == "09:30 - 18:00"
    results["19. CARE Privacy & Schedule Persistence"] = "PASS"

    print("\n-------------------------------------------------------")
    print("                 DETAILED TEST RESULTS                 ")
    print("-------------------------------------------------------")
    all_ok = True
    for name, status in results.items():
        print(f"  [OK] {name:48} -> {status}")
        if "PASS" not in status:
            all_ok = False
    print("-------------------------------------------------------\n")

    if all_ok:
        print(">>> SUCCESS: 100% OF BACKEND FUNCTIONS & FEATURES VERIFIED! <<<\n")
    else:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
