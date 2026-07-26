export interface TeamMember {
  id: number;
  name: string;
  email: string;
  slack_user_id: string | null;
  jira_account_id: string | null;
  created_at: string;
}

export type TeamMemberInput = Omit<TeamMember, "id" | "created_at">;

export interface JiraIssue {
  key: string | null;
  summary: string | null;
  status: string | null;
  priority: string | null;
  issue_type: string | null;
  assignee_name: string | null;
  assignee_account_id: string | null;
  due_date: string | null;
  url: string | null;
}

export interface JiraConnection {
  connected: boolean;
  auth_method: "oauth" | "api_token" | "none";
  oauth_available: boolean;
  site_name: string | null;
  site_url: string | null;
  account_name: string | null;
  account_email: string | null;
  account_id: string | null;
  scopes: string[];
  connected_at: string | null;
  project_key: string | null;
  redirect_uri: string;
}

export interface JiraUser {
  account_id: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface AiSummary {
  key_decisions?: string[];
  discussion_highlights?: string[];
  risks_or_blockers?: string[];
  suggested_action_items?: { description: string; owner?: string }[];
  next_steps?: string[];
}

export interface Meeting {
  id: number;
  title: string;
  meeting_date: string;
  status: string;
  created_at: string;
  attendees: TeamMember[];
  raw_notes?: string | null;
  ai_summary?: AiSummary | null;
}

export interface ActionItem {
  id: number;
  meeting_id: number;
  description: string;
  due_date: string | null;
  status: "open" | "in_progress" | "done";
  jira_issue_key: string | null;
  jira_issue_summary: string | null;
  created_at: string;
  assignee: TeamMember | null;
}

export interface Report {
  id: number;
  meeting_id: number;
  pdf_path: string;
  ai_content: {
    headline?: string;
    key_points?: string[];
    risks?: string[];
    next_steps?: string[];
  } | null;
  created_at: string;
}

export interface NotificationLog {
  id: number;
  type: "email" | "slack";
  recipient: string;
  subject: string | null;
  status: string;
  error_message: string | null;
  related_meeting_id: number | null;
  related_action_item_id: number | null;
  sent_at: string;
}

export interface Todo {
  id: number;
  title: string;
  notes: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high" | string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TodoCreateInput {
  title: string;
  notes?: string | null;
  due_date?: string | null;
  priority?: string;
}

export interface TodoUpdateInput {
  title?: string;
  notes?: string | null;
  due_date?: string | null;
  priority?: string;
  completed?: boolean;
}

export interface Whiteboard {
  id: number;
  title: string;
  meeting_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface WhiteboardDetail extends Whiteboard {
  data: {
    nodes: unknown[];
    edges: unknown[];
    viewport: { x: number; y: number; zoom: number };
  };
}
