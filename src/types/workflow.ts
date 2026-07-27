export type ApprovalRole = 'librarian' | 'lab' | 'hod' | 'principal'
export type ApplicationStatus =
  | 'librarian_pending'
  | 'lab_pending'
  | 'hod_pending'
  | 'principal_pending'
  | 'approved'
  | 'rejected'

export interface Application {
  id: string
  student_id: string
  status: ApplicationStatus
  current_stage: string
  department: string | null
  purpose?: string | null
  document_ids: string[]
  is_submitted: boolean
  created_at: string
  updated_at?: string
  student?: {
    full_name: string
    username: string
    student_uid?: string
  }
}

export interface Approval {
  id: string
  application_id: string
  role: ApprovalRole
  status: 'pending' | 'approved' | 'rejected'
  comment: string | null
  actor_id: string | null
  updated_at: string
}

export interface Document {
  id: string
  file_url: string
  file_name: string
  file_type: string
  uploaded_at: string
}

export interface ApplicationWithStudent extends Application {
  student: {
    full_name: string
    student_uid: string
    department: string
    username: string
  }
}

export interface ParsedPurpose {
  type: string
  notes: string
  cgpa?: string
  phone?: string
  address?: string
  pincode?: string
}
