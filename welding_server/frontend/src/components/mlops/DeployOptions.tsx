import { FC } from 'react'
import { Wifi, Zap } from 'lucide-react'

interface DeployOptionsProps {
  lanIp: string
  onLanIpChange: (ip: string) => void
}

export const DeployOptions: FC<DeployOptionsProps> = ({ lanIp, onLanIpChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Online deploy */}
    <div className="p-6 bg-emerald-950/20 border border-emerald-800/30 rounded-xl">
      <div className="flex items-center gap-3 mb-3">
        <Wifi className="w-5 h-5 text-emerald-400" />
        <h4 className="font-bold text-white">Online Deploy (Internet)</h4>
      </div>
      <p className="text-sm text-slate-400 mb-3">
        Edge device polls Cloudflare KV every 30s. When a model is marked deployed, it downloads the .bin from R2 and
        hot-swaps — no reboot needed.
      </p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-emerald-400 rounded-full" />
        <span className="text-xs text-emerald-400">Click "Online" in the table above</span>
      </div>
    </div>

    {/* LAN deploy */}
    <div className="p-6 bg-blue-950/20 border border-blue-800/30 rounded-xl">
      <div className="flex items-center gap-3 mb-3">
        <Zap className="w-5 h-5 text-blue-400" />
        <h4 className="font-bold text-white">Offline LAN Deploy</h4>
      </div>
      <p className="text-sm text-slate-400 mb-3">
        For air-gapped or offline environments — pushes model info directly to edge device HTTP endpoint on the same LAN.
      </p>
      <div className="flex gap-2">
        <input
          value={lanIp}
          onChange={e => onLanIpChange(e.target.value)}
          placeholder="192.168.1.x"
          title="Edge device LAN IP address"
          aria-label="Edge device LAN IP address"
          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
        />
        <span className="flex items-center px-3 py-2 bg-slate-800 text-slate-400 text-sm rounded-lg border border-slate-700">
          :8080
        </span>
      </div>
      <p className="text-xs text-slate-600 mt-2">Then click "LAN" next to the model in the table</p>
    </div>
  </div>
)
