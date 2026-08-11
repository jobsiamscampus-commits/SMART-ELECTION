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

// Candidates distributed across the 5 positions and departments
export const DEFAULT_CANDIDATES: Candidate[] = [
  // Chairman Candidates
  {
    id: 'cand-1',
    name: 'Rohan Menon',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    positionId: 'pos-1',
    positionName: 'Chairman',
    position: 'Chairman',
    department: 'Business Management',
    manifesto: 'I am committed to transforming IAMS Campus into a 24/7 student-empowered learning environment. My manifesto focuses on establishing a campus startup incubation fund, expanding industry mentorships, and upgrading campus Wi-Fi infrastructure.',
    campaignMessage: 'Leadership through innovation and student empowerment!',
    achievements: [
      'Organized IAMS Management Conclave 2025 (400+ participants)',
      'Student Representative on Academic Advisory Board',
      'Top Ranker in Business Management',
    ],
    votesCount: 16,
  },
  {
    id: 'cand-2',
    name: 'Ananya Verma',
    photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    positionId: 'pos-1',
    positionName: 'Chairman',
    position: 'Chairman',
    department: 'Digital Marketing',
    manifesto: 'A modern, connected campus for every student! My agenda prioritizes student wellness initiatives, subsidised cafeteria pricing, digital marketing workshops with industry leaders, and eco-friendly campus projects.',
    campaignMessage: 'Together we build a stronger and smarter IAMS Campus.',
    achievements: [
      'Lead Strategist for IAMS Digital Marketing Club',
      'Led Campus Green Initiative 2025',
      'Represented IAMS at National Youth Leadership Summit',
    ],
    votesCount: 12,
  },

  // Treasurer Candidates
  {
    id: 'cand-3',
    name: 'Vikram Rao',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    positionId: 'pos-2',
    positionName: 'Treasurer',
    position: 'Treasurer',
    department: 'Plus Two Commerce',
    manifesto: 'Every rupee accounted for! I will publish quarterly financial summaries online and allocate fair budgets to student-led initiatives across all departments.',
    campaignMessage: 'Trust, Integrity, and Financial Clarity!',
    achievements: [
      'Head Auditor for IAMS Commerce Association',
      'Top Scorer in Financial Accounting',
    ],
    votesCount: 17,
  },
  {
    id: 'cand-4',
    name: 'Diya Malhotra',
    photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    positionId: 'pos-2',
    positionName: 'Treasurer',
    position: 'Treasurer',
    department: 'Business Management',
    manifesto: 'Fair allocation for all departments! I will ensure transparent budget distribution among Business Management, Digital Marketing, and Plus Two Commerce.',
    campaignMessage: 'Empowering Student Ideas with Smart Funding!',
    achievements: [
      'Treasurer of Management Society',
      'Winner of National Business Plan Contest',
    ],
    votesCount: 11,
  },

  // Media Head Candidates
  {
    id: 'cand-5',
    name: 'Karan Saxena',
    photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    positionId: 'pos-3',
    positionName: 'Media Head',
    position: 'Media Head',
    department: 'Digital Marketing',
    manifesto: 'Elevating IAMS Campus brand nationwide. I will showcase student achievements on Instagram, LinkedIn, and YouTube with creative digital content teams.',
    campaignMessage: 'Creative Vision for Modern Media!',
    achievements: [
      'Official Campus Media Coordinator 2024-2025',
      '20,000+ views on IAMS Campus Spotlight Videos',
    ],
    votesCount: 19,
  },
  {
    id: 'cand-6',
    name: 'Kavya Nair',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    positionId: 'pos-3',
    positionName: 'Media Head',
    position: 'Media Head',
    department: 'Business Management',
    manifesto: 'Inclusive media coverage for all student clubs and departmental achievements. I will launch a weekly student podcast featuring campus innovators.',
    campaignMessage: 'Shining Light on Every Student Talent!',
    achievements: [
      'Host of IAMS Campus Voice Podcast',
      'Media Lead for Business Management Summit',
    ],
    votesCount: 9,
  },

  // Program Coordinator Candidates
  {
    id: 'cand-7',
    name: 'Arjun Iyer',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    positionId: 'pos-4',
    positionName: 'Program Coordinator',
    position: 'Program Coordinator',
    department: 'Digital Marketing',
    manifesto: 'Unforgettable campus experiences! I will organize monthly workshops, cultural nights, guest lectures, and inter-department sports leagues.',
    campaignMessage: 'More Fests, More Opportunities, More Memories!',
    achievements: [
      'Lead Coordinator for IAMS Annual Fest 2025',
      'Coordinator of Digital Marketing Expo',
    ],
    votesCount: 14,
  },
  {
    id: 'cand-8',
    name: 'Isha Menon',
    photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    positionId: 'pos-4',
    positionName: 'Program Coordinator',
    position: 'Program Coordinator',
    department: 'Plus Two Commerce',
    manifesto: 'Balancing academic growth with vibrant campus culture. I will coordinate skill-building workshops, career expos, and inter-college competitions.',
    campaignMessage: 'Excellence in Event Execution!',
    achievements: [
      'Organized IAMS Commerce & Management Expo 2025',
      'Core Member of Cultural Steering Committee',
    ],
    votesCount: 14,
  },

  // General Captain Candidates
  {
    id: 'cand-9',
    name: 'Rohan Patel',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    positionId: 'pos-5',
    positionName: 'General Captain',
    position: 'General Captain',
    department: 'Plus Two Commerce',
    manifesto: 'Revitalizing IAMS sports and fitness culture! I will organize inter-department cricket and football leagues, upgrade campus sports equipment, and represent IAMS in state tournaments.',
    campaignMessage: 'Championing Athletics and Team Spirit for IAMS!',
    achievements: [
      'Captain of IAMS Cricket Team 2025',
      'Best Athlete Award - Annual Sports Meet',
    ],
    votesCount: 15,
  },
  {
    id: 'cand-10',
    name: 'Amina Gupta',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    positionId: 'pos-5',
    positionName: 'General Captain',
    position: 'General Captain',
    department: 'Digital Marketing',
    manifesto: 'Promoting health, athletic excellence, and sportsmanship for all students. I will establish a campus fitness club and annual indoor/outdoor athletic championship.',
    campaignMessage: 'Fitness, Discipline, and Victory together!',
    achievements: [
      'Gold Medalist in Badminton Championship 2025',
      'Organizer of IAMS Campus Fitness Marathon',
    ],
    votesCount: 13,
  },
];

// Sample Announcements
export const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Smart Campus Election 2026 Officially Declared',
    description: 'Voting for the IAMS Campus Student Council 2026 is officially open today across Business Management, Digital Marketing, and Plus Two Commerce departments. All 70 registered students are requested to cast their secure digital ballot.',
    date: 'August 6, 2026',
    priority: 'high',
    category: 'Notice',
  },
  {
    id: 'ann-2',
    title: 'Candidate Manifesto Debates & Department Verification',
    description: 'All 10 candidates across 5 positions (Chairman, Treasurer, Media Head, Program Coordinator, General Captain) have successfully verified their department credentials and manifestos. Review candidate profiles on the Candidates tab before casting your vote.',
    date: 'August 5, 2026',
    priority: 'medium',
    category: 'Rules',
  },
  {
    id: 'ann-3',
    title: 'Official Voting Rules & One-Vote Policy',
    description: 'Each student ID is authorized to vote exactly ONCE across all candidate positions. Votes are securely recorded in Cloud Firestore and cannot be altered once submitted.',
    date: 'August 4, 2026',
    priority: 'high',
    category: 'Rules',
  },
  {
    id: 'ann-4',
    title: 'Results Declaration Schedule',
    description: 'Official results will be published by the Election Admin immediately after voting closes. Detailed vote breakdown charts will become visible in the Results portal.',
    date: 'August 3, 2026',
    priority: 'low',
    category: 'Schedule',
  },
];

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
  totalStudentsCount: 70,
  soundEnabled: true,
  themeMode: 'light',
};
