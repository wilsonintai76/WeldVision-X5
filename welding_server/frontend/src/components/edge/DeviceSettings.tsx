import React from 'react'
import { RefreshCw, Power, Settings, CheckCircle, Camera, Trash2, Edit2 } from 'lucide-react'
import { DeviceInfo, EdgeConfig, Calibration } from './types'

interface DeviceSettingsProps {
  deviceInfo: DeviceInfo | null;
  edgeConfig: EdgeConfig;
  setEdgeConfig: (config: EdgeConfig) => void;
  loading: boolean;
  checkConnection: () => void;
  handleReboot: () => void;
  calibrations: Calibration[];
  activateCalibration: (id: number) => void;
  deleteCalibration: (id: number) => void;
  setActiveTab: (tab: 'device' | 'calibration') => void;
  onEditCalibration: (cal: Calibration) => void;
}

const DeviceSettings: React.FC<DeviceSettingsProps> = ({
  deviceInfo,
  edgeConfig,
  setEdgeConfig,
  loading,
  checkConnection,
  handleReboot,
  calibrations,
  activateCalibration,
  deleteCalibration,
  setActiveTab,
  onEditCalibration
}) => {
  const InfoRow = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <div className="flex justify-between py-2 border-b border-slate-800/50 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Information */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
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
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
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
              <div className="p-3 bg-slate-950 rounded-lg">
                <p className="text-xs text-slate-400">CPU Usage</p>
                <p className="text-lg font-bold text-white">24%</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg">
                <p className="text-xs text-slate-400">Memory</p>
                <p className="text-lg font-bold text-white">1.2 GB</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg">
                <p className="text-xs text-slate-400">Temperature</p>
                <p className="text-lg font-bold text-white">42°C</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg">
                <p className="text-xs text-slate-400">Uptime</p>
                <p className="text-lg font-bold text-white">8d 4h</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Connection Settings */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
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
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
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
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  placeholder="8080"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Stream Port</label>
                <input
                  type="text"
                  value={edgeConfig.stream_port}
                  onChange={(e) => setEdgeConfig({ ...edgeConfig, stream_port: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
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
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                placeholder="/opt/models/weldvision.bin"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={checkConnection}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-bold text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Test Connection
              </button>
            </div>
          </div>
          
          {/* Device Info */}
          {deviceInfo && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">Health Status</h4>
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

        {/* Saved Calibrations */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Saved Calibrations</h3>
            <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
              {calibrations.length} Profiles
            </span>
          </div>
          
          {calibrations.length === 0 ? (
            <div className="text-center py-12 flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl">
              <Camera className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-slate-500 text-sm">No calibrations saved yet</p>
              <button
                onClick={() => setActiveTab('calibration')}
                className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
              >
                Launch Calibration Wizard
              </button>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
              {calibrations.map((cal) => (
                <div key={cal.id} className={`p-4 rounded-xl border transition-all ${
                  cal.is_active ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {cal.is_active && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                      <p className="text-white font-bold text-sm">{cal.name}</p>
                    </div>
                    {cal.is_active ? (
                      <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded font-black tracking-tighter">DEPLOYED</span>
                    ) : (
                      <button
                        onClick={() => activateCalibration(cal.id)}
                        className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded font-black tracking-tighter transition-colors"
                      >
                        DEPLOY TO X5
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4 text-[10px] text-slate-500 font-mono">
                    <div className="bg-slate-900/50 p-1.5 rounded">BASELINE: {cal.baseline?.toFixed(1)}mm</div>
                    <div className="bg-slate-900/50 p-1.5 rounded">ERR: {cal.reprojection_error?.toFixed(3)}px</div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-800/50 pt-3">
                    <button
                      onClick={() => onEditCalibration(cal)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                      title="Edit Parameters"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCalibration(cal.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Delete Profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <button
            onClick={() => setActiveTab('calibration')}
            className="mt-6 w-full py-3 border-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            New Calibration Wizard
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeviceSettings
