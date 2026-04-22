import React from 'react'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"

interface MetricCardProps {
  title: string
  value: number
  unit: string
  targetText: string
  isValid: boolean | 'warning'
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, targetText, isValid }) => {
  let borderColor = 'border-red-600'
  let bgColor = 'bg-red-950/30'
  let Icon = XCircle
  let iconColor = 'text-red-500'

  if (isValid === true) {
    borderColor = 'border-green-600'
    bgColor = 'bg-green-950/30'
    Icon = CheckCircle
    iconColor = 'text-green-500'
  } else if (isValid === 'warning') {
    borderColor = 'border-yellow-600'
    bgColor = 'bg-yellow-950/30'
    Icon = AlertTriangle
    iconColor = 'text-yellow-500'
  }

  return (
    <Card className={`p-4 rounded-lg border-2 transition-all ${bgColor} ${borderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-300">{title}</span>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="text-3xl font-bold text-white">
        {value.toFixed(2)} <span className="text-lg text-slate-400">{unit}</span>
      </div>
      <div className="text-xs text-slate-400 mt-1">
        Target: {targetText}
      </div>
    </Card>
  )
}
