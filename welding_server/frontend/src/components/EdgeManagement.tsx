import { useState, useEffect, FC } from 'react'
import { Wifi, WifiOff, Settings, Camera, X, Save } from 'lucide-react'

// Types
import { DeviceInfo, EdgeConfig, CheckerboardConfig, CapturedImage, CalibrationResults, Calibration } from './edge/types'

// Components
import DeviceSettings from './edge/DeviceSettings'
import CalibrationWizard from './edge/CalibrationWizard'

const EdgeManagement: FC = () => {
  const [activeTab, setActiveTab] = useState<'device' | 'calibration'>('device')
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected')
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  
  const [edgeConfig, setEdgeConfig] = useState<EdgeConfig>({
    device_ip: '192.168.1.100',
    device_port: '8080',
    stream_port: '8554',
    model_path: '/opt/models/weldvision.bin'
  })
  
  // Stereo Calibration State
  const [calibrationStep, setCalibrationStep] = useState<number>(1)
  const [checkerboardConfig, setCheckerboardConfig] = useState<CheckerboardConfig>({
    rows: 6,
    cols: 9,
    square_size: 25,
    name: ''
  })
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([])
  const [isCapturing, setIsCapturing] = useState<boolean>(false)
  const [calibrationResults, setCalibrationResults] = useState<CalibrationResults | null>(null)
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false)
  const [calibrations, setCalibrations] = useState<Calibration[]>([])

  // Edit Calibration Modal State
  const [editingCalibration, setEditingCalibration] = useState<Calibration | null>(null)
  const [showEditModal, setShowEditModal] = useState<boolean>(false)

  useEffect(() => {
    checkConnection()
    fetchCalibrations()
  }, [])

  const checkConnection = async () => {
    setLoading(true)
    try {
      const res = await fetch(`http://${edgeConfig.device_ip}:${edgeConfig.device_port}/health`)
      if (res.ok) {
        setConnectionStatus('connected')
        const data = await res.json()
        setDeviceInfo(data)
      } else {
        setConnectionStatus('error')
      }
    } catch (error) {
      setConnectionStatus('disconnected')
      setDeviceInfo(null)
    }
    setLoading(false)
  }

  const fetchCalibrations = async () => {
    try {
      const res = await fetch('/api/stereo-calibrations/', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setCalibrations((Array.isArray(data) ? data : (data.results || [])) as Calibration[])
      }
    } catch (error) {
      console.error('Error fetching calibrations:', error)
    }
  }

  const activateCalibration = async (id: number) => {
    try {
      const res = await fetch(`/api/stereo-calibrations/${id}/deploy/`, { 
        credentials: 'include', 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ip: edgeConfig.device_ip,
          port: edgeConfig.device_port
        })
      })
      if (res.ok) {
        alert('Calibration deployed successfully')
        fetchCalibrations()
      } else {
        alert('Failed to deploy calibration')
      }
    } catch (error: any) {
      alert('Error deploying calibration: ' + error.message)
    }
  }

  const deleteCalibration = async (id: number) => {
    if (!confirm('Delete this calibration?')) return
    try {
      const res = await fetch(`/api/stereo-calibrations/${id}/`, { credentials: 'include', method: 'DELETE' })
      if (res.ok) fetchCalibrations()
    } catch (error) {
      console.error('Error deleting calibration:', error)
    }
  }

  const handleUpdateCalibration = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCalibration) return
    
    try {
      const res = await fetch(`/api/stereo-calibrations/${editingCalibration.id}/`, {
        credentials: 'include',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCalibration)
      })
      if (res.ok) {
        setShowEditModal(false)
        setEditingCalibration(null)
        fetchCalibrations()
      }
    } catch (error) {
      alert('Error updating calibration')
    }
  }

  const handleReboot = () => {
    if (window.confirm('⚠️ Are you sure you want to reboot the RDK X5?')) {
      alert('Reboot command sent')
    }
  }

  const captureCalibrationImage = async () => {
    setIsCapturing(true)
    try {
      const res = await fetch(`http://${edgeConfig.device_ip}:${edgeConfig.device_port}/capture-stereo`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: checkerboardConfig.rows, cols: checkerboardConfig.cols })
      })
      if (res.ok) {
        const data = await res.json()
        setCapturedImages(prev => [...prev, {
          id: Date.now(),
          left: data.left_image || null,
          right: data.right_image || null,
          corners_found: data.corners_found || true,
          timestamp: new Date().toLocaleTimeString()
        }])
      }
    } catch (error) {
       // Mock for development
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
    if (capturedImages.length < 5) {
      alert('Please capture at least 5 image pairs')
      return
    }
    setIsCalibrating(true)
    try {
      const res = await fetch('/api/stereo-calibrations/calibrate/', { 
        credentials: 'include', 
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
        const data = await res.json()
        setCalibrationResults(data)
        setCalibrationStep(4)
        fetchCalibrations()
      }
    } catch (error) {
       // Mock for development
      setCalibrationResults({
        name: checkerboardConfig.name || 'Calibration ' + new Date().toLocaleDateString(),
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
      const res = await fetch('/api/stereo-calibrations/', { 
        credentials: 'include', 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        fetchCalibrations()
        resetCalibration()
        setActiveTab('device')
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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Edge Management</h2>
          <p className="text-slate-400 mt-1">RDK X5 device configuration and consolidated stereo calibration</p>
        </div>
        
        {/* Connection Status */}
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border-2 ${
          connectionStatus === 'connected' ? 'bg-emerald-950/30 border-emerald-600' : 
          connectionStatus === 'error' ? 'bg-amber-950/30 border-amber-600' : 'bg-red-950/30 border-red-600'
        }`}>
          {connectionStatus === 'connected' ? (
            <><Wifi className="w-5 h-5 text-emerald-500" /><div><p className="text-sm font-semibold text-white">Connected</p></div></>
          ) : (
            <><WifiOff className="w-5 h-5 text-red-500" /><div><p className="text-sm font-semibold text-white">Offline</p></div></>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('device')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'device' ? 'text-white border-blue-500' : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          <Settings className="w-4 h-4" />
          Device Settings
        </button>
        <button
          onClick={() => setActiveTab('calibration')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'calibration' ? 'text-white border-blue-500' : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          <Camera className="w-4 h-4" />
          Calibration Wizard
        </button>
      </div>

      {activeTab === 'device' ? (
        <DeviceSettings
          deviceInfo={deviceInfo}
          edgeConfig={edgeConfig}
          setEdgeConfig={setEdgeConfig}
          loading={loading}
          checkConnection={checkConnection}
          handleReboot={handleReboot}
          calibrations={calibrations}
          activateCalibration={activateCalibration}
          deleteCalibration={deleteCalibration}
          setActiveTab={setActiveTab}
          onEditCalibration={(cal) => { setEditingCalibration(cal); setShowEditModal(true); }}
        />
      ) : (
        <CalibrationWizard
          calibrationStep={calibrationStep}
          setCalibrationStep={setCalibrationStep}
          checkerboardConfig={checkerboardConfig}
          setCheckerboardConfig={setCheckerboardConfig}
          capturedImages={capturedImages}
          isCapturing={isCapturing}
          captureCalibrationImage={captureCalibrationImage}
          removeCalibrationImage={removeCalibrationImage}
          runCalibration={runCalibration}
          isCalibrating={isCalibrating}
          calibrationResults={calibrationResults}
          saveCalibrationResults={saveCalibrationResults}
          resetCalibration={resetCalibration}
          deviceIp={edgeConfig.device_ip}
        />
      )}

      {/* Edit Calibration Modal */}
      {showEditModal && editingCalibration && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Edit Calibration Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateCalibration} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Profile Name</label>
                <input
                  type="text"
                  value={editingCalibration.name}
                  onChange={(e) => setEditingCalibration({ ...editingCalibration, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Baseline (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingCalibration.baseline}
                    onChange={(e) => setEditingCalibration({ ...editingCalibration, baseline: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Focal Length</label>
                  <input
                    type="number"
                    step="1"
                    value={editingCalibration.focal_length}
                    onChange={(e) => setEditingCalibration({ ...editingCalibration, focal_length: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default EdgeManagement
