import { useState, useRef, useCallback } from 'react';

/**
 * PhotoCapture - Camera integration for kids to snap pictures
 * Supports device camera capture and file upload fallback
 */
export default function PhotoCapture({ 
  onCapture, 
  onError,
  maxSizeMB = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  className = ''
}) {
  const [mode, setMode] = useState('idle'); // 'idle' | 'camera' | 'preview' | 'uploading'
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'user' | 'environment'
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      
      setMode('camera');
    } catch (err) {
      console.error('Camera access error:', err);
      const errorMsg = err.name === 'NotAllowedError' 
        ? 'Camera permission denied. Please allow camera access! 📷'
        : err.name === 'NotFoundError'
        ? 'No camera found. Try uploading a photo instead! 📁'
        : 'Could not start camera. Try uploading a photo! 🌟';
      
      setError(errorMsg);
      onError?.(err);
    }
  }, [cameraFacing, onError]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Capture photo from video stream
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage({ blob, url: imageUrl });
        stopCamera();
        setMode('preview');
      }
    }, 'image/jpeg', 0.9);
  }, [stopCamera]);

  // Switch camera (front/back)
  const switchCamera = useCallback(() => {
    stopCamera();
    setCameraFacing(prev => prev === 'user' ? 'environment' : 'user');
    // Will restart camera with new facing mode
    setTimeout(() => startCamera(), 100);
  }, [stopCamera, startCamera]);

  // Handle file upload
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      setError('Please upload an image (JPG, PNG, GIF) 🖼️');
      return;
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`Image too big! Please use a smaller photo (under ${maxSizeMB}MB) 📏`);
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setCapturedImage({ blob: file, url: imageUrl });
    setMode('preview');
  }, [acceptedTypes, maxSizeMB]);

  // Confirm and send image
  const confirmImage = useCallback(async () => {
    if (!capturedImage) return;

    setMode('uploading');
    
    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('image', capturedImage.blob, 'photo.jpg');

      // Call parent callback with image data
      await onCapture?.({
        blob: capturedImage.blob,
        url: capturedImage.url,
        formData
      });

      // Reset after successful capture
      resetCapture();
    } catch (err) {
      console.error('Upload error:', err);
      setError('Oops! Could not save your photo. Try again! 🌈');
      setMode('preview');
      onError?.(err);
    }
  }, [capturedImage, onCapture, onError]);

  // Retake/reselect photo
  const retakePhoto = useCallback(() => {
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url);
    }
    setCapturedImage(null);
    setMode('idle');
    setError(null);
  }, [capturedImage]);

  // Full reset
  const resetCapture = useCallback(() => {
    stopCamera();
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url);
    }
    setCapturedImage(null);
    setMode('idle');
    setError(null);
  }, [stopCamera, capturedImage]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    stopCamera();
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url);
    }
  }, [stopCamera, capturedImage]);

  return (
    <div className={`photo-capture-container ${className}`}>
      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Error display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-center">
          {error}
        </div>
      )}

      {/* IDLE MODE - Show options */}
      {mode === 'idle' && (
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="text-6xl mb-2">📸</div>
          <h3 className="text-xl font-bold text-purple-600">Take a Picture!</h3>
          <p className="text-gray-600 text-center mb-4">
            Snap a photo of something curious! 🌟
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
            <button
              onClick={startCamera}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 px-6 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              📷 Use Camera
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4 px-6 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              📁 Upload Photo
            </button>
          </div>
        </div>
      )}

      {/* CAMERA MODE - Live viewfinder */}
      {mode === 'camera' && (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-xl shadow-lg"
            style={{ maxHeight: '60vh' }}
          />
          
          {/* Camera controls overlay */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            {/* Cancel button */}
            <button
              onClick={resetCapture}
              className="bg-gray-800/70 text-white p-3 rounded-full shadow-lg hover:bg-gray-700/80 transition"
            >
              ✖️
            </button>
            
            {/* Capture button */}
            <button
              onClick={capturePhoto}
              className="bg-white w-16 h-16 rounded-full shadow-lg border-4 border-purple-500 hover:border-pink-500 transform hover:scale-110 transition-all"
            >
              <span className="text-3xl">📸</span>
            </button>
            
            {/* Switch camera button */}
            <button
              onClick={switchCamera}
              className="bg-gray-800/70 text-white p-3 rounded-full shadow-lg hover:bg-gray-700/80 transition"
            >
              🔄
            </button>
          </div>
        </div>
      )}

      {/* PREVIEW MODE - Show captured image */}
      {mode === 'preview' && capturedImage && (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <img
              src={capturedImage.url}
              alt="Captured photo"
              className="w-full rounded-xl shadow-lg"
              style={{ maxHeight: '50vh', objectFit: 'contain' }}
            />
            <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
              ✓ Looking good!
            </div>
          </div>
          
          <p className="text-gray-600 text-center">
            Is this the picture you want? 🌈
          </p>
          
          <div className="flex gap-4">
            <button
              onClick={retakePhoto}
              className="bg-gray-500 text-white py-3 px-6 rounded-xl text-lg font-bold shadow-lg hover:bg-gray-600 transition"
            >
              🔄 Try Again
            </button>
            
            <button
              onClick={confirmImage}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-8 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              ✅ Use This!
            </button>
          </div>
        </div>
      )}

      {/* UPLOADING MODE - Show loading */}
      {mode === 'uploading' && (
        <div className="flex flex-col items-center gap-4 p-8">
          <div className="animate-bounce text-6xl">🚀</div>
          <h3 className="text-xl font-bold text-purple-600">Sending your photo...</h3>
          <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" style={{ width: '70%' }} />
          </div>
        </div>
      )}
    </div>
  );
}
