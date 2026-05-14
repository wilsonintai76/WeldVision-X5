import React from 'react'
import { Shield, BookOpen, GraduationCap, Users, CheckCircle, Clock, Edit, Trash2 } from 'lucide-react'
import { ManagedUser } from './types'

interface UserTableProps {
  users: ManagedUser[];
  handleApprove: (id: number, approve: boolean) => void;
  handleEdit: (user: ManagedUser) => void;
  handleDelete: (id: number) => void;
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  handleApprove,
  handleEdit,
  handleDelete
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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-800/50">
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">User</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Role</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Joined</th>
            <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {users.map(user => (
            <tr key={user.id} className="hover:bg-slate-800/30">
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {user.name?.[0]?.toUpperCase() || user.first_name?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.username}</p>
                    <p className="text-slate-400 text-sm">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  {getRoleIcon(user.role)}
                  <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-tighter ${getRoleBadge(user.role)}`}>
                    {user.role}
                  </span>
                </div>
              </td>
              <td className="px-4 py-4">
                {user.is_approved ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                    <CheckCircle className="w-4 h-4" /> ACTIVE
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 text-xs font-medium">
                    <Clock className="w-4 h-4" /> PENDING
                  </span>
                )}
              </td>
              <td className="px-4 py-4 text-slate-400 text-sm">
                {new Date(user.date_joined).toLocaleDateString()}
              </td>
              <td className="px-4 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {!user.is_approved && (
                    <button
                      onClick={() => handleApprove(user.id, true)}
                      className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                      title="Approve"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(user)}
                    className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default UserTable
