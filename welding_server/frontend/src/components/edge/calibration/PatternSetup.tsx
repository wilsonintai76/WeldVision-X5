import React from 'react'
import { Grid3X3, ChevronRight, Printer } from 'lucide-react'
import { CheckerboardConfig } from '../types'

interface PatternSetupProps {
  config: CheckerboardConfig;
  onChange: (config: CheckerboardConfig) => void;
  onNext: () => void;
}

const PatternSetup: React.FC<PatternSetupProps> = ({ config, onChange, onNext }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
        <div className="flex items-start gap-3">
          <Grid3X3 className="w-6 h-6 text-blue-400 mt-0.5" />
          <div>
            <h4 className="text-white font-medium mb-1 text-lg">Checkerboard Pattern Required</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Print a checkerboard calibration pattern. The pattern should be mounted flat on a rigid surface.
              Move the pattern to different positions and angles in view of both cameras.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Calibration Name</label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => onChange({ ...config, name: e.target.value })}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="e.g., Station Alpha-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Square Size (mm)</label>
          <input
            type="number"
            value={config.square_size}
            onChange={(e) => onChange({ ...config, square_size: Number(e.target.value) })}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
          <p className="text-xs text-slate-500 mt-2 italic">Physical size of each square on your printed pattern</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Inner Corners (Rows)</label>
          <input
            type="number"
            min="3"
            max="20"
            value={config.rows}
            onChange={(e) => onChange({ ...config, rows: Number(e.target.value) })}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Inner Corners (Columns)</label>
          <input
            type="number"
            min="3"
            max="20"
            value={config.cols}
            onChange={(e) => onChange({ ...config, cols: Number(e.target.value) })}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Pattern Type Selector */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/50">
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Target Technology</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'checkerboard', label: 'Checkerboard', desc: 'Standard OpenCV' },
            { id: 'charuco', label: 'Charuco', desc: 'Robust + Markers' },
            { id: 'circles', label: 'Circle Grid', desc: 'Symmetric' }
          ].map(type => (
            <button
              key={type.id}
              onClick={() => onChange({ ...config, pattern_type: type.id as any })}
              className={`p-3 rounded-lg border text-left transition-all ${
                (config.pattern_type || 'checkerboard') === type.id 
                  ? 'bg-blue-600/20 border-blue-500 text-white' 
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              <p className="text-xs font-bold">{type.label}</p>
              <p className="text-[9px] opacity-60">{type.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Preview & Print */}
      <div className="flex flex-col items-center py-8 bg-slate-950 rounded-2xl border border-slate-800/50 shadow-inner relative group">
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => {
              const printWindow = window.open('', '_blank');
              if (!printWindow) return;
              printWindow.document.write(`
                <html>
                  <head>
                    <title>Print Calibration Pattern</title>
                    <style>
                      @page { margin: 10mm; size: auto; }
                      body { 
                        margin: 0; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        height: 100vh; 
                        font-family: sans-serif; 
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                      }
                      .container { text-align: center; }
                      .grid { 
                        display: grid; 
                        grid-template-columns: repeat(${config.cols + 1}, ${config.square_size}mm);
                        border: 1mm solid black;
                        margin-bottom: 5mm;
                        box-shadow: 0 0 0 1px black;
                      }
                      .square { 
                        width: ${config.square_size}mm; 
                        height: ${config.square_size}mm; 
                        box-sizing: border-box;
                      }
                      .black { 
                        background-color: black !important; 
                        background: black !important;
                      }
                      .white { 
                        background-color: white !important; 
                        background: white !important;
                      }
                      .info { font-size: 10pt; font-weight: bold; color: black; text-transform: uppercase; letter-spacing: 0.2em; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="grid" style="${config.pattern_type === 'circles' ? 'border: none;' : ''}">
                        ${Array.from({ length: (config.rows + 1) * (config.cols + 1) }).map((_, idx) => {
                          const row = Math.floor(idx / (config.cols + 1));
                          const col = idx % (config.cols + 1);
                          
                          if (config.pattern_type === 'circles') {
                            return '<div class="square" style="display: flex; align-items: center; justify-content: center;"><div style="width: 80%; height: 80%; background: black; border-radius: 50%;"></div></div>';
                          }
                          
                          const isBlack = (row + col) % 2 === 0;
                          if (isBlack) return '<div class="square black"></div>';
                          
                          if (config.pattern_type === 'charuco') {
                            // Simulated ArUco marker inside white squares
                            const markerId = (row * config.cols + col) % 4;
                            return `
                              <div class="square white" style="display: grid; grid-template-columns: repeat(3, 1fr); padding: 15%;">
                                ${Array.from({ length: 9 }).map((_, mIdx) => {
                                  const isMarkerBlack = (mIdx + markerId) % 3 === 0 || mIdx === 4;
                                  return `<div style="background: ${isMarkerBlack ? 'black' : 'white'}"></div>`;
                                }).join('')}
                              </div>
                            `;
                          }
                          
                          return '<div class="square white"></div>';
                        }).join('')}
                      </div>
                      <div class="info">WeldVision-X5 | ${config.pattern_type || 'checkerboard'} | ${config.rows}x${config.cols} | ${config.square_size}mm</div>
                    </div>
                    <script>window.onload = () => { window.print(); window.close(); }</script>
                  </body>
                </html>
              `);
              printWindow.document.close();
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-500 hover:text-white transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Pattern
          </button>
        </div>

        <div 
          className={`border-[12px] border-white rounded shadow-2xl ${config.pattern_type === 'circles' ? 'bg-white' : ''}`}
          style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${config.cols + 1}, 14px)`,
            gap: '0px'
          }}
        >
          {Array.from({ length: (config.rows + 1) * (config.cols + 1) }).map((_, idx) => {
            const row = Math.floor(idx / (config.cols + 1))
            const col = idx % (config.cols + 1)
            
            if (config.pattern_type === 'circles') {
              return (
                <div key={idx} className="w-[14px] h-[14px] flex items-center justify-center">
                  <div className="w-[10px] h-[10px] bg-black rounded-full" />
                </div>
              )
            }

            const isBlack = (row + col) % 2 === 0
            if (isBlack) return <div key={idx} className="w-[14px] h-[14px] bg-black" />
            
            if (config.pattern_type === 'charuco') {
              return (
                <div key={idx} className="w-[14px] h-[14px] bg-white p-[2px] grid grid-cols-2 gap-px">
                  <div className="bg-black" /><div className="bg-white" />
                  <div className="bg-white" /><div className="bg-black" />
                </div>
              )
            }

            return <div key={idx} className="w-[14px] h-[14px] bg-white" />
          })}
        </div>
        <p className="text-xs text-slate-500 mt-6 font-mono uppercase tracking-wider">
          Pattern: {config.rows} × {config.cols} inner corners
        </p>
      </div>

      <button
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
      >
        Continue to Image Capture
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}

export default PatternSetup
