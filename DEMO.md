# CoPlan AI: Capstone Presentation & Demo Script

## Demo Access
- **URL**: `http://127.0.0.1:5173`
- **Email**: `demo@coplan.ai`
- **Password**: `demo1234`

---

## The 6-Minute Pitch Script

### Minute 1: The Hook & Core Thesis
* **Presenter says**: 
  > *"Every modern engineering team uses Jira, Linear, or Asana. Yet sprints still slip, engineers burn out, and blockers remain hidden until retro meetings. Why? Because existing systems only optimize task visibility—they understand the **state of work**. CoPlan AI is designed to understand the **context around work**."*
* **Show**:
  - Personal Dashboard banner showcasing the **CARE Governance Framework** (*Control, Accountability, Respect, Equity*).
  - The **5 Human-Governed Agents status bar** (*Planning, Workload, Blocker, Communication, Insight*).
  - The coordination loop: `LISTEN → UNDERSTAND → REASON → RECOMMEND → HUMAN DECIDES → ADAPT`.

---

### Minute 2: The Core Differentiator — Task Count ≠ Workload (Priya vs. Arjun)
* **Navigate to**: `Team & Equity` view.
* **Presenter says**:
  > *"Look at this comparison. A conventional project dashboard looks at card counts and concludes that Arjun is the most overloaded person on the team with 5 tasks, while Priya only has 3. But look at the context: Priya is designing an authentication architecture, patching a production zero-day vulnerability, and migrating a legacy database. Her cognitive load is 4.7 out of 5 and technical complexity is 5.0 out of 5.*
  >
  > *Arjun's 5 tasks are small documentation and link updates. CoPlan AI's **Workload Agent** evaluates complexity, cognitive load, dependencies, and capacity. It calculates that Priya is at **100% Critical Overload Risk**, while Arjun is at **38% Available Capacity**. This is where our **Equity** principle becomes technically meaningful rather than just an ethical statement."*
* **Show**:
  - The side-by-side **Priya vs. Arjun** contrast card.
  - The Multi-Factor Cognitive Scoring table with contextual workload progress bars.
  - The Workload Agent's suggested rebalancing action (pairing Rohan with Priya).

---

### Minute 3: Empathetic Blocker Check-In (Blocker Agent)
* **Navigate to**: `Empathetic Check-In` view.
* **Presenter says**:
  > *"Instead of sending an automated, nagging message like '⚠️ Task Overdue: Complete it today', CoPlan AI's **Blocker Agent** initiates an empathetic conversation: 'This task looks like it is taking longer than originally planned. Is the main friction time, dependency, unclear requirements, technical difficulty, or something else?'"*
* **Action**:
  - Select the task: `API integration`.
  - Click chip: `Waiting on external dependency`.
  - Type note: *"Waiting for sandbox API credentials from backend team."*
* **Highlight**:
  - Point to the **Live Inference Preview**:
    - **Blocker Category**: External Dependency
    - **Schedule Impact**: +1-2 days
    - **Required Resource**: Backend API credentials
    - **Suggested Action**: Contact backend owner and buffer downstream task
  - Point to the **Consent Gate**: *"Notice the toggle: 'Allow this blocker to be shared with the team'. Under our Respect principle, private reflections remain confidential unless explicitly shared."*
  - Click **Send Check-In**.
  - Show the response confirming the recommendation was routed to the **Approval Center**.

---

### Minute 4: The Human Decision Layer (Approval Center)
* **Navigate to**: `Approval Center` view.
* **Presenter says**:
  > *"We avoid the trap of autonomous AI that makes personnel decisions. Our architecture is **agentic but human-governed**. The 5 agents can analyze, coordinate, and recommend, but humans retain 100% of final authority."*
* **Show**:
  - Each recommendation badge shows which specialized agent created it (*Planning Agent, Workload Agent, Blocker Agent, Communication Agent, Insight Agent*).
  - Inspect the rationale and confidence score.
  - Demonstrate the 3 action buttons:
    - **Approve**: Applies the recommended change with audit timestamp.
    - **Modify**: Allows adjusting the date buffer or scope.
    - **Reject**: Rejects with an optional decision note for accountability.

---

### Minute 5: Transparent Planning (Planning Agent)
* **Navigate to**: `AI Daily Planner` view.
* **Presenter says**:
  > *"The **Planning Agent** organizes focus queues based on critical path dependencies and cognitive weight. Notice our **Accountability** principle: whenever you wonder why a task was prioritized, click **Why?**."*
* **Action**:
  - Click the **Why?** button on a task to expand the inspectable rule breakdown:
    - Urgency + high cognitive load + downstream dependency + confidence level.

---

### Minute 6: Privacy, Anti-Surveillance & Capstone Conclusion
* **Navigate to**: `Privacy & CARE Settings` view.
* **Presenter says**:
  > *"Finally, CoPlan AI is built with an explicit **anti-surveillance guarantee**. The Communication Agent enforces quiet hours (21:00-08:00) so engineers aren't bombarded after hours. More importantly, CoPlan AI never converts check-in sentiment or friction reports into employee productivity or stack-ranking scores.*
  >
  > *To summarize our capstone thesis: **AI should improve team coordination and productivity while preserving autonomy, psychological safety, fairness, and human accountability.** CoPlan AI demonstrates that a team coordination tool can be both agentic and deeply empathetic."*

---

## Key Backend Endpoints for Technical Judges

- `GET /api/bootstrap` — Returns user, tasks, 5-agent states, and CARE principles.
- `POST /api/ai/daily-plan` — Planning Agent cognitive queue generation.
- `POST /api/checkins/{task_id}/message` — Blocker Agent 5-part friction inference engine.
- `GET /api/analytics/personal` — Contextual workload equity calculation (Priya vs. Arjun).
- `POST /api/ai/recommendations/{id}/accept|modify|reject` — Human Decision Layer audit endpoints.
