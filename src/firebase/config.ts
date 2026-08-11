// ============================================================
// SUPABASE BACKEND ADAPTER (REPLACING FIREBASE)
// ============================================================

import {
  fetchStudentsFromSupabase,
  fetchStudentByIdFromSupabase,
  listenToStudentsFromSupabase,
  checkExistingStudentIdsInSupabase,
  saveStudentsToSupabaseBatch,
  saveSingleStudentToSupabase,
  deleteStudentFromSupabase,
  markStudentVotedInSupabase,
  bulkGenerateSlipsInSupabase,
  listenToCandidatesFromSupabase,
  saveCandidateToSupabase,
  saveCandidatesToSupabaseBatch,
  deleteCandidateFromSupabase,
  listenToPositionsFromSupabase,
  savePositionToSupabase,
  deletePositionFromSupabase,
  listenToAnnouncementsFromSupabase,
  saveAnnouncementToSupabase,
  deleteAnnouncementFromSupabase,
  listenToSettingsFromSupabase,
  saveSettingsToSupabase,
  listenToVotesFromSupabase,
  isSupabaseConfigured,
  generatePasscode,
  generateSlipToken,
} from '../supabase/config';

export const isFirebaseConfigured = (): boolean => isSupabaseConfigured();

export const generateRandomPasscode = generatePasscode;
export { generateSlipToken };

export const fetchStudentsFromFirestore = fetchStudentsFromSupabase;
export const fetchStudentByIdFromFirestore = fetchStudentByIdFromSupabase;
export const listenToStudentsFromFirestore = listenToStudentsFromSupabase;
export const checkExistingStudentIdsInFirestore = checkExistingStudentIdsInSupabase;

export const saveStudentsToFirestoreBatch = async (students: any[]) => {
  const result = await saveStudentsToSupabaseBatch(students);
  return {
    savedCount: result.inserted + result.updated,
    failedCount: result.failed,
    failedRows: result.errors.map((e) => ({ studentId: e.studentId, reason: e.reason })),
  };
};

export const saveSingleStudentToFirestore = saveSingleStudentToSupabase;
export const deleteStudentFromFirestore = deleteStudentFromSupabase;

export const markStudentVotedInFirestore = async (
  studentId: string,
  voteRecords: any[]
) => {
  const candidateIds = voteRecords.map((v) => v.candidateId || v);
  return await markStudentVotedInSupabase(studentId, candidateIds);
};

export const generateAllStudentSlipsBatch = async (
  onProgress?: (current: number, total: number) => void,
  forceRegenerate: boolean = false
) => {
  const res = await bulkGenerateSlipsInSupabase();
  const students = await fetchStudentsFromSupabase();
  if (onProgress) onProgress(res.totalStudents, res.totalStudents);
  return {
    students,
    totalCount: res.totalStudents,
    updatedCount: res.generatedCount,
  };
};

export const listenToCandidatesFromFirestore = listenToCandidatesFromSupabase;
export const saveCandidateToFirestore = saveCandidateToSupabase;
export const saveCandidatesToFirestoreBatch = async (candidates: any[]) => {
  const success = await saveCandidatesToSupabaseBatch(candidates);
  return { saved: candidates.length, failed: success ? 0 : candidates.length };
};
export const deleteCandidateFromFirestore = deleteCandidateFromSupabase;

export const listenToPositionsFromFirestore = listenToPositionsFromSupabase;
export const savePositionToFirestore = savePositionToSupabase;
export const deletePositionFromFirestore = deletePositionFromSupabase;

export const listenToAnnouncementsFromFirestore = listenToAnnouncementsFromSupabase;
export const saveAnnouncementToFirestore = saveAnnouncementToSupabase;
export const deleteAnnouncementFromFirestore = deleteAnnouncementFromSupabase;

export const listenToSettingsFromFirestore = listenToSettingsFromSupabase;
export const saveSettingsToFirestore = saveSettingsToSupabase;

export const listenToVotesFromFirestore = listenToVotesFromSupabase;

export const cleanupMockDataFromFirestore = async (): Promise<void> => {
  // No-op for Supabase adapter
};
