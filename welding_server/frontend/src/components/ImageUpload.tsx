import { useRef, useState, FC } from 'react'
import { ImagePlus, UploadCloud, CheckCircle, X } from 'lucide-react'
import { storageAPI } from '../services/coreAPI'

interface Props {
  folder?: string
}

interface FileStatus {
  file: File
  pct: number
  done: boolean
  error?: string
  key?: string
}

const ImageUpload: FC<Props> = ({ folder = 'images/training' }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<FileStatus[]>([])
  const [uploading, setUploading] = useState(false)

  const update = (idx: number, patch: Partial<FileStatus>) =>
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    const next: FileStatus[] = Array.from(files)
      .filter(f => allowed.includes(f.type))
      .map(f => ({ file: f, pct: 0, done: false }))
    setItems(prev => [...prev, ...next])
  }

  const remove = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx))

  const uploadAll = async () => {
    const pending = items.filter(it => !it.done && !it.error)
    if (!pending.length) return
    setUploading(true)
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.done || it.error) continue
      try {
        const result = await storageAPI.uploadFile(it.file, folder, pct => update(i, { pct }))
        update(i, { done: true, pct: 100, key: result.key })
      } catch (e) {
        update(i, { error: (e as Error).message })
      }
    }
    setUploading(false)
  }

  const clearDone = () => setItems(prev => prev.filter(it => !it.done))

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600/10 rounded-lg flex items-center justify-center">
          <ImagePlus className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Training Image Upload</h3>
          <p className="text-sm text-slate-500">JPG / PNG / WEBP → R2 <span className="text-slate-600">{folder}</span></p>
        </div>
        <div className="ml-auto flex gap-2">
          {items.some(it => it.done) && (
            <button
              onClick={clearDone}
              className="text-xs text-slate-400 hover:text-white px-3 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors"
            >
              Clear done
            </button>
          )}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors text-sm disabled:opacity-50"
          >
            <ImagePlus className="w-4 h-4" /> Add images
          </button>
          <button
            onClick={uploadAll}
            disabled={uploading || !items.some(it => !it.done && !it.error)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm disabled:opacity-40"
          >
            <UploadCloud className="w-4 h-4" />
            {uploading ? 'Uploading…' : 'Upload all'}
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
      >
        <ImagePlus className="w-10 h-10 text-slate-600 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">Drag &amp; drop images here or click to browse</p>
        <p className="text-slate-600 text-xs mt-1">Supports JPG, PNG, WEBP · max 100 MB each</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        title="Select training images to upload"
        placeholder="Select images"
        onChange={e => addFiles(e.target.files)}
      />

      {/* File list */}
      {items.length > 0 && (
        <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-3 bg-slate-800 rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{it.file.name}</p>
                {it.key && (
                  <p className="text-xs text-slate-500 truncate">{it.key}</p>
                )}
                {it.error && (
                  <p className="text-xs text-red-400">{it.error}</p>
                )}
                {!it.done && !it.error && it.pct > 0 && (
                  <div className="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      data-pct={it.pct}
                      ref={el => { if (el) el.style.width = `${it.pct}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="shrink-0">
                {it.done ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : it.error ? (
                  <X className="w-5 h-5 text-red-400" />
                ) : (
                  <button onClick={() => remove(i)} title="Remove file" className="text-slate-600 hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ImageUpload
