import React, { useState, useRef, useEffect } from 'react';
import { taskAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useEvent } from '../context/EventContext';
import { 
  Camera, 
  X, 
  CheckCircle2, 
  Trash2, 
  RotateCcw, 
  AlertCircle,
  SwitchCamera
} from 'lucide-react';

export const SubmitTaskProofModal = ({ isOpen, onClose, task, onSuccess }) => {
  const { selectedEventId, refreshEventData } = useEvent();
  const { socket } = useSocket();

  const [hasCamera, setHasCamera] = useState(null); // null (checking) | true | false
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [availableCamerasCount, setAvailableCamerasCount] = useState(0);

  const [proofImage, setProofImage] = useState(null);
  const [proofNotes, setProofNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

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

  // Start Live Camera Stream
  const startCameraStream = async (facing = cameraFacing) => {
    stopCameraStream();
    setCameraLoading(true);
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      setError('Live camera access is not supported on this browser or device.');
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
        setError('No camera detected. A live camera is required to capture task proof.');
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
        // Fallback to any available video stream
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
    } catch (err) {
      console.warn('Camera not available or permission denied:', err);
      setHasCamera(false);
      setError('Camera access denied or unavailable. Please enable camera permission to capture live proof.');
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
      startCameraStream('environment');
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen]);

  // Handle snapping photo from live camera feed
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    // Convert to compressed jpeg dataURL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setProofImage(dataUrl);
    setError(null);

    // Stop camera stream once captured
    stopCameraStream();
  };

  const handleRetake = () => {
    setProofImage(null);
    startCameraStream(cameraFacing);
  };

  const handleClose = () => {
    stopCameraStream();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proofImage) {
      setError('Please take a live photo proof of your work.');
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
          
          {/* Live Camera Proof Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
                <Camera size={14} className="text-primary" />
                <span>Live Camera Proof *</span>
              </label>

              {!proofImage && availableCamerasCount > 1 && hasCamera && (
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

            {/* STATE 1: Photo Captured via Live Camera */}
            {proofImage ? (
              <div className="relative rounded-2xl overflow-hidden border border-success/40 bg-base-300 max-h-64 group shadow-md">
                <img
                  src={proofImage}
                  alt="Captured Live Proof"
                  className="w-full h-52 sm:h-60 object-cover"
                />
                <div className="absolute top-2 left-2 bg-success/90 backdrop-blur-md text-white text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <CheckCircle2 size={12} /> Live Proof Captured
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="btn btn-sm btn-primary rounded-xl gap-1.5 shadow-lg"
                  >
                    <RotateCcw size={15} /> Retake Photo
                  </button>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="btn btn-sm btn-error text-white rounded-xl gap-1 shadow-lg"
                  >
                    <Trash2 size={15} /> Discard
                  </button>
                </div>
              </div>
            ) : hasCamera === false ? (
              /* Camera Not Available / Permission Denied */
              <div className="rounded-2xl border border-error/30 bg-error/10 p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
                <div className="w-12 h-12 rounded-full bg-error/20 text-error flex items-center justify-center">
                  <Camera size={24} />
                </div>
                <div className="max-w-xs">
                  <p className="font-bold text-sm text-base-content">Camera Not Available</p>
                  <p className="text-xs text-base-content/70 mt-1">
                    Live camera capture is required to submit task proof. Please grant camera permissions or connect a camera device.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startCameraStream(cameraFacing)}
                  className="btn btn-sm btn-outline btn-error rounded-xl gap-1.5"
                >
                  <RotateCcw size={14} /> Retry Camera
                </button>
              </div>
            ) : (
              /* STATE 2: Active Live Camera Viewfinder */
              <div className="relative rounded-2xl overflow-hidden border border-base-content/20 bg-black flex flex-col items-center justify-center min-h-[230px] sm:min-h-[270px]">
                {cameraLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-white/70">
                    <span className="loading loading-spinner loading-md text-primary"></span>
                    <span className="text-xs font-semibold">Activating live camera...</span>
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

                    {/* Live Shutter Button */}
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
                      <span>LIVE CAMERA</span>
                    </div>
                  </>
                )}
              </div>
            )}
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
