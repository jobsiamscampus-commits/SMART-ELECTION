import { SupabaseClient } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Student,
  Candidate,
  Position,
  Announcement,
  ElectionSettings,
  VoteRecord,
} from '../types/election';

export { supabase, isSupabaseConfigured };

// Utility functions for passcodes & secure slip tokens
export const generatePasscode = (): string => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let passcode = '';
  for (let i = 0; i < 6; i++) {
    passcode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return passcode;
};

export const generateSlipToken = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = 'slip_';
  for (let i = 0; i < 20; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// ============================================================
// 1. STUDENTS SERVICE
// ============================================================

export const fetchStudentsFromSupabase = async (): Promise<Student[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('student_id', { ascending: true });

    if (error) {
      console.warn('Supabase fetchStudents warning:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((row) => ({
      id: row.student_id || row.id,
      studentId: row.student_id || row.id,
      name: row.name,
      department: row.department || row.class_name || 'General',
      semester: row.semester || row.division || '1',
      password: row.passcode || row.password || '',
      passcode: row.passcode || row.password || '',
      slipToken: row.slip_token || '',
      photo: row.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      hasVoted: Boolean(row.has_voted),
      votedAt: row.voted_at || undefined,
    }));
  } catch (err: any) {
    console.warn('Error in fetchStudentsFromSupabase:', err?.message || err);
    return [];
  }
};

export const fetchStudentByIdFromSupabase = async (
  studentIdOrToken: string
): Promise<Student | null> => {
  if (!supabase || !studentIdOrToken) return null;

  const cleanQuery = studentIdOrToken.trim();

  try {
    // 1. Direct match on students table (by student_id, id, slip_token)
    const { data: directMatch, error: directErr } = await supabase
      .from('students')
      .select('*')
      .or(`student_id.eq.${cleanQuery},slip_token.eq.${cleanQuery},id.eq.${cleanQuery}`)
      .limit(1);

    if (!directErr && directMatch && directMatch.length > 0) {
      const row = directMatch[0];
      return {
        id: row.student_id || row.id,
        studentId: row.student_id || row.id,
        name: row.name,
        department: row.department || row.class_name || 'General',
        semester: row.semester || row.division || '1',
        password: row.passcode || row.password || '',
        passcode: row.passcode || row.password || '',
        slipToken: row.slip_token || '',
        photo: row.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        hasVoted: Boolean(row.has_voted),
        votedAt: row.voted_at || undefined,
      };
    }

    // 2. Query election_slips table by secure_token
    const { data: slipMatch } = await supabase
      .from('election_slips')
      .select('student_code')
      .eq('secure_token', cleanQuery)
      .limit(1);

    if (slipMatch && slipMatch.length > 0 && slipMatch[0].student_code) {
      const targetStudentId = slipMatch[0].student_code;
      const { data: studentFromSlip } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', targetStudentId)
        .limit(1);

      if (studentFromSlip && studentFromSlip.length > 0) {
        const row = studentFromSlip[0];
        return {
          id: row.student_id || row.id,
          studentId: row.student_id || row.id,
          name: row.name,
          department: row.department || row.class_name || 'General',
          semester: row.semester || row.division || '1',
          password: row.passcode || row.password || '',
          passcode: row.passcode || row.password || '',
          slipToken: row.slip_token || cleanQuery,
          photo: row.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          hasVoted: Boolean(row.has_voted),
          votedAt: row.voted_at || undefined,
        };
      }
    }

    return null;
  } catch (err: any) {
    console.warn('Error in fetchStudentByIdFromSupabase:', err?.message || err);
    return null;
  }
};

export const listenToStudentsFromSupabase = (
  callback: (students: Student[]) => void,
  onError?: (error: any) => void
) => {
  if (!supabase) return () => {};

  let active = true;

  // Initial Fetch
  fetchStudentsFromSupabase().then((data) => {
    if (active) callback(data);
  });

  // Realtime Listener
  const channel = supabase
    .channel('public:students')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'students' },
      () => {
        fetchStudentsFromSupabase().then((data) => {
          if (active) callback(data);
        });
      }
    )
    .subscribe((status, err) => {
      if (err && onError) {
        onError(err);
      }
    });

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
};

export const checkExistingStudentIdsInSupabase = async (): Promise<Set<string>> => {
  if (!supabase) return new Set();

  try {
    const { data, error } = await supabase
      .from('students')
      .select('student_id');

    if (error || !data) return new Set();

    const existing = new Set<string>();
    data.forEach((row) => {
      if (row.student_id) existing.add(row.student_id);
    });
    return existing;
  } catch (err: any) {
    console.warn('Error in checkExistingStudentIdsInSupabase:', err?.message || err);
    return new Set();
  }
};

export const saveStudentsToSupabaseBatch = async (
  studentsList: Student[]
): Promise<{
  success: boolean;
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ studentId: string; name: string; reason: string }>;
}> => {
  if (!supabase || studentsList.length === 0) {
    return { success: true, inserted: 0, updated: 0, failed: 0, errors: [] };
  }

  let inserted = 0;
  let updated = 0;
  let failed = 0;
  const errors: Array<{ studentId: string; name: string; reason: string }> = [];

  try {
    // 1. Fetch existing students to preserve passcodes and tokens
    const studentIds = studentsList.map((s) => s.studentId || s.id).filter(Boolean);
    const { data: existingData } = await supabase
      .from('students')
      .select('student_id, passcode, slip_token, has_voted')
      .in('student_id', studentIds);

    const existingMap = new Map<string, any>();
    if (existingData) {
      existingData.forEach((row) => {
        existingMap.set(row.student_id, row);
      });
    }

    // 2. Prepare payload rows for UPSERT
    const rowsToUpsert = studentsList.map((st) => {
      const sid = st.studentId || st.id;
      const existing = existingMap.get(sid);

      const passcode = existing?.passcode || st.passcode || st.password || generatePasscode();
      const slipToken = existing?.slip_token || st.slipToken || generateSlipToken();
      const hasVoted = existing ? Boolean(existing.has_voted) : Boolean(st.hasVoted);

      if (existing) {
        updated++;
      } else {
        inserted++;
      }

      return {
        student_id: sid,
        name: st.name.trim(),
        department: st.department || 'General',
        semester: String(st.semester || '1'),
        passcode: passcode,
        slip_token: slipToken,
        has_voted: hasVoted,
        updated_at: new Date().toISOString(),
      };
    });

    // 3. Perform upsert in batches of 100
    const chunkSize = 100;
    for (let i = 0; i < rowsToUpsert.length; i += chunkSize) {
      const chunk = rowsToUpsert.slice(i, i + chunkSize);
      const { error: upsertErr } = await supabase
        .from('students')
        .upsert(chunk, { onConflict: 'student_id' });

      if (upsertErr) {
        console.warn('Batch upsert error in Supabase students:', upsertErr.message);
        failed += chunk.length;
        chunk.forEach((c) => {
          errors.push({
            studentId: c.student_id,
            name: c.name,
            reason: upsertErr.message,
          });
        });
      } else {
        // Create election_slips records
        const slipsRows = chunk.map((c) => ({
          student_code: c.student_id,
          secure_token: c.slip_token,
          passcode: c.passcode,
          is_active: true,
        }));
        await supabase
          .from('election_slips')
          .upsert(slipsRows, { onConflict: 'secure_token' });
      }
    }

    return {
      success: failed === 0,
      inserted,
      updated,
      failed,
      errors,
    };
  } catch (err: any) {
    console.warn('Error in saveStudentsToSupabaseBatch:', err?.message || err);
    return {
      success: false,
      inserted,
      updated,
      failed: studentsList.length,
      errors: [{ studentId: 'batch', name: 'Batch', reason: err?.message || 'Database error' }],
    };
  }
};

export const saveSingleStudentToSupabase = async (student: Student): Promise<boolean> => {
  if (!supabase) return false;

  const sid = student.studentId || student.id;
  const passcode = student.passcode || student.password || generatePasscode();
  const slipToken = student.slipToken || generateSlipToken();

  try {
    const { error } = await supabase
      .from('students')
      .upsert(
        {
          student_id: sid,
          name: student.name.trim(),
          department: student.department || 'General',
          semester: String(student.semester || '1'),
          passcode: passcode,
          slip_token: slipToken,
          has_voted: Boolean(student.hasVoted),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id' }
      );

    if (error) {
      console.warn('Error saving single student to Supabase:', error.message);
      return false;
    }

    // Save election slip
    await supabase.from('election_slips').upsert(
      {
        student_code: sid,
        secure_token: slipToken,
        passcode: passcode,
        is_active: true,
      },
      { onConflict: 'secure_token' }
    );

    return true;
  } catch (err: any) {
    console.warn('Error in saveSingleStudentToSupabase:', err?.message || err);
    return false;
  }
};

export const deleteStudentFromSupabase = async (studentId: string): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .or(`student_id.eq.${studentId},id.eq.${studentId}`);

    if (error) {
      console.warn('Error deleting student from Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn('Error in deleteStudentFromSupabase:', err?.message || err);
    return false;
  }
};

export const markStudentVotedInSupabase = async (
  studentId: string,
  candidateIds: string[] | string,
  electionId: string = 'election-2026'
): Promise<{ success: boolean; message: string }> => {
  if (!supabase) {
    return { success: false, message: 'Supabase is not configured.' };
  }

  const cleanStudentId = studentId.trim();

  try {
    // 1. Check if student exists and has voted
    const { data: studentRows, error: studentErr } = await supabase
      .from('students')
      .select('*')
      .or(`student_id.eq.${cleanStudentId},id.eq.${cleanStudentId}`)
      .limit(1);

    if (studentErr || !studentRows || studentRows.length === 0) {
      return { success: false, message: 'Student record not found in Supabase database.' };
    }

    const studentRow = studentRows[0];
    if (studentRow.has_voted) {
      return { success: false, message: 'Student has already submitted a ballot in this election.' };
    }

    // 2. Check unique constraint in votes table
    const { data: existingVotes } = await supabase
      .from('votes')
      .select('id')
      .eq('election_id', electionId)
      .eq('student_id', studentRow.student_id);

    if (existingVotes && existingVotes.length > 0) {
      return { success: false, message: 'A ballot record already exists for this student.' };
    }

    // 3. Record vote in votes table
    const candidatesArray = Array.isArray(candidateIds) ? candidateIds : [candidateIds];
    const voteEntries = candidatesArray.map((candId) => ({
      election_id: electionId,
      student_id: studentRow.student_id,
      candidate_id: candId,
      created_at: new Date().toISOString(),
    }));

    const { error: voteInsertErr } = await supabase
      .from('votes')
      .insert(voteEntries);

    if (voteInsertErr) {
      if (voteInsertErr.message.includes('unique') || voteInsertErr.code === '23505') {
        return { success: false, message: 'Student has already voted (duplicate vote prevented by database).' };
      }
      console.warn('Vote insert error:', voteInsertErr.message);
    }

    // 4. Update student voting status
    const { error: updateStudentErr } = await supabase
      .from('students')
      .update({
        has_voted: true,
        voted_at: new Date().toISOString(),
      })
      .eq('student_id', studentRow.student_id);

    if (updateStudentErr) {
      console.warn('Error updating student has_voted:', updateStudentErr.message);
    }

    // 5. Increment votes_count on candidates
    for (const candId of candidatesArray) {
      const { data: candData } = await supabase
        .from('candidates')
        .select('votes_count')
        .or(`candidate_id.eq.${candId},id.eq.${candId}`)
        .limit(1);

      if (candData && candData.length > 0) {
        const currentCount = candData[0].votes_count || 0;
        await supabase
          .from('candidates')
          .update({ votes_count: currentCount + 1 })
          .or(`candidate_id.eq.${candId},id.eq.${candId}`);
      }
    }

    return { success: true, message: 'Vote successfully recorded in Supabase database.' };
  } catch (err: any) {
    console.warn('Error in markStudentVotedInSupabase:', err?.message || err);
    return { success: false, message: err?.message || 'Failed to submit vote to Supabase.' };
  }
};

export const bulkGenerateSlipsInSupabase = async (): Promise<{
  success: boolean;
  generatedCount: number;
  totalStudents: number;
}> => {
  if (!supabase) return { success: false, generatedCount: 0, totalStudents: 0 };

  try {
    const students = await fetchStudentsFromSupabase();
    let generatedCount = 0;

    for (const st of students) {
      const sid = st.studentId || st.id;
      let passcode = st.passcode || st.password;
      let slipToken = st.slipToken;
      let needsUpdate = false;

      if (!passcode) {
        passcode = generatePasscode();
        needsUpdate = true;
      }
      if (!slipToken) {
        slipToken = generateSlipToken();
        needsUpdate = true;
      }

      if (needsUpdate) {
        generatedCount++;
        await supabase
          .from('students')
          .update({
            passcode: passcode,
            slip_token: slipToken,
          })
          .eq('student_id', sid);

        await supabase
          .from('election_slips')
          .upsert(
            {
              student_code: sid,
              secure_token: slipToken,
              passcode: passcode,
              is_active: true,
            },
            { onConflict: 'secure_token' }
          );
      }
    }

    return {
      success: true,
      generatedCount,
      totalStudents: students.length,
    };
  } catch (err: any) {
    console.warn('Error in bulkGenerateSlipsInSupabase:', err?.message || err);
    return { success: false, generatedCount: 0, totalStudents: 0 };
  }
};

// ============================================================
// 2. CANDIDATES SERVICE
// ============================================================

export const fetchCandidatesFromSupabase = async (): Promise<Candidate[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.candidate_id || row.id,
      candidateId: row.candidate_id || row.id,
      name: row.name,
      photo: row.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      photoUrl: row.photo_url || '',
      positionId: row.position_id || 'pos-1',
      positionName: row.position_name || row.position || 'Council Member',
      position: row.position || row.position_name || 'Council Member',
      department: row.department || 'General',
      manifesto: row.manifesto || '',
      campaignMessage: row.campaign_message || '',
      achievements: Array.isArray(row.achievements)
        ? row.achievements
        : typeof row.achievements === 'string'
        ? JSON.parse(row.achievements)
        : [],
      votesCount: row.votes_count || 0,
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err: any) {
    console.warn('Error in fetchCandidatesFromSupabase:', err?.message || err);
    return [];
  }
};

export const listenToCandidatesFromSupabase = (
  callback: (candidates: Candidate[]) => void
) => {
  if (!supabase) return () => {};

  let active = true;

  fetchCandidatesFromSupabase().then((data) => {
    if (active) callback(data);
  });

  const channel = supabase
    .channel('public:candidates')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'candidates' },
      () => {
        fetchCandidatesFromSupabase().then((data) => {
          if (active) callback(data);
        });
      }
    )
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
};

export const saveCandidateToSupabase = async (candidate: Candidate): Promise<boolean> => {
  if (!supabase) return false;

  const cid = candidate.candidateId || candidate.id || `CAND_${Date.now()}`;

  try {
    const payload = {
      candidate_id: cid,
      name: candidate.name.trim(),
      position_id: candidate.positionId || 'pos-1',
      position_name: candidate.positionName || candidate.position || 'Council Member',
      position: candidate.position || candidate.positionName || 'Council Member',
      department: candidate.department || 'General',
      manifesto: candidate.manifesto || '',
      campaign_message: candidate.campaignMessage || '',
      photo_url: candidate.photoUrl || candidate.photo || '',
      achievements: candidate.achievements || [],
      votes_count: candidate.votesCount || 0,
      is_active: candidate.isActive !== false,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('candidates')
      .upsert(payload, { onConflict: 'candidate_id' });

    if (error) {
      console.warn('Error saving candidate to Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn('Error in saveCandidateToSupabase:', err?.message || err);
    return false;
  }
};

export const saveCandidatesToSupabaseBatch = async (
  candidatesList: Candidate[]
): Promise<boolean> => {
  if (!supabase || candidatesList.length === 0) return true;

  try {
    const rows = candidatesList.map((cand) => ({
      candidate_id: cand.candidateId || cand.id || `CAND_${Date.now()}_${Math.random()}`,
      name: cand.name.trim(),
      position_id: cand.positionId || 'pos-1',
      position_name: cand.positionName || cand.position || 'Council Member',
      position: cand.position || cand.positionName || 'Council Member',
      department: cand.department || 'General',
      manifesto: cand.manifesto || '',
      campaign_message: cand.campaignMessage || '',
      photo_url: cand.photoUrl || cand.photo || '',
      achievements: cand.achievements || [],
      votes_count: cand.votesCount || 0,
      is_active: cand.isActive !== false,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('candidates')
      .upsert(rows, { onConflict: 'candidate_id' });

    if (error) {
      console.warn('Batch candidate upsert error:', error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn('Error in saveCandidatesToSupabaseBatch:', err?.message || err);
    return false;
  }
};

export const deleteCandidateFromSupabase = async (candidateId: string): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .or(`candidate_id.eq.${candidateId},id.eq.${candidateId}`);

    if (error) {
      console.warn('Error deleting candidate from Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn('Error in deleteCandidateFromSupabase:', err?.message || err);
    return false;
  }
};

// ============================================================
// 3. POSITIONS SERVICE
// ============================================================

export const fetchPositionsFromSupabase = async (): Promise<Position[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .order('display_order', { ascending: true });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      displayOrder: row.display_order || 1,
    }));
  } catch (err: any) {
    console.warn('Error in fetchPositionsFromSupabase:', err?.message || err);
    return [];
  }
};

export const listenToPositionsFromSupabase = (
  callback: (positions: Position[]) => void
) => {
  if (!supabase) return () => {};

  let active = true;

  fetchPositionsFromSupabase().then((data) => {
    if (active) callback(data);
  });

  const channel = supabase
    .channel('public:positions')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'positions' },
      () => {
        fetchPositionsFromSupabase().then((data) => {
          if (active) callback(data);
        });
      }
    )
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
};

export const savePositionToSupabase = async (position: Position): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('positions')
      .upsert(
        {
          id: position.id,
          title: position.title,
          description: position.description || '',
          display_order: position.displayOrder || 1,
        },
        { onConflict: 'id' }
      );

    return !error;
  } catch (err: any) {
    console.warn('Error in savePositionToSupabase:', err?.message || err);
    return false;
  }
};

export const deletePositionFromSupabase = async (positionId: string): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('positions').delete().eq('id', positionId);
    return !error;
  } catch (err: any) {
    console.warn('Error in deletePositionFromSupabase:', err?.message || err);
    return false;
  }
};

// ============================================================
// 4. ANNOUNCEMENTS SERVICE
// ============================================================

export const fetchAnnouncementsFromSupabase = async (): Promise<Announcement[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.announcement_id || row.id,
      title: row.title,
      description: row.description || row.content || '',
      date: row.date || new Date(row.created_at).toLocaleDateString(),
      priority: row.priority || 'normal',
      category: row.category || 'Notice',
    }));
  } catch (err: any) {
    console.warn('Error in fetchAnnouncementsFromSupabase:', err?.message || err);
    return [];
  }
};

export const listenToAnnouncementsFromSupabase = (
  callback: (announcements: Announcement[]) => void
) => {
  if (!supabase) return () => {};

  let active = true;

  fetchAnnouncementsFromSupabase().then((data) => {
    if (active) callback(data);
  });

  const channel = supabase
    .channel('public:announcements')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'announcements' },
      () => {
        fetchAnnouncementsFromSupabase().then((data) => {
          if (active) callback(data);
        });
      }
    )
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
};

export const saveAnnouncementToSupabase = async (
  announcement: Announcement
): Promise<boolean> => {
  if (!supabase) return false;

  const aid = announcement.id || `ANN_${Date.now()}`;

  try {
    const { error } = await supabase
      .from('announcements')
      .upsert(
        {
          announcement_id: aid,
          title: announcement.title,
          description: announcement.description,
          content: announcement.description,
          date: announcement.date,
          priority: announcement.priority,
          category: announcement.category,
        },
        { onConflict: 'announcement_id' }
      );

    return !error;
  } catch (err: any) {
    console.warn('Error in saveAnnouncementToSupabase:', err?.message || err);
    return false;
  }
};

export const deleteAnnouncementFromSupabase = async (
  announcementId: string
): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .or(`announcement_id.eq.${announcementId},id.eq.${announcementId}`);

    return !error;
  } catch (err: any) {
    console.warn('Error in deleteAnnouncementFromSupabase:', err?.message || err);
    return false;
  }
};

// ============================================================
// 5. SETTINGS / ELECTIONS SERVICE
// ============================================================

export const fetchSettingsFromSupabase = async (): Promise<ElectionSettings | null> => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('elections')
      .select('*')
      .eq('election_id', 'election-2026')
      .limit(1);

    if (error || !data || data.length === 0) return null;

    const row = data[0];
    const settingsJson = row.settings_json || {};

    return {
      collegeName: row.college_name || settingsJson.collegeName || 'IAMS Campus',
      collegeLogo: settingsJson.collegeLogo || '🎓',
      electionName: row.name || settingsJson.electionName || 'Smart Campus Election 2026',
      electionDate: settingsJson.electionDate || '2026-08-06',
      votingStartTime: settingsJson.votingStartTime || '09:00 AM',
      votingEndTime: settingsJson.votingEndTime || '05:00 PM',
      votingOpen: row.voting_open !== false,
      resultPublished: Boolean(row.result_published),
      totalStudentsCount: settingsJson.totalStudentsCount || 0,
      soundEnabled: settingsJson.soundEnabled !== false,
      themeMode: settingsJson.themeMode || 'light',
    };
  } catch (err: any) {
    console.warn('Error in fetchSettingsFromSupabase:', err?.message || err);
    return null;
  }
};

export const listenToSettingsFromSupabase = (
  callback: (settings: ElectionSettings) => void
) => {
  if (!supabase) return () => {};

  let active = true;

  fetchSettingsFromSupabase().then((data) => {
    if (active && data) callback(data);
  });

  const channel = supabase
    .channel('public:elections')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'elections' },
      () => {
        fetchSettingsFromSupabase().then((data) => {
          if (active && data) callback(data);
        });
      }
    )
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
};

export const saveSettingsToSupabase = async (
  settings: ElectionSettings
): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('elections').upsert(
      {
        election_id: 'election-2026',
        name: settings.electionName || 'Smart Campus Election 2026',
        college_name: settings.collegeName || 'IAMS Campus',
        voting_open: Boolean(settings.votingOpen),
        result_published: Boolean(settings.resultPublished),
        settings_json: settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'election_id' }
    );

    return !error;
  } catch (err: any) {
    console.warn('Error in saveSettingsToSupabase:', err?.message || err);
    return false;
  }
};

// ============================================================
// 6. VOTES SERVICE
// ============================================================

export const fetchVotesFromSupabase = async (): Promise<VoteRecord[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      studentId: row.student_id,
      candidateId: row.candidate_id,
      positionId: row.position_id || '',
      timestamp: row.created_at,
    }));
  } catch (err: any) {
    console.warn('Error in fetchVotesFromSupabase:', err?.message || err);
    return [];
  }
};

export const listenToVotesFromSupabase = (
  callback: (votes: VoteRecord[]) => void
) => {
  if (!supabase) return () => {};

  let active = true;

  fetchVotesFromSupabase().then((data) => {
    if (active) callback(data);
  });

  const channel = supabase
    .channel('public:votes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'votes' },
      () => {
        fetchVotesFromSupabase().then((data) => {
          if (active) callback(data);
        });
      }
    )
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
};

// ============================================================
// 7. SUPABASE STORAGE FILE UPLOAD HELPERS
// ============================================================

export const uploadCandidatePhotoToSupabase = async (
  fileOrBase64: File | string,
  candidateId: string
): Promise<string> => {
  if (!supabase) return typeof fileOrBase64 === 'string' ? fileOrBase64 : '';

  try {
    const fileName = `${candidateId}_${Date.now()}.jpg`;

    let fileBody: File | Blob;
    if (typeof fileOrBase64 === 'string') {
      if (fileOrBase64.startsWith('data:')) {
        const response = await fetch(fileOrBase64);
        fileBody = await response.blob();
      } else {
        return fileOrBase64; // Already a URL
      }
    } else {
      fileBody = fileOrBase64;
    }

    const { data, error } = await supabase.storage
      .from('candidate-photos')
      .upload(fileName, fileBody, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.warn('Storage upload error:', error.message);
      return typeof fileOrBase64 === 'string' ? fileOrBase64 : '';
    }

    const { data: publicData } = supabase.storage
      .from('candidate-photos')
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  } catch (err: any) {
    console.warn('Error uploading candidate photo to Supabase:', err?.message || err);
    return typeof fileOrBase64 === 'string' ? fileOrBase64 : '';
  }
};

export const uploadSelfieToSupabase = async (
  fileOrBase64: File | string,
  studentId: string
): Promise<string> => {
  if (!supabase) return typeof fileOrBase64 === 'string' ? fileOrBase64 : '';

  try {
    const fileName = `selfie_${studentId}_${Date.now()}.jpg`;

    let fileBody: File | Blob;
    if (typeof fileOrBase64 === 'string') {
      if (fileOrBase64.startsWith('data:')) {
        const response = await fetch(fileOrBase64);
        fileBody = await response.blob();
      } else {
        return fileOrBase64;
      }
    } else {
      fileBody = fileOrBase64;
    }

    const { data, error } = await supabase.storage
      .from('student-selfies')
      .upload(fileName, fileBody, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.warn('Storage selfie upload error:', error.message);
      return typeof fileOrBase64 === 'string' ? fileOrBase64 : '';
    }

    const { data: publicData } = supabase.storage
      .from('student-selfies')
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  } catch (err: any) {
    console.warn('Error uploading selfie to Supabase:', err?.message || err);
    return typeof fileOrBase64 === 'string' ? fileOrBase64 : '';
  }
};
