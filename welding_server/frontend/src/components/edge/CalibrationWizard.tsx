import React from 'react'
import { 
  Grid3X3, 
  ChevronRight, 
  Camera, 
  AlertTriangle, 
  Play, 
  Trash2, 
  Image as ImageIcon,
  CheckCircle,
  Eye,
  RefreshCw,
  Save,
  X
} from 'lucide-react'
import { CheckerboardConfig, CapturedImage, CalibrationResults } from './types'

interface CalibrationWizardProps {
  calibrationStep: number;
  setCalibrationStep: (step: number) => void;
  checkerboardConfig: CheckerboardConfig;
  setCheckerboardConfig: (config: CheckerboardConfig) => void;
  capturedImages: CapturedImage[];
  isCapturing: boolean;
  captureCalibrationImage: () => void;
  removeCalibrationImage: (id: number) => void;
  runCalibration: () => void;
  isCalibrating: boolean;
  calibrationResults: CalibrationResults | null;
  saveCalibrationResults: () => void;
  resetCalibration: () => void;
  deviceIp: string;
}

const CalibrationWizard: React.FC<CalibrationWizardProps> = ({
  calibrationStep,
  setCalibrationStep,
  checkerboardConfig,
  setCheckerboardConfig,
  capturedImages,
  isCapturing,
  captureCalibrationImage,
  removeCalibrationImage,
  runCalibration,
  isCalibrating,
  calibrationResults,
  saveCalibrationResults,
  resetCalibration,
  deviceIp
}) => {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Stereo Camera Calibration Wizard</h3>
        <button
          onClick={resetCalibration}
          className="text-sm text-slate-400 hover:text-white"
        >
          Reset
        </button>
      </div>
      
      {/* Step Indicators */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { step: 1, label: 'Pattern Setup' },
          { step: 2, label: 'Capture Images' },
          { step: 3, label: 'Run Calibration' },
          { step: 4, label: 'Results' }
        ].map((s, idx) => (
          <div key={s.step} className="flex items-center">
            <div
              onClick={() => s.step < calibrationStep && setCalibrationStep(s.step)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                calibrationStep === s.step
                  ? 'bg-blue-600 text-white'
                  : calibrationStep > s.step
                  ? 'bg-emerald-900/50 text-emerald-400'
                  : 'bg-slate-950 text-slate-500'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-current/20 flex items-center justify-center text-sm font-bold">
                {calibrationStep > s.step ? '✓' : s.step}
              </span>
              <span className="text-sm font-medium">{s.label}</span>
            </div>
            {idx < 3 && <ChevronRight className="w-4 h-4 text-slate-600 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Pattern Setup */}
      {calibrationStep === 1 && (
        <div className="space-y-6">
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex items-start gap-3">
              <Grid3X3 className="w-6 h-6 text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-white font-medium mb-1">Checkerboard Pattern Required</h4>
                <p className="text-sm text-slate-400">
                  Print a checkerboard calibration pattern. The pattern should be mounted flat on a rigid surface.
                  Move the pattern to different positions and angles in view of both cameras.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Calibration Name</label>
              <input
                type="text"
                value={checkerboardConfig.name}
                onChange={(e) => setCheckerboardConfig({ ...checkerboardConfig, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                placeholder="e.g., Welding Station #1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Square Size (mm)</label>
              <input
                type="number"
                value={checkerboardConfig.square_size}
                onChange={(e) => setCheckerboardConfig({ ...checkerboardConfig, square_size: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
              <p className="text-xs text-slate-500 mt-1">Physical size of each square on your printed pattern</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Inner Corners (Rows)</label>
              <input
                type="number"
                min="3"
                max="20"
                value={checkerboardConfig.rows}
                onChange={(e) => setCheckerboardConfig({ ...checkerboardConfig, rows: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
              <p className="text-xs text-slate-500 mt-1">Count inner corners, not squares (e.g., 7x10 squares = 6x9 corners)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Inner Corners (Columns)</label>
              <input
                type="number"
                min="3"
                max="20"
                value={checkerboardConfig.cols}
                onChange={(e) => setCheckerboardConfig({ ...checkerboardConfig, cols: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Preview Grid */}
          <div className="flex flex-col items-center py-4">
            <div 
              className="border-2 border-slate-700 rounded p-2 bg-white"
              style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${checkerboardConfig.cols + 1}, 16px)`,
                gap: '0px'
              }}
            >
              {Array.from({ length: (checkerboardConfig.rows + 1) * (checkerboardConfig.cols + 1) }).map((_, idx) => {
                const row = Math.floor(idx / (checkerboardConfig.cols + 1))
                const col = idx % (checkerboardConfig.cols + 1)
                const isBlack = (row + col) % 2 === 0
                return (
                  <div 
                    key={idx} 
                    className={`w-4 h-4 ${isBlack ? 'bg-black' : 'bg-white'}`}
                  />
                )
              })}
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Pattern preview: {checkerboardConfig.rows} × {checkerboardConfig.cols} inner corners
            </p>
          </div>

          <button
            onClick={() => setCalibrationStep(2)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Continue to Image Capture
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Capture Images */}
      {calibrationStep === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Left Camera Preview</h4>
              <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center border-2 border-slate-800">
                <div className="text-center">
                  <Camera className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-600 text-sm">RDK X5 Stream: {deviceIp}</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-950 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Right Camera Preview</h4>
              <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center border-2 border-slate-800">
                <div className="text-center">
                  <Camera className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-600 text-sm">RDK X5 Stream: {deviceIp}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-950/20 border border-amber-600/30 rounded-lg flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-amber-200/70 text-sm">
              <h4 className="text-amber-400 font-medium mb-1">Capture Tips</h4>
              <ul className="space-y-1">
                <li>• Capture at least 15-20 image pairs</li>
                <li>• Hold the pattern at various angles and positions</li>
                <li>• Ensure the entire pattern is visible in both cameras</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={captureCalibrationImage}
              disabled={isCapturing}
              className="w-full max-w-xs h-16 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50"
            >
              {isCapturing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
              Capture Pair
            </button>
            <p className="text-slate-400 text-sm">{capturedImages.length} pairs captured</p>
          </div>

          {/* Captured Gallery */}
          {capturedImages.length > 0 && (
            <div className="mt-8">
              <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                Captured Images
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {capturedImages.map((img) => (
                  <div key={img.id} className="group relative bg-slate-950 rounded-lg border border-slate-800 p-2 overflow-hidden">
                    <div className="aspect-video bg-slate-900 rounded mb-2 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-slate-700" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${img.corners_found ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                        {img.corners_found ? 'Corners OK' : 'No Corners'}
                      </span>
                      <button 
                        onClick={() => removeCalibrationImage(img.id)}
                        className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-800 flex justify-between">
            <button onClick={() => setCalibrationStep(1)} className="px-6 py-2 text-slate-400 hover:text-white">Back</button>
            <button
              onClick={() => setCalibrationStep(3)}
              disabled={capturedImages.length < 5}
              className="px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              Proceed to Calibration
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Run Calibration */}
      {calibrationStep === 3 && (
        <div className="space-y-6 py-8 text-center">
          <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <RefreshCw className={`w-12 h-12 text-blue-500 ${isCalibrating ? 'animate-spin' : ''}`} />
          </div>
          <h4 className="text-2xl font-bold text-white">Compute Intrinsic & Extrinsic Parameters</h4>
          <p className="text-slate-400 max-w-md mx-auto">
            Ready to process {capturedImages.length} image pairs. This will calculate focal length, baseline, and distortion coefficients.
          </p>
          
          {!isCalibrating ? (
            <button
              onClick={runCalibration}
              className="mt-6 px-12 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-lg flex items-center gap-3 mx-auto transition-all"
            >
              <Play className="w-5 h-5" />
              Start OpenCV Engine
            </button>
          ) : (
            <div className="mt-8 space-y-4">
              <div className="w-full max-w-xs bg-slate-950 rounded-full h-2 mx-auto overflow-hidden">
                <div className="bg-blue-500 h-full animate-progress-indefinite" />
              </div>
              <p className="text-blue-400 text-sm animate-pulse">Running bundle adjustment...</p>
            </div>
          )}
          
          <button 
            disabled={isCalibrating} 
            onClick={() => setCalibrationStep(2)} 
            className="block mt-8 text-slate-500 hover:text-slate-400 mx-auto disabled:opacity-30"
          >
            ← Back to capture more images
          </button>
        </div>
      )}

      {/* Step 4: Results */}
      {calibrationStep === 4 && calibrationResults && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950 p-6 rounded-lg border border-slate-800 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Baseline</p>
              <p className="text-3xl font-bold text-white">{calibrationResults.baseline.toFixed(1)} <span className="text-sm font-normal text-slate-400">mm</span></p>
            </div>
            <div className="bg-slate-950 p-6 rounded-lg border border-slate-800 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Avg Focal Length</p>
              <p className="text-3xl font-bold text-white">{((calibrationResults.focal_length_left + calibrationResults.focal_length_right) / 2).toFixed(1)} <span className="text-sm font-normal text-slate-400">px</span></p>
            </div>
            <div className="bg-slate-950 p-6 rounded-lg border border-slate-800 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Reprojection Error</p>
              <p className={`text-3xl font-bold ${calibrationResults.reprojection_error < 0.5 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {calibrationResults.reprojection_error.toFixed(3)}
              </p>
            </div>
          </div>

          <div className="bg-slate-950 rounded-lg border border-slate-800 p-6">
            <h4 className="text-white font-medium mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" />
              Rectification Results
            </h4>
            <div className="aspect-[21/9] bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 mb-4 overflow-hidden relative">
              <div className="absolute inset-0 grid grid-cols-2 gap-px bg-slate-800">
                <div className="flex items-center justify-center text-slate-700">Left Rectified</div>
                <div className="flex items-center justify-center text-slate-700">Right Rectified</div>
              </div>
              <div className="absolute inset-x-0 h-px bg-emerald-500/30 top-1/4" />
              <div className="absolute inset-x-0 h-px bg-emerald-500/30 top-1/2" />
              <div className="absolute inset-x-0 h-px bg-emerald-500/30 top-3/4" />
              <div className="z-10 bg-slate-900/80 px-4 py-2 rounded-lg border border-emerald-500/50 text-emerald-400 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Epipolar lines aligned
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={resetCalibration}
              className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
            >
              Discard & Restart
            </button>
            <button
              onClick={saveCalibrationResults}
              className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
            >
              <Save className="w-5 h-5" />
              Deploy to RDK X5
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalibrationWizard
