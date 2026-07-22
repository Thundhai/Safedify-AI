/**
 * MOBILE INCIDENT FORM
 * Touch-optimized form for field workers to report incidents offline
 * Features camera integration, voice notes, and offline storage
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  AlertTriangle, 
  Camera, 
  Mic, 
  MapPin, 
  Clock, 
  Save,
  Wifi,
  WifiOff,
  Upload,
  User,
  FileText,
  Star
} from 'lucide-react';
import offlineStorage from '../services/offlineStorageService';
import { useAuth } from '../context/AuthContext';

interface MobileIncidentFormProps {
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

interface IncidentFormData {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  photos: File[];
  voiceNote?: Blob;
  witnessCount: number;
  injuryType: string;
  immediateActions: string;
  reportedBy: string;
  timestamp: number;
}

const SEVERITY_COLORS = {
  low: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  medium: 'bg-orange-100 border-orange-300 text-orange-800',
  high: 'bg-red-100 border-red-300 text-red-800',
  critical: 'bg-purple-100 border-purple-300 text-purple-800'
};

const CATEGORIES = [
  'Near Miss',
  'First Aid',
  'Medical Treatment',
  'Lost Time Injury',
  'Property Damage',
  'Environmental',
  'Security',
  'Equipment Failure',
  'Other'
];

const INJURY_TYPES = [
  'None',
  'Cut/Laceration',
  'Bruise/Contusion',
  'Strain/Sprain',
  'Burn',
  'Fracture',
  'Eye Injury',
  'Back Injury',
  'Chemical Exposure',
  'Other'
];

export default function MobileIncidentForm({
  onSubmit,
  onCancel,
  autoFocus = false
}: MobileIncidentFormProps) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRecording, setIsRecording] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [formData, setFormData] = useState<IncidentFormData>({
    title: '',
    description: '',
    severity: 'medium',
    category: '',
    location: '',
    photos: [],
    witnessCount: 0,
    injuryType: 'None',
    immediateActions: '',
    reportedBy: user?.name || '',
    timestamp: Date.now()
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({
            ...prev,
            coordinates: { lat: latitude, lng: longitude },
            location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          }));
        },
        (error) => {
          console.error('Location error:', error);
          alert('Unable to get location. Please enter manually.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert('Location services not available');
    }
  }, []);

  // Handle photo capture
  const handlePhotoCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + formData.photos.length > 5) {
      alert('Maximum 5 photos allowed');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...files]
    }));
  }, [formData.photos.length]);

  // Handle voice recording
  const toggleVoiceRecording = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      if (audioRecorder) {
        audioRecorder.stop();
        setIsRecording(false);
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            setFormData(prev => ({ ...prev, voiceNote: event.data }));
          }
        };

        recorder.start();
        setAudioRecorder(recorder);
        setIsRecording(true);

        // Auto-stop after 2 minutes
        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
            setIsRecording(false);
          }
        }, 120000);
      } catch (error) {
        console.error('Audio recording error:', error);
        alert('Unable to access microphone');
      }
    }
  }, [isRecording, audioRecorder]);

  // Remove photo
  const removePhoto = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionData = {
        ...formData,
        id: `incident-${Date.now()}`,
        status: 'submitted',
        createdAt: new Date().toISOString(),
        offline: !isOnline
      };

      if (isOnline) {
        // Try to submit directly
        try {
          const response = await fetch('/api/incidents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData)
          });

          if (response.ok) {
            setShowSuccess(true);
            setTimeout(() => {
              if (onSubmit) onSubmit(submissionData);
            }, 2000);
          } else {
            throw new Error('Server error');
          }
        } catch (error) {
          // Fallback to offline storage even when online
          await offlineStorage.cacheFormSubmission('incident', submissionData);
          alert('Incident saved for later sync');
          if (onSubmit) onSubmit(submissionData);
        }
      } else {
        // Cache for offline sync
        await offlineStorage.cacheFormSubmission('incident', submissionData);
        setShowSuccess(true);
        setTimeout(() => {
          if (onSubmit) onSubmit(submissionData);
        }, 2000);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Failed to save incident. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isOnline, onSubmit]);

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 text-center max-w-md w-full">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            Incident Reported
          </h2>
          <p className="text-green-600">
            {isOnline ? 
              'Your incident has been submitted successfully.' : 
              'Incident saved offline and will sync when connected.'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h1 className="text-lg font-semibold">Report Incident</h1>
          </div>
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-gray-500 font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6 pb-24">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Incident Title *
          </label>
          <input
            ref={titleInputRef}
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Brief description of incident"
            className="w-full p-4 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Severity Level *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, severity: level }))}
                className={`p-4 border-2 rounded-lg font-medium text-center transition-all ${
                  formData.severity === level
                    ? SEVERITY_COLORS[level]
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                <Star className={`w-5 h-5 mx-auto mb-1 ${
                  formData.severity === level ? '' : 'text-gray-400'
                }`} />
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full p-4 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select category</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location *
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Enter location or use GPS"
              className="flex-1 p-4 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="button"
              onClick={getCurrentLocation}
              className="p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <MapPin className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what happened, including sequence of events..."
            rows={4}
            className="w-full p-4 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Injury Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Injury Type
          </label>
          <select
            value={formData.injuryType}
            onChange={(e) => setFormData(prev => ({ ...prev, injuryType: e.target.value }))}
            className="w-full p-4 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500"
          >
            {INJURY_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Witness Count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Witnesses
          </label>
          <input
            type="number"
            value={formData.witnessCount}
            onChange={(e) => setFormData(prev => ({ ...prev, witnessCount: parseInt(e.target.value) || 0 }))}
            min="0"
            className="w-full p-4 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Immediate Actions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Immediate Actions Taken
          </label>
          <textarea
            value={formData.immediateActions}
            onChange={(e) => setFormData(prev => ({ ...prev, immediateActions: e.target.value }))}
            placeholder="What steps were taken immediately after the incident..."
            rows={3}
            className="w-full p-4 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Photo Capture */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Photos ({formData.photos.length}/5)
          </label>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-400 transition-colors"
            >
              <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <span className="text-sm text-gray-600">Take Photo</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-400 transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <span className="text-sm text-gray-600">Upload Image</span>
            </button>
          </div>
          
          {formData.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {formData.photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Incident photo ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            multiple
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoCapture}
            multiple
            className="hidden"
          />
        </div>

        {/* Voice Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Voice Note (Optional)
          </label>
          <button
            type="button"
            onClick={toggleVoiceRecording}
            className={`w-full p-4 border rounded-lg flex items-center justify-center space-x-3 transition-colors ${
              isRecording
                ? 'bg-red-100 border-red-300 text-red-700'
                : 'border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          >
            <Mic className={`w-5 h-5 ${isRecording ? 'text-red-600' : ''}`} />
            <span>
              {isRecording ? 'Stop Recording' : 'Record Voice Note'}
            </span>
            {isRecording && (
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          {formData.voiceNote && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-green-700 text-sm">Voice note recorded</span>
            </div>
          )}
        </div>

        {/* Reporter Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reported By
          </label>
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <User className="w-5 h-5 text-gray-500" />
            <span className="font-medium">{formData.reportedBy}</span>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{new Date(formData.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </form>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full p-4 rounded-lg font-semibold text-lg transition-colors ${
            isSubmitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-3">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Submitting...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-3">
              <Save className="w-5 h-5" />
              <span>Submit Incident Report</span>
            </div>
          )}
        </button>
        
        {!isOnline && (
          <p className="text-center text-sm text-orange-600 mt-2">
            📱 Offline mode - Report will sync when connected
          </p>
        )}
      </div>
    </div>
  );
}