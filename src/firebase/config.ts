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
      // Document ID MUST be the student's unique Student ID
      const docId = student.studentId.trim();
      const docRef = doc(db, 'students', docId);

      const docData = {
        studentId: student.studentId,
        name: student.name,
        department: student.department,
        semester: student.semester || 2,
        password: student.password || '123456',
        photo: student.photo || '',
        hasVoted: Boolean(student.hasVoted),
        createdAt: serverTimestamp(),
      };

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
          await setDoc(docRef, {
            studentId: student.studentId,
            name: student.name,
            department: student.department,
            semester: student.semester || 2,
            password: student.password || '123456',
            photo: student.photo || '',
            hasVoted: Boolean(student.hasVoted),
            createdAt: serverTimestamp(),
          }, { merge: true });
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
    await setDoc(
      docRef,
      {
        studentId: student.studentId || student.id,
        name: student.name,
        department: student.department,
        semester: student.semester || 2,
        password: student.password || '123456',
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
 * Mark student as voted and save ballot in Firestore
 */
export const markStudentVotedInFirestore = async (
  studentId: string,
  voteRecords: VoteRecord[]
): Promise<boolean> => {
  try {
    const batch = writeBatch(db);
    const studentRef = doc(db, 'students', studentId.trim());
    batch.update(studentRef, {
      hasVoted: true,
      votedAt: new Date().toISOString(),
    });

    voteRecords.forEach((vote) => {
      const voteRef = doc(db, 'votes', vote.id);
      batch.set(voteRef, {
        studentId: vote.studentId,
        candidateId: vote.candidateId,
        positionId: vote.positionId,
        timestamp: vote.timestamp,
      });
    });

    await batch.commit();
    return true;
  } catch (err) {
    console.error('Error marking student voted in Firestore:', err);
    return false;
  }
};
