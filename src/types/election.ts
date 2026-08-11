export const IAMS_DEPARTMENTS = [
  'Business Management',
  'Digital Marketing',
  'Plus Two Commerce',
] as const;

export type IAMSDepartment = (typeof IAMS_DEPARTMENTS)[number];

export interface Student {
  id: string; // e.g., 'IAMS-2026-001' or 'IAMS001'
  studentId?: string;
  name: string;
  department: string;
  semester: number | string;
  password?: string;
  passcode?: string;
  slipToken?: string;
  photo: string;
  hasVoted: boolean;
  votedAt?: string;
}

export interface Candidate {
  id: string;
  candidateId?: string;
  name: string;
  photo: string;
  photoUrl?: string;
  positionId: string;
  positionName: string;
  position?: string;
  department: string;
  manifesto: string;
  campaignMessage: string;
  achievements: string[];
  votesCount?: number;
  createdAt?: string;
}

export interface Position {
  id: string;
  title: string;
  description: string;
  displayOrder: number;
}

export interface VoteRecord {
  id: string;
  studentId: string;
  candidateId: string;
  positionId: string;
  timestamp: string;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  date: string;
  priority: 'low' | 'medium' | 'high';
  category: 'Rules' | 'Schedule' | 'Notice' | 'Meeting';
}

export interface ElectionSettings {
  collegeName: string;
  collegeLogo: string;
  electionName: string;
  electionDate: string;
  votingStartTime: string;
  votingEndTime: string;
  votingOpen: boolean;
  resultPublished: boolean;
  totalStudentsCount: number;
  soundEnabled: boolean;
  themeMode: 'light' | 'dark' | 'system';
}

export interface AdminUser {
  email: string;
  name: string;
  role: 'super_admin' | 'election_officer';
}

export type UserRole = 'student' | 'admin' | null;
