import React from 'react'
import { CheckCircle, XCircle, Shield, BookOpen, GraduationCap, Users } from 'lucide-react'
import { ManagedUser } from './types'

interface PendingApprovalsProps {
  pendingUsers: ManagedUser[];
  handleApprove: (id: number, approve: boolean) => void;
}

const PendingApprovals: React.FC<PendingApprovalsProps> = ({
  pendingUsers,
  handleApprove
}) => {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4 text-red-400" />;
      case 'instructor': return <BookOpen className="w-4 h-4 text-blue-400" />;
      case 'student': return <GraduationCap className="w-4 h-4 text-green-400" />;
      default: return <Users className="w-4 h-4 text-slate-400" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-500/20 text-red-300 border-red-500/30',
      instructor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      student: 'bg-green-500/20 text-green-300 border-green-500/30',
    };
    return colors[role] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  };

  if (pendingUsers.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-white font-semibold text-lg mb-2">All caught up!</h3>
        <p className="text-slate-400 text-sm">No pending user approvals</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {pendingUsers.map(user => (
        <div key={user.id} className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                {getRoleIcon(user.role)}
              </div>
              <div>
                <h3 className="text-white font-semibold">{user.username}</h3>
                <p className="text-slate-400 text-sm">{user.email}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-tighter ${getRoleBadge(user.role)}`}>
                    Wants: {user.role}
                  </span>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">
                    Requested {new Date(user.date_joined).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleApprove(user.id, false)}
                className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg transition-colors text-sm font-bold"
              >
                <XCircle className="w-4 h-4" />
                REJECT
              </button>
              <button
                onClick={() => handleApprove(user.id, true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors text-sm font-bold"
              >
                <CheckCircle className="w-4 h-4" />
                APPROVE
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default PendingApprovals
