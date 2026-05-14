import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Metrics } from './types'

interface DefectsCardProps {
  defects: Metrics['defects']
}

export const DefectsCard: React.FC<DefectsCardProps> = ({ defects }) => {
  const getTotalDefects = () => {
    return Object.values(defects).reduce((a, b) => a + b, 0)
  }

  const total = getTotalDefects()
  
  return (
    <Card className="p-4 rounded-lg bg-industrial-slate border-2 border-industrial-gray">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        <span className="text-sm font-medium text-slate-300">Visual Defects</span>
        <Badge 
          variant={total === 0 ? "default" : total < 5 ? "secondary" : "destructive"}
          className={`ml-auto ${total === 0 ? 'bg-green-900 text-green-300 hover:bg-green-900' :
            total < 5 ? 'bg-yellow-900 text-yellow-300 hover:bg-yellow-900' : 'bg-red-900 text-red-300 hover:bg-red-900'
          }`}
        >
          {total} total
        </Badge>
      </div>
      <div className="space-y-2">
        <DefectRow label="Porosity" count={defects.porosity} />
        <DefectRow label="Undercut" count={defects.undercut} />
        <DefectRow label="Spatter" count={defects.spatter} />
        <DefectRow label="Cracks" count={defects.cracks} />
        <DefectRow label="Lack of Fusion" count={defects.lackOfFusion} />
      </div>
    </Card>
  )
}

const DefectRow = ({ label, count }: { label: string, count: number }) => (
  <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
    <span className="text-sm text-slate-400">{label}</span>
    <span className={`font-semibold ${count > 0 ? 'text-red-400' : 'text-slate-500'}`}>
      {count}
    </span>
  </div>
)
