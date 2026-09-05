import type { Analytics, Bootstrap, Recommendation, Task } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

let token = localStorage.getItem('coplan_token') ?? '';

export function setToken(nextToken: string) {
  token = nextToken;
  localStorage.setItem('coplan_token', nextToken);
}

export function clearToken() {
  token = '';
  localStorage.removeItem('coplan_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(body.detail ?? 'Request failed');
  }
  return response.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: Bootstrap['user'] }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string, role: string, team_name: string) =>
    request<{ token: string; user: Bootstrap['user'] }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, team_name }),
    }),
  bootstrap: () => request<Bootstrap>('/api/bootstrap'),
  analytics: () => request<Analytics>('/api/analytics/personal'),
  dailyPlan: () =>
    request<{
      summary: string;
      plan: Array<{
        task_id: number;
        task_title: string;
        recommended_priority: string;
        recommended_position: number;
        reason: string[];
        proposed_action: string;
        confidence: number;
        requires_human_approval: boolean;
        agent_name?: string;
        governance_rule?: string;
      }>;
      requires_human_approval: boolean;
      agent?: string;
      governance_rule?: string;
    }>('/api/ai/daily-plan', { method: 'POST' }),
  createTask: (task: Partial<Task>) => request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id: number, patch: Partial<Task>) => request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  decideRecommendation: (id: number, action: 'accept' | 'reject' | 'modify', body = {}) =>
    request<Recommendation>(`/api/ai/recommendations/${id}/${action}`, { method: 'POST', body: JSON.stringify(body) }),
  startCheckin: (task_id: number) =>
    request<{ question: string; quick_responses: string[]; task_title?: string; agent?: string }>('/api/checkins/start', {
      method: 'POST',
      body: JSON.stringify({ task_id }),
    }),
  sendCheckin: (
    taskId: number,
    message: string,
    completion_status: string,
    blocker_category?: string,
    permission_to_share = false,
    extra = {}
  ) =>
    request<{
      reply: string;
      checkin: Record<string, unknown>;
      inference?: {
        friction_type: string;
        schedule_impact: string;
        required_resource: string;
        suggested_action: string;
        permission_to_share: boolean;
      };
    }>(`/api/checkins/${taskId}/message`, {
      method: 'POST',
      body: JSON.stringify({ message, completion_status, blocker_category, permission_to_share, ...extra }),
    }),
};
