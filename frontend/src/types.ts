export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  weekly_availability?: number;
  skills?: string;
};

export type Task = {
  id: number;
  project_id: number;
  project_name: string;
  title: string;
  description: string;
  owner_id: number;
  owner_name: string;
  status: 'To Do' | 'In Progress' | 'Blocked' | 'Under Review' | 'Completed';
  priority: string;
  ai_priority_score: number;
  importance: number;
  estimated_hours: number;
  due_date: string;
  required_skills: string;
  privacy_level: string;
  blocker_details: string;
  complexity?: number;
  cognitive_load?: number;
  task_type?: string;
};

export type Recommendation = {
  id: number;
  user_id: number;
  task_id: number;
  agent_name?: string;
  recommendation_type: string;
  proposed_change: string;
  explanation: string;
  confidence: number;
  status: 'Pending' | 'Accepted' | 'Modified' | 'Rejected';
  decision_note?: string;
  friction_type?: string;
  schedule_impact?: string;
  required_resource?: string;
  suggested_action?: string;
  created_at?: string;
  reviewed_at?: string;
};

export type Notification = {
  id: number;
  title: string;
  body: string;
  category: string;
  read: number;
  created_at: string;
};

export type Project = {
  id: number;
  name: string;
  deadline: string;
  status: string;
  description: string;
};

export type WorkloadEquityMember = {
  name: string;
  full_name: string;
  role: string;
  task_count: number;
  total_hours: number;
  avg_complexity: number;
  avg_cognitive_load: number;
  contextual_score: number;
  status_label: string;
  availability: number;
};

export type Analytics = {
  status_distribution: Array<{ status: string; count: number }>;
  weekly_completion: Array<{ week: string; completed: number; rescheduled: number }>;
  workload_equity: Array<WorkloadEquityMember>;
  blockers: Array<{ category: string; count: number }>;
  ai_decisions: Array<{ name: string; value: number }>;
  agent_activity?: Array<{ agent_name: string; count: number }>;
};

export type AgentInfo = {
  name: string;
  role: string;
  status: string;
};

export type Bootstrap = {
  user: User;
  users: User[];
  projects: Project[];
  tasks: Task[];
  recommendations: Recommendation[];
  notifications: Notification[];
  care_principles?: Record<string, string>;
  agents?: AgentInfo[];
};
