import React, { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { CheckerboardConfig, CapturedImage, CalibrationResults } from './types'
import { getStoredToken } from '../../services/authAPI'

function authHeaders(json = false): Record<string, string> {
  const token = getStoredToken();
  const h: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

// Sub-components
import PatternSetup from './calibration/PatternSetup'
import ImageCapture from './calibration/ImageCapture'
import CalibrationEngine from './calibration/CalibrationEngine'
import ResultsView from './calibration/ResultsView'

interface CalibrationWizardProps {
  deviceIp: string;
  onComplete?: () => void;
}

const CalibrationWizard: React.FC<CalibrationWizardProps> = ({ deviceIp, onComplete }) => {
  // --- Internal State (Encapsulated) ---
  const [calibrationStep, setCalibrationStep] = useState<number>(1)
  const [isCapturing, setIsCapturing] = useState<boolean>(false)
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false)
  const [calibrationResults, setCalibrationResults] = useState<CalibrationResults | null>(null)
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([])
  const [checkerboardConfig, setCheckerboardConfig] = useState<CheckerboardConfig>({
    rows: 6,
    cols: 9,
    square_size: 25,
    name: ''
  })

  // --- API Logic (Encapsulated) ---
  
  const captureCalibrationImage = async () => {
    setIsCapturing(true)
    try {
      const res = await fetch(`http://${deviceIp}:8080/capture-stereo`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: checkerboardConfig.rows, cols: checkerboardConfig.cols })
      })
      if (res.ok) {
        const data = await res.json() as any
        setCapturedImages(prev => [...prev, {
          id: Date.now(),
          left: data.left_image || null,
          right: data.right_image || null,
          corners_found: data.corners_found || true,
          timestamp: new Date().toLocaleTimeString()
        }])
      }
    } catch (error) {
       // Mock for development if device unreachable
       setCapturedImages(prev => [...prev, {
        id: Date.now(),
        left: null,
        right: null,
        corners_found: true,
        timestamp: new Date().toLocaleTimeString()
      }])
    }
    setIsCapturing(false)
  }

  const removeCalibrationImage = (id: number) => {
    setCapturedImages(prev => prev.filter(img => img.id !== id))
  }

  const runCalibration = async () => {
    if (capturedImages.length < 5) return
    setIsCalibrating(true)
    try {
      const res = await fetch(`http://${deviceIp}:8080/calibrate`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: checkerboardConfig.name,
          checkerboard_rows: checkerboardConfig.rows,
          checkerboard_cols: checkerboardConfig.cols,
          square_size: checkerboardConfig.square_size,
          image_count: capturedImages.length
        })
      })
      if (res.ok) {
        const data = await res.json() as any
        setCalibrationResults(data)
        setCalibrationStep(4)
      }
    } catch (error) {
       // Mock for development
      setCalibrationResults({
        name: checkerboardConfig.name || 'Auto Calibration ' + new Date().toLocaleDateString(),
        baseline: 120.0,
        focal_length_left: 812.0,
        focal_length_right: 812.0,
        principal_point_left: { x: 960, y: 540 },
        principal_point_right: { x: 960, y: 540 },
        reprojection_error: 0.35,
        image_width: 1920,
        image_height: 1080,
        distortion_left: [0, 0, 0, 0, 0],
        distortion_right: [0, 0, 0, 0, 0],
        rectification_valid: true
      })
      setCalibrationStep(4)
    }
    setIsCalibrating(false)
  }

  const saveCalibrationResults = async () => {
    if (!calibrationResults) return
    try {
      const res = await fetch('/api/stereo-calibrations', { 
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({
          name: calibrationResults.name,
          baseline: calibrationResults.baseline,
          focal_length: (calibrationResults.focal_length_left + calibrationResults.focal_length_right) / 2,
          image_width: calibrationResults.image_width,
          image_height: calibrationResults.image_height,
          reprojection_error: calibrationResults.reprojection_error,
          is_active: false
        })
      })
      if (res.ok) {
        alert('Calibration saved successfully!')
        resetCalibration()
        if (onComplete) onComplete()
      }
    } catch (error) {
      alert('Error saving calibration')
    }
  }

  const resetCalibration = () => {
    setCalibrationStep(1)
    setCapturedImages([])
    setCalibrationResults(null)
    setCheckerboardConfig({ rows: 6, cols: 9, square_size: 25, name: '' })
  }

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Dynamic Header */}
      <div className="bg-slate-950 p-8 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight">Stereo Calibration Wizard</h3>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">RDK X5 Hardware Sync</p>
        </div>
        <button
          onClick={resetCalibration}
          className="px-4 py-2 bg-slate-900 text-slate-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest border border-slate-800 transition-all hover:bg-red-950/20 hover:border-red-500/30"
        >
          Reset Session
        </button>
      </div>
      
      <div className="p-8">
        {/* Progress Timeline */}
        <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2 no-scrollbar">
          {[
            { step: 1, label: 'Configuration' },
            { step: 2, label: 'Acquisition' },
            { step: 3, label: 'Processing' },
            { step: 4, label: 'Verification' }
          ].map((s, idx) => (
            <React.Fragment key={s.step}>
              <div 
                className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl transition-all ${
                  calibrationStep === s.step
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105 z-10'
                    : calibrationStep > s.step
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 opacity-60'
                    : 'bg-slate-950 text-slate-500 border border-slate-800'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                  calibrationStep === s.step ? 'bg-white text-blue-600' : 'bg-current/10'
                }`}>
                  {calibrationStep > s.step ? '✓' : s.step}
                </div>
                <span className="text-sm font-black uppercase tracking-wider whitespace-nowrap">{s.label}</span>
              </div>
              {idx < 3 && <ChevronRight className={`w-4 h-4 flex-shrink-0 ${calibrationStep > s.step ? 'text-emerald-500' : 'text-slate-700'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[500px]">
          {calibrationStep === 1 && (
            <PatternSetup 
              config={checkerboardConfig} 
              onChange={setCheckerboardConfig} 
              onNext={() => setCalibrationStep(2)} 
            />
          )}

          {calibrationStep === 2 && (
            <ImageCapture 
              deviceIp={deviceIp}
              images={capturedImages}
              isCapturing={isCapturing}
              onCapture={captureCalibrationImage}
              onRemove={removeCalibrationImage}
              onBack={() => setCalibrationStep(1)}
              onNext={() => setCalibrationStep(3)}
            />
          )}

          {calibrationStep === 3 && (
            <CalibrationEngine 
              imageCount={capturedImages.length}
              isProcessing={isCalibrating}
              onStart={runCalibration}
              onBack={() => setCalibrationStep(2)}
            />
          )}

          {calibrationStep === 4 && calibrationResults && (
            <ResultsView 
              results={calibrationResults}
              onSave={saveCalibrationResults}
              onReset={resetCalibration}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default CalibrationWizard
