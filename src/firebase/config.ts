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
      console.error('Firestore students listener error:', error);
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
  return onSnapshot(collection(db, 'candidates'), (snap) => {
    const list: any[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
    callback(list);
  });
};

export const saveCandidateToFirestore = async (candidate: any): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'candidates', candidate.id), candidate, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving candidate to Firestore:', err);
    return false;
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
  return onSnapshot(collection(db, 'positions'), (snap) => {
    const list: any[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
    callback(list);
  });
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
  return onSnapshot(collection(db, 'announcements'), (snap) => {
    const list: any[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
    callback(list);
  });
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
  return onSnapshot(doc(db, 'settings', 'current'), (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    }
  });
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
  return onSnapshot(collection(db, 'votes'), (snap) => {
    const list: any[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
    callback(list);
  });
};
