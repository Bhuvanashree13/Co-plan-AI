import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
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
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Edit3,
  Eye,
  HelpCircle,
  History,
  KanbanSquare,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquareText,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { api, clearToken, setToken } from './api';
import type { Analytics, Bootstrap, Recommendation, Task, User, WorkloadEquityMember } from './types';

type View = 'dashboard' | 'tasks' | 'planner' | 'checkin' | 'team' | 'analytics' | 'approvals' | 'settings';

interface Toast {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

const statuses: Task['status'][] = ['To Do', 'In Progress', 'Blocked', 'Under Review', 'Completed'];

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [data, setData] = useState<Bootstrap | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modals & Navigation Context
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [modifyingRec, setModifyingRec] = useState<Recommendation | null>(null);
  const [rebalanceTarget, setRebalanceTarget] = useState<WorkloadEquityMember | null>(null);
  const [checkinTaskId, setCheckinTaskId] = useState<number | null>(null);

  function showToast(message: string, type: Toast['type'] = 'success', title?: string) {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function refresh() {
    try {
      const [bootstrap, metrics] = await Promise.all([api.bootstrap(), api.analytics()]);
      setData(bootstrap);
      setAnalytics(metrics);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
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
    showToast(`Welcome back, ${result.user.name.split(' ')[0]}!`, 'success');
  }

  async function handleRegister(name: string, email: string, password: string, role: string, team: string) {
    setError('');
    const result = await api.register(name, email, password, role, team);
    setToken(result.token);
    await refresh();
    showToast(`Workspace initialized for ${result.user.name}!`, 'success');
  }

  async function handleSwitchPersona(userId: number) {
    try {
      const result = await api.switchPersona(userId);
      setToken(result.token);
      await refresh();
      showToast(`Switched perspective to ${result.user.name} (${result.user.role.replace('_', ' ')})`, 'info', 'Persona Switched');
    } catch (err) {
      showToast('Failed to switch persona', 'error');
    }
  }

  if (loading) {
    return <div className="boot">Loading CoPlan AI Agentic Workspace...</div>;
  }

  if (!data) {
    return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} error={error} setError={setError} />;
  }

  const pending = data.recommendations.filter((item) => item.status === 'Pending').length;
  const overdue = data.tasks.filter((task) => new Date(task.due_date) < new Date() && task.status !== 'Completed').length;
  const blockedCount = data.tasks.filter((task) => task.status === 'Blocked').length;

  return (
    <div className="app-shell">
      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' && <CheckCircle2 size={18} color="#10b981" />}
            {t.type === 'info' && <UserCheck size={18} color="#3b82f6" />}
            {t.type === 'warning' && <AlertCircle size={18} color="#f59e0b" />}
            {t.type === 'error' && <AlertCircle size={18} color="#ef4444" />}
            <div className="toast-content">
              {t.title && <strong>{t.title}</strong>}
              <span>{t.message}</span>
            </div>
            <button className="toast-close" onClick={() => dismissToast(t.id)}>
              <X size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Sidebar Navigation */}
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
          <NavButton active={view === 'tasks'} icon={<KanbanSquare size={18} />} label="Tasks & Lifecycle" onClick={() => setView('tasks')} badge={blockedCount > 0 ? blockedCount : undefined} />
          <NavButton active={view === 'planner'} icon={<Sparkles size={18} />} label="AI Daily Planner" onClick={() => setView('planner')} />
          <NavButton active={view === 'checkin'} icon={<MessageSquareText size={18} />} label="Empathetic Check-In" onClick={() => setView('checkin')} />
          <NavButton active={view === 'team'} icon={<Users size={18} />} label="Team & Equity" onClick={() => setView('team')} />
          <NavButton active={view === 'analytics'} icon={<ClipboardCheck size={18} />} label="Progress & Trends" onClick={() => setView('analytics')} />
          <NavButton active={view === 'approvals'} icon={<ShieldCheck size={18} />} label="Approval Center" onClick={() => setView('approvals')} badge={pending > 0 ? pending : undefined} />
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

      {/* Main Workspace Body */}
      <main>
        <header className="topbar">
          <div>
            <span className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            <h1>{titleFor(view)}</h1>
          </div>

          <div className="profile-strip">
            {/* Live Persona Switcher Dropdown */}
            <div className="persona-switcher">
              <UserCheck size={16} color="#126c6a" />
              <label>Role:</label>
              <select
                className="persona-select"
                value={data.user.id}
                onChange={(e) => handleSwitchPersona(Number(e.target.value))}
                title="Switch active user perspective"
              >
                {data.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div className="signal" title="Pending Agent Recommendations">
              <Bell size={17} />
              <span>{data.notifications.length} alerts</span>
            </div>
            <div className="signal danger" title="Overdue tasks">
              <CalendarDays size={17} />
              <span>{overdue} overdue</span>
            </div>
            <div className="avatar" title={`Logged in as ${data.user.name}`}>{initials(data.user.name)}</div>
          </div>
        </header>

        {/* Dynamic Views */}
        {view === 'dashboard' && <Dashboard data={data} analytics={analytics} setView={setView} />}
        {view === 'tasks' && (
          <Tasks
            data={data}
            refresh={refresh}
            onOpenNewTask={() => setIsNewTaskOpen(true)}
            onEditTask={(task) => setEditingTask(task)}
            onStartCheckin={(taskId) => {
              setCheckinTaskId(taskId);
              setView('checkin');
            }}
            showToast={showToast}
          />
        )}
        {view === 'planner' && <Planner data={data} refresh={refresh} showToast={showToast} />}
        {view === 'checkin' && (
          <CheckIn
            data={data}
            refresh={refresh}
            initialTaskId={checkinTaskId}
            onClearInitialTask={() => setCheckinTaskId(null)}
            showToast={showToast}
          />
        )}
        {view === 'team' && (
          <TeamWorkspace
            data={data}
            analytics={analytics}
            onOpenRebalance={(member) => setRebalanceTarget(member)}
          />
        )}
        {view === 'analytics' && <Progress analytics={analytics} />}
        {view === 'approvals' && (
          <Approvals
            recommendations={data.recommendations}
            refresh={refresh}
            onOpenModify={(rec) => setModifyingRec(rec)}
            showToast={showToast}
          />
        )}
        {view === 'settings' && <Settings user={data.user} refresh={refresh} showToast={showToast} />}
      </main>

      {/* Task Modal (Create & Edit) */}
      {(isNewTaskOpen || editingTask) && (
        <TaskModal
          task={editingTask}
          users={data.users}
          onClose={() => {
            setIsNewTaskOpen(false);
            setEditingTask(null);
          }}
          onSave={async (taskData) => {
            if (editingTask) {
              await api.updateTask(editingTask.id, taskData);
              showToast(`Task '${taskData.title}' updated successfully.`, 'success');
            } else {
              await api.createTask(taskData);
              showToast(`New task '${taskData.title}' created.`, 'success');
            }
            await refresh();
            setIsNewTaskOpen(false);
            setEditingTask(null);
          }}
          onDelete={async (taskId) => {
            await api.deleteTask(taskId);
            showToast('Task removed from workspace.', 'info');
            await refresh();
            setEditingTask(null);
          }}
        />
      )}

      {/* Modify Recommendation Modal */}
      {modifyingRec && (
        <ModifyModal
          recommendation={modifyingRec}
          onClose={() => setModifyingRec(null)}
          onSave={async (modifiedChange, decisionNote) => {
            await api.decideRecommendation(modifyingRec.id, 'modify', {
              modified_change: modifiedChange,
              note: decisionNote,
            });
            showToast('Recommendation modified & approved in audit trail.', 'success', 'Decision Recorded');
            await refresh();
            setModifyingRec(null);
          }}
        />
      )}

      {/* Workload Rebalance Assistant Modal */}
      {rebalanceTarget && (
        <RebalanceModal
          sourceMember={rebalanceTarget}
          data={data}
          onClose={() => setRebalanceTarget(null)}
          onExecute={async (taskId, newOwnerId, note) => {
            await api.rebalanceTask(taskId, newOwnerId, note);
            showToast('Workload rebalance executed successfully.', 'success', 'CARE Equity Applied');
            await refresh();
            setRebalanceTarget(null);
          }}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Auth Screen with Quick Demo Logins
// --------------------------------------------------------------------------
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

  function setQuickDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('demo1234');
    setMode('login');
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

        {/* Quick Demo Persona Switcher Buttons */}
        <div style={{ marginTop: 24, borderTop: '1px solid #e5ede8', paddingTop: 16 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#788c84', textTransform: 'uppercase' }}>
            Quick Demo Persona Logins:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            <button className="btn-icon" onClick={() => setQuickDemo('demo@coplan.ai')}>Maya (Lead)</button>
            <button className="btn-icon" onClick={() => setQuickDemo('priya@coplan.ai')}>Priya (Architect - Overloaded)</button>
            <button className="btn-icon" onClick={() => setQuickDemo('arjun@coplan.ai')}>Arjun (Frontend - Available)</button>
            <button className="btn-icon" onClick={() => setQuickDemo('rohan@coplan.ai')}>Rohan (Backend)</button>
            <button className="btn-icon" onClick={() => setQuickDemo('nila@coplan.ai')}>Nila (Research)</button>
          </div>
        </div>
      </section>
    </div>
  );
}

// --------------------------------------------------------------------------
// Governance Strips & Badges
// --------------------------------------------------------------------------
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

// --------------------------------------------------------------------------
// Dashboard View
// --------------------------------------------------------------------------
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
                {task.project_name} · {task.owner_name} · {task.estimated_hours}h · Cognitive: {task.cognitive_load ?? 3}/5 · Complexity: {task.complexity ?? 3}/5
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

// --------------------------------------------------------------------------
// Enhanced Tasks View (Search, Filter, Board, List, Calendar, Priority)
// --------------------------------------------------------------------------
function Tasks({
  data,
  refresh,
  onOpenNewTask,
  onEditTask,
  onStartCheckin,
  showToast,
}: {
  data: Bootstrap;
  refresh: () => Promise<void>;
  onOpenNewTask: () => void;
  onEditTask: (task: Task) => void;
  onStartCheckin: (taskId: number) => void;
  showToast: (msg: string, type?: Toast['type']) => void;
}) {
  const [mode, setMode] = useState<'board' | 'list' | 'calendar' | 'priority'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [frictionOnly, setFrictionOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'priority' | 'due' | 'cognitive' | 'complexity'>('priority');

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    return data.tasks
      .filter((t) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchDesc = t.description?.toLowerCase().includes(q);
          const matchSkills = t.required_skills?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchSkills) return false;
        }
        if (selectedOwner !== 'all' && String(t.owner_id) !== selectedOwner) return false;
        if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
        if (frictionOnly && t.status !== 'Blocked' && !t.blocker_details) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') return b.ai_priority_score - a.ai_priority_score;
        if (sortBy === 'due') return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        if (sortBy === 'cognitive') return (b.cognitive_load ?? 3) - (a.cognitive_load ?? 3);
        if (sortBy === 'complexity') return (b.complexity ?? 3) - (a.complexity ?? 3);
        return 0;
      });
  }, [data.tasks, searchQuery, selectedOwner, selectedStatus, frictionOnly, sortBy]);

  async function handleQuickMove(task: Task, newStatus: Task['status']) {
    await api.updateTask(task.id, { status: newStatus });
    await refresh();
    showToast(`'${task.title}' marked as ${newStatus}`);
  }

  async function handleResolveBlocker(task: Task) {
    await api.resolveBlocker(task.id, 'Blocker resolved via task action.');
    await refresh();
    showToast(`Blocker cleared for '${task.title}' · Returned to In Progress.`, 'success');
  }

  return (
    <div className="stack">
      {/* Search & Filter Toolbar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search tasks, skills, descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={selectedOwner}
          onChange={(e) => setSelectedOwner(e.target.value)}
        >
          <option value="all">All Assignees</option>
          {data.users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
        >
          <option value="priority">Sort: AI Priority Score</option>
          <option value="due">Sort: Due Date</option>
          <option value="cognitive">Sort: Cognitive Load</option>
          <option value="complexity">Sort: Complexity</option>
        </select>

        <label className="friction-toggle">
          <input
            type="checkbox"
            checked={frictionOnly}
            onChange={(e) => setFrictionOnly(e.target.checked)}
          />
          Friction / Blockers Only
        </label>

        <div className="segmented compact" style={{ marginLeft: 'auto' }}>
          {(['board', 'list', 'calendar', 'priority'] as const).map((item) => (
            <button key={item} className={mode === item ? 'active' : ''} onClick={() => setMode(item)}>
              {item}
            </button>
          ))}
        </div>

        <button className="primary" onClick={onOpenNewTask}>
          <Plus size={18} /> New task
        </button>
      </div>

      {/* Board Mode */}
      {mode === 'board' && (
        <div className="board">
          {statuses.map((status) => {
            const columnTasks = filteredTasks.filter((task) => task.status === status);
            return (
              <section className="column" key={status}>
                <div className="column-title">
                  <span>{status}</span>
                  <b>{columnTasks.length}</b>
                </div>
                {columnTasks.map((task) => (
                  <article className="task-card" key={task.id}>
                    <div className="task-head">
                      <h3>{task.title}</h3>
                      <Priority score={task.ai_priority_score} />
                    </div>
                    <p style={{ margin: '4px 0 8px', fontSize: '0.84rem' }}>{task.description}</p>
                    <div className="meta-row">
                      <span>{task.owner_name}</span>
                      <span>Due {formatDate(task.due_date)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, margin: '6px 0', fontSize: '0.74rem', color: '#5b6c66' }}>
                      <span title="Cognitive load">Cog: {task.cognitive_load ?? 3}/5</span>
                      <span>·</span>
                      <span title="Technical complexity">Complex: {task.complexity ?? 3}/5</span>
                      <span>·</span>
                      <span>{task.estimated_hours}h</span>
                    </div>

                    {task.blocker_details && (
                      <div className="blocker" style={{ marginBottom: 8 }}>
                        {task.blocker_details}
                      </div>
                    )}

                    <select
                      value={task.status}
                      onChange={(event) => handleQuickMove(task, event.target.value as Task['status'])}
                      style={{ marginBottom: 6 }}
                    >
                      {statuses.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>

                    <div className="task-actions">
                      <button className="btn-icon" onClick={() => onEditTask(task)}>
                        <Edit3 size={13} /> Edit
                      </button>
                      <button className="btn-icon friction" onClick={() => onStartCheckin(task.id)}>
                        <MessageSquareText size={13} /> Check-In
                      </button>
                      {task.status === 'Blocked' && (
                        <button className="btn-icon" style={{ color: '#10b981' }} onClick={() => handleResolveBlocker(task)}>
                          <Check size={13} /> Resolve
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      )}

      {/* List Mode */}
      {mode === 'list' && (
        <Panel title={`Filtered Tasks (${filteredTasks.length} items)`} action="Contextual Workload Metadata">
          {filteredTasks.map((task) => (
            <div className="task-row" key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <strong>{task.title}</strong>
                <span>
                  {task.owner_name} · {task.task_type ?? 'Task'} · {task.estimated_hours}h · Due {formatDate(task.due_date)} · Cog: {task.cognitive_load ?? 3}/5 · Complex: {task.complexity ?? 3}/5
                </span>
                {task.blocker_details && (
                  <div className="blocker" style={{ display: 'inline-block', marginTop: 4 }}>
                    {task.blocker_details}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusPill value={task.status} />
                <Priority score={task.ai_priority_score} />
                <button className="btn-icon" onClick={() => onEditTask(task)}>
                  <Edit3 size={14} />
                </button>
                <button className="btn-icon friction" onClick={() => onStartCheckin(task.id)}>
                  <MessageSquareText size={14} />
                </button>
              </div>
            </div>
          ))}
        </Panel>
      )}

      {/* Calendar Mode */}
      {mode === 'calendar' && <CalendarView tasks={filteredTasks} onEditTask={onEditTask} />}

      {/* AI-Priority Mode */}
      {mode === 'priority' && (
        <Panel title="AI-Prioritized Queue (Cognitive Load & Friction Weighted)">
          {filteredTasks.map((task, idx) => (
            <div className="task-row" key={task.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#126c6a', minWidth: 24 }}>#{idx + 1}</span>
                <div>
                  <strong>{task.title}</strong>
                  <span>
                    {task.owner_name} · {task.estimated_hours}h · Cog Load: {task.cognitive_load ?? 3}/5 · Complexity: {task.complexity ?? 3}/5
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusPill value={task.status} />
                <Priority score={task.ai_priority_score} />
                <button className="btn-icon" onClick={() => onEditTask(task)}>Edit</button>
              </div>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Actionable AI Daily Planner (With Apply Flow)
// --------------------------------------------------------------------------
function Planner({ data, refresh, showToast }: { data: Bootstrap; refresh: () => Promise<void>; showToast: (msg: string, type?: Toast['type'], title?: string) => void }) {
  const [plan, setPlan] = useState<{
    summary: string;
    agent?: string;
    plan: Array<any>;
    governance_rule?: string;
  } | null>(null);
  const [why, setWhy] = useState<number | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  async function generate() {
    setPlan(await api.dailyPlan());
  }

  useEffect(() => {
    generate();
  }, []);

  async function handleApplyPlan() {
    if (!plan?.plan || plan.plan.length === 0) return;
    setIsApplying(true);
    try {
      const taskIds = plan.plan.map((item) => item.task_id);
      await api.applyDailyPlan(taskIds);
      await refresh();
      showToast(
        `Planning Agent: ${taskIds.length} high-impact tasks scheduled as active focus queue for today.`,
        'success',
        'Daily Plan Activated'
      );
    } catch (err) {
      showToast('Failed to apply daily plan', 'error');
    } finally {
      setIsApplying(false);
    }
  }

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
            The Planning Agent synthesizes deadlines, dependencies, cognitive load, and effort into transparent scores.
            In accordance with the CARE Control principle, these recommendations require your approval before schedules are updated.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ghost" onClick={generate}><RefreshCw size={16} /> Recalculate</button>
          <button className="primary" onClick={handleApplyPlan} disabled={isApplying}>
            <Sparkles size={18} /> {isApplying ? 'Applying...' : 'Approve & Activate Schedule'}
          </button>
        </div>
      </section>

      <div className="planner-list">
        {plan?.plan.map((item) => (
          <article className="plan-item" key={item.task_id}>
            <div className="rank">{item.recommended_position}</div>
            <div style={{ flex: 1 }}>
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
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Empathetic Check-in (Blocker Agent with Resolve Flow)
// --------------------------------------------------------------------------
function CheckIn({
  data,
  refresh,
  initialTaskId,
  onClearInitialTask,
  showToast,
}: {
  data: Bootstrap;
  refresh: () => Promise<void>;
  initialTaskId: number | null;
  onClearInitialTask: () => void;
  showToast: (msg: string, type?: Toast['type']) => void;
}) {
  const [taskId, setTaskId] = useState<number>(
    initialTaskId ?? data.tasks.find((task) => task.status === 'Blocked')?.id ?? data.tasks[0]?.id ?? 1
  );
  const [question, setQuestion] = useState('');
  const [message, setMessage] = useState('Waiting for API credentials from backend team before payment flow can be tested.');
  const [status, setStatus] = useState('Waiting on external dependency');
  const [share, setShare] = useState(false);
  const [reply, setReply] = useState('');

  const selectedTask = data.tasks.find((t) => t.id === Number(taskId));

  async function start() {
    if (!taskId) return;
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
    await refresh();
    showToast('Check-in processed · Friction recommendation created in Approval Center.', 'info');
  }

  async function handleResolve() {
    if (!selectedTask) return;
    await api.resolveBlocker(selectedTask.id, 'Resolved via Check-In center.');
    await refresh();
    showToast(`Task '${selectedTask.title}' unblocked and returned to In Progress.`, 'success');
  }

  useEffect(() => {
    start();
  }, [taskId]);

  useEffect(() => {
    if (initialTaskId) {
      setTaskId(initialTaskId);
      onClearInitialTask();
    }
  }, [initialTaskId]);

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
          rows={3}
          placeholder="Share what is creating friction. Private by default under CARE Respect principle."
        />

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

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button className="primary" onClick={send}>
            <Bot size={16} style={{ marginRight: 6 }} /> Send Check-In & Request Support
          </button>
          {selectedTask?.status === 'Blocked' && (
            <button className="btn-icon" style={{ color: '#10b981', padding: '0 14px' }} onClick={handleResolve}>
              <CheckCircle2 size={16} /> Mark Blocker as Resolved
            </button>
          )}
        </div>

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

// --------------------------------------------------------------------------
// Team & Equity Workspace (Interactive Rebalancer)
// --------------------------------------------------------------------------
function TeamWorkspace({
  data,
  analytics,
  onOpenRebalance,
}: {
  data: Bootstrap;
  analytics: Analytics | null;
  onOpenRebalance: (member: WorkloadEquityMember) => void;
}) {
  const equityMembers = analytics?.workload_equity ?? [];

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
              ⚠️ Conventional tools assume Priya is underutilized. CoPlan AI recognizes critical cognitive overload.
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
        <Panel title="Team Workload Equity Breakdown" action="Click Member to Rebalance">
          <table className="equity-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Tasks</th>
                <th>Hours</th>
                <th>Cognitive Load</th>
                <th>Contextual Workload</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {equityMembers.map((m) => (
                <tr key={m.name}>
                  <td><strong>{m.full_name}</strong></td>
                  <td>{m.role.replace('_', ' ')}</td>
                  <td>{m.task_count}</td>
                  <td>{m.total_hours}h</td>
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
                    <button
                      className="btn-icon"
                      onClick={() => onOpenRebalance(m)}
                      title={`Rebalance tasks for ${m.full_name}`}
                    >
                      <Scale size={13} /> Rebalance
                    </button>
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
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Approval Center (With Interactive Modification & Audit Trail)
// --------------------------------------------------------------------------
function Approvals({
  recommendations,
  refresh,
  onOpenModify,
  showToast,
}: {
  recommendations: Recommendation[];
  refresh: () => Promise<void>;
  onOpenModify: (rec: Recommendation) => void;
  showToast: (msg: string, type?: Toast['type']) => void;
}) {
  const [tab, setTab] = useState<'pending' | 'audit'>('pending');
  const [auditLogs, setAuditLogs] = useState<Recommendation[]>([]);

  useEffect(() => {
    if (tab === 'audit') {
      api.getAuditLogs().then(setAuditLogs).catch(console.error);
    }
  }, [tab]);

  async function decide(id: number, action: 'accept' | 'reject') {
    await api.decideRecommendation(id, action, { note: `Action recorded as ${action} by user.` });
    await refresh();
    showToast(`Recommendation #${id} ${action === 'accept' ? 'approved' : 'rejected'}. Audit record created.`, action === 'accept' ? 'success' : 'info');
  }

  const pendingRecs = recommendations.filter((r) => r.status === 'Pending');

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
        <div className="segmented">
          <button className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>
            Pending Approvals ({pendingRecs.length})
          </button>
          <button className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>
            <History size={14} style={{ marginRight: 4 }} /> Audit Trail
          </button>
        </div>
      </div>

      {tab === 'pending' ? (
        <div className="approval-grid">
          {pendingRecs.map((rec) => (
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
                <button className="soft" onClick={() => onOpenModify(rec)}>Modify</button>
                <button className="ghost" onClick={() => decide(rec.id, 'reject')}>Reject</button>
              </div>
            </article>
          ))}
          {pendingRecs.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: '#66716c' }}>
              <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: 8 }} />
              <h3>All recommendations reviewed!</h3>
              <p>Check the Audit Trail tab to view the history of your governance decisions.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="stack">
          {auditLogs.map((log) => (
            <div className="audit-item" key={log.id}>
              <div className="audit-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AgentBadge name={log.agent_name} />
                  <span className={`audit-status ${log.status}`}>{log.status}</span>
                  <strong>{log.recommendation_type}</strong>
                </div>
                <span className="audit-time">Logged {log.created_at ? new Date(log.created_at).toLocaleString() : 'Recently'}</span>
              </div>
              <div>
                <strong>Proposed Action:</strong> {log.proposed_change}
              </div>
              <div className="audit-note">
                <strong>Decision Record:</strong> {log.decision_note || 'Approved as suggested.'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Analytics Progress View
// --------------------------------------------------------------------------
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

// --------------------------------------------------------------------------
// Settings with Database Persistence
// --------------------------------------------------------------------------
function Settings({ user, refresh, showToast }: { user: User; refresh: () => Promise<void>; showToast: (msg: string, type?: Toast['type']) => void }) {
  const [workingHours, setWorkingHours] = useState('09:00-17:00');
  const [quietStart, setQuietStart] = useState('21:00');
  const [quietEnd, setQuietEnd] = useState('08:00');

  async function handleSaveSettings() {
    await api.updateSettings({
      working_hours: workingHours,
      quiet_hours_start: quietStart,
      quiet_hours_end: quietEnd,
    });
    await refresh();
    showToast('Privacy & Quiet Hours settings updated.', 'success');
  }

  return (
    <div className="settings-grid">
      <Panel title="Communication Agent & Quiet Hours">
        <label className="toggle"><input type="checkbox" defaultChecked /> Respect quiet hours ({quietStart} - {quietEnd})</label>
        <label className="toggle"><input type="checkbox" defaultChecked /> Batch non-urgent reminders into morning digest</label>
        <label className="toggle"><input type="checkbox" /> Suppress all pings during focus blocks</label>
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Working Hours Window:</label>
          <input value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} placeholder="09:00-17:00" />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Quiet hours start:</label>
            <input value={quietStart} onChange={(e) => setQuietStart(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Quiet hours end:</label>
            <input value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} />
          </div>
        </div>
        <button className="primary" style={{ marginTop: 14 }} onClick={handleSaveSettings}>
          Save Communication Preferences
        </button>
      </Panel>
      <Panel title="CARE Privacy & Consent Controls">
        <label className="toggle"><input type="checkbox" defaultChecked /> Keep private check-in reflections confidential</label>
        <label className="toggle"><input type="checkbox" defaultChecked /> Require explicit consent before sharing blockers</label>
        <label className="toggle"><input type="checkbox" defaultChecked /> Prohibit automated employee surveillance scoring</label>
        <div className="guardrail" style={{ marginTop: 16 }}>
          <ShieldCheck size={24} color="#126c6a" />
          <div>
            <strong>Zero-Surveillance Guarantee:</strong>
            <span>All AI inferences are designed to support human workload balance, never to calculate punitive performance ranking.</span>
          </div>
        </div>
      </Panel>
      <Panel title="Account & Active Profile">
        <div className="member">
          <div className="avatar">{initials(user.name)}</div>
          <div>
            <strong>{user.name}</strong>
            <span>{user.email} · {user.role.replace('_', ' ')}</span>
            <div style={{ fontSize: '0.78rem', color: '#126c6a', marginTop: 4, fontWeight: 600 }}>
              Availability: {user.weekly_availability ?? 35}h / week
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

// --------------------------------------------------------------------------
// Full-Featured Task Modal (Create & Edit with Cognitive Sliders)
// --------------------------------------------------------------------------
function TaskModal({
  task,
  users,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task | null;
  users: User[];
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => Promise<void>;
  onDelete: (taskId: number) => Promise<void>;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [ownerId, setOwnerId] = useState(task?.owner_id ?? users[0]?.id ?? 1);
  const [status, setStatus] = useState<Task['status']>(task?.status ?? 'To Do');
  const [priority, setPriority] = useState(task?.priority ?? 'Medium');
  const [dueDate, setDueDate] = useState(
    task?.due_date ?? new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10)
  );
  const [estimatedHours, setEstimatedHours] = useState(task?.estimated_hours ?? 3.0);
  const [complexity, setComplexity] = useState(task?.complexity ?? 3);
  const [cognitiveLoad, setCognitiveLoad] = useState(task?.cognitive_load ?? 3);
  const [requiredSkills, setRequiredSkills] = useState(task?.required_skills ?? 'Full Stack');
  const [blockerDetails, setBlockerDetails] = useState(task?.blocker_details ?? '');

  const cogDesc = [
    '',
    'Minimal cognitive effort / mechanical pattern',
    'Low friction / familiar routines',
    'Standard problem solving & implementation',
    'High cognitive demand / deep focus required',
    'Intense cognitive load / high context switching risk',
  ][cognitiveLoad];

  const compDesc = [
    '',
    'Trivial styling / copy / asset update',
    'Standard component or bugfix',
    'Multi-module implementation / API logic',
    'Cross-cutting security / system architecture',
    'Core infrastructure / zero-downtime database internals',
  ][complexity];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{task ? 'Edit Task & Workload Metadata' : 'Create New Task'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div>
            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>Task Title:</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Design authentication architecture" />
          </div>

          <div>
            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>Description & Context:</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Explain what needs to be done..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>Assignee:</label>
              <select value={ownerId} onChange={(e) => setOwnerId(Number(e.target.value))}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>Status:</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as Task['status'])}>
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>Priority:</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>Due Date:</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>Estimated Effort (Hours):</label>
              <input type="number" step="0.5" min="0.5" value={estimatedHours} onChange={(e) => setEstimatedHours(Number(e.target.value))} />
            </div>
          </div>

          {/* Interactive Cognitive Load Slider */}
          <div className="slider-group">
            <div className="slider-header">
              <label>Cognitive Load Index (Mental Effort):</label>
              <span className={`slider-badge ${cognitiveLoad >= 4 ? 'high' : cognitiveLoad >= 3 ? 'med' : 'low'}`}>
                Level {cognitiveLoad} / 5
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={cognitiveLoad}
              onChange={(e) => setCognitiveLoad(Number(e.target.value))}
            />
            <div className="slider-desc">{cogDesc}</div>
          </div>

          {/* Interactive Technical Complexity Slider */}
          <div className="slider-group">
            <div className="slider-header">
              <label>Technical Complexity Index:</label>
              <span className={`slider-badge ${complexity >= 4 ? 'high' : complexity >= 3 ? 'med' : 'low'}`}>
                Level {complexity} / 5
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={complexity}
              onChange={(e) => setComplexity(Number(e.target.value))}
            />
            <div className="slider-desc">{compDesc}</div>
          </div>

          <div>
            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>Blocker / Friction Details (Optional):</label>
            <input
              value={blockerDetails}
              onChange={(e) => setBlockerDetails(e.target.value)}
              placeholder="e.g. Waiting on API credentials from backend team..."
            />
          </div>
        </div>
        <div className="modal-footer">
          {task && (
            <button
              className="btn-danger"
              style={{ marginRight: 'auto' }}
              onClick={() => onDelete(task.id)}
            >
              <Trash2 size={16} /> Delete Task
            </button>
          )}
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button
            className="primary"
            disabled={!title.trim()}
            onClick={() =>
              onSave({
                title,
                description,
                owner_id: ownerId,
                status,
                priority,
                due_date: dueDate,
                estimated_hours: estimatedHours,
                cognitive_load: cognitiveLoad,
                complexity,
                required_skills: requiredSkills,
                blocker_details: blockerDetails,
              })
            }
          >
            {task ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Modify Recommendation Modal
// --------------------------------------------------------------------------
function ModifyModal({
  recommendation,
  onClose,
  onSave,
}: {
  recommendation: Recommendation;
  onClose: () => void;
  onSave: (modifiedChange: string, note: string) => Promise<void>;
}) {
  const [modifiedChange, setModifiedChange] = useState(recommendation.proposed_change);
  const [note, setNote] = useState('');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Modify Recommendation (CARE Control)</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: '0.84rem', color: '#556862' }}>
            <strong>Original AI Suggestion:</strong> {recommendation.proposed_change}
          </div>

          <div>
            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>Your Adjusted Proposed Change:</label>
            <textarea
              value={modifiedChange}
              onChange={(e) => setModifiedChange(e.target.value)}
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#5b6c66' }}>Quick Presets:</span>
            <button className="btn-icon" onClick={() => setModifiedChange(`${modifiedChange} (+1 day buffer)`)}>+1 Day</button>
            <button className="btn-icon" onClick={() => setModifiedChange(`${modifiedChange} (+2 days buffer)`)}>+2 Days</button>
            <button className="btn-icon" onClick={() => setModifiedChange(`Pair with teammate for 30 mins to resolve blocker.`)}>Pair Support</button>
          </div>

          <div>
            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>Decision Rationale & Audit Note:</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Why are you modifying this? Logged for CARE accountability..."
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="primary" onClick={() => onSave(modifiedChange, note)}>
            Apply Modified Suggestion
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Workload Rebalance Assistant Modal
// --------------------------------------------------------------------------
function RebalanceModal({
  sourceMember,
  data,
  onClose,
  onExecute,
}: {
  sourceMember: WorkloadEquityMember;
  data: Bootstrap;
  onClose: () => void;
  onExecute: (taskId: number, newOwnerId: number, note: string) => Promise<void>;
}) {
  const memberTasks = data.tasks.filter((t) => t.owner_id === data.users.find((u) => u.name === sourceMember.full_name)?.id && t.status !== 'Completed');
  const [selectedTaskId, setSelectedTaskId] = useState<number>(memberTasks[0]?.id ?? 0);
  const otherUsers = data.users.filter((u) => u.name !== sourceMember.full_name);
  const [targetUserId, setTargetUserId] = useState<number>(otherUsers[0]?.id ?? 1);
  const [pairingNote, setPairingNote] = useState('');

  const targetUser = data.users.find((u) => u.id === targetUserId);
  const targetEquity = data.users.length ? otherUsers.find((u) => u.id === targetUserId) : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Workload Rebalancing Assistant (CARE Equity)</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="rebalance-grid">
            <div className="rebalance-col">
              <span className="eyebrow" style={{ color: '#d74154' }}>Source: Overloaded</span>
              <h4 style={{ margin: '4px 0' }}>{sourceMember.full_name}</h4>
              <div style={{ fontSize: '0.8rem', color: '#556862' }}>
                Load Index: <strong>{sourceMember.contextual_score}%</strong> · Tasks: {sourceMember.task_count}
              </div>
            </div>
            <div className="rebalance-col">
              <span className="eyebrow" style={{ color: '#126c6a' }}>Target: Available Capacity</span>
              <h4 style={{ margin: '4px 0' }}>{targetUser?.name}</h4>
              <div style={{ fontSize: '0.8rem', color: '#556862' }}>
                Role: {targetUser?.role.replace('_', ' ')}
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>Select Task to Rebalance or Pair On:</label>
            <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(Number(e.target.value))}>
              {memberTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.estimated_hours}h · Cog: {t.cognitive_load ?? 3}/5)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>Delegate / Pair With:</label>
            <select value={targetUserId} onChange={(e) => setTargetUserId(Number(e.target.value))}>
              {otherUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>Pairing / Coordination Note:</label>
            <textarea
              value={pairingNote}
              onChange={(e) => setPairingNote(e.target.value)}
              rows={2}
              placeholder="e.g. Delegate secondary documentation or pair for 30m code walkthrough..."
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button
            className="primary"
            disabled={!selectedTaskId}
            onClick={() => onExecute(selectedTaskId, targetUserId, pairingNote)}
          >
            Execute Rebalance & Log Audit
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Calendar View Helper Component
// --------------------------------------------------------------------------
function CalendarView({ tasks, onEditTask }: { tasks: Task[]; onEditTask: (task: Task) => void }) {
  return (
    <Panel title="Upcoming Deadlines & Complexity Timeline">
      <div className="calendar-grid">
        {tasks.map((task) => (
          <div className="calendar-cell" key={task.id} onClick={() => onEditTask(task)} style={{ cursor: 'pointer' }}>
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

// --------------------------------------------------------------------------
// Common UI Primitives
// --------------------------------------------------------------------------
function NavButton({ active, icon, label, badge, onClick }: { active: boolean; icon: JSX.Element; label: string; badge?: number; onClick: () => void }) {
  return (
    <button className={active ? 'nav active' : 'nav'} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {Boolean(badge) && <b>{badge}</b>}
    </button>
  );
}

function Panel({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        {action && <span>{action}</span>}
      </div>
      {children}
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ChartWrap({ children }: { children: React.ReactElement }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
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
    tasks: 'Task Management & Workload Metadata',
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
