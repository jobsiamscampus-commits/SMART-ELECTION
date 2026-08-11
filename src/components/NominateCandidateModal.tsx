import React, { useState, useRef } from 'react';
import { useElection } from '../context/ElectionContext';
import { Position, IAMS_DEPARTMENTS, IAMSDepartment, Candidate } from '../types/election';
import {
  Upload,
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Sparkles,
  FileText,
  Award,
  Megaphone,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';

interface NominateCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NominateCandidateModal: React.FC<NominateCandidateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { positions, candidates, addCandidate } = useElection();

  // Form State
  const defaultCandId = `C${String(candidates.length + 1).padStart(3, '0')}`;
  const [candidateIdInput, setCandidateIdInput] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [selectedPositionId, setSelectedPositionId] = useState<string>(
    positions[0]?.id || 'pos-1'
  );
  const [selectedDepartment, setSelectedDepartment] = useState<string>(IAMS_DEPARTMENTS[0]);
  const [manifesto, setManifesto] = useState('');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [achievementsText, setAchievementsText] = useState('');

  // Photo & Upload State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [photoError, setPhotoError] = useState<string>('');

  // Submit & Loading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isSubmittingRef = useRef(false);

  if (!isOpen) return null;

  // Handle Photo Selection
  const handlePhotoSelect = (file: File) => {
    setPhotoError('');

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setPhotoError('Invalid file type. Please upload a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    // Check file size (5 MB limit)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      setPhotoError('File size exceeds 5 MB limit. Please select a smaller photo.');
      return;
    }

    setPhotoFile(file);

    // Create image preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPhotoPreviewUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreviewUrl('');
    setPhotoError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Form Submission with Double-Click Protection
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhotoError('');

    // PREVENT DOUBLE-CLICK / RAPID REPEATED SUBMISSION
    if (isSubmittingRef.current || isUploading) {
      return;
    }

    // MANDATORY PHOTO VALIDATION
    if (!photoPreviewUrl) {
      setPhotoError('Please select a candidate photo.');
      return;
    }

    if (!candidateName.trim()) {
      alert('Please enter Candidate Name.');
      return;
    }

    if (!manifesto.trim()) {
      alert('Please provide a manifesto.');
      return;
    }

    // Synchronously lock submission immediately
    isSubmittingRef.current = true;
    setIsUploading(true);
    setUploadProgress(20);

    try {
      const posObj = positions.find((p) => p.id === selectedPositionId);
      const posTitle = posObj ? posObj.title : 'Council Member';

      // Check if candidate already exists in state/Firestore
      const userEnteredId = candidateIdInput.trim().toUpperCase();
      const normInputName = candidateName.trim().toLowerCase().replace(/\s+/g, ' ');

      const existingCand = candidates.find((c) => {
        if (userEnteredId && (c.candidateId?.toUpperCase() === userEnteredId || c.id?.toUpperCase() === userEnteredId)) {
          return true;
        }
        const normExistingName = (c.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
        return normExistingName === normInputName && c.positionId === selectedPositionId;
      });

      const candidateId = existingCand
        ? (existingCand.candidateId || existingCand.id)
        : (userEnteredId || defaultCandId);

      setUploadProgress(60);
      const firebaseStoragePath = `candidate_photos/${candidateId}.jpg`;
      setUploadProgress(100);

      const achievementsList = achievementsText
        .split('\n')
        .map((a) => a.trim())
        .filter(Boolean);

      const newCandidateObj: Omit<Candidate, 'id' | 'votesCount'> & { candidateId: string } = {
        candidateId,
        name: candidateName.trim(),
        photo: photoPreviewUrl,
        photoUrl: photoPreviewUrl,
        positionId: selectedPositionId,
        positionName: posTitle,
        position: posTitle,
        department: selectedDepartment,
        manifesto: manifesto.trim(),
        campaignMessage: campaignMessage.trim() || `Vote for ${candidateName.trim()} for ${posTitle}!`,
        achievements: achievementsList.length > 0 ? achievementsList : [`Representative candidate for ${selectedDepartment}`],
        createdAt: new Date().toISOString(),
      };

      await addCandidate(newCandidateObj);

      setIsUploading(false);
      setSuccessToast(
        `✔ Candidate "${candidateName.trim()}" (${candidateId}) saved successfully in Cloud Firestore!`
      );

      setTimeout(() => {
        setSuccessToast(null);
        isSubmittingRef.current = false;
        onClose();
        // Reset form
        setCandidateIdInput('');
        setCandidateName('');
        setManifesto('');
        setCampaignMessage('');
        setAchievementsText('');
        setPhotoFile(null);
        setPhotoPreviewUrl('');
      }, 1000);
    } catch (err) {
      console.error('Error submitting candidate:', err);
      setIsUploading(false);
      isSubmittingRef.current = false;
      alert('Failed to save candidate to Firestore. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden transition-all">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Nominate Candidate</h2>
              <p className="text-xs text-slate-300">
                Official Student Council Election Nomination
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast Banner */}
        {successToast && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-slide-down">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* PHOTO UPLOAD CARD (Rounded 18px / 2xl card) */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Candidate Photo <span className="text-rose-500">* (Required)</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Max 5 MB (JPG, PNG, WEBP)</span>
            </label>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`p-6 rounded-[18px] border-2 border-dashed text-center transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 scale-[1.01]'
                  : photoError
                  ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                  : 'border-slate-300 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:border-blue-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg, image/jpg, image/png, image/webp"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handlePhotoSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {/* State 1: No Photo Uploaded yet */}
              {!photoPreviewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer space-y-3"
                >
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner border border-blue-200 dark:border-blue-800">
                    <Camera className="w-8 h-8" />
                  </div>

                  <div>
                    <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                      Upload Candidate Photo
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Drag & drop image here or click to browse
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Photo File</span>
                  </div>
                </div>
              ) : (
                /* State 2: Photo Selected - Circular Image Preview (120x120px) */
                <div className="flex flex-col items-center justify-center space-y-4 animate-fade-in">
                  <div className="relative group">
                    <img
                      src={photoPreviewUrl}
                      alt="Candidate Preview"
                      className="w-[120px] h-[120px] rounded-full object-cover ring-4 ring-blue-500/30 shadow-xl"
                    />
                    <div className="absolute inset-0 rounded-full bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {photoFile ? photoFile.name : 'Selected Candidate Photo'}
                    </p>
                    {photoFile && (
                      <p className="text-[10px] text-slate-400">
                        {(photoFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold rounded-xl cursor-pointer flex items-center gap-1.5 text-xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Change Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold rounded-xl cursor-pointer flex items-center gap-1.5 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Photo</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Photo Validation Error Message */}
            {photoError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{photoError}</span>
              </div>
            )}
          </div>

          {/* CANDIDATE ID & NAME GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-900 dark:text-white mb-1">
                Candidate ID <span className="text-slate-400 font-normal">(e.g. {defaultCandId})</span>
              </label>
              <input
                type="text"
                placeholder={defaultCandId}
                value={candidateIdInput}
                onChange={(e) => setCandidateIdInput(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 dark:text-white mb-1">
                Candidate Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. MUHAMMED NIHAJ U"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>
          </div>

          {/* POSITION SELECTION */}
          <div>
            <label className="block font-bold text-slate-900 dark:text-white mb-1">
              Position <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedPositionId}
              onChange={(e) => setSelectedPositionId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
            >
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* DEPARTMENT SELECTION */}
          <div>
            <label className="block font-bold text-slate-900 dark:text-white mb-1">
              Department <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
            >
              {IAMS_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* MANIFESTO */}
          <div>
            <label className="block font-bold text-slate-900 dark:text-white mb-1">
              Manifesto <span className="text-rose-500">*</span>
            </label>
            <textarea
              placeholder="Detail candidate commitments, goals, and campus development initiatives..."
              value={manifesto}
              onChange={(e) => setManifesto(e.target.value)}
              required
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-normal"
            />
          </div>

          {/* CAMPAIGN MESSAGE */}
          <div>
            <label className="block font-bold text-slate-900 dark:text-white mb-1">
              Campaign Message
            </label>
            <input
              type="text"
              placeholder="e.g. Together we build a stronger and smarter IAMS Campus!"
              value={campaignMessage}
              onChange={(e) => setCampaignMessage(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            />
          </div>

          {/* ACHIEVEMENTS / HIGHLIGHTS */}
          <div>
            <label className="block font-bold text-slate-900 dark:text-white mb-1">
              Achievements / Highlights (1 per line)
            </label>
            <textarea
              placeholder="Organized IAMS Management Conclave 2025&#10;Lead Strategist for Digital Marketing Club"
              value={achievementsText}
              onChange={(e) => setAchievementsText(e.target.value)}
              rows={2}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-normal"
            />
          </div>

          {/* UPLOAD PROGRESS BAR */}
          {isUploading && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between text-xs font-bold text-blue-800 dark:text-blue-300">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Uploading to Firebase Storage candidate_photos/...</span>
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-200 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* FOOTER BUTTONS */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isUploading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Nominating...</span>
                </>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  <span>Nominate Candidate</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
