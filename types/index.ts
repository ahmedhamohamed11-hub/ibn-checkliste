export type TaskStatus = 'offen' | 'in_arbeit' | 'regiearbeit' | 'erledigt'

export interface UserProfile {
  id: string
  name: string
  created_at: string
}

export interface Project {
  id: string
  name: string
  commissioning_date: string | null
  creator_name: string
  created_at: string
  updated_at: string
  archived: boolean
  template_id: string | null
}

export interface ProjectParticipant {
  id: string
  project_id: string
  user_name: string
  created_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  created_by: string
  modified_by: string | null
  completed_by: string | null
  created_at: string
  updated_at: string
  position: number
}

export interface Comment {
  id: string
  task_id: string
  project_id: string
  author: string
  content: string
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  project_id: string
  task_id: string | null
  actor: string
  action: string
  detail: string | null
  created_at: string
}

export interface Favorite {
  id: string
  user_name: string
  title: string
  position: number
  created_at: string
}

export interface Template {
  id: string
  name: string
  tasks: string[]
  created_at: string
}

export interface SuggestionLibrary {
  id: string
  title: string
  usage_count: number
  created_at: string
  updated_at: string
}

export interface ProjectWithProgress extends Project {
  participants: ProjectParticipant[]
  task_count: number
  done_count: number
}
