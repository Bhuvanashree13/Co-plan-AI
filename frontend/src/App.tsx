import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Bot,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Cpu,
  Eye,
  HelpCircle,
  KanbanSquare,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquareText,
  Plus,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { api, clearToken, setToken } from './api';
import type { Analytics, Bootstrap, Recommendation, Task, User, WorkloadEquityMember } from './types';

type View = 'dashboard' | 'tasks' | 'planner' | 'checkin' | 'team' | 'analytics' | 'approvals' | 'settings';

const statuses: Task['status'][] = ['To Do', 'In Progress', 'Blocked', 'Under Review', 'Completed'];
const chartColors = ['#126c6a', '#d77441', '#415c8a', '#8a6f24', '#6f5aa7'];

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [data, setData] = useState<Bootstrap | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    const [bootstrap, metrics] = await Promise.all([api.bootstrap(), api.analytics()]);
    setData(bootstrap);
    setAnalytics(metrics);
  }

  useEffect(() => {
    refresh()
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogin(email: string, password: string) {
    setError('');
    const result = await api.login(email, password);
    setToken(result.token);
    await refresh();
  }

  async function handleRegister(name: string, email: string, password: string, role: string, team: string) {
    setError('');
    const result = await api.register(name, email, password, role, team);
    setToken(result.token);
    await refresh();
  }

  if (loading) {
    return <div className="boot">Loading CoPlan AI Agentic Workspace...</div>;
  }

  if (!data) {
    return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} error={error} setError={setError} />;
  }

  const pending = data.recommendations.filter((item) => item.status === 'Pending').length;
  const overdue = data.tasks.filter((task) => new Date(task.due_date) < new Date() && task.status !== 'Completed').length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">CP</div>
          <div>
            <strong>CoPlan AI</strong>
            <span>Human-Governed Coordination</span>
          </div>
        </div>
        <nav>
          <NavButton active={view === 'dashboard'} icon={<LayoutDashboard size={18} />} label="Dashboard" onClick={() => setView('dashboard')} />
          <NavButton active={view === 'tasks'} icon={<KanbanSquare size={18} />} label="My Tasks" onClick={() => setView('tasks')} />
          <NavButton active={view === 'planner'} icon={<Sparkles size={18} />} label="AI Daily Planner" onClick={() => setView('planner')} badge={pending} />
          <NavButton active={view === 'checkin'} icon={<MessageSquareText size={18} />} label="Empathetic Check-In" onClick={() => setView('checkin')} />
          <NavButton active={view === 'team'} icon={<Users size={18} />} label="Team & Equity" onClick={() => setView('team')} />
          <NavButton active={view === 'analytics'} icon={<ClipboardCheck size={18} />} label="Progress & Trends" onClick={() => setView('analytics')} />
          <NavButton active={view === 'approvals'} icon={<ShieldCheck size={18} />} label="Approval Center" onClick={() => setView('approvals')} badge={pending} />
          <NavButton active={view === 'settings'} icon={<Lock size={18} />} label="Privacy & CARE" onClick={() => setView('settings')} />
        </nav>
        <button
          className="ghost logout"
          onClick={() => {
            clearToken();
            setData(null);
          }}
        >
          <LogOut size={18} /> Sign out
        </button>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <span className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            <h1>{titleFor(view)}</h1>
          </div>
          <div className="profile-strip">
            <div className="signal">
              <Bell size={17} />
              <span>{data.notifications.length} alerts</span>
            </div>
            <div className="signal danger">
              <CalendarDays size={17} />
              <span>{overdue} overdue</span>
            </div>
            <div className="avatar">{initials(data.user.name)}</div>
          </div>
        </header>

        {view === 'dashboard' && <Dashboard data={data} analytics={analytics} setView={setView} />}
        {view === 'tasks' && <Tasks data={data} refresh={refresh} />}
        {view === 'planner' && <Planner data={data} refresh={refresh} />}
        {view === 'checkin' && <CheckIn data={data} refresh={refresh} />}
        {view === 'team' && <TeamWorkspace data={data} analytics={analytics} />}
        {view === 'analytics' && <Progress analytics={analytics} />}
        {view === 'approvals' && <Approvals recommendations={data.recommendations} refresh={refresh} />}
        {view === 'settings' && <Settings user={data.user} />}
      </main>
    </div>
  );
}

function AuthScreen({
  onLogin,
  onRegister,
  error,
  setError,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string, role: string, team: string) => Promise<void>;
  error: string;
  setError: (value: string) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('Maya Srinivasan');
  const [email, setEmail] = useState('demo@coplan.ai');
  const [password, setPassword] = useState('demo1234');
  const [role, setRole] = useState('team_leader');
  const [team, setTeam] = useState('CoPlan Capstone Team');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      if (mode === 'login') await onLogin(email, password);
      else await onRegister(name, email, password, role, team);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth-visual">
        <div className="brand-block">
          <div className="brand-mark">CP</div>
          <div>
            <strong>CoPlan AI</strong>
            <span>Human-Governed Coordination</span>
          </div>
        </div>
        <h1>Understanding the context of work, not just the state of work.</h1>
        <div className="hero-grid">
          <Metric value="5 Agents" label="human-governed pipeline" />
          <Metric value="CARE" label="governance framework" />
          <Metric value="0" label="surveillance scores" />
        </div>
      </section>
      <section className="auth-panel">
        <div className="segmented">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
        </div>
        {mode === 'register' && <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" />}
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
        <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" />
        {mode === 'register' && (
          <>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="team_member">Team member</option>
              <option value="team_leader">Team leader</option>
              <option value="organization_admin">Organization administrator</option>
            </select>
            <input value={team} onChange={(event) => setTeam(event.target.value)} placeholder="Team name" />
          </>
        )}
        {error && <div className="error">{error}</div>}
        <button className="primary full" onClick={submit} disabled={busy}>
          {busy ? 'Working...' : mode === 'login' ? 'Enter demo workspace' : 'Create workspace'} <ChevronRight size={18} />
        </button>
      </section>
    </div>
  );
}

function CareStrip() {
  return (
    <div className="care-strip">
      <div className="care-card active-care">
        <strong>Control</strong>
        <p>Humans retain 100% authority over AI suggestions (Approve · Modify · Reject).</p>
      </div>
      <div className="care-card">
        <strong>Accountability</strong>
        <p>Inspectable reasoning: AI explains why it recommended changes and logs audit records.</p>
      </div>
      <div className="care-card">
        <strong>Respect</strong>
        <p>Private check-ins, non-judgmental communication, and quiet hours instead of nagging.</p>
      </div>
      <div className="care-card">
        <strong>Equity</strong>
        <p>Workload reasons over complexity, cognitive load, and capacity—never raw task count.</p>
      </div>
    </div>
  );
}

function AgentsBar() {
  return (
    <div className="agents-bar">
      <span className="agents-bar-label">Human-Governed Agents:</span>
      <span className="agent-pill planning"><BrainCircuit size={14} /> Planning Agent</span>
      <span className="agent-pill workload"><Scale size={14} /> Workload Agent</span>
      <span className="agent-pill blocker"><Shield size={14} /> Blocker Agent</span>
      <span className="agent-pill communication"><MessageSquareText size={14} /> Communication Agent</span>
      <span className="agent-pill insight"><Eye size={14} /> Insight Agent</span>
      <span className="governance-tag">HUMAN DECISION LAYER: 100% CONTROL</span>
    </div>
  );
}

function InteractionLoopBar() {
  return (
    <div className="loop-flow">
      <span className="loop-step">LISTEN</span>
      <ArrowRight size={12} className="loop-arrow" />
      <span className="loop-step">UNDERSTAND</span>
      <ArrowRight size={12} className="loop-arrow" />
      <span className="loop-step">REASON</span>
      <ArrowRight size={12} className="loop-arrow" />
      <span className="loop-step">RECOMMEND</span>
      <ArrowRight size={12} className="loop-arrow" />
      <span className="loop-step" style={{ color: '#d77441' }}>HUMAN DECIDES</span>
      <ArrowRight size={12} className="loop-arrow" />
      <span className="loop-step">ADAPT</span>
    </div>
  );
}

function AgentBadge({ name }: { name?: string }) {
  const agent = name || 'Planning Agent';
  let className = 'planning';
  if (agent.includes('Workload')) className = 'workload';
  else if (agent.includes('Blocker')) className = 'blocker';
  else if (agent.includes('Communication')) className = 'communication';
  else if (agent.includes('Insight')) className = 'insight';

  return <span className={`agent-pill ${className}`}>{agent}</span>;
}

function Dashboard({ data, analytics, setView }: { data: Bootstrap; analytics: Analytics | null; setView: (view: View) => void }) {
  const focus = data.tasks.filter((task) => task.status !== 'Completed').slice(0, 4);
  const blocked = data.tasks.filter((task) => task.status === 'Blocked');
  const completion = Math.round((data.tasks.filter((task) => task.status === 'Completed').length / data.tasks.length) * 100);

  return (
    <div className="content-grid">
      <section className="summary-band" style={{ gridColumn: '1 / -1' }}>
        <div>
          <span className="eyebrow">CARE Governance Architecture</span>
          <h2>Human-Centered Coordination for {data.user.name.split(' ')[0]}</h2>
          <p>
            Existing systems track the <em>state of work</em>. CoPlan AI reasons over the <em>context around work</em>:
            detecting friction, balancing cognitive equity, and recommending adjustments where humans hold final authority.
          </p>
        </div>
        <button className="primary" onClick={() => setView('planner')}><Sparkles size={18} /> Review AI Plan</button>
      </section>

      <div style={{ gridColumn: '1 / -1' }}>
        <CareStrip />
        <AgentsBar />
        <InteractionLoopBar />
      </div>

      <Metric value={`${completion}%`} label="project milestone completion" />
      <Metric value={`${focus.length}`} label="focused priority items" />
      <Metric value={`${blocked.length}`} label="tasks with active friction" />
      <Metric value={`${data.recommendations.filter((rec) => rec.status === 'Pending').length}`} label="pending human approvals" />

      <Panel title="Today's Priority Focus" action="Contextually Ranked">
        {focus.map((task) => (
          <div className="task-row" key={task.id}>
            <div>
              <strong>{task.title}</strong>
              <span>
                {task.project_name} · {task.owner_name} · {task.estimated_hours}h · Cognitive Load: {task.cognitive_load ?? 3}/5 · Complexity: {task.complexity ?? 3}/5
              </span>
            </div>
            <StatusPill value={task.status} />
            <Priority score={task.ai_priority_score} />
          </div>
        ))}
      </Panel>

      <Panel title="Agent Recommendations" action="Human Decision Layer">
        {data.recommendations.slice(0, 3).map((rec) => (
          <div className="recommendation" key={rec.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <AgentBadge name={rec.agent_name} />
              <StatusPill value={rec.status} />
            </div>
            <div>
              <strong>{rec.proposed_change}</strong>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#40504a' }}>{rec.explanation}</p>
            </div>
          </div>
        ))}
      </Panel>

      <Panel title="Weekly Completion vs Rescheduling">
        <ChartWrap>
          <AreaChart data={analytics?.weekly_completion ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbe4de" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="completed" stroke="#126c6a" fill="#b7dfd2" />
            <Area type="monotone" dataKey="rescheduled" stroke="#d77441" fill="#f2c7ab" />
          </AreaChart>
        </ChartWrap>
      </Panel>

      <Panel title="Agent Coordination Activity">
        {data.notifications.map((note) => (
          <div className="notice" key={note.id}>
            <Bell size={17} />
            <div>
              <strong>{note.title}</strong>
              <span>{note.body}</span>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function Tasks({ data, refresh }: { data: Bootstrap; refresh: () => Promise<void> }) {
  const [mode, setMode] = useState<'board' | 'list' | 'calendar' | 'priority'>('board');
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="segmented compact">
          {(['board', 'list', 'calendar', 'priority'] as const).map((item) => (
            <button key={item} className={mode === item ? 'active' : ''} onClick={() => setMode(item)}>{item}</button>
          ))}
        </div>
        <button className="primary" onClick={() => setShowForm((value) => !value)}><Plus size={18} /> New task</button>
      </div>
      {showForm && <TaskForm users={data.users} refresh={refresh} />}
      {mode === 'board' && <TaskBoard tasks={data.tasks} refresh={refresh} />}
      {mode === 'list' && (
        <Panel title="All Tasks (Contextual Workload Metadata)">
          {data.tasks.map((task) => (
            <div className="task-row" key={task.id}>
              <div>
                <strong>{task.title}</strong>
                <span>
                  {task.owner_name} · {task.task_type ?? 'Task'} · {task.estimated_hours}h · Cog Load: {task.cognitive_load ?? 3}/5 · Complexity: {task.complexity ?? 3}/5
                </span>
              </div>
              <StatusPill value={task.status} />
              <Priority score={task.ai_priority_score} />
            </div>
          ))}
        </Panel>
      )}
      {mode === 'calendar' && <CalendarView tasks={data.tasks} />}
      {mode === 'priority' && (
        <Panel title="AI-Prioritized Queue (Cognitive Load Weighted)">
          {[...data.tasks]
            .sort((a, b) => b.ai_priority_score - a.ai_priority_score)
            .map((task) => (
              <div className="task-row" key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <span>
                    {task.owner_name} · {task.estimated_hours}h · Cog Load: {task.cognitive_load ?? 3}/5 · Complexity: {task.complexity ?? 3}/5
                  </span>
                </div>
                <StatusPill value={task.status} />
                <Priority score={task.ai_priority_score} />
              </div>
            ))}
        </Panel>
      )}
    </div>
  );
}

function Planner({ data, refresh }: { data: Bootstrap; refresh: () => Promise<void> }) {
  const [plan, setPlan] = useState<{
    summary: string;
    agent?: string;
    plan: Array<any>;
    governance_rule?: string;
  } | null>(null);
  const [why, setWhy] = useState<number | null>(null);

  async function generate() {
    setPlan(await api.dailyPlan());
  }

  useEffect(() => {
    generate();
  }, []);

  return (
    <div className="stack">
      <section className="summary-band">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span className="eyebrow">Explainable AI</span>
            <AgentBadge name={plan?.agent ?? 'Planning Agent'} />
          </div>
          <h2>{plan?.summary ?? 'Planning Agent analyzing workload and dependencies...'}</h2>
          <p>
            The Planning Agent combines deadlines, dependencies, cognitive load, and effort into transparent scores.
            In accordance with the CARE Control principle, these recommendations require your approval before schedules are updated.
          </p>
        </div>
        <button className="primary" onClick={generate}><Sparkles size={18} /> Recalculate Plan</button>
      </section>

      <div className="planner-list">
        {plan?.plan.map((item) => (
          <article className="plan-item" key={item.task_id}>
            <div className="rank">{item.recommended_position}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h3 style={{ margin: 0 }}>{item.task_title}</h3>
                <AgentBadge name={item.agent_name} />
              </div>
              <p style={{ margin: 0, color: '#2b3d37' }}>{item.proposed_action}</p>
              {why === item.task_id && (
                <div className="explain" style={{ marginTop: 8 }}>
                  <strong>Inspectable Rationale:</strong> {item.reason.join(' · ')}
                  <br />
                  <span style={{ fontSize: '0.78rem', color: '#126c6a', fontWeight: 600 }}>
                    Confidence: {Math.round(item.confidence * 100)}% · {item.governance_rule}
                  </span>
                </div>
              )}
            </div>
            <div className="actions">
              <button className="ghost" onClick={() => setWhy(why === item.task_id ? null : item.task_id)}>
                <HelpCircle size={15} style={{ marginRight: 4 }} /> Why?
              </button>
              <button className="primary small" onClick={refresh}>Approve</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function CheckIn({ data, refresh }: { data: Bootstrap; refresh: () => Promise<void> }) {
  const [taskId, setTaskId] = useState(data.tasks.find((task) => task.status !== 'Completed')?.id ?? data.tasks[0]?.id);
  const [question, setQuestion] = useState('');
  const [message, setMessage] = useState('Waiting for API credentials from backend team before payment flow can be tested.');
  const [status, setStatus] = useState('Waiting on external dependency');
  const [share, setShare] = useState(false);
  const [reply, setReply] = useState('');
  const [inference, setInference] = useState<{
    friction_type: string;
    schedule_impact: string;
    required_resource: string;
    suggested_action: string;
  } | null>(null);

  const selectedTask = data.tasks.find((t) => t.id === Number(taskId));

  async function start() {
    const result = await api.startCheckin(Number(taskId));
    setQuestion(result.question);
  }

  async function send() {
    const result = await api.sendCheckin(
      Number(taskId),
      message,
      status,
      status.includes('dependency') ? 'External dependency' : status.includes('overload') ? 'Capacity overload' : 'Technical friction',
      share
    );
    setReply(result.reply);
    if (result.inference) {
      setInference(result.inference);
    }
    await refresh();
  }

  useEffect(() => {
    start();
  }, [taskId]);

  // Live estimated friction preview
  const previewFriction = useMemo(() => {
    const txt = `${message} ${status}`.toLowerCase();
    if (txt.includes('api') || txt.includes('access') || txt.includes('waiting') || txt.includes('dependency')) {
      return {
        type: 'External Dependency',
        impact: '+1-2 days',
        resource: 'Backend API credentials / lead contact',
        action: 'Contact backend owner (Rohan) and adjust downstream dependent task.',
      };
    }
    if (txt.includes('overload') || txt.includes('too much') || txt.includes('busy')) {
      return {
        type: 'Capacity Overload',
        impact: '+2-3 days',
        resource: 'Teammate co-pilot / pairing',
        action: 'Suggest rebalancing secondary documentation tasks to Arjun.',
      };
    }
    return {
      type: 'Technical Complexity',
      impact: '+1-2 days',
      resource: 'Senior architecture review (30 mins)',
      action: 'Schedule focused pairing session to isolate blocker.',
    };
  }, [message, status]);

  return (
    <div className="chat-layout">
      <Panel title="Empathetic Blocker Check-In" action="Blocker Agent · Consent-Aware">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <AgentBadge name="Blocker Agent" />
          <span style={{ fontSize: '0.8rem', color: '#40504a' }}>Non-judgmental friction detection</span>
        </div>

        <div className="chat-bubble bot">
          <Bot size={18} style={{ minWidth: 18 }} />
          <div>
            <strong>Blocker Agent:</strong>
            <p style={{ margin: '4px 0 0' }}>
              {question || `This task '${selectedTask?.title}' looks like it is taking longer than originally planned. Is the main friction time, dependency, unclear requirements, technical difficulty, or something else?`}
            </p>
          </div>
        </div>

        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#33443e' }}>Select Task for Check-In:</label>
        <select value={taskId} onChange={(event) => setTaskId(Number(event.target.value))}>
          {data.tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title} ({task.status}) - {task.owner_name}
            </option>
          ))}
        </select>

        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#33443e', marginTop: 10 }}>Primary Friction Dimension:</label>
        <div className="quick-grid">
          {[
            'Waiting on external dependency',
            'Technical complexity / uncertainty',
            'Requirements are unclear',
            'Workload / capacity overload',
            'Need teammate pairing',
            'On track, completing soon',
          ].map((item) => (
            <button key={item} className={status === item ? 'active-chip' : 'chip'} onClick={() => setStatus(item)}>
              {item}
            </button>
          ))}
        </div>

        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#33443e', marginTop: 10 }}>Your Private Reflection:</label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          placeholder="Share what is creating friction. Private by default under CARE Respect principle."
        />

        {/* Structured Blocker Inference Preview */}
        <div className="friction-preview">
          <div className="friction-preview-title">
            <Sparkles size={16} /> Blocker Agent Inference Preview
          </div>
          <div className="friction-row">
            <span className="label">Blocker Category:</span>
            <span className="value"><strong>{previewFriction.type}</strong></span>
          </div>
          <div className="friction-row">
            <span className="label">Affected Task:</span>
            <span className="value">{selectedTask?.title}</span>
          </div>
          <div className="friction-row">
            <span className="label">Schedule Impact:</span>
            <span className="value">{previewFriction.impact}</span>
          </div>
          <div className="friction-row">
            <span className="label">Required Resource:</span>
            <span className="value">{previewFriction.resource}</span>
          </div>
          <div className="friction-row">
            <span className="label">Suggested Action:</span>
            <span className="value">{previewFriction.action}</span>
          </div>
        </div>

        <label className="toggle" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={share} onChange={(event) => setShare(event.target.checked)} />
          <span><strong>Consent Gate:</strong> Allow this blocker recommendation to be shared with the team</span>
        </label>

        <button className="primary" onClick={send} style={{ marginTop: 8 }}>
          <Bot size={16} style={{ marginRight: 6 }} /> Send Check-In & Request Support
        </button>

        {reply && (
          <div className="chat-bubble" style={{ marginTop: 16, background: '#f4f9f7', borderColor: '#126c6a' }}>
            <CheckCircle2 size={18} color="#126c6a" style={{ minWidth: 18 }} />
            <div>
              <strong>Action Taken:</strong>
              <p style={{ margin: '4px 0 0' }}>{reply}</p>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="CARE Respect & Privacy Guardrails">
        <div className="guardrail">
          <ShieldCheck size={20} color="#126c6a" />
          <div>
            <strong>Private Notes Stay Confidential:</strong>
            <span>Your notes are not broadcast to managers without explicit consent.</span>
          </div>
        </div>
        <div className="guardrail">
          <Lock size={20} color="#126c6a" />
          <div>
            <strong>Anti-Surveillance Architecture:</strong>
            <span>Check-in sentiment is never converted into employee productivity scores.</span>
          </div>
        </div>
        <div className="guardrail">
          <CheckCircle2 size={20} color="#126c6a" />
          <div>
            <strong>Human Decision Layer:</strong>
            <span>All AI suggestions route to the Approval Center for human confirmation.</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function TeamWorkspace({ data, analytics }: { data: Bootstrap; analytics: Analytics | null }) {
  const equityMembers = analytics?.workload_equity ?? [];
  const priya = equityMembers.find((m) => m.name === 'Priya');
  const arjun = equityMembers.find((m) => m.name === 'Arjun');

  return (
    <div className="stack">
      {/* Central Capstone Showcase: Task Count != Workload */}
      <div className="equity-contrast-card">
        <div className="equity-contrast-header">
          <div>
            <span className="eyebrow" style={{ color: '#126c6a' }}>CARE Equity Principle in Action</span>
            <h3 style={{ marginTop: 4 }}>Workload Reasoning: Task Count ≠ Actual Workload</h3>
          </div>
          <span>Contextual Equity Model</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.86rem', color: '#33443e', lineHeight: 1.5 }}>
          Traditional project management platforms optimize for task visibility, concluding that person A with 5 tasks has more workload than person B with 3 tasks.
          CoPlan AI reasons over <strong>Workload = complexity + estimated effort + dependencies + urgency + cognitive load + capacity</strong>.
        </p>

        <div className="equity-grid-2">
          <div className="contrast-box alert-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>Priya Sharma (Principal Architect)</h4>
              <span className="priority high">100% Critical Load</span>
            </div>
            <div className="contrast-metric-row"><span>Raw Task Count:</span> <strong>3 tasks</strong></div>
            <div className="contrast-metric-row"><span>Active Focus Hours:</span> <strong>17.5 hours</strong></div>
            <div className="contrast-metric-row"><span>Avg Technical Complexity:</span> <strong>5.0 / 5.0</strong></div>
            <div className="contrast-metric-row"><span>Avg Cognitive Load:</span> <strong>4.7 / 5.0</strong></div>
            <div className="contrast-metric-row"><span>Critical Context:</span> <strong>Auth Arch + CVE Patch + DB Partitioning</strong></div>
            <p style={{ fontSize: '0.78rem', color: '#a81c3a', margin: '8px 0 0' }}>
              ⚠️ Conventional tools assume Priya is underutilized. CoPlan AI recognizes critical cognitive overload and recommends pairing support.
            </p>
          </div>

          <div className="contrast-box ok-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>Arjun Mehta (Frontend & Polish)</h4>
              <span className="priority" style={{ background: '#e6f7f5', color: '#0c6158' }}>38% Available Capacity</span>
            </div>
            <div className="contrast-metric-row"><span>Raw Task Count:</span> <strong>5 active tasks</strong></div>
            <div className="contrast-metric-row"><span>Active Focus Hours:</span> <strong>7.0 hours</strong></div>
            <div className="contrast-metric-row"><span>Avg Technical Complexity:</span> <strong>1.4 / 5.0</strong></div>
            <div className="contrast-metric-row"><span>Avg Cognitive Load:</span> <strong>1.4 / 5.0</strong></div>
            <div className="contrast-metric-row"><span>Task Context:</span> <strong>Docs, Favicon, README links, Onboarding copy</strong></div>
            <p style={{ fontSize: '0.78rem', color: '#0c6158', margin: '8px 0 0' }}>
              ✅ Arjun has 5 tasks but low cognitive friction. CoPlan AI shows Arjun has available capacity to co-pilot or support secondary tasks.
            </p>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <Panel title="Team Workload Equity Breakdown" action="Multi-Factor Cognitive Scoring">
          <table className="equity-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Tasks</th>
                <th>Hours</th>
                <th>Complexity</th>
                <th>Cognitive Load</th>
                <th>Contextual Workload</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {equityMembers.map((m) => (
                <tr key={m.name}>
                  <td><strong>{m.full_name}</strong></td>
                  <td>{m.role.replace('_', ' ')}</td>
                  <td>{m.task_count}</td>
                  <td>{m.total_hours}h</td>
                  <td>{m.avg_complexity} / 5</td>
                  <td>{m.avg_cognitive_load} / 5</td>
                  <td style={{ minWidth: 140 }}>
                    <div className="score-bar-wrap">
                      <div className="score-bar">
                        <div
                          className={`score-bar-fill ${m.contextual_score >= 80 ? 'high' : m.contextual_score >= 50 ? 'medium' : 'low'}`}
                          style={{ width: `${m.contextual_score}%` }}
                        />
                      </div>
                      <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>{m.contextual_score}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`priority ${m.contextual_score >= 80 ? 'high' : m.contextual_score >= 50 ? 'medium' : ''}`}>
                      {m.status_label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Contextual Load vs Available Capacity">
          <ChartWrap>
            <BarChart data={equityMembers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe4de" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="contextual_score" fill="#126c6a" name="Contextual Workload Score" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ChartWrap>
        </Panel>

        <Panel title="Workload Agent Rebalancing Actions">
          <div className="recommendation">
            <AgentBadge name="Workload Agent" />
            <div>
              <strong>Pair Rohan with Priya on Database Migration</strong>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
                Priya is at 100% capacity with 3 critical systems tasks. Rohan has backend bandwidth to share scripting validation.
              </p>
            </div>
          </div>
          <div className="recommendation">
            <AgentBadge name="Workload Agent" />
            <div>
              <strong>Delegate Secondary Docs to Arjun</strong>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
                Arjun has 38% workload index and bandwidth to pick up UI documentation without context switching.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Progress({ analytics }: { analytics: Analytics | null }) {
  return (
    <div className="content-grid">
      <Panel title="Friction & Blocker Dimensions">
        {(analytics?.blockers ?? []).map((item) => (
          <div className="bar-line" key={item.category}>
            <span>{item.category}</span>
            <progress value={item.count} max={5} />
          </div>
        ))}
      </Panel>

      <Panel title="Agent Recommendations Distribution">
        {(analytics?.agent_activity ?? []).map((item) => (
          <div className="bar-line" key={item.agent_name}>
            <span>{item.agent_name}</span>
            <progress value={item.count} max={8} />
          </div>
        ))}
      </Panel>

      <Panel title="Weekly Completion vs Rescheduling">
        <ChartWrap>
          <AreaChart data={analytics?.weekly_completion ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbe4de" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="completed" stroke="#126c6a" fill="#b7dfd2" />
            <Area type="monotone" dataKey="rescheduled" stroke="#d77441" fill="#f2c7ab" />
          </AreaChart>
        </ChartWrap>
      </Panel>

      <Panel title="Human Decisions on AI Suggestions">
        {(analytics?.ai_decisions ?? []).map((item) => (
          <div className="bar-line" key={item.name}>
            <span>{item.name}</span>
            <progress value={item.value} max={20} />
          </div>
        ))}
      </Panel>
    </div>
  );
}

function Approvals({ recommendations, refresh }: { recommendations: Recommendation[]; refresh: () => Promise<void> }) {
  async function decide(id: number, action: 'accept' | 'reject' | 'modify') {
    await api.decideRecommendation(
      id,
      action,
      action === 'modify' ? { modified_change: 'Apply suggestion with adjusted timeline (+2 days).' } : {}
    );
    await refresh();
  }

  return (
    <div className="stack">
      <div className="summary-band">
        <div>
          <span className="eyebrow">Human Decision Layer</span>
          <h2>CARE Control Principle: 100% Final Human Authority</h2>
          <p>
            Autonomous agents analyze and propose recommendations, but never make consequential personnel or schedule changes unilaterally.
            You have full authority to Accept, Modify, or Reject every suggestion with complete audit logging.
          </p>
        </div>
      </div>

      <div className="approval-grid">
        {recommendations.map((rec) => (
          <article className="approval" key={rec.id}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <AgentBadge name={rec.agent_name} />
                <span className="eyebrow">{rec.recommendation_type}</span>
              </div>
              <h3 style={{ margin: '6px 0' }}>{rec.proposed_change}</h3>
              <p style={{ fontSize: '0.84rem', color: '#40504a', lineHeight: 1.4 }}>{rec.explanation}</p>
            </div>

            {rec.friction_type && (
              <div style={{ fontSize: '0.78rem', background: '#f8faf9', padding: '8px 10px', borderRadius: 6, margin: '8px 0' }}>
                <div><strong>Friction:</strong> {rec.friction_type} · <strong>Impact:</strong> {rec.schedule_impact || 'Protected'}</div>
                {rec.required_resource && <div><strong>Resource:</strong> {rec.required_resource}</div>}
              </div>
            )}

            <div className="confidence"><span style={{ width: `${Math.round(rec.confidence * 100)}%` }} /></div>
            <div className="meta-row">
              <StatusPill value={rec.status} />
              <span>{Math.round(rec.confidence * 100)}% confidence</span>
            </div>
            <div className="actions">
              <button className="primary small" onClick={() => decide(rec.id, 'accept')}>Approve</button>
              <button className="soft" onClick={() => decide(rec.id, 'modify')}>Modify</button>
              <button className="ghost" onClick={() => decide(rec.id, 'reject')}>Reject</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Settings({ user }: { user: User }) {
  return (
    <div className="settings-grid">
      <Panel title="Communication Agent & Quiet Hours">
        <label className="toggle"><input type="checkbox" defaultChecked /> Respect quiet hours (21:00 - 08:00)</label>
        <label className="toggle"><input type="checkbox" defaultChecked /> Batch non-urgent reminders into morning digest</label>
        <label className="toggle"><input type="checkbox" /> Suppress all pings during focus blocks</label>
        <label>Quiet hours start <input defaultValue="21:00" /></label>
        <label>Quiet hours end <input defaultValue="08:00" /></label>
      </Panel>
      <Panel title="CARE Privacy & Consent Controls">
        <label className="toggle"><input type="checkbox" defaultChecked /> Keep private check-in reflections confidential</label>
        <label className="toggle"><input type="checkbox" defaultChecked /> Require explicit consent before sharing blockers</label>
        <label className="toggle"><input type="checkbox" /> Prohibit automated surveillance scoring</label>
      </Panel>
      <Panel title="Account & Profile">
        <div className="member">
          <div className="avatar">{initials(user.name)}</div>
          <div>
            <strong>{user.name}</strong>
            <span>{user.email} · {user.role.replace('_', ' ')}</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function TaskBoard({ tasks, refresh }: { tasks: Task[]; refresh: () => Promise<void> }) {
  async function move(task: Task, status: Task['status']) {
    await api.updateTask(task.id, { status });
    await refresh();
  }

  return (
    <div className="board">
      {statuses.map((status) => (
        <section className="column" key={status}>
          <div className="column-title"><span>{status}</span><b>{tasks.filter((task) => task.status === status).length}</b></div>
          {tasks.filter((task) => task.status === status).map((task) => (
            <article className="task-card" key={task.id}>
              <div className="task-head">
                <h3>{task.title}</h3>
                <Priority score={task.ai_priority_score} />
              </div>
              <p>{task.description}</p>
              <div className="meta-row">
                <span>{task.owner_name}</span>
                <span>Due {formatDate(task.due_date)}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, margin: '6px 0', fontSize: '0.74rem', color: '#5b6c66' }}>
                <span>Cog: {task.cognitive_load ?? 3}/5</span>
                <span>·</span>
                <span>Complex: {task.complexity ?? 3}/5</span>
                <span>·</span>
                <span>{task.estimated_hours}h</span>
              </div>
              {task.blocker_details && <div className="blocker">{task.blocker_details}</div>}
              <select value={task.status} onChange={(event) => move(task, event.target.value as Task['status'])}>
                {statuses.map((item) => <option key={item}>{item}</option>)}
              </select>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

function TaskForm({ users, refresh }: { users: User[]; refresh: () => Promise<void> }) {
  const [title, setTitle] = useState('New architectural task');
  const [owner, setOwner] = useState(users[0]?.id ?? 1);
  const [complexity, setComplexity] = useState(3);
  const [cognitiveLoad, setCognitiveLoad] = useState(3);

  async function create() {
    await api.createTask({
      title,
      description: 'Created with cognitive load and complexity parameters.',
      owner_id: owner,
      project_id: 1,
      due_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      required_skills: 'System Design',
      estimated_hours: 3.5,
      importance: 4,
      privacy_level: 'Team',
      complexity,
      cognitive_load: cognitiveLoad,
      task_type: 'Implementation',
    });
    await refresh();
  }

  return (
    <Panel title="Create Task (With Cognitive Load Parameters)">
      <div className="form-row">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Task Title" />
        <select value={owner} onChange={(event) => setOwner(Number(event.target.value))}>
          {users.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}
        </select>
        <select value={complexity} onChange={(event) => setComplexity(Number(event.target.value))}>
          <option value={1}>Complexity: 1 (Minimal)</option>
          <option value={2}>Complexity: 2 (Routine)</option>
          <option value={3}>Complexity: 3 (Moderate)</option>
          <option value={4}>Complexity: 4 (High)</option>
          <option value={5}>Complexity: 5 (Extreme)</option>
        </select>
        <select value={cognitiveLoad} onChange={(event) => setCognitiveLoad(Number(event.target.value))}>
          <option value={1}>Cog Load: 1 (Light)</option>
          <option value={2}>Cog Load: 2 (Low)</option>
          <option value={3}>Cog Load: 3 (Standard)</option>
          <option value={4}>Cog Load: 4 (Deep focus)</option>
          <option value={5}>Cog Load: 5 (Intense focus)</option>
        </select>
        <button className="primary" onClick={create}>Create Task</button>
      </div>
    </Panel>
  );
}

function CalendarView({ tasks }: { tasks: Task[] }) {
  return (
    <Panel title="Upcoming Deadlines & Complexity Timeline">
      <div className="calendar-grid">
        {tasks.map((task) => (
          <div className="calendar-cell" key={task.id}>
            <strong>{formatDate(task.due_date)}</strong>
            <span>{task.title}</span>
            <div style={{ fontSize: '0.74rem', color: '#556660' }}>
              Cog: {task.cognitive_load ?? 3}/5 · {task.owner_name}
            </div>
            <Priority score={task.ai_priority_score} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function NavButton({ active, icon, label, badge, onClick }: { active: boolean; icon: JSX.Element; label: string; badge?: number; onClick: () => void }) {
  return <button className={active ? 'nav active' : 'nav'} onClick={onClick}>{icon}<span>{label}</span>{Boolean(badge) && <b>{badge}</b>}</button>;
}

function Panel({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return <section className="panel"><div className="panel-head"><h2>{title}</h2>{action && <span>{action}</span>}</div>{children}</section>;
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="metric"><strong>{value}</strong><span>{label}</span></div>;
}

function ChartWrap({ children }: { children: React.ReactElement }) {
  return <div className="chart"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}

function Priority({ score }: { score: number }) {
  return <span className={score >= 8 ? 'priority high' : score >= 6 ? 'priority medium' : 'priority'}>{score.toFixed(1)}</span>;
}

function StatusPill({ value }: { value: string }) {
  return <span className={`status ${value.toLowerCase().replace(/\s+/g, '-')}`}>{value}</span>;
}

function titleFor(view: View) {
  return {
    dashboard: 'Personal Dashboard & CARE Overview',
    tasks: 'My Tasks & Workload Metadata',
    planner: 'AI Daily Planner (Planning Agent)',
    checkin: 'Empathetic Blocker Check-In (Blocker Agent)',
    team: 'Team Workspace & Workload Equity',
    analytics: 'Progress & Coordination Trends',
    approvals: 'Recommendation Approval Center (Human Decision Layer)',
    settings: 'Privacy & CARE Governance Settings',
  }[view];
}

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default App;
