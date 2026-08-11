import { Student, Candidate, Position, Announcement, ElectionSettings, IAMS_DEPARTMENTS } from '../types/election';

const DEPARTMENTS = IAMS_DEPARTMENTS;

const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Rohan', 'Amina', 'Aditya', 'Sneha', 'Vikram', 'Diya', 'Rahul', 'Kavya',
  'Arjun', 'Isha', 'Karan', 'Meera', 'Varun', 'Riya', 'Siddharth', 'Tanvi', 'Yash', 'Pooja',
  'Dev', 'Nisha', 'Aman', 'Sanya', 'Kabir', 'Tara', 'Ayush', 'Zara', 'Pranav', 'Simran',
  'Rishabh', 'Rhea', 'Manav', 'Shreya', 'Harsh', 'Anushka', 'Vivek', 'Avani', 'Gaurav', 'Aditi',
  'Zain', 'Fatima', 'Bilal', 'Maryam', 'Tariq', 'Hania', 'Omar', 'Ayla', 'Hamza', 'Sana'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Singh', 'Gupta', 'Kumar', 'Reddy', 'Joshi', 'Mehta', 'Nair',
  'Deshmukh', 'Chopra', 'Rao', 'Bhat', 'Saxena', 'Kapoor', 'Malhotra', 'Roy', 'Iyer', 'Menon',
  'Khan', 'Ahmed', 'Syed', 'Ali', 'Siddiqui', 'Hassan', 'Shah', 'Qureshi', 'Mirza', 'Husain'
];

// Generate Students - Returns empty array. Only uploaded students from Cloud Firestore are used.
export const generateSampleStudents = (): Student[] => {
  return [];
};

// Default Positions (Chairman, Treasurer, Media Head, Program Coordinator, General Captain)
export const DEFAULT_POSITIONS: Position[] = [
  {
    id: 'pos-1',
    title: 'Chairman',
    description: 'Leads the Student Council, represents student interests to campus administration, and manages overall council initiatives.',
    displayOrder: 1,
  },
  {
    id: 'pos-2',
    title: 'Treasurer',
    description: 'Oversees student council finances, budget allocation for clubs, and transparent financial reporting.',
    displayOrder: 2,
  },
  {
    id: 'pos-3',
    title: 'Media Head',
    description: 'Directs digital campaigns, campus newsletter, social media platforms, and public relations.',
    displayOrder: 3,
  },
  {
    id: 'pos-4',
    title: 'Program Coordinator',
    description: 'Organizes cultural fests, academic symposiums, guest lectures, and student hackathons.',
    displayOrder: 4,
  },
  {
    id: 'pos-5',
    title: 'General Captain',
    description: 'Leads campus sports events, athletic tournaments, fitness programs, and inter-college sports meets.',
    displayOrder: 5,
  },
];

// Candidates list is loaded purely from Cloud Firestore
export const DEFAULT_CANDIDATES: Candidate[] = [];

// System Announcements list is loaded purely from Cloud Firestore
export const DEFAULT_ANNOUNCEMENTS: Announcement[] = [];

// Default Settings
export const DEFAULT_SETTINGS: ElectionSettings = {
  collegeName: 'IAMS Campus',
  collegeLogo: '🎓',
  electionName: 'Smart Campus Election 2026',
  electionDate: '2026-08-06',
  votingStartTime: '09:00 AM',
  votingEndTime: '05:00 PM',
  votingOpen: true,
  resultPublished: false,
  totalStudentsCount: 0,
  soundEnabled: true,
  themeMode: 'light',
};
