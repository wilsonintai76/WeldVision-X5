import React from 'react'
import { Camera, RefreshCw, ImageIcon, Trash2, AlertTriangle } from 'lucide-react'
import { CapturedImage } from '../types'

interface ImageCaptureProps {
  deviceIp: string;
  images: CapturedImage[];
  isCapturing: boolean;
  onCapture: () => void;
  onRemove: (id: number) => void;
  onBack: () => void;
  onNext: () => void;
}

const ImageCapture: React.FC<ImageCaptureProps> = ({ 
  deviceIp, 
  images, 
  isCapturing, 
  onCapture, 
  onRemove, 
  onBack, 
  onNext 
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 shadow-xl overflow-hidden relative group">
          <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Left Camera</span>
          </div>
          <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center border-2 border-slate-800 transition-colors group-hover:border-blue-500/30">
            <div className="text-center">
              <Camera className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-600 text-xs font-mono">{deviceIp}:8554 (L)</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 shadow-xl overflow-hidden relative group">
          <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Right Camera</span>
          </div>
          <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center border-2 border-slate-800 transition-colors group-hover:border-blue-500/30">
            <div className="text-center">
              <Camera className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-600 text-xs font-mono">{deviceIp}:8554 (R)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-amber-950/20 border border-amber-600/30 rounded-xl flex gap-4">
        <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-amber-200/70 text-sm">
          <h4 className="text-amber-400 font-bold mb-1">Expert Capture Tips</h4>
          <ul className="space-y-1 opacity-80">
            <li>• Aim for <span className="text-amber-300 font-bold">15-20</span> high-quality image pairs.</li>
            <li>• Vary the tilt and rotation of the pattern for better extrinsic data.</li>
            <li>• Ensure no glare or reflections are present on the checkerboard.</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 py-4">
        <button
          onClick={onCapture}
          disabled={isCapturing}
          className="group w-full max-w-xs h-20 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-full font-black text-2xl flex items-center justify-center gap-4 shadow-xl shadow-emerald-900/30 transition-all disabled:opacity-50 active:scale-95"
        >
          {isCapturing ? (
            <RefreshCw className="w-8 h-8 animate-spin" />
          ) : (
            <Camera className="w-8 h-8 group-hover:scale-110 transition-transform" />
          )}
          Capture Pair
        </button>
        <p className="text-slate-400 text-sm font-medium bg-slate-950 px-4 py-1 rounded-full border border-slate-800">
          <span className="text-white font-bold">{images.length}</span> pairs collected
        </p>
      </div>

      {images.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-800/50">
          <h4 className="text-white font-bold flex items-center gap-2 px-1">
            <ImageIcon className="w-5 h-5 text-blue-400" />
            Capture Gallery
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img) => (
              <div key={img.id} className="group relative bg-slate-950 rounded-xl border border-slate-800 p-2 overflow-hidden shadow-lg hover:border-slate-600 transition-colors">
                <div className="aspect-video bg-slate-900 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                  <ImageIcon className="w-8 h-8 text-slate-800" />
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${img.corners_found ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20' : 'bg-red-950/50 text-red-400 border border-red-500/20'}`}>
                    {img.corners_found ? 'Detected' : 'Failed'}
                  </span>
                  <button 
                    onClick={() => onRemove(img.id)}
                    className="p-1.5 bg-slate-900 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-8 border-t border-slate-800/50 flex justify-between items-center">
        <button onClick={onBack} className="px-6 py-2 text-slate-400 hover:text-white font-bold transition-colors">
          ← Back to Setup
        </button>
        <button
          onClick={onNext}
          disabled={images.length < 5}
          className="px-10 py-3 bg-white text-slate-950 hover:bg-slate-200 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg"
        >
          Initialize Engine
        </button>
      </div>
    </div>
  )
}

export default ImageCapture
