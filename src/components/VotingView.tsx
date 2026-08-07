import React, { useState, useEffect, useRef } from 'react';
import { useElection } from '../context/ElectionContext';
import confetti from 'canvas-confetti';
import { playSound } from '../utils/sound';
import {
  Vote,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Award,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Lock,
  Loader2,
  User,
  CreditCard,
  Camera,
  RefreshCw,
  Upload,
  ArrowRight,
  Check,
} from 'lucide-react';

export const VotingView: React.FC = () => {
  const {
    currentUser,
    userRole,
    settings,
    positions,
    candidates,
    castBallot,
    verifyStudent,
    students,
    soundEnabled,
    setActiveTab,
  } = useElection();

  const isStudent = userRole === 'student' && currentUser && 'hasVoted' in currentUser;
  const student = isStudent ? (currentUser as any) : null;
  const hasVoted = student ? student.hasVoted : false;

  // Multi-step Verification State
  // Steps: 'details' (Step 1) -> 'selfie' (Step 2) -> 'verified' (Step 3) -> 'voting'
  const [verificationStep, setVerificationStep] = useState<'details' | 'selfie' | 'verified'>('details');

  // Input states
  const [inputName, setInputName] = useState('');
  const [inputId, setInputId] = useState('');
  const [verifyError, setVerifyError] = useState('');

  // Verified student object held locally before completing step 3
  const [matchedStudent, setMatchedStudent] = useState<any>(null);

  // Camera & Selfie states
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<
    'idle' | 'initializing' | 'active' | 'captured' | 'permission_denied' | 'no_camera' | 'in_use' | 'https_required' | 'unsupported' | 'error'
  >('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Voting ballot state
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [activePosIndex, setActivePosIndex] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [votedSuccess, setVotedSuccess] = useState(false);

  const currentPos = positions[activePosIndex] || positions[0];
  const candidatesForCurrentPos = candidates.filter((c) => c.positionId === currentPos?.id);

  // Cleanup camera stream on unmount or step change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Ensure video element receives stream whenever stream or step changes
  useEffect(() => {
    if (stream && videoRef.current && verificationStep === 'selfie' && !capturedSelfie) {
      const video = videoRef.current;
      video.srcObject = stream;
      video
        .play()
        .catch((err) => console.warn('Video play exception:', err));
    }
  }, [stream, verificationStep, capturedSelfie]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      setStream(null);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setCameraStatus('initializing');
    stopCamera();

    // Check secure context for web camera access
    const isLocal =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.protocol === 'https:');

    if (typeof window !== 'undefined' && !isLocal && !window.isSecureContext) {
      setCameraStatus('https_required');
      setCameraError('Camera access requires a secure HTTPS connection.');
      return;
    }

    // Check browser mediaDevices API support
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraStatus('unsupported');
      setCameraError('Your browser does not support camera access.');
      return;
    }

    try {
      let mediaStream: MediaStream;

      try {
        // Prefer front camera with ideal constraints
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user', // Front camera preferred
            width: { ideal: 640 },
            height: { ideal: 640 },
          },
          audio: false,
        });
      } catch (constraintErr) {
        console.warn('Front camera constraint fallback:', constraintErr);
        // Fallback to basic video constraint
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setStream(mediaStream);
      setCameraStatus('active');

      // Bind stream immediately if video element is mounted
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((e) => console.warn('Video play error:', e));
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      const errName = err?.name || '';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraStatus('permission_denied');
        setCameraError('Camera permission is required to take a selfie.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraStatus('no_camera');
        setCameraError('No camera was detected on this device.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraStatus('in_use');
        setCameraError('Camera is currently being used by another application.');
      } else {
        setCameraStatus('error');
        setCameraError('Unable to access your camera. Try allowing camera permission in your browser settings.');
      }
    }
  };

  // STEP 1: Verify Name + Student ID against Firestore/state
  const handleVerifyDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError('');

    const cleanName = inputName.trim();
    const cleanId = inputId.trim().toUpperCase();

    if (!cleanName || !cleanId) {
      setVerifyError('Both Student Name and Student ID are required.');
      playSound('error', soundEnabled);
      return;
    }

    const cleanIdNoHyphen = cleanId.replace(/[^A-Z0-9]/g, '');

    // Search student records
    const foundStudent = students.find((s) => {
      const sId = (s.id || '').toUpperCase();
      const sCode = (s.studentId || '').toUpperCase();
      const sIdNoHyphen = sId.replace(/[^A-Z0-9]/g, '');
      const sCodeNoHyphen = sCode.replace(/[^A-Z0-9]/g, '');

      return (
        sId === cleanId ||
        sCode === cleanId ||
        (sIdNoHyphen.length > 0 && sIdNoHyphen === cleanIdNoHyphen) ||
        (sCodeNoHyphen.length > 0 && sCodeNoHyphen === cleanIdNoHyphen)
      );
    });

    if (!foundStudent) {
      setVerifyError('Student ID or Name is incorrect.');
      playSound('error', soundEnabled);
      return;
    }

    // Verify Name match
    const registeredName = foundStudent.name.trim().toLowerCase();
    const enteredName = cleanName.toLowerCase();

    if (registeredName !== enteredName) {
      setVerifyError('Student ID or Name is incorrect.');
      playSound('error', soundEnabled);
      return;
    }

    // Check if student has already voted
    if (foundStudent.hasVoted) {
      setVerifyError('Your vote has already been submitted.');
      playSound('error', soundEnabled);
      return;
    }

    // Name + ID match successfully! Move to Step 2: Selfie
    setMatchedStudent(foundStudent);
    setVerificationStep('selfie');
    playSound('button_click', soundEnabled);

    // Auto-launch front camera
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  // STEP 2: Snap Selfie
  const handleTakeSelfie = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 400;
    canvas.height = video.videoHeight || 400;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror image horizontally for front camera feel
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedSelfie(imageDataUrl);
      stopCamera();
      playSound('success', soundEnabled);
    }
  };

  const handleRetakeSelfie = () => {
    setCapturedSelfie(null);
    startCamera();
  };

  // File fallback for selfie upload if webcam fails
  const handleSelfieFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedSelfie(event.target.result as string);
          stopCamera();
          playSound('success', soundEnabled);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Proceed from Selfie step to Step 3: Verification Status
  const handleContinueAfterSelfie = () => {
    if (!capturedSelfie) {
      setCameraError('Please capture or upload a selfie before continuing.');
      playSound('error', soundEnabled);
      return;
    }

    stopCamera();
    setVerificationStep('verified');
    playSound('success', soundEnabled);
  };

  // STEP 3: Complete Auth and Proceed to Voting
  const handleStartVoting = () => {
    if (!matchedStudent) return;
    const res = verifyStudent(inputName, inputId);
    if (res.success) {
      playSound('vote_success', soundEnabled);
    }
  };

  // Voting ballot handlers
  const handleSelectCandidate = (positionId: string, candidateId: string) => {
    playSound('button_click', soundEnabled);
    setSelections((prev) => ({
      ...prev,
      [positionId]: candidateId,
    }));
  };

  const handleConfirmVote = async () => {
    setIsSubmitting(true);

    setTimeout(() => {
      const res = castBallot(selections);
      setIsSubmitting(false);
      setShowConfirmModal(false);

      if (res.success) {
        setVotedSuccess(true);
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    }, 600);
  };

  // ----------------------------------------------------
  // VIEW: IF ALREADY VOTED OR JUST SUBMITTED BALLOT
  // ----------------------------------------------------
  if (hasVoted || votedSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6 text-center animate-fade-in">
        <div className="p-8 sm:p-12 bg-white dark:bg-slate-900 rounded-[18px] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-emerald-100 dark:bg-emerald-950/80 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-950/40">
            <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>

          <div className="space-y-2">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              Firestore Ballot Sealed
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              Vote Submitted
            </h1>
            <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300 max-w-lg mx-auto">
              Your vote has already been submitted and securely recorded in Firestore.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 max-w-md mx-auto text-left text-xs space-y-1.5">
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Student ID: <span className="font-mono text-[#1565C0] dark:text-blue-400">{student?.id || student?.studentId || 'IAMS001'}</span>
            </p>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Student Name: <span className="text-slate-700 dark:text-slate-300">{student?.name}</span>
            </p>
            <p className="text-slate-500">
              Timestamp: {student?.votedAt ? new Date(student.votedAt).toLocaleString() : new Date().toLocaleString()}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => setActiveTab('results')}
              className="px-6 py-3.5 bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer transition-all"
            >
              View Election Results
            </button>
            <button
              onClick={() => setActiveTab('home')}
              className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW: IF VOTING IS CLOSED BY ELECTION COMMISSION
  // ----------------------------------------------------
  if (!settings.votingOpen) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4 animate-fade-in">
        <div className="p-8 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-[18px] shadow-xl space-y-4">
          <Lock className="w-12 h-12 text-amber-600 dark:text-amber-400 mx-auto" />
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Voting is currently closed.
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            The Election Administrator has paused or closed the voting booth. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW: UNVERIFIED STUDENT VERIFICATION STEPS (1 -> 2 -> 3)
  // ----------------------------------------------------
  if (!student) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
        <div className="w-full max-w-lg space-y-6">
          {/* STEP INDICATOR HEADER (Material Design 3) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-[18px] shadow-md border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {/* Step 1 */}
            <div
              className={`flex items-center gap-2 text-xs font-bold ${
                verificationStep === 'details'
                  ? 'text-[#1565C0] dark:text-blue-400'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  verificationStep === 'details'
                    ? 'bg-[#1565C0] text-white shadow-md'
                    : verificationStep === 'selfie' || verificationStep === 'verified'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {verificationStep === 'selfie' || verificationStep === 'verified' ? '✓' : '①'}
              </div>
              <span className="hidden sm:inline">Student Details</span>
            </div>

            <div className="h-0.5 w-6 sm:w-10 bg-slate-200 dark:bg-slate-800" />

            {/* Step 2 */}
            <div
              className={`flex items-center gap-2 text-xs font-bold ${
                verificationStep === 'selfie'
                  ? 'text-[#1565C0] dark:text-blue-400'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  verificationStep === 'selfie'
                    ? 'bg-[#1565C0] text-white shadow-md'
                    : verificationStep === 'verified'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {verificationStep === 'verified' ? '✓' : '②'}
              </div>
              <span className="hidden sm:inline">Selfie</span>
            </div>

            <div className="h-0.5 w-6 sm:w-10 bg-slate-200 dark:bg-slate-800" />

            {/* Step 3 */}
            <div
              className={`flex items-center gap-2 text-xs font-bold ${
                verificationStep === 'verified'
                  ? 'text-[#1565C0] dark:text-blue-400'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  verificationStep === 'verified'
                    ? 'bg-[#1565C0] text-white shadow-md'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                ③
              </div>
              <span className="hidden sm:inline">Vote</span>
            </div>
          </div>

          {/* MAIN VERIFICATION CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-[18px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Primary Blue #1565C0 Header */}
            <div className="bg-[#1565C0] text-white p-7 text-center space-y-1.5">
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto text-2xl shadow-inner">
                {verificationStep === 'details' ? '🗳️' : verificationStep === 'selfie' ? '📷' : '✔'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Cast Your Vote Now
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm font-medium">
                Verify your details to continue
              </p>
            </div>

            {/* ---------------------------------------------------- */}
            {/* STEP 1: STUDENT DETAILS FORM                         */}
            {/* ---------------------------------------------------- */}
            {verificationStep === 'details' && (
              <form onSubmit={handleVerifyDetails} className="p-6 sm:p-8 space-y-5">
                {verifyError && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-3 text-rose-700 dark:text-rose-200 text-xs font-semibold animate-shake">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                    <span>{verifyError}</span>
                  </div>
                )}

                {/* Student Name Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#1565C0]" />
                    <span>Student Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your registered name (e.g., Ahmed Ali)"
                    value={inputName}
                    onChange={(e) => {
                      setInputName(e.target.value);
                      if (verifyError) setVerifyError('');
                    }}
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] transition-all"
                  />
                </div>

                {/* Student ID Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#1565C0]" />
                    <span>Student ID</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your Student ID (e.g., IAMS001)"
                    value={inputId}
                    onChange={(e) => {
                      setInputId(e.target.value);
                      if (verifyError) setVerifyError('');
                    }}
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] transition-all"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-4 bg-[#1565C0] hover:bg-[#0D47A1] text-white font-black text-sm rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                  >
                    <span>Next: Take Selfie</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-center pt-2">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    IAMS Smart Campus Election Commission • Verified Student Registration
                  </p>
                </div>
              </form>
            )}

            {/* ---------------------------------------------------- */}
            {/* STEP 2: LIVE SELFIE CAMERA                            */}
            {/* ---------------------------------------------------- */}
            {verificationStep === 'selfie' && (
              <div className="p-6 sm:p-8 space-y-6 text-center animate-fade-in">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Take a Selfie
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Front-facing live selfie required for student verification record
                  </p>
                </div>

                {cameraError && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center justify-between gap-2 max-w-md mx-auto">
                    <span>{cameraError}</span>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1 bg-[#1565C0] text-white text-[11px] font-bold rounded-lg cursor-pointer shrink-0"
                    >
                      Allow Camera Access
                    </button>
                  </div>
                )}

                {/* LARGE CIRCULAR CAMERA PREVIEW */}
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border-4 border-[#1565C0] shadow-2xl overflow-hidden mx-auto bg-slate-950 flex items-center justify-center group ring-8 ring-blue-50 dark:ring-blue-950/40">
                  {capturedSelfie ? (
                    // Captured Selfie Image Preview
                    <img
                      src={capturedSelfie}
                      alt="Captured Selfie"
                      className="w-full h-full object-cover"
                    />
                  ) : cameraStatus === 'initializing' ? (
                    // Camera Loading / Initializing State
                    <div className="flex flex-col items-center justify-center gap-2 text-white p-4 text-center">
                      <Loader2 className="w-10 h-10 animate-spin text-white" />
                      <span className="text-xs font-bold">Initializing Camera...</span>
                      <span className="text-[10px] text-blue-200">Opening front camera feed</span>
                    </div>
                  ) : stream && cameraStatus === 'active' ? (
                    // Live Video Feed from Front Camera
                    <video
                      ref={(node) => {
                        videoRef.current = node;
                        if (node && stream && node.srcObject !== stream) {
                          node.srcObject = stream;
                          node.play().catch((e) => console.warn('Video play error:', e));
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  ) : (
                    // Camera Error / Permission Denied / Offline View
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-300 p-4 text-center">
                      <Camera className="w-10 h-10 text-slate-400" />
                      <span className="text-xs font-bold text-white">
                        {cameraStatus === 'permission_denied'
                          ? 'Permission Denied'
                          : cameraStatus === 'https_required'
                          ? 'HTTPS Required'
                          : 'Camera Offline'}
                      </span>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="mt-1 px-4 py-1.5 bg-[#1565C0] hover:bg-[#0D47A1] text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors shadow-md flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>
                          {cameraStatus === 'permission_denied'
                            ? 'Allow Camera Access'
                            : 'Start Front Camera'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Hidden Canvas for Frame Capture */}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Green Captured Badge */}
                  {capturedSelfie && (
                    <div className="absolute bottom-3 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>✓ Selfie Captured</span>
                    </div>
                  )}
                </div>

                {/* CAMERA BUTTON CONTROLS */}
                <div className="space-y-3 pt-2">
                  {!capturedSelfie ? (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleTakeSelfie}
                        disabled={!stream || cameraStatus !== 'active'}
                        className="w-full sm:w-auto px-8 py-3.5 bg-[#1565C0] hover:bg-[#0D47A1] text-white font-black text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Camera className="w-5 h-5" />
                        <span>📷 Take Selfie</span>
                      </button>

                      {/* File Upload Alternative if webcam unavailable */}
                      <label className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4 text-[#1565C0]" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSelfieFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleRetakeSelfie}
                        className="w-full sm:w-auto px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Retake Selfie</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleContinueAfterSelfie}
                        className="w-full sm:w-auto px-8 py-3 bg-[#1565C0] hover:bg-[#0D47A1] text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>Continue</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        setVerificationStep('details');
                      }}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back to Student Details</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* STEP 3: VERIFICATION STATUS (CONFIRMATION)            */}
            {/* ---------------------------------------------------- */}
            {verificationStep === 'verified' && matchedStudent && (
              <div className="p-6 sm:p-8 space-y-6 text-center animate-fade-in">
                {/* Green Verification Success Indicator */}
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50 dark:ring-emerald-950/40">
                  <ShieldCheck className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                    Welcome, {matchedStudent.name}
                  </h2>
                  <p className="text-xs font-semibold text-slate-500">
                    Identity verified for {matchedStudent.department}
                  </p>
                </div>

                {/* VERIFICATION CHECKLIST ITEMS */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-left space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      ✓
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Identity details verified
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {matchedStudent.name} • {matchedStudent.id || matchedStudent.studentId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      ✓
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          Selfie captured
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Stored securely in student_selfies record
                        </p>
                      </div>
                      {capturedSelfie && (
                        <img
                          src={capturedSelfie}
                          alt="Selfie"
                          className="w-9 h-9 rounded-full object-cover border-2 border-emerald-500"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStartVoting}
                    className="w-full py-4 bg-[#1565C0] hover:bg-[#0D47A1] text-white font-black text-sm rounded-xl shadow-xl hover:shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                  >
                    <span>Continue to Vote</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW: VERIFIED STUDENT VOTING BOOTH (BALLOT SCREEN)
  // ----------------------------------------------------
  const selectedCount = Object.keys(selections).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fade-in">
      {/* Top Banner Displaying Welcome & Cast Your Vote Now */}
      <div className="p-6 sm:p-8 bg-[#1565C0] text-white rounded-[18px] shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-bold text-blue-100 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Official Student Ballot</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Welcome, {student.name}
          </h1>
          <h2 className="text-lg sm:text-xl font-extrabold text-blue-100">
            Cast Your Vote Now
          </h2>
          <p className="text-xs text-blue-200/90 font-medium">
            Student ID: <span className="font-mono text-white font-bold">{student.id || student.studentId}</span> • {student.department}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/20 text-center shrink-0">
          <span className="text-[10px] font-bold uppercase text-blue-200 block">
            Ballot Progress
          </span>
          <span className="text-xl font-black text-emerald-300">
            {selectedCount} / {positions.length} Positions Selected
          </span>
        </div>
      </div>

      {/* Position Stepper Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {positions.map((pos, idx) => {
          const isSelected = Boolean(selections[pos.id]);
          const isActive = idx === activePosIndex;
          return (
            <button
              key={pos.id}
              onClick={() => {
                playSound('button_click', soundEnabled);
                setActivePosIndex(idx);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#1565C0] text-white shadow-lg ring-2 ring-blue-300'
                  : isSelected
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <span>{idx + 1}. {pos.title}</span>
              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            </button>
          );
        })}
      </div>

      {/* Current Position Voting Card */}
      <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-[18px] border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#1565C0] dark:text-blue-400 uppercase tracking-wider">
              Position {activePosIndex + 1} of {positions.length}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              Vote for {currentPos.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {currentPos.description}
            </p>
          </div>

          <div className="text-xs text-slate-400 font-medium hidden sm:block">
            Select 1 Candidate
          </div>
        </div>

        {/* Candidates Radio Card List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {candidatesForCurrentPos.map((cand) => {
            const isSelected = selections[currentPos.id] === cand.id;
            return (
              <div
                key={cand.id}
                onClick={() => handleSelectCandidate(currentPos.id, cand.id)}
                className={`group p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/80 dark:bg-blue-950/50 border-[#1565C0] dark:border-blue-500 ring-2 ring-[#1565C0]/30 shadow-md'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <img
                      src={cand.photo}
                      alt={cand.name}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                    />

                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-[#1565C0] bg-[#1565C0] text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}>
                      {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {cand.department}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {cand.name}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic">
                    "{cand.campaignMessage || cand.manifesto}"
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold">
                  <span className={isSelected ? 'text-[#1565C0] dark:text-blue-400' : 'text-slate-500'}>
                    {isSelected ? '✓ Candidate Selected' : 'Tap to Select'}
                  </span>
                  <Award className="w-4 h-4 text-amber-500" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Stepper Navigation Buttons */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              if (activePosIndex > 0) setActivePosIndex(activePosIndex - 1);
            }}
            disabled={activePosIndex === 0}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Position</span>
          </button>

          {activePosIndex < positions.length - 1 ? (
            <button
              onClick={() => {
                setActivePosIndex(activePosIndex + 1);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold text-xs cursor-pointer flex items-center gap-1 shadow-md"
            >
              <span>Next Position</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                if (selectedCount === 0) {
                  playSound('error', soundEnabled);
                  alert('Please select at least one candidate before submitting.');
                  return;
                }
                setShowConfirmModal(true);
              }}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xl flex items-center gap-2 cursor-pointer"
            >
              <Vote className="w-4 h-4" />
              <span>Submit Final Ballot</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[18px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 bg-[#1565C0] text-white flex items-center justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20">
                  Confirm Your Ballot
                </span>
                <h2 className="text-xl font-extrabold mt-1">
                  Are you ready to submit your vote?
                </h2>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-80 overflow-y-auto">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Summary of candidate selections on your ballot:
              </p>

              <div className="space-y-2">
                {positions.map((pos) => {
                  const selectedCandId = selections[pos.id];
                  const candObj = candidates.find((c) => c.id === selectedCandId);

                  return (
                    <div
                      key={pos.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {pos.title}
                      </span>
                      {candObj ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={candObj.photo}
                            alt={candObj.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="text-xs font-bold text-[#1565C0] dark:text-blue-400">
                            {candObj.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No selection</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-[11px] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Once confirmed, your ballot will be permanently recorded and set hasVoted = true.</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVote}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Sealing Ballot...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Vote</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
