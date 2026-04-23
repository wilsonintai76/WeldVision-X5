import React from 'react'
import { AuditLog } from './types'

interface AuditLogTableProps {
  logs: AuditLog[];
}

const AuditLogTable: React.FC<AuditLogTableProps> = ({ logs }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-800/50">
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Time</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">User</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Action</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Details</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">IP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {logs.map(log => (
            <tr key={log.id} className="hover:bg-slate-800/30">
              <td className="px-4 py-3 text-slate-400 text-sm">
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-white text-sm">{log.username || '-'}</td>
              <td className="px-4 py-3">
                <span className={`text-[10px] px-2 py-1 rounded uppercase font-bold tracking-tighter ${
                  log.action === 'login' ? 'bg-emerald-500/20 text-emerald-300' :
                  log.action === 'logout' ? 'bg-slate-500/20 text-slate-300' :
                  log.action === 'create' ? 'bg-blue-500/20 text-blue-300' :
                  log.action === 'update' ? 'bg-amber-500/20 text-amber-300' :
                  log.action === 'delete' ? 'bg-red-500/20 text-red-300' :
                  'bg-slate-500/20 text-slate-300'
                }`}>
                  {log.action_display}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-400 text-sm">
                {log.model_name && <span>{log.model_name}: </span>}
                {log.object_repr || '-'}
              </td>
              <td className="px-4 py-3 text-slate-500 text-sm font-mono">{log.ip_address || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default AuditLogTable
