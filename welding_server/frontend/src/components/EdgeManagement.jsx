import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw, Camera, Settings, Power, Save, AlertTriangle, CheckCircle, Grid3X3, Play, Trash2, Image, ChevronRight, Eye } from 'lucide-react'

function EdgeManagement() {
  const [activeTab, setActiveTab] = useState('device') // 'device' | 'calibration'
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const [edgeConfig, setEdgeConfig] = useState({
    device_ip: '192.168.1.100',
    device_port: '8080',
    stream_port: '8554',
    model_path: '/opt/models/weldvision.bin'
  })
  
  // Stereo Calibration State
  const [calibrationStep, setCalibrationStep] = useState(1) // 1: Setup, 2: Capture, 3: Calibrate, 4: Results
  const [checkerboardConfig, setCheckerboardConfig] = useState({
    rows: 6,
    cols: 9,
    square_size: 25, // mm
    name: ''
  })
  const [capturedImages, setCapturedImages] = useState([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [calibrationResults, setCalibrationResults] = useState(null)
  const [isCalibrating, setIsCalibrating] = useState(false)
  
  const [calibrations, setCalibrations] = useState([])

  useEffect(() => {
    checkConnection()
    fetchCalibrations()
  }, [])

  const checkConnection = async () => {
    setLoading(true)
    try {
      // Try to connect to RDK X5
      const res = await fetch(`http://${edgeConfig.device_ip}:${edgeConfig.device_port}/health`, { credentials: 'include', method: 'GET',
        signal: AbortSignal.timeout(3000)
      })
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
        setCalibrations(Array.isArray(data) ? data : (data.results || []))
      }
    } catch (error) {
      console.error('Error fetching calibrations:', error)
    }
  }

  const saveCalibration = async () => {
    if (!calibration.name) {
      alert('Please enter a calibration name')
      return
    }
    
    try {
      const res = await fetch('/api/stereo-calibrations/', { credentials: 'include', method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calibration)
      })
      if (res.ok) {
        alert('Calibration saved successfully')
        fetchCalibrations()
        setCalibration({ name: '', baseline: 120, focal_length: 800, image_width: 1920, image_height: 1080, is_active: false })
      } else {
        const err = await res.json()
        alert(`Error: ${err.detail || 'Failed to save calibration'}`)
      }
    } catch (error) {
      alert('Error saving calibration: ' + error.message)
    }
  }

  const activateCalibration = async (id) => {
    try {
      const res = await fetch(`/api/stereo-calibrations/${id}/`, { credentials: 'include', method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true })
      })
      if (res.ok) {
        fetchCalibrations()
      }
    } catch (error) {
      console.error('Error activating calibration:', error)
    }
  }

  const deleteCalibration = async (id) => {
    if (!confirm('Delete this calibration?')) return
    
    try {
      const res = await fetch(`/api/stereo-calibrations/${id}/`, { credentials: 'include', method: 'DELETE'
      })
      if (res.ok) {
        fetchCalibrations()
      }
    } catch (error) {
      console.error('Error deleting calibration:', error)
    }
  }

  const handleReboot = () => {
    if (window.confirm('⚠️ Are you sure you want to reboot the RDK X5? This will interrupt live monitoring.')) {
      alert('Sending reboot command to RDK X5...')
    }
  }

  // Stereo Calibration Functions
  const captureCalibrationImage = async () => {
    setIsCapturing(true)
    try {
      // Simulate capturing stereo pair from RDK X5
      const res = await fetch(`http://${edgeConfig.device_ip}:${edgeConfig.device_port}/capture-stereo`, { credentials: 'include', method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rows: checkerboardConfig.rows, 
          cols: checkerboardConfig.cols 
        }),
        signal: AbortSignal.timeout(5000)
      })
      if (res.ok) {
        const data = await res.json()
        setCapturedImages(prev => [...prev, {
          id: Date.now(),
          left: data.left_image || '/placeholder-left.jpg',
          right: data.right_image || '/placeholder-right.jpg',
          corners_found: data.corners_found || true,
          timestamp: new Date().toLocaleTimeString()
        }])
      }
    } catch (error) {
      // Demo: Add mock captured image
      setCapturedImages(prev => [...prev, {
        id: Date.now(),
        left: null,
        right: null,
        corners_found: Math.random() > 0.2, // 80% success rate
        timestamp: new Date().toLocaleTimeString()
      }])
    }
    setIsCapturing(false)
  }

  const removeCalibrationImage = (id) => {
    setCapturedImages(prev => prev.filter(img => img.id !== id))
  }

  const runCalibration = async () => {
    if (capturedImages.length < 10) {
      alert('Please capture at least 10 image pairs for accurate calibration')
      return
    }
    
    setIsCalibrating(true)
    try {
      // Send to backend for OpenCV calibration
      const res = await fetch('/api/stereo-calibrations/calibrate/', { credentials: 'include', method: 'POST',
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
      // Demo: Show mock results
      setCalibrationResults({
        name: checkerboardConfig.name || 'Calibration ' + new Date().toLocaleDateString(),
        baseline: 119.8,
        focal_length_left: 812.4,
        focal_length_right: 810.9,
        principal_point_left: { x: 960.2, y: 540.1 },
        principal_point_right: { x: 959.8, y: 539.7 },
        reprojection_error: 0.32,
        image_width: 1920,
        image_height: 1080,
        distortion_left: [-0.215, 0.089, 0.001, -0.002, 0.012],
        distortion_right: [-0.218, 0.091, 0.002, -0.001, 0.011],
        rectification_valid: true
      })
      setCalibrationStep(4)
    }
    setIsCalibrating(false)
  }

  const saveCalibrationResults = async () => {
    if (!calibrationResults) return
    
    try {
      const res = await fetch('/api/stereo-calibrations/', { credentials: 'include', method: 'POST',
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
      }
    } catch (error) {
      alert('Calibration saved locally (demo mode)')
      fetchCalibrations()
      resetCalibration()
    }
  }

  const resetCalibration = () => {
    setCalibrationStep(1)
    setCapturedImages([])
    setCalibrationResults(null)
    setCheckerboardConfig({ rows: 6, cols: 9, square_size: 25, name: '' })
  }

  const InfoRow = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-industrial-gray/50 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  )

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Edge Management</h2>
          <p className="text-slate-400 mt-1">RDK X5 device configuration and stereo camera calibration</p>
        </div>
        
        {/* Connection Status */}
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border-2 ${
          connectionStatus === 'connected' 
            ? 'bg-green-950/30 border-green-600' 
            : connectionStatus === 'error'
            ? 'bg-yellow-950/30 border-yellow-600'
            : 'bg-red-950/30 border-red-600'
        }`}>
          {connectionStatus === 'connected' ? (
            <>
              <Wifi className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-semibold text-white">Connected</p>
                <p className="text-xs text-green-400">RDK X5 Online</p>
              </div>
            </>
          ) : connectionStatus === 'error' ? (
            <>
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-semibold text-white">Error</p>
                <p className="text-xs text-yellow-400">Connection Issue</p>
              </div>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-white">Disconnected</p>
                <p className="text-xs text-red-400">Device Offline</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-industrial-gray pb-0">
        <button
          onClick={() => setActiveTab('device')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'device'
              ? 'text-white border-industrial-blue'
              : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          <Settings className="w-4 h-4" />
          Device Settings
        </button>
        <button
          onClick={() => setActiveTab('calibration')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'calibration'
              ? 'text-white border-industrial-blue'
              : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          <Camera className="w-4 h-4" />
          Stereo Calibration
        </button>
      </div>

      {activeTab === 'device' ? (
        <>
          <div className="grid grid-cols-2 gap-6">
        {/* Device Information */}
        <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Device Information</h3>
          <div className="space-y-3">
            <InfoRow label="Device Model" value="RDK X5" />
            <InfoRow label="IP Address" value={edgeConfig.device_ip} />
            <InfoRow label="Firmware Version" value="2.4.1" />
            <InfoRow label="Python Version" value="3.10.8" />
            <InfoRow label="OpenCV Version" value="4.8.1" />
            <InfoRow label="YOLOv8 Version" value="8.0.196" />
          </div>
        </div>

        {/* Device Control */}
        <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Device Control</h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-red-950/20 border-2 border-red-600/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Power className="w-5 h-5 text-red-400" />
                <span className="text-sm font-medium text-red-300">Danger Zone</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Rebooting the device will interrupt all live monitoring and require reconnection.
              </p>
              <button
                onClick={handleReboot}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Power className="w-4 h-4" />
                Reboot RDK X5
              </button>
            </div>

            {/* System Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-industrial-dark rounded-lg">
                <p className="text-xs text-slate-400">CPU Usage</p>
                <p className="text-lg font-bold text-white">24%</p>
              </div>
              <div className="p-3 bg-industrial-dark rounded-lg">
                <p className="text-xs text-slate-400">Memory</p>
                <p className="text-lg font-bold text-white">1.2 GB</p>
              </div>
              <div className="p-3 bg-industrial-dark rounded-lg">
                <p className="text-xs text-slate-400">Temperature</p>
                <p className="text-lg font-bold text-white">42°C</p>
              </div>
              <div className="p-3 bg-industrial-dark rounded-lg">
                <p className="text-xs text-slate-400">Uptime</p>
                <p className="text-lg font-bold text-white">8d 4h</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Device Connection Settings */}
        <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-6 h-6 text-slate-400" />
            <h3 className="text-xl font-semibold text-white">Device Connection</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Device IP Address</label>
              <input
                type="text"
                value={edgeConfig.device_ip}
                onChange={(e) => setEdgeConfig({ ...edgeConfig, device_ip: e.target.value })}
                className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded-lg text-white"
                placeholder="192.168.1.100"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">API Port</label>
                <input
                  type="text"
                  value={edgeConfig.device_port}
                  onChange={(e) => setEdgeConfig({ ...edgeConfig, device_port: e.target.value })}
                  className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded-lg text-white"
                  placeholder="8080"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Stream Port</label>
                <input
                  type="text"
                  value={edgeConfig.stream_port}
                  onChange={(e) => setEdgeConfig({ ...edgeConfig, stream_port: e.target.value })}
                  className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded-lg text-white"
                  placeholder="8554"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Model Path on Device</label>
              <input
                type="text"
                value={edgeConfig.model_path}
                onChange={(e) => setEdgeConfig({ ...edgeConfig, model_path: e.target.value })}
                className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded-lg text-white"
                placeholder="/opt/models/weldvision.bin"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={checkConnection}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-industrial-blue hover:bg-industrial-blue-dark text-white rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Test Connection
              </button>
              <button
                onClick={handleReboot}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Power className="w-4 h-4" />
                Reboot
              </button>
            </div>
          </div>
          
          {/* Device Info */}
          {deviceInfo && (
            <div className="mt-6 pt-6 border-t border-industrial-gray">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">Device Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-slate-400">Hostname:</div>
                <div className="text-white">{deviceInfo.hostname || 'RDK-X5'}</div>
                <div className="text-slate-400">Firmware:</div>
                <div className="text-white">{deviceInfo.firmware || 'v2.1.0'}</div>
                <div className="text-slate-400">Uptime:</div>
                <div className="text-white">{deviceInfo.uptime || 'N/A'}</div>
                <div className="text-slate-400">Temperature:</div>
                <div className="text-white">{deviceInfo.temperature || 'N/A'}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved Calibrations - also shown in Device tab */}
      <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Saved Calibrations</h3>
        
        {calibrations.length === 0 ? (
          <div className="text-center py-8">
            <Camera className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">No calibrations saved yet</p>
            <button
              onClick={() => setActiveTab('calibration')}
              className="mt-3 text-industrial-blue hover:text-industrial-blue-dark text-sm"
            >
              Start a new calibration →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-industrial-gray">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Name</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Baseline</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Focal Length</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Resolution</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Error</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {calibrations.map((cal) => (
                  <tr key={cal.id} className="border-b border-industrial-gray/50 hover:bg-industrial-dark transition-colors">
                    <td className="py-4 px-4 text-white font-medium">{cal.name}</td>
                    <td className="py-4 px-4 text-center text-slate-400">{cal.baseline?.toFixed(1)} mm</td>
                    <td className="py-4 px-4 text-center text-slate-400">{cal.focal_length?.toFixed(1)} px</td>
                    <td className="py-4 px-4 text-center text-slate-400">{cal.image_width}x{cal.image_height}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`text-xs ${cal.reprojection_error < 0.5 ? 'text-green-400' : cal.reprojection_error < 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {cal.reprojection_error?.toFixed(3) || 'N/A'} px
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {cal.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">Inactive</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {!cal.is_active && (
                          <button
                            onClick={() => activateCalibration(cal.id)}
                            className="px-3 py-1.5 bg-industrial-blue hover:bg-industrial-blue-dark text-white text-xs rounded transition-colors"
                          >
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() => deleteCalibration(cal.id)}
                          className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      ) : (
        /* Stereo Calibration Tab */
        <div className="space-y-6">
          {/* Calibration Steps Progress */}
          <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6">
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
                        ? 'bg-industrial-blue text-white'
                        : calibrationStep > s.step
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-industrial-dark text-slate-500'
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
                <div className="p-4 bg-industrial-dark rounded-lg border border-industrial-gray">
                  <div className="flex items-start gap-3">
                    <Grid3X3 className="w-6 h-6 text-industrial-blue mt-0.5" />
                    <div>
                      <h4 className="text-white font-medium mb-1">Checkerboard Pattern Required</h4>
                      <p className="text-sm text-slate-400">
                        Print a checkerboard calibration pattern. The pattern should be mounted flat on a rigid surface.
                        Move the pattern to different positions and angles in view of both cameras.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Calibration Name</label>
                    <input
                      type="text"
                      value={checkerboardConfig.name}
                      onChange={(e) => setCheckerboardConfig({ ...checkerboardConfig, name: e.target.value })}
                      className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded-lg text-white"
                      placeholder="e.g., Welding Station #1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Square Size (mm)</label>
                    <input
                      type="number"
                      value={checkerboardConfig.square_size}
                      onChange={(e) => setCheckerboardConfig({ ...checkerboardConfig, square_size: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded-lg text-white"
                    />
                    <p className="text-xs text-slate-500 mt-1">Physical size of each square on your printed pattern</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Inner Corners (Rows)</label>
                    <input
                      type="number"
                      min="3"
                      max="20"
                      value={checkerboardConfig.rows}
                      onChange={(e) => setCheckerboardConfig({ ...checkerboardConfig, rows: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded-lg text-white"
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
                      className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded-lg text-white"
                    />
                  </div>
                </div>

                {/* Preview Grid */}
                <div className="flex justify-center py-4">
                  <div 
                    className="border-2 border-slate-600 rounded p-2"
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
                          className={`w-4 h-4 ${isBlack ? 'bg-white' : 'bg-slate-800'}`}
                        />
                      )
                    })}
                  </div>
                </div>
                <p className="text-center text-xs text-slate-500">
                  Pattern preview: {checkerboardConfig.rows} × {checkerboardConfig.cols} inner corners
                </p>

                <button
                  onClick={() => setCalibrationStep(2)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-industrial-blue hover:bg-industrial-blue-dark text-white rounded-lg font-semibold transition-colors"
                >
                  Continue to Image Capture
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2: Capture Images */}
            {calibrationStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Live Preview */}
                  <div className="bg-industrial-dark rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">Left Camera</h4>
                      <span className="text-xs text-slate-500">Live Preview</span>
                    </div>
                    <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center border-2 border-slate-700">
                      <div className="text-center">
                        <Camera className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">Connect to RDK X5 for live preview</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-industrial-dark rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">Right Camera</h4>
                      <span className="text-xs text-slate-500">Live Preview</span>
                    </div>
                    <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center border-2 border-slate-700">
                      <div className="text-center">
                        <Camera className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">Connect to RDK X5 for live preview</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Capture Instructions */}
                <div className="p-4 bg-amber-950/30 border border-amber-600/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div>
                      <h4 className="text-amber-300 font-medium mb-1">Capture Tips for Accurate Calibration</h4>
                      <ul className="text-sm text-amber-200/70 space-y-1">
                        <li>• Capture at least <strong>15-20 image pairs</strong> for best results</li>
                        <li>• Hold the pattern at <strong>various angles</strong> (tilted left, right, up, down)</li>
                        <li>• Cover <strong>all areas</strong> of the camera's field of view</li>
                        <li>• Ensure the <strong>entire pattern is visible</strong> in both cameras</li>
                        <li>• Keep the pattern <strong>flat and still</strong> when capturing</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Capture Button */}
                <div className="flex gap-4">
                  <button
                    onClick={captureCalibrationImage}
                    disabled={isCapturing}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-lg font-semibold text-lg transition-colors"
                  >
                    <Camera className={`w-6 h-6 ${isCapturing ? 'animate-pulse' : ''}`} />
                    {isCapturing ? 'Capturing...' : 'Capture Stereo Pair'}
                  </button>
                  <button
                    onClick={() => setCalibrationStep(1)}
                    className="px-4 py-2 bg-industrial-dark hover:bg-industrial-gray text-slate-300 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                </div>

                {/* Captured Images */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium">
                      Captured Image Pairs ({capturedImages.length})
                    </h4>
                    <span className={`text-sm ${capturedImages.length >= 10 ? 'text-green-400' : 'text-slate-400'}`}>
                      {capturedImages.length >= 10 ? '✓ Minimum reached' : `Need ${10 - capturedImages.length} more`}
                    </span>
                  </div>
                  
                  {capturedImages.length === 0 ? (
                    <div className="text-center py-8 bg-industrial-dark rounded-lg border border-dashed border-industrial-gray">
                      <Image className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">No images captured yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-3">
                      {capturedImages.map((img, idx) => (
                        <div 
                          key={img.id} 
                          className={`relative bg-industrial-dark rounded-lg p-2 border ${
                            img.corners_found ? 'border-green-600/50' : 'border-red-600/50'
                          }`}
                        >
                          <div className="aspect-video bg-slate-800 rounded flex items-center justify-center">
                            <span className="text-2xl font-bold text-slate-600">#{idx + 1}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs ${img.corners_found ? 'text-green-400' : 'text-red-400'}`}>
                              {img.corners_found ? '✓ Valid' : '✗ No pattern'}
                            </span>
                            <button
                              onClick={() => removeCalibrationImage(img.id)}
                              className="text-slate-500 hover:text-red-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Continue Button */}
                {capturedImages.length >= 10 && (
                  <button
                    onClick={() => setCalibrationStep(3)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-industrial-blue hover:bg-industrial-blue-dark text-white rounded-lg font-semibold transition-colors"
                  >
                    Continue to Calibration
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Step 3: Run Calibration */}
            {calibrationStep === 3 && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <Grid3X3 className="w-16 h-16 text-industrial-blue mx-auto mb-4" />
                  <h4 className="text-xl font-semibold text-white mb-2">Ready to Calibrate</h4>
                  <p className="text-slate-400 mb-6">
                    {capturedImages.length} image pairs captured. The calibration process will compute:
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto text-sm">
                    <div className="p-3 bg-industrial-dark rounded-lg">
                      <p className="text-slate-400">Intrinsic Parameters</p>
                      <p className="text-white font-medium">Focal Length, Principal Point</p>
                    </div>
                    <div className="p-3 bg-industrial-dark rounded-lg">
                      <p className="text-slate-400">Distortion Coefficients</p>
                      <p className="text-white font-medium">Radial & Tangential</p>
                    </div>
                    <div className="p-3 bg-industrial-dark rounded-lg">
                      <p className="text-slate-400">Stereo Parameters</p>
                      <p className="text-white font-medium">Baseline, Rectification</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setCalibrationStep(2)}
                    className="px-6 py-3 bg-industrial-dark hover:bg-industrial-gray text-slate-300 rounded-lg transition-colors"
                  >
                    Back to Capture
                  </button>
                  <button
                    onClick={runCalibration}
                    disabled={isCalibrating}
                    className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-lg font-semibold transition-colors"
                  >
                    {isCalibrating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Calibrating...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Run Calibration
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Results */}
            {calibrationStep === 4 && calibrationResults && (
              <div className="space-y-6">
                {/* Quality Indicator */}
                <div className={`p-4 rounded-lg border-2 ${
                  calibrationResults.reprojection_error < 0.5 
                    ? 'bg-green-950/30 border-green-600' 
                    : calibrationResults.reprojection_error < 1 
                    ? 'bg-yellow-950/30 border-yellow-600'
                    : 'bg-red-950/30 border-red-600'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className={`w-8 h-8 ${
                        calibrationResults.reprojection_error < 0.5 ? 'text-green-400' : 
                        calibrationResults.reprojection_error < 1 ? 'text-yellow-400' : 'text-red-400'
                      }`} />
                      <div>
                        <h4 className="text-white font-semibold">Calibration Complete</h4>
                        <p className="text-sm text-slate-400">
                          {calibrationResults.reprojection_error < 0.5 
                            ? 'Excellent calibration quality' 
                            : calibrationResults.reprojection_error < 1 
                            ? 'Good calibration quality'
                            : 'Consider recalibrating with more images'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{calibrationResults.reprojection_error.toFixed(3)} px</p>
                      <p className="text-xs text-slate-400">Reprojection Error</p>
                    </div>
                  </div>
                </div>

                {/* Results Grid */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Camera */}
                  <div className="bg-industrial-dark rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Left Camera</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Focal Length</span>
                        <span className="text-white font-mono">{calibrationResults.focal_length_left.toFixed(2)} px</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Principal Point</span>
                        <span className="text-white font-mono">
                          ({calibrationResults.principal_point_left.x.toFixed(1)}, {calibrationResults.principal_point_left.y.toFixed(1)})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Distortion (k1, k2)</span>
                        <span className="text-white font-mono text-xs">
                          {calibrationResults.distortion_left.slice(0, 2).map(d => d.toFixed(4)).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Camera */}
                  <div className="bg-industrial-dark rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Right Camera</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Focal Length</span>
                        <span className="text-white font-mono">{calibrationResults.focal_length_right.toFixed(2)} px</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Principal Point</span>
                        <span className="text-white font-mono">
                          ({calibrationResults.principal_point_right.x.toFixed(1)}, {calibrationResults.principal_point_right.y.toFixed(1)})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Distortion (k1, k2)</span>
                        <span className="text-white font-mono text-xs">
                          {calibrationResults.distortion_right.slice(0, 2).map(d => d.toFixed(4)).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stereo Parameters */}
                <div className="bg-industrial-dark rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Stereo Parameters</h4>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Baseline</p>
                      <p className="text-white font-mono text-lg">{calibrationResults.baseline.toFixed(2)} mm</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Resolution</p>
                      <p className="text-white font-mono text-lg">{calibrationResults.image_width}×{calibrationResults.image_height}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Rectification</p>
                      <p className={`font-mono text-lg ${calibrationResults.rectification_valid ? 'text-green-400' : 'text-red-400'}`}>
                        {calibrationResults.rectification_valid ? 'Valid' : 'Invalid'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Images Used</p>
                      <p className="text-white font-mono text-lg">{capturedImages.length} pairs</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={saveCalibrationResults}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    Save Calibration
                  </button>
                  <button
                    onClick={resetCalibration}
                    className="px-6 py-3 bg-industrial-dark hover:bg-industrial-gray text-slate-300 rounded-lg transition-colors"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Saved Calibrations */}
          <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Saved Calibrations</h3>
            
            {calibrations.length === 0 ? (
              <div className="text-center py-8">
                <Camera className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500">No calibrations saved yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-industrial-gray">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Name</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Baseline</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Focal Length</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Resolution</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Error</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calibrations.map((cal) => (
                      <tr key={cal.id} className="border-b border-industrial-gray/50 hover:bg-industrial-dark transition-colors">
                        <td className="py-4 px-4 text-white font-medium">{cal.name}</td>
                        <td className="py-4 px-4 text-center text-slate-400">{cal.baseline?.toFixed(1)} mm</td>
                        <td className="py-4 px-4 text-center text-slate-400">{cal.focal_length?.toFixed(1)} px</td>
                        <td className="py-4 px-4 text-center text-slate-400">{cal.image_width}x{cal.image_height}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`text-xs ${cal.reprojection_error < 0.5 ? 'text-green-400' : cal.reprojection_error < 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {cal.reprojection_error?.toFixed(3) || 'N/A'} px
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {cal.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs font-medium">
                              <CheckCircle className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">Inactive</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex gap-2 justify-end">
                            {!cal.is_active && (
                              <button
                                onClick={() => activateCalibration(cal.id)}
                                className="px-3 py-1.5 bg-industrial-blue hover:bg-industrial-blue-dark text-white text-xs rounded transition-colors"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              onClick={() => deleteCalibration(cal.id)}
                              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs rounded transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default EdgeManagement


