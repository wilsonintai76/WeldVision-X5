import React from 'react'
import { Camera } from 'lucide-react'

interface CameraFeedProps {
  isEvaluating: boolean
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ isEvaluating }) => {
  return (
    <div className="lg:col-span-2 space-y-4">
      <div className="bg-black rounded-xl border border-slate-800 aspect-video relative overflow-hidden group">
        {/* LIVE CAMERA VIEW */}
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
          <Camera className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">Camera Feed</p>
          <p className="text-sm opacity-60">Awaiting RDK X5 Connection</p>
          {isEvaluating && (
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full animate-pulse border border-red-500/30">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs font-semibold">LIVE RECORDING</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
