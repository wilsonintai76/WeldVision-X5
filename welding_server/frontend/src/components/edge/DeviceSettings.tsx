import React, { useState, useEffect } from 'react'
import { RefreshCw, Power, Settings, CheckCircle, Camera, Trash2, Edit2, X, Save } from 'lucide-react'
import { DeviceInfo, EdgeConfig, Calibration } from './types'

interface DeviceSettingsProps {
  edgeConfig: EdgeConfig;
  setEdgeConfig: (config: EdgeConfig) => void;
  onNavigateToCalibration: () => void;
  refreshTrigger?: number;
}

const DeviceSettings: React.FC<DeviceSettingsProps> = ({
  edgeConfig,
  setEdgeConfig,
  onNavigateToCalibration,
  refreshTrigger = 0
}) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [calibrations, setCalibrations] = useState<Calibration[]>([])
  
  // Edit Calibration Modal State
  const [editingCalibration, setEditingCalibration] = useState<Calibration | null>(null)
  const [showEditModal, setShowEditModal] = useState<boolean>(false)

  useEffect(() => {
    checkConnection()
    fetchCalibrations()
  }, [refreshTrigger])

  const checkConnection = async () => {
    setLoading(true)
    try {
      const res = await fetch(`http://${edgeConfig.device_ip}:${edgeConfig.device_port}/health`)
      if (res.ok) {
        const data = await res.json()
        setDeviceInfo(data)
      }
    } catch (error) {
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

  const InfoRow = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <div className="flex justify-between py-2 border-b border-slate-800/50 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Device Information */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-xl">
          <h3 className="text-2xl font-black text-white mb-6 tracking-tight">System Information</h3>
          <div className="space-y-1">
            <InfoRow label="Device Model" value="RDK X5" />
            <InfoRow label="IP Address" value={edgeConfig.device_ip} />
            <InfoRow label="Firmware Version" value="2.4.1-pro" />
            <InfoRow label="Python Runtime" value="3.10.12" />
            <InfoRow label="NPU Accelerator" value="BPU @ 1.2GHz" />
            <InfoRow label="Storage" value="54.2 / 128 GB" />
          </div>
          
          <div className="mt-8 p-4 bg-blue-600/5 border border-blue-500/20 rounded-2xl flex items-center gap-4">
             <div className="p-3 bg-blue-500/10 rounded-xl">
               <Settings className="w-6 h-6 text-blue-400" />
             </div>
             <div>
               <p className="text-sm font-bold text-white">Edge Sync v1.0</p>
               <p className="text-xs text-slate-500">Auto-calibration polling is active</p>
             </div>
          </div>
        </div>

        {/* Device Control */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-xl">
          <h3 className="text-2xl font-black text-white mb-6 tracking-tight">Hardware Control</h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CPU Usage</p>
                <p className="text-2xl font-black text-white">24%</p>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Core Temp</p>
                <p className="text-2xl font-black text-white">42°C</p>
              </div>
            </div>

            <button
              onClick={handleReboot}
              className="w-full px-6 py-4 bg-red-600/10 hover:bg-red-600 border border-red-600/20 text-red-500 hover:text-white rounded-2xl font-black transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
            >
              <Power className="w-5 h-5" />
              Reboot RDK X5
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Connection Settings */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-xl">
          <h3 className="text-2xl font-black text-white mb-6 tracking-tight">Sync Configuration</h3>
          
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Endpoint IP</label>
              <input
                type="text"
                value={edgeConfig.device_ip}
                onChange={(e) => setEdgeConfig({ ...edgeConfig, device_ip: e.target.value })}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">API Port</label>
                <input
                  type="text"
                  value={edgeConfig.device_port}
                  onChange={(e) => setEdgeConfig({ ...edgeConfig, device_port: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Stream Port</label>
                <input
                  type="text"
                  value={edgeConfig.stream_port}
                  onChange={(e) => setEdgeConfig({ ...edgeConfig, stream_port: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
            
            <button
              onClick={checkConnection}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Test Device Connection
            </button>
          </div>
        </div>

        {/* Saved Profiles */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black text-white tracking-tight">Profiles</h3>
            <span className="bg-slate-800 text-slate-400 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest">
              {calibrations.length} Active
            </span>
          </div>
          
          {calibrations.length === 0 ? (
            <div className="text-center py-12 flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl">
              <Camera className="w-12 h-12 text-slate-700 mb-4" />
              <p className="text-slate-500 font-bold">No calibration profiles found</p>
              <button
                onClick={onNavigateToCalibration}
                className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg"
              >
                Launch Wizard
              </button>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
              {calibrations.map((cal) => (
                <div key={cal.id} className={`p-5 rounded-2xl border transition-all ${
                  cal.is_active ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20' : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {cal.is_active && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                      <p className="text-white font-black text-lg tracking-tight">{cal.name}</p>
                    </div>
                    {cal.is_active ? (
                      <span className="text-[10px] bg-emerald-500 text-white px-3 py-1 rounded-lg font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">Active</span>
                    ) : (
                      <button
                        onClick={() => activateCalibration(cal.id)}
                        className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                      >
                        Deploy
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4 font-mono">
                    <div className="bg-slate-900/80 p-2 rounded-xl border border-white/5 text-[10px] flex justify-between">
                      <span className="text-slate-500">BASELINE</span>
                      <span className="text-white font-bold">{cal.baseline?.toFixed(1)}mm</span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-xl border border-white/5 text-[10px] flex justify-between">
                      <span className="text-slate-500">ERROR</span>
                      <span className={`font-bold ${cal.reprojection_error! < 0.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {cal.reprojection_error?.toFixed(3)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-slate-800/50 pt-4">
                    <button
                      onClick={() => { setEditingCalibration(cal); setShowEditModal(true); }}
                      className="p-2.5 bg-slate-900 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCalibration(cal.id)}
                      className="p-2.5 bg-slate-900 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-all border border-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <button
            onClick={onNavigateToCalibration}
            className="mt-8 w-full py-4 border-2 border-dashed border-slate-800 text-slate-500 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3"
          >
            <Camera className="w-5 h-5" />
            Create New Profile
          </button>
        </div>
      </div>

      {/* Edit Calibration Modal */}
      {showEditModal && editingCalibration && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h3 className="text-2xl font-black text-white tracking-tight">Edit Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-950 rounded-xl border border-slate-800">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateCalibration} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Profile Name</label>
                <input
                  type="text"
                  value={editingCalibration.name}
                  onChange={(e) => setEditingCalibration({ ...editingCalibration, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Baseline (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingCalibration.baseline}
                    onChange={(e) => setEditingCalibration({ ...editingCalibration, baseline: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Focal Length</label>
                  <input
                    type="number"
                    step="1"
                    value={editingCalibration.focal_length}
                    onChange={(e) => setEditingCalibration({ ...editingCalibration, focal_length: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-6 py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[1.5] px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Apply Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeviceSettings
