import React, { useState, useRef, useEffect } from 'react';
import { taskAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useEvent } from '../context/EventContext';
import { 
  Camera, 
  Upload, 
  X, 
  CheckCircle2, 
  Image as ImageIcon, 
  Trash2, 
  RefreshCw, 
  RotateCcw,
  Video,
  AlertCircle,
  SwitchCamera
} from 'lucide-react';

export const SubmitTaskProofModal = ({ isOpen, onClose, task, onSuccess }) => {
  const { selectedEventId, refreshEventData } = useEvent();
  const { socket } = useSocket();

  const [mode, setMode] = useState('camera'); // 'camera' | 'upload'
  const [hasCamera, setHasCamera] = useState(null); // null (checking) | true | false
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [availableCamerasCount, setAvailableCamerasCount] = useState(0);

  const [proofImage, setProofImage] = useState(null);
  const [proofNotes, setProofNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stop active camera stream
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.error('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start Camera Stream
  const startCameraStream = async (facing = cameraFacing) => {
    stopCameraStream();
    setCameraLoading(true);
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      setMode('upload');
      setCameraLoading(false);
      return;
    }

    try {
      // Check available video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setAvailableCamerasCount(videoDevices.length);

      if (videoDevices.length === 0) {
        setHasCamera(false);
        setMode('upload');
        setCameraLoading(false);
        return;
      }

      // Try preferred facing mode with fallback
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (err) {
        // Fallback to any basic video stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setHasCamera(true);
      setMode('camera');
    } catch (err) {
      console.warn('Camera not available or permission denied:', err);
      setHasCamera(false);
      setMode('upload');
    } finally {
      setCameraLoading(false);
    }
  };

  // Switch between front and rear cameras
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCameraStream(nextFacing);
  };

  // Trigger camera check when modal opens
  useEffect(() => {
    if (isOpen) {
      setProofImage(null);
      setProofNotes('');
      setError(null);
      // If camera is not yet disabled, attempt starting camera
      startCameraStream('environment');
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen]);

  // Handle snapping photo from live video feed
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    // Draw current frame
    ctx.drawImage(video, 0, 0, width, height);

    // Convert to compressed jpeg dataURL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setProofImage(dataUrl);
    setError(null);

    // Stop camera stream once captured
    stopCameraStream();
  };

  // Handle File Upload
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, or JPEG).');
      return;
    }

    // Convert to base64 with compression
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let w = img.width;
        let h = img.height;

        if (w > MAX_WIDTH || h > MAX_HEIGHT) {
          if (w > h) {
            h = Math.round((h * MAX_WIDTH) / w);
            w = MAX_WIDTH;
          } else {
            w = Math.round((w * MAX_HEIGHT) / h);
            h = MAX_HEIGHT;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        setProofImage(canvas.toDataURL('image/jpeg', 0.85));
        setError(null);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setProofImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (hasCamera !== false) {
      setMode('camera');
      startCameraStream(cameraFacing);
    }
  };

  const handleClose = () => {
    stopCameraStream();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proofImage) {
      setError('Please take a photo or upload an image proof of your work.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await taskAPI.submitProof(task.id, {
        proofImage,
        proofNotes: proofNotes.trim()
      });

      if (res.data.success) {
        if (socket) {
          socket.emit('broadcast_task_update', {
            eventId: selectedEventId,
            task: res.data.data,
            updatedBy: 'Worker'
          });
        }
        refreshEventData();
        if (onSuccess) onSuccess(res.data.data);
        handleClose();
      }
    } catch (err) {
      console.error('Failed to submit proof', err);
      setError('Failed to submit proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-base-200 border border-base-content/20 rounded-3xl w-full max-w-lg shadow-2xl p-5 sm:p-6 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-success/20 text-success">
              <Camera size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-base-content">
                Submit Task Proof
              </h3>
              <p className="text-xs text-base-content/60 truncate max-w-[240px] sm:max-w-[320px]">
                {task.title}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="btn btn-ghost btn-circle btn-sm">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-error/20 border border-error/30 text-error text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 flex-1 overflow-y-auto pr-1">
          
          {/* Mode Switcher Tabs (Live Camera vs File Upload) */}
          {!proofImage && (
            <div className="flex items-center justify-between bg-base-100 p-1 rounded-2xl border border-base-content/10">
              <button
                type="button"
                onClick={() => {
                  setMode('camera');
                  startCameraStream(cameraFacing);
                }}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'camera'
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'text-base-content/70 hover:text-base-content'
                }`}
              >
                <Video size={14} />
                <span>Live Camera {hasCamera === true ? '●' : ''}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setMode('upload');
                }}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'upload'
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'text-base-content/70 hover:text-base-content'
                }`}
              >
                <Upload size={14} />
                <span>Upload File</span>
              </button>
            </div>
          )}

          {/* Photo Capture / Preview Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70">
                Photo Proof of Work *
              </label>

              {mode === 'camera' && !proofImage && availableCamerasCount > 1 && (
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="btn btn-xs btn-ghost gap-1 text-[11px] text-primary"
                  title="Switch Front/Back Camera"
                >
                  <SwitchCamera size={13} /> Switch Camera
                </button>
              )}
            </div>

            {/* STATE 1: Photo Already Captured or Selected */}
            {proofImage ? (
              <div className="relative rounded-2xl overflow-hidden border border-success/40 bg-base-300 max-h-64 group shadow-md">
                <img
                  src={proofImage}
                  alt="Captured Proof"
                  className="w-full h-52 sm:h-60 object-cover"
                />
                <div className="absolute top-2 left-2 bg-success/90 backdrop-blur-md text-white text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <CheckCircle2 size={12} /> Ready to Submit
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="btn btn-sm btn-primary rounded-xl gap-1.5 shadow-lg"
                  >
                    <RotateCcw size={15} /> Retake / Change
                  </button>
                  <button
                    type="button"
                    onClick={() => setProofImage(null)}
                    className="btn btn-sm btn-error text-white rounded-xl gap-1 shadow-lg"
                  >
                    <Trash2 size={15} /> Remove
                  </button>
                </div>
              </div>
            ) : mode === 'camera' ? (
              /* STATE 2: Live Camera Viewfinder */
              <div className="relative rounded-2xl overflow-hidden border border-base-content/20 bg-black flex flex-col items-center justify-center min-h-[230px] sm:min-h-[270px]">
                {cameraLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-white/70">
                    <span className="loading loading-spinner loading-md text-primary"></span>
                    <span className="text-xs font-semibold">Detecting and activating camera...</span>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-52 sm:h-64 object-cover"
                    />

                    {/* Shutter Bar */}
                    <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 px-4">
                      <button
                        type="button"
                        onClick={handleSnapPhoto}
                        className="btn btn-circle btn-primary btn-lg shadow-2xl border-4 border-white/30 hover:scale-105 active:scale-95 transition-transform"
                        title="Click to capture photo"
                      >
                        <Camera size={26} className="text-white" />
                      </button>
                    </div>

                    <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      <span>LIVE VIEW</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* STATE 3: File Upload Fallback */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-base-content/20 hover:border-primary/60 bg-base-100/50 hover:bg-base-100 rounded-2xl p-7 text-center cursor-pointer transition-all space-y-2 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 group-hover:bg-primary/20 text-primary flex items-center justify-center mx-auto transition-colors">
                  <Upload size={24} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-base-content">
                    Click to browse or drop an image file
                  </p>
                  <p className="text-[11px] text-base-content/50 mt-0.5">
                    Supports PNG, JPG, JPEG up to 10MB
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Optional Notes for Team Leader */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 block">
              Notes for Team Leader (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Completed chair arrangement in rows A-G, stage lights tested and locked..."
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              className="textarea textarea-bordered w-full bg-base-100 rounded-xl text-xs focus:textarea-primary"
            ></textarea>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-base-content/10">
            <button type="button" onClick={handleClose} className="btn btn-sm btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !proofImage}
              className="btn btn-sm btn-success text-white font-bold rounded-xl gap-1.5 shadow-md shadow-success/20 px-4 disabled:opacity-50"
            >
              {submitting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Submit for Leader Approval</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default SubmitTaskProofModal;

