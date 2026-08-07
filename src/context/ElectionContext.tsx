import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Student,
  Candidate,
  Position,
  VoteRecord,
  Announcement,
  ElectionSettings,
  AdminUser,
  UserRole,
} from '../types/election';
import {
  generateSampleStudents,
  DEFAULT_POSITIONS,
  DEFAULT_CANDIDATES,
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_SETTINGS,
} from '../utils/sampleData';
import { playSound } from '../utils/sound';
import {
  fetchStudentsFromFirestore,
  listenToStudentsFromFirestore,
  saveSingleStudentToFirestore,
  deleteStudentFromFirestore,
  markStudentVotedInFirestore,
  saveStudentsToFirestoreBatch,
} from '../firebase/config';

interface ElectionContextType {
  // Session & UI Navigation
  currentUser: Student | AdminUser | null;
  userRole: UserRole;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  splashVisible: boolean;
  setSplashVisible: (visible: boolean) => void;

  // App Settings & Preferences
  settings: ElectionSettings;
  updateSettings: (newSettings: Partial<ElectionSettings>) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;

  // Core Datasets
  students: Student[];
  candidates: Candidate[];
  positions: Position[];
  votes: VoteRecord[];
  announcements: Announcement[];

  // Authentication Actions
  loginStudent: (studentId: string, pass?: string) => { success: boolean; message: string };
  verifyStudent: (nameInput: string, studentIdInput: string) => { success: boolean; message: string; student?: Student };
  loginAdmin: (email: string, pass: string) => { success: boolean; message: string };
  logout: () => void;

  // Student Voting Action
  castBallot: (selectedCandidates: Record<string, string>) => { success: boolean; message: string };

  // Admin Actions
  openVoting: () => void;
  closeVoting: () => void;
  publishResults: () => void;
  unpublishResults: () => void;
  resetElection: () => void;

  // Student CRUD
  addStudent: (student: Omit<Student, 'hasVoted'>) => void;
  bulkAddStudents: (newStudents: Student[]) => void;
  updateStudent: (studentId: string, updated: Partial<Student>) => void;
  deleteStudent: (studentId: string) => void;
  resetStudentVoteStatus: (studentId: string) => void;
  reloadStudentsFromFirestore: () => Promise<Student[]>;

  // Candidate CRUD
  addCandidate: (candidate: Omit<Candidate, 'id' | 'votesCount'>) => void;
  updateCandidate: (candidateId: string, updated: Partial<Candidate>) => void;
  deleteCandidate: (candidateId: string) => void;

  // Position CRUD
  addPosition: (pos: Omit<Position, 'id'>) => void;
  deletePosition: (positionId: string) => void;

  // Announcement CRUD
  addAnnouncement: (announcement: Omit<Announcement, 'id'>) => void;
  deleteAnnouncement: (announcementId: string) => void;

  // Utility helpers
  getWinnerForPosition: (positionId: string) => Candidate | null;
  getCandidatesByPosition: (positionId: string) => Candidate[];
}

const ElectionContext = createContext<ElectionContextType | undefined>(undefined);

const STORAGE_KEYS = {
  STUDENTS: 'iams_election_students_v4',
  CANDIDATES: 'iams_election_candidates_v4',
  POSITIONS: 'iams_election_positions_v4',
  VOTES: 'iams_election_votes_v4',
  ANNOUNCEMENTS: 'iams_election_announcements_v4',
  SETTINGS: 'iams_election_settings_v4',
  USER_ROLE: 'iams_election_user_role_v4',
  CURRENT_USER: 'iams_election_current_user_v4',
  SOUND_ENABLED: 'iams_election_sound_enabled_v4',
  DARK_MODE: 'iams_election_dark_mode_v4',
};

export const ElectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Splash & Nav State
  const [splashVisible, setSplashVisible] = useState(true);
  const [activeTab, setActiveTab] = useState('home');

  // Preferences
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    return saved !== null ? JSON.parse(saved) : false;
  });

  // Settings State
  const [settings, setSettings] = useState<ElectionSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Students Dataset (70 default)
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return saved ? JSON.parse(saved) : generateSampleStudents();
  });

  // Positions Dataset (Automatically filters out Vice Chairman and Secretary)
  const [positions, setPositions] = useState<Position[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.POSITIONS);
    if (saved) {
      try {
        const parsed: Position[] = JSON.parse(saved);
        const cleaned = parsed.filter(
          (p) =>
            p.title.toLowerCase() !== 'vice chairman' &&
            p.title.toLowerCase() !== 'secretary'
        );
        if (cleaned.length > 0) return cleaned;
      } catch (e) {
        // Fallback to defaults if JSON parse fails
      }
    }
    return DEFAULT_POSITIONS;
  });

  // Candidates Dataset (Automatically filters out candidates assigned to Vice Chairman or Secretary)
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CANDIDATES);
    if (saved) {
      try {
        const parsed: Candidate[] = JSON.parse(saved);
        const cleaned = parsed.filter((c) => {
          const posName = (c.positionName || c.position || '').toLowerCase();
          return posName !== 'vice chairman' && posName !== 'secretary';
        });
        if (cleaned.length > 0) return cleaned;
      } catch (e) {
        // Fallback to defaults if JSON parse fails
      }
    }
    return DEFAULT_CANDIDATES;
  });

  // Votes Records Dataset
  const [votes, setVotes] = useState<VoteRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VOTES);
    return saved ? JSON.parse(saved) : [];
  });

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
    return saved ? JSON.parse(saved) : DEFAULT_ANNOUNCEMENTS;
  });

  // Auth User Session State
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
    return (saved as UserRole) || 'student';
  });

  const [currentUser, setCurrentUser] = useState<Student | AdminUser | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Default to first student (Aarav Sharma - IAMS-2026-001) for instant testability
    const sampleSt = generateSampleStudents();
    return sampleSt[0];
  });

  // Persist State to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(candidates));
  }, [candidates]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(votes));
  }, [votes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (userRole) {
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, userRole);
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    }
  }, [userRole]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  // Real-time Cloud Firestore Listener for permanent Student roster sync
  useEffect(() => {
    const unsubscribe = listenToStudentsFromFirestore((firestoreStudents) => {
      if (firestoreStudents && firestoreStudents.length > 0) {
        setStudents(firestoreStudents);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const reloadStudentsFromFirestore = async (): Promise<Student[]> => {
    const fresh = await fetchStudentsFromFirestore();
    if (fresh && fresh.length > 0) {
      setStudents(fresh);
    }
    return fresh;
  };

  // Preferences Toggles
  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    playSound('button_click', enabled);
  };

  const setDarkMode = (dark: boolean) => {
    setDarkModeState(dark);
    playSound('button_click', soundEnabled);
  };

  const updateSettings = (newSettings: Partial<ElectionSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Auth Operations
  const verifyStudent = (
    nameInput: string,
    studentIdInput: string
  ): { success: boolean; message: string; student?: Student } => {
    const cleanName = nameInput.trim();
    const cleanId = studentIdInput.trim();

    if (!cleanName || !cleanId) {
      playSound('error', soundEnabled);
      return {
        success: false,
        message: 'Both Student Name and Student ID are required.',
      };
    }

    const searchId = cleanId.toUpperCase();
    const searchIdNoHyphen = searchId.replace(/[^A-Z0-9]/g, '');

    // 1. Check if Student ID exists in students collection
    const foundStudent = students.find((s) => {
      const sId = (s.id || '').toUpperCase();
      const sCode = (s.studentId || '').toUpperCase();
      const sIdNoHyphen = sId.replace(/[^A-Z0-9]/g, '');
      const sCodeNoHyphen = sCode.replace(/[^A-Z0-9]/g, '');

      return (
        sId === searchId ||
        sCode === searchId ||
        (sIdNoHyphen.length > 0 && sIdNoHyphen === searchIdNoHyphen) ||
        (sCodeNoHyphen.length > 0 && sCodeNoHyphen === searchIdNoHyphen)
      );
    });

    if (!foundStudent) {
      playSound('error', soundEnabled);
      return {
        success: false,
        message: 'Student ID not found. Please check your ID.',
      };
    }

    // 2. Check if Student Name matches
    const registeredName = foundStudent.name.trim().toLowerCase();
    const enteredName = cleanName.toLowerCase();

    if (registeredName !== enteredName) {
      playSound('error', soundEnabled);
      return {
        success: false,
        message: 'Name and Student ID do not match.',
      };
    }

    // 3. Check if student has already voted
    if (foundStudent.hasVoted) {
      playSound('error', soundEnabled);
      return {
        success: false,
        message: 'Your vote has already been submitted.',
      };
    }

    // Authentication Success
    setCurrentUser(foundStudent);
    setUserRole('student');
    playSound('success', soundEnabled);

    return {
      success: true,
      message: `Welcome, ${foundStudent.name}`,
      student: foundStudent,
    };
  };

  const loginStudent = (studentId: string, pass = 'student123') => {
    const cleanId = studentId.trim().toUpperCase();
    const found = students.find((s) => s.id.toUpperCase() === cleanId);

    if (!found) {
      playSound('error', soundEnabled);
      return { success: false, message: `Student ID "${studentId}" not found in IAMS records.` };
    }

    if (found.password && found.password !== pass) {
      playSound('error', soundEnabled);
      return { success: false, message: 'Invalid password. Default is "student123".' };
    }

    setCurrentUser(found);
    setUserRole('student');
    setActiveTab('home');
    playSound('success', soundEnabled);
    return { success: true, message: `Welcome back, ${found.name}!` };
  };

  const loginAdmin = (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (
      cleanEmail === 'admin@iamscampus.edu' ||
      cleanEmail === 'jobsiamscampus@gmail.com' ||
      cleanEmail === 'admin'
    ) {
      if (pass === 'admin123' || pass === 'admin') {
        const adminUser: AdminUser = {
          email: cleanEmail,
          name: 'IAMS Election Administrator',
          role: 'super_admin',
        };
        setCurrentUser(adminUser);
        setUserRole('admin');
        setActiveTab('admin');
        playSound('success', soundEnabled);
        return { success: true, message: 'Admin authenticated successfully.' };
      }
    }
    playSound('error', soundEnabled);
    return { success: false, message: 'Invalid Admin credentials. (Default: admin / admin123)' };
  };

  const logout = () => {
    playSound('button_click', soundEnabled);
    setCurrentUser(null);
    setUserRole(null);
    setActiveTab('home');
  };

  // Student Cast Ballot Function (Supports per-position choices)
  const castBallot = (selectedCandidates: Record<string, string>) => {
    if (userRole !== 'student' || !currentUser) {
      playSound('error', soundEnabled);
      return { success: false, message: 'Only logged-in students can cast votes.' };
    }

    const studentObj = currentUser as Student;

    if (studentObj.hasVoted) {
      playSound('error', soundEnabled);
      return { success: false, message: 'You have already voted! Each student is allowed only one ballot.' };
    }

    if (!settings.votingOpen) {
      playSound('error', soundEnabled);
      return { success: false, message: 'Voting is currently closed by the Election Admin.' };
    }

    const timestamp = new Date().toISOString();
    const newVoteRecords: VoteRecord[] = [];

    // Create vote record for each position candidate selected
    Object.entries(selectedCandidates).forEach(([positionId, candidateId]) => {
      newVoteRecords.push({
        id: `vote-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        studentId: studentObj.id,
        candidateId,
        positionId,
        timestamp,
      });
    });

    // 1. Update Votes state
    setVotes((prev) => [...prev, ...newVoteRecords]);

    // 2. Increment vote counts on Candidates
    setCandidates((prev) =>
      prev.map((cand) => {
        const votesReceived = newVoteRecords.filter((v) => v.candidateId === cand.id).length;
        if (votesReceived > 0) {
          return {
            ...cand,
            votesCount: (cand.votesCount || 0) + votesReceived,
          };
        }
        return cand;
      })
    );

    // 3. Mark Student as voted
    const updatedStudent: Student = {
      ...studentObj,
      hasVoted: true,
      votedAt: timestamp,
    };

    setStudents((prev) => prev.map((st) => (st.id === studentObj.id ? updatedStudent : st)));
    setCurrentUser(updatedStudent);

    // Save ballot and mark student voted in Cloud Firestore
    markStudentVotedInFirestore(studentObj.id, newVoteRecords);

    // Play EVM Confirmation Sound Beep!
    playSound('vote_success', soundEnabled);

    return { success: true, message: '🎉 Your vote has been successfully recorded in Firestore!' };
  };

  // Admin Election State Operations
  const openVoting = () => {
    playSound('button_click', soundEnabled);
    setSettings((prev) => ({ ...prev, votingOpen: true }));
  };

  const closeVoting = () => {
    playSound('button_click', soundEnabled);
    setSettings((prev) => ({ ...prev, votingOpen: false }));
  };

  const publishResults = () => {
    playSound('success', soundEnabled);
    setSettings((prev) => ({ ...prev, resultPublished: true }));
  };

  const unpublishResults = () => {
    playSound('button_click', soundEnabled);
    setSettings((prev) => ({ ...prev, resultPublished: false }));
  };

  const resetElection = () => {
    playSound('button_click', soundEnabled);
    // Reset votes, student voted statuses, and candidate counts
    setVotes([]);
    setStudents((prev) => prev.map((s) => ({ ...s, hasVoted: false, votedAt: undefined })));
    setCandidates((prev) => prev.map((c) => ({ ...c, votesCount: 0 })));
    setSettings((prev) => ({ ...prev, votingOpen: true, resultPublished: false }));

    if (currentUser && 'hasVoted' in currentUser) {
      setCurrentUser({ ...(currentUser as Student), hasVoted: false, votedAt: undefined });
    }
  };

  // Student Management Operations
  const addStudent = (studentData: Omit<Student, 'hasVoted'>) => {
    playSound('success', soundEnabled);
    const newStudent: Student = {
      ...studentData,
      hasVoted: false,
    };
    setStudents((prev) => [newStudent, ...prev]);
    saveSingleStudentToFirestore(newStudent);
  };

  const bulkAddStudents = (newStudentsList: Student[]) => {
    playSound('success', soundEnabled);
    setStudents((prev) => {
      // Filter out any IDs already existing just in case
      const existingIds = new Set(prev.map((s) => s.id.toUpperCase()));
      const filteredNew = newStudentsList.filter((s) => !existingIds.has(s.id.toUpperCase()));
      return [...filteredNew, ...prev];
    });
    // Write all to Firestore in batch
    saveStudentsToFirestoreBatch(
      newStudentsList.map((s) => ({
        studentId: s.studentId || s.id,
        name: s.name,
        department: s.department,
        password: s.password,
        photo: s.photo,
        hasVoted: s.hasVoted,
        semester: s.semester,
      }))
    );
  };

  const updateStudent = (studentId: string, updated: Partial<Student>) => {
    playSound('button_click', soundEnabled);
    setStudents((prev) => {
      const next = prev.map((s) => (s.id === studentId ? { ...s, ...updated } : s));
      const target = next.find((s) => s.id === studentId);
      if (target) {
        saveSingleStudentToFirestore(target);
      }
      return next;
    });
  };

  const deleteStudent = (studentId: string) => {
    playSound('button_click', soundEnabled);
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    deleteStudentFromFirestore(studentId);
  };

  const resetStudentVoteStatus = (studentId: string) => {
    playSound('button_click', soundEnabled);
    setStudents((prev) => {
      const next = prev.map((s) => (s.id === studentId ? { ...s, hasVoted: false, votedAt: undefined } : s));
      const target = next.find((s) => s.id === studentId);
      if (target) {
        saveSingleStudentToFirestore(target);
      }
      return next;
    });
    // Remove student's votes
    setVotes((prev) => prev.filter((v) => v.studentId !== studentId));
  };

  // Candidate Management Operations
  const addCandidate = (candData: Omit<Candidate, 'id' | 'votesCount'>) => {
    playSound('success', soundEnabled);
    const newCand: Candidate = {
      ...candData,
      id: `cand-${Date.now()}`,
      votesCount: 0,
    };
    setCandidates((prev) => [...prev, newCand]);
  };

  const updateCandidate = (candidateId: string, updated: Partial<Candidate>) => {
    playSound('button_click', soundEnabled);
    setCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, ...updated } : c)));
  };

  const deleteCandidate = (candidateId: string) => {
    playSound('button_click', soundEnabled);
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
  };

  // Positions Operations
  const addPosition = (posData: Omit<Position, 'id'>) => {
    playSound('success', soundEnabled);
    const newPos: Position = {
      ...posData,
      id: `pos-${Date.now()}`,
    };
    setPositions((prev) => [...prev, newPos]);
  };

  const deletePosition = (positionId: string) => {
    playSound('button_click', soundEnabled);
    setPositions((prev) => prev.filter((p) => p.id !== positionId));
  };

  // Announcements Operations
  const addAnnouncement = (annData: Omit<Announcement, 'id'>) => {
    playSound('success', soundEnabled);
    const newAnn: Announcement = {
      ...annData,
      id: `ann-${Date.now()}`,
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
  };

  const deleteAnnouncement = (announcementId: string) => {
    playSound('button_click', soundEnabled);
    setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
  };

  // Helpers
  const getCandidatesByPosition = (positionId: string) => {
    return candidates.filter((c) => c.positionId === positionId);
  };

  const getWinnerForPosition = (positionId: string): Candidate | null => {
    const cands = getCandidatesByPosition(positionId);
    if (cands.length === 0) return null;

    let winner = cands[0];
    cands.forEach((c) => {
      if ((c.votesCount || 0) > (winner.votesCount || 0)) {
        winner = c;
      }
    });

    return (winner.votesCount || 0) > 0 ? winner : null;
  };

  return (
    <ElectionContext.Provider
      value={{
        currentUser,
        userRole,
        activeTab,
        setActiveTab,
        splashVisible,
        setSplashVisible,
        settings,
        updateSettings,
        soundEnabled,
        setSoundEnabled,
        darkMode,
        setDarkMode,
        students,
        candidates,
        positions,
        votes,
        announcements,
        loginStudent,
        verifyStudent,
        loginAdmin,
        logout,
        castBallot,
        openVoting,
        closeVoting,
        publishResults,
        unpublishResults,
        resetElection,
        addStudent,
        bulkAddStudents,
        updateStudent,
        deleteStudent,
        resetStudentVoteStatus,
        reloadStudentsFromFirestore,
        addCandidate,
        updateCandidate,
        deleteCandidate,
        addPosition,
        deletePosition,
        addAnnouncement,
        deleteAnnouncement,
        getWinnerForPosition,
        getCandidatesByPosition,
      }}
    >
      {children}
    </ElectionContext.Provider>
  );
};

export const useElection = () => {
  const context = useContext(ElectionContext);
  if (!context) {
    throw new Error('useElection must be used within an ElectionProvider');
  }
  return context;
};
