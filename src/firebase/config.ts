import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';
import { Student, VoteRecord } from '../types/election';

export const firebaseConfig = firebaseAppletConfig;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(
  app,
  firebaseAppletConfig.firestoreDatabaseId || '(default)'
);

export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig && firebaseConfig.projectId);
};

export const generateRandomPasscode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
};

export const generateSlipToken = (studentId: string): string => {
  const cleanId = studentId.replace(/[^a-zA-Z0-9]/g, '');
  const randHex = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `SLIP-${cleanId}-${randHex}`;
};

/**
 * Fetch all student documents directly from Firestore
 */
export const fetchStudentsFromFirestore = async (): Promise<Student[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'students'));
    const students: Student[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const studentIdVal = data.studentId || docSnap.id;
      students.push({
        id: docSnap.id,
        studentId: studentIdVal,
        name: data.name || '',
        department: data.department || '',
        semester: data.semester || 2,
        password: data.password || '123456',
        passcode: data.passcode || undefined,
        slipToken: data.slipToken || undefined,
        photo: data.photo || '',
        hasVoted: Boolean(data.hasVoted),
        votedAt: data.votedAt || undefined,
      });
    });
    return students;
  } catch (error) {
    console.error('Error fetching students from Firestore:', error);
    return [];
  }
};

/**
 * Fetch a single student document by ID, studentId, or slipToken directly from Firestore
 */
export const fetchStudentByIdFromFirestore = async (studentIdOrToken: string): Promise<Student | null> => {
  if (!studentIdOrToken || !studentIdOrToken.trim()) return null;
  const cleanKey = studentIdOrToken.trim();

  try {
    // 1. Direct doc lookup by ID
    const docRef = doc(db, 'students', cleanKey);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const studentIdVal = data.studentId || docSnap.id;
      return {
        id: docSnap.id,
        studentId: studentIdVal,
        name: data.name || '',
        department: data.department || '',
        semester: data.semester || 2,
        password: data.password || '123456',
        passcode: data.passcode || undefined,
        slipToken: data.slipToken || undefined,
        photo: data.photo || '',
        hasVoted: Boolean(data.hasVoted),
        votedAt: data.votedAt || undefined,
      };
    }

    // 2. Query all students from Firestore and match by token, ID, or studentId
    const allStudents = await fetchStudentsFromFirestore();
    const cleanUpper = cleanKey.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const found = allStudents.find((s) => {
      if (s.slipToken && s.slipToken === cleanKey) return true;
      const sIdUpper = (s.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const sCodeUpper = (s.studentId || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      return sIdUpper === cleanUpper || sCodeUpper === cleanUpper;
    });

    return found || null;
  } catch (error) {
    console.error('Error fetching student by ID from Firestore:', error);
    return null;
  }
};

/**
 * Real-time listener for Firestore `students` collection
 */
export const listenToStudentsFromFirestore = (
  callback: (students: Student[]) => void,
  onError?: (error: any) => void
) => {
  if (!isFirebaseConfigured() || !db) return () => {};

  return onSnapshot(
    collection(db, 'students'),
    (snapshot) => {
      const students: Student[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const studentIdVal = data.studentId || docSnap.id;
        students.push({
          id: docSnap.id,
          studentId: studentIdVal,
          name: data.name || '',
          department: data.department || '',
          semester: data.semester || 2,
          password: data.password || '123456',
          passcode: data.passcode || undefined,
          slipToken: data.slipToken || undefined,
          photo: data.photo || '',
          hasVoted: Boolean(data.hasVoted),
          votedAt: data.votedAt || undefined,
        });
      });
      callback(students);
    },
    (error) => {
      console.warn('Firestore students listener status:', error?.message || error);
      if (onError) onError(error);
    }
  );
};

/**
 * Query existing student IDs from Firestore to prevent overwriting
 */
export const checkExistingStudentIdsInFirestore = async (): Promise<Set<string>> => {
  const existingSet = new Set<string>();
  try {
    const snapshot = await getDocs(collection(db, 'students'));
    snapshot.forEach((docSnap) => {
      const docId = docSnap.id.toUpperCase();
      const stId = (docSnap.data().studentId || '').toUpperCase();
      existingSet.add(docId);
      if (stId) existingSet.add(stId);
    });
  } catch (err) {
    console.error('Error checking existing student IDs in Firestore:', err);
  }
  return existingSet;
};

export interface SaveBatchResult {
  success: boolean;
  savedCount: number;
  failedCount: number;
  failedRows: Array<{
    rowNumber?: number;
    studentId: string;
    reason: string;
  }>;
}

/**
 * Batch write students to Firestore collection `students/{studentId}`
 */
export const saveStudentsToFirestoreBatch = async (
  studentsList: Array<{
    rowNumber?: number;
    studentId: string;
    name: string;
    department: string;
    password?: string;
    passcode?: string;
    slipToken?: string;
    photo?: string;
    hasVoted?: boolean;
    semester?: number;
  }>
): Promise<SaveBatchResult> => {
  let savedCount = 0;
  let failedCount = 0;
  const failedRows: Array<{ rowNumber?: number; studentId: string; reason: string }> = [];

  const BATCH_SIZE = 100;

  for (let i = 0; i < studentsList.length; i += BATCH_SIZE) {
    const chunk = studentsList.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((student) => {
      const docId = student.studentId.trim();
      const docRef = doc(db, 'students', docId);

      const passcode = student.passcode || generateRandomPasscode();
      const slipToken = student.slipToken || generateSlipToken(student.studentId);

      const docData: Record<string, any> = {
        studentId: student.studentId,
        name: student.name,
        department: student.department,
        semester: student.semester || 2,
        password: student.password || '123456',
        passcode,
        slipToken,
        photo: student.photo || '',
        createdAt: serverTimestamp(),
      };

      if (student.hasVoted !== undefined) {
        docData.hasVoted = Boolean(student.hasVoted);
      }

      batch.set(docRef, docData, { merge: true });
    });

    try {
      await batch.commit();
      savedCount += chunk.length;
    } catch (err: any) {
      console.error('Firestore batch commit failed, attempting row-by-row fallback:', err);
      for (const student of chunk) {
        try {
          const docId = student.studentId.trim();
          const docRef = doc(db, 'students', docId);
          const passcode = student.passcode || generateRandomPasscode();
          const slipToken = student.slipToken || generateSlipToken(student.studentId);

          await setDoc(
            docRef,
            {
              studentId: student.studentId,
              name: student.name,
              department: student.department,
              semester: student.semester || 2,
              password: student.password || '123456',
              passcode,
              slipToken,
              photo: student.photo || '',
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
          savedCount += 1;
        } catch (singleErr: any) {
          failedCount += 1;
          failedRows.push({
            rowNumber: student.rowNumber,
            studentId: student.studentId,
            reason: singleErr?.message || 'Firestore permission denied or network error',
          });
        }
      }
    }
  }

  return {
    success: failedCount === 0,
    savedCount,
    failedCount,
    failedRows,
  };
};

/**
 * Save single student document to Firestore
 */
export const saveSingleStudentToFirestore = async (student: Student): Promise<boolean> => {
  try {
    const docId = (student.studentId || student.id).trim();
    const docRef = doc(db, 'students', docId);
    const passcode = student.passcode || generateRandomPasscode();
    const slipToken = student.slipToken || generateSlipToken(docId);

    await setDoc(
      docRef,
      {
        studentId: student.studentId || student.id,
        name: student.name,
        department: student.department,
        semester: student.semester || 2,
        password: student.password || '123456',
        passcode,
        slipToken,
        photo: student.photo || '',
        hasVoted: Boolean(student.hasVoted),
        votedAt: student.votedAt || null,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('Error saving single student to Firestore:', err);
    return false;
  }
};

/**
 * Delete student document from Firestore
 */
export const deleteStudentFromFirestore = async (studentId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, 'students', studentId.trim());
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Error deleting student from Firestore:', err);
    return false;
  }
};

/**
 * Mark student as voted and save ballot in Firestore atomically via Transaction
 */
export const markStudentVotedInFirestore = async (
  studentId: string,
  voteRecords: VoteRecord[]
): Promise<{ success: boolean; message?: string }> => {
  try {
    const cleanId = studentId.trim();
    const studentRef = doc(db, 'students', cleanId);

    await runTransaction(db, async (transaction) => {
      const studentSnap = await transaction.get(studentRef);
      if (!studentSnap.exists()) {
        throw new Error('Student record not found in Cloud Firestore.');
      }

      const data = studentSnap.data();
      if (data.hasVoted === true) {
        throw new Error('This student has already voted!');
      }

      // 1. Atomically mark student as voted
      transaction.update(studentRef, {
        hasVoted: true,
        votedAt: new Date().toISOString(),
      });

      // 2. Atomically write vote records
      voteRecords.forEach((vote) => {
        const voteRef = doc(db, 'votes', vote.id);
        transaction.set(voteRef, {
          studentId: vote.studentId,
          candidateId: vote.candidateId,
          positionId: vote.positionId,
          timestamp: vote.timestamp,
        });
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error('Transaction error in markStudentVotedInFirestore:', err);
    return { success: false, message: err?.message || 'Failed to submit vote to Firestore.' };
  }
};

/**
 * Bulk generate unique Election Slips & Passcodes for all students directly in Firestore.
 * - Preserves existing valid tokens/passcodes to prevent link invalidation.
 * - Progress callback reports (current, total).
 */
export const generateAllStudentSlipsBatch = async (
  onProgress?: (current: number, total: number) => void,
  forceRegenerate: boolean = false
): Promise<{ totalCount: number; updatedCount: number; students: Student[] }> => {
  const allStudents = await fetchStudentsFromFirestore();
  const totalCount = allStudents.length;

  if (totalCount === 0) {
    return { totalCount: 0, updatedCount: 0, students: [] };
  }

  const updatedStudents: Student[] = [];
  let updatedCount = 0;
  let processed = 0;

  const BATCH_SIZE = 100;

  // Generate tokens/passcodes for students missing them or if forceRegenerate is true
  const studentUpdates = allStudents.map((st) => {
    let passcode = st.passcode;
    let slipToken = st.slipToken;
    let needsUpdate = false;

    if (!passcode || forceRegenerate) {
      // 6-character secure uppercase passcode
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      passcode = Array.from({ length: 6 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
      needsUpdate = true;
    }

    if (!slipToken || forceRegenerate) {
      const cleanId = (st.studentId || st.id).replace(/[^a-zA-Z0-9]/g, '');
      const randHex = Math.random().toString(36).substring(2, 9).toUpperCase();
      slipToken = `SLIP-${cleanId}-${randHex}`;
      needsUpdate = true;
    }

    const updatedSt: Student = {
      ...st,
      passcode,
      slipToken,
    };

    return {
      updatedSt,
      needsUpdate,
    };
  });

  // Batch commit to Firestore
  for (let i = 0; i < studentUpdates.length; i += BATCH_SIZE) {
    const chunk = studentUpdates.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    chunk.forEach(({ updatedSt, needsUpdate }) => {
      if (needsUpdate) {
        const docId = (updatedSt.studentId || updatedSt.id).trim();
        const docRef = doc(db, 'students', docId);
        batch.set(
          docRef,
          {
            passcode: updatedSt.passcode,
            slipToken: updatedSt.slipToken,
          },
          { merge: true }
        );
        updatedCount++;
      }
    });

    try {
      await batch.commit();
    } catch (err) {
      console.error('Batch commit error in generateAllStudentSlipsBatch:', err);
      // Fallback to single doc set
      for (const { updatedSt, needsUpdate } of chunk) {
        if (needsUpdate) {
          try {
            const docId = (updatedSt.studentId || updatedSt.id).trim();
            const docRef = doc(db, 'students', docId);
            await setDoc(docRef, { passcode: updatedSt.passcode, slipToken: updatedSt.slipToken }, { merge: true });
          } catch (singleErr) {
            console.error(`Error saving token for student ${updatedSt.id}:`, singleErr);
          }
        }
      }
    }

    processed += chunk.length;
    if (onProgress) {
      onProgress(processed, totalCount);
    }
  }

  // Populate list
  studentUpdates.forEach(({ updatedSt }) => updatedStudents.push(updatedSt));

  return {
    totalCount,
    updatedCount,
    students: updatedStudents,
  };
};

/**
 * Candidates Firestore Listeners & Helpers
 */
export const listenToCandidatesFromFirestore = (
  callback: (candidates: any[]) => void
) => {
  if (!isFirebaseConfigured() || !db) return () => {};

  return onSnapshot(
    collection(db, 'candidates'),
    (snap) => {
      const map = new Map<string, any>();

      snap.forEach((d) => {
        const data = d.data();
        const docId = d.id;
        const candidateIdVal = (data.candidateId || docId).trim();
        const candItem = { id: docId, candidateId: candidateIdVal, ...data };

        const candIdKey = candidateIdVal.toUpperCase();
        const normNameKey = `${(data.name || '').trim().toLowerCase().replace(/\s+/g, ' ')};${data.positionId || ''}`;

        let existingKeyToReplace: string | null = null;
        let isDuplicate = false;

        for (const [key, existing] of map.entries()) {
          const existingCandIdKey = (existing.candidateId || existing.id).toUpperCase().trim();
          const existingNameKey = `${(existing.name || '').trim().toLowerCase().replace(/\s+/g, ' ')};${existing.positionId || ''}`;

          if (candIdKey === existingCandIdKey || (normNameKey === existingNameKey && data.name)) {
            isDuplicate = true;
            // Prefer standard document ID format (e.g., C001) or higher votesCount
            const isNewDocCleanId = docId.match(/^C\d{3,}$/i) || candidateIdVal.match(/^C\d{3,}$/i);
            const isExistingCleanId = existing.id.match(/^C\d{3,}$/i) || existing.candidateId.match(/^C\d{3,}$/i);

            if (isNewDocCleanId && !isExistingCleanId) {
              existingKeyToReplace = key;
            } else if (!isNewDocCleanId && isExistingCleanId) {
              // Keep existing
            } else if ((data.votesCount || 0) > (existing.votesCount || 0)) {
              existingKeyToReplace = key;
            }
            break;
          }
        }

        if (existingKeyToReplace) {
          map.delete(existingKeyToReplace);
          map.set(docId, candItem);
        } else if (!isDuplicate) {
          map.set(docId, candItem);
        }
      });

      callback(Array.from(map.values()));
    },
    (error) => {
      console.warn('Firestore candidates listener status:', error?.message || error);
    }
  );
};

export const saveCandidateToFirestore = async (candidate: any): Promise<boolean> => {
  if (!isFirebaseConfigured() || !db) return false;

  try {
    const rawId = (candidate.candidateId || candidate.id || '').trim();
    const cleanName = (candidate.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const docId = rawId || `CAND-${cleanName || Date.now()}`;

    const docRef = doc(db, 'candidates', docId);

    const docData: Record<string, any> = {
      id: docId,
      candidateId: docId,
      name: (candidate.name || '').trim(),
      photo: candidate.photo || candidate.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      photoUrl: candidate.photoUrl || candidate.photo || '',
      positionId: candidate.positionId || 'pos-1',
      positionName: candidate.positionName || candidate.position || 'Council Member',
      position: candidate.position || candidate.positionName || 'Council Member',
      department: candidate.department || 'Business Management',
      manifesto: candidate.manifesto || '',
      campaignMessage: candidate.campaignMessage || `Vote for ${candidate.name}!`,
      achievements: Array.isArray(candidate.achievements) ? candidate.achievements : [],
      votesCount: candidate.votesCount !== undefined ? candidate.votesCount : 0,
      isActive: candidate.isActive !== undefined ? candidate.isActive : true,
      updatedAt: serverTimestamp(),
    };

    if (candidate.createdAt) {
      docData.createdAt = candidate.createdAt;
    }

    await setDoc(docRef, docData, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving candidate to Firestore:', err);
    return false;
  }
};

export const saveCandidatesToFirestoreBatch = async (
  candidatesList: any[]
): Promise<{ saved: number; failed: number }> => {
  if (!isFirebaseConfigured() || !db) return { saved: 0, failed: 0 };

  try {
    const batch = writeBatch(db);
    let savedCount = 0;

    candidatesList.forEach((cand) => {
      const rawId = (cand.candidateId || cand.id || '').trim();
      const cleanName = (cand.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const docId = rawId || `CAND-${cleanName || Date.now()}`;

      const docRef = doc(db, 'candidates', docId);

      const docData: Record<string, any> = {
        id: docId,
        candidateId: docId,
        name: (cand.name || '').trim(),
        photo: cand.photo || cand.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        photoUrl: cand.photoUrl || cand.photo || '',
        positionId: cand.positionId || 'pos-1',
        positionName: cand.positionName || cand.position || 'Council Member',
        position: cand.position || cand.positionName || 'Council Member',
        department: cand.department || 'Business Management',
        manifesto: cand.manifesto || '',
        campaignMessage: cand.campaignMessage || `Vote for ${cand.name}!`,
        achievements: Array.isArray(cand.achievements) ? cand.achievements : [],
        votesCount: cand.votesCount !== undefined ? cand.votesCount : 0,
        isActive: cand.isActive !== undefined ? cand.isActive : true,
        updatedAt: serverTimestamp(),
      };

      if (cand.createdAt) {
        docData.createdAt = cand.createdAt;
      }

      batch.set(docRef, docData, { merge: true });
      savedCount += 1;
    });

    await batch.commit();
    return { saved: savedCount, failed: 0 };
  } catch (err) {
    console.error('Error saving candidates batch to Firestore:', err);
    return { saved: 0, failed: candidatesList.length };
  }
};

export const deleteCandidateFromFirestore = async (candidateId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'candidates', candidateId));
    return true;
  } catch (err) {
    console.error('Error deleting candidate from Firestore:', err);
    return false;
  }
};

/**
 * Positions Firestore Listeners & Helpers
 */
export const listenToPositionsFromFirestore = (
  callback: (positions: any[]) => void
) => {
  if (!isFirebaseConfigured() || !db) return () => {};

  return onSnapshot(
    collection(db, 'positions'),
    (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      callback(list);
    },
    (error) => {
      console.warn('Firestore positions listener status:', error?.message || error);
    }
  );
};

export const savePositionToFirestore = async (position: any): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'positions', position.id), position, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving position to Firestore:', err);
    return false;
  }
};

export const deletePositionFromFirestore = async (positionId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'positions', positionId));
    return true;
  } catch (err) {
    console.error('Error deleting position from Firestore:', err);
    return false;
  }
};

/**
 * Announcements Firestore Listeners & Helpers
 */
export const listenToAnnouncementsFromFirestore = (
  callback: (announcements: any[]) => void
) => {
  if (!isFirebaseConfigured() || !db) return () => {};

  return onSnapshot(
    collection(db, 'announcements'),
    (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      callback(list);
    },
    (error) => {
      console.warn('Firestore announcements listener status:', error?.message || error);
    }
  );
};

export const saveAnnouncementToFirestore = async (announcement: any): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'announcements', announcement.id), announcement, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving announcement to Firestore:', err);
    return false;
  }
};

export const deleteAnnouncementFromFirestore = async (announcementId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'announcements', announcementId));
    return true;
  } catch (err) {
    console.error('Error deleting announcement from Firestore:', err);
    return false;
  }
};

/**
 * Settings Firestore Listeners & Helpers
 */
export const listenToSettingsFromFirestore = (
  callback: (settings: any) => void
) => {
  if (!isFirebaseConfigured() || !db) return () => {};

  return onSnapshot(
    doc(db, 'settings', 'current'),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      }
    },
    (error) => {
      console.warn('Firestore settings listener status:', error?.message || error);
    }
  );
};

export const saveSettingsToFirestore = async (settings: any): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'settings', 'current'), settings, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving settings to Firestore:', err);
    return false;
  }
};

/**
 * Votes Firestore Listener
 */
export const listenToVotesFromFirestore = (
  callback: (votes: any[]) => void
) => {
  if (!isFirebaseConfigured() || !db) return () => {};

  return onSnapshot(
    collection(db, 'votes'),
    (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      callback(list);
    },
    (error) => {
      console.warn('Firestore votes listener status:', error?.message || error);
    }
  );
};

/**
 * Remove any mock/demo students and candidates from Firestore
 */
export const cleanupMockDataFromFirestore = async (): Promise<void> => {
  if (!isFirebaseConfigured() || !db) return;
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('mock_data_cleaned') === 'true') {
    return;
  }

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('mock_data_cleaned', 'true');
    }

    // 1. Clean Mock Candidates AND Duplicate Candidates from Firestore
    const candidatesSnap = await getDocs(collection(db, 'candidates'));
    const mockCandIds = new Set(['cand-1', 'cand-2', 'cand-3', 'cand-4', 'cand-5', 'cand-6', 'cand-7', 'cand-8', 'cand-9', 'cand-10']);
    const mockCandNames = new Set([
      'rohan menon', 'ananya verma', 'vikram rao', 'diya malhotra',
      'karan saxena', 'kavya nair', 'arjun iyer', 'isha menon',
      'rohan patel', 'amina gupta', 'demo candidate', 'sample candidate', 'test candidate', 'fake candidate'
    ]);

    const candidatesByGroup = new Map<string, Array<{ docId: string; data: any }>>();

    for (const d of candidatesSnap.docs) {
      const data = d.data();
      const docId = d.id;
      const docIdLower = docId.toLowerCase();
      const nameClean = (data.name || '').trim().toLowerCase().replace(/\s+/g, ' ');

      const isMock =
        mockCandIds.has(docIdLower) ||
        mockCandNames.has(nameClean) ||
        nameClean.includes('demo candidate') ||
        nameClean.includes('sample candidate') ||
        nameClean.includes('test candidate') ||
        nameClean.includes('fake candidate');

      if (isMock) {
        try {
          await deleteDoc(doc(db, 'candidates', docId));
          console.log(`[Cleanup] Removed mock candidate: ${docId} (${data.name})`);
        } catch (e) {
          console.error(`Failed to delete mock candidate ${docId}:`, e);
        }
        continue;
      }

      // Group candidate documents by candidate ID or by normalized name + positionId
      const candidateIdVal = (data.candidateId || '').trim();
      const groupKey = (candidateIdVal && !candidateIdVal.startsWith('cand-17'))
        ? candidateIdVal.toUpperCase()
        : `${nameClean}_${data.positionId || ''}`;

      if (!candidatesByGroup.has(groupKey)) {
        candidatesByGroup.set(groupKey, []);
      }
      candidatesByGroup.get(groupKey)!.push({ docId, data });
    }

    // Delete duplicate candidate records, keeping the primary valid record
    for (const [groupKey, group] of candidatesByGroup.entries()) {
      if (group.length > 1) {
        // Sort group to pick the best primary document to keep
        group.sort((a, b) => {
          const aIsCleanId = a.docId.match(/^C\d{3,}$/i) || (a.data.candidateId && a.data.candidateId.match(/^C\d{3,}$/i));
          const bIsCleanId = b.docId.match(/^C\d{3,}$/i) || (b.data.candidateId && b.data.candidateId.match(/^C\d{3,}$/i));
          if (aIsCleanId && !bIsCleanId) return -1;
          if (!aIsCleanId && bIsCleanId) return 1;

          const aVotes = a.data.votesCount || 0;
          const bVotes = b.data.votesCount || 0;
          return bVotes - aVotes;
        });

        const primaryDoc = group[0];
        const duplicates = group.slice(1);

        for (const dup of duplicates) {
          try {
            await deleteDoc(doc(db, 'candidates', dup.docId));
            console.log(`[Cleanup] Removed duplicate candidate document: ${dup.docId} (Kept primary: ${primaryDoc.docId} for ${primaryDoc.data.name})`);
          } catch (e) {
            console.error(`Failed to delete duplicate candidate ${dup.docId}:`, e);
          }
        }
      }
    }

    // 2. Clean Mock Students from Firestore
    const studentsSnap = await getDocs(collection(db, 'students'));
    const mockStudentNames = new Set([
      'aarav sharma', 'demo student', 'test student', 'sample student',
      'john doe', 'jane doe', 'example student', 'dummy student'
    ]);
    const mockStudentIds = new Set(['iams-2026-001', 'demo-1', 'test-1']);

    studentsSnap.forEach(async (d) => {
      const data = d.data();
      const docId = d.id.toLowerCase();
      const studentIdVal = (data.studentId || '').toLowerCase().trim();
      const name = (data.name || '').toLowerCase().trim();

      const isMock =
        mockStudentIds.has(docId) ||
        mockStudentIds.has(studentIdVal) ||
        mockStudentNames.has(name) ||
        name.includes('demo student') ||
        name.includes('sample student') ||
        name.includes('test student') ||
        name.includes('dummy student') ||
        name.includes('aarav sharma') ||
        name.includes('john doe') ||
        name.includes('jane doe');

      if (isMock) {
        try {
          await deleteDoc(doc(db, 'students', d.id));
          console.log(`[Cleanup] Removed mock student: ${d.id} (${data.name})`);
        } catch (e) {
          console.error(`Failed to delete mock student ${d.id}:`, e);
        }
      }
    });
  } catch (err: any) {
    console.warn('Firestore cleanup skipped (quota limit or network):', err?.message || err);
  }
};

