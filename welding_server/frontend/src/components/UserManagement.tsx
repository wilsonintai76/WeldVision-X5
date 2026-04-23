import { useState, useEffect, FC } from 'react';
import { 
  Users, 
  AlertCircle,
  Clock,
  Search,
  RefreshCw,
  ChevronDown,
  Filter
} from 'lucide-react';
import authAPI from '../services/authAPI';

// Types
import { ManagedUser, AuditLog } from './users/types';

// Components
import UserTable from './users/UserTable';
import AuditLogTable from './users/AuditLogTable';
import PendingApprovals from './users/PendingApprovals';
import EditUserModal from './users/EditUserModal';

const UserManagement: FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<ManagedUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all'); // all, pending, logs
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, pendingData, logsData] = await Promise.all([
        authAPI.getUsers(),
        authAPI.getPendingUsers(),
        authAPI.getAuditLogs({ limit: 50 }),
      ]);
      setUsers(usersData);
      setPendingUsers(pendingData);
      setAuditLogs(logsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: number, approve = true) => {
    try {
      await authAPI.approveUser(userId, approve);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await authAPI.deleteUser(userId);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateUser = async (userId: number, data: any) => {
    try {
      await authAPI.updateUser(userId, data);
      setShowEditModal(false);
      setSelectedUser(null);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">User Management</h1>
              <p className="text-slate-400">Manage staff accounts, roles, and permissions</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors font-bold text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-3 bg-red-900/20 border border-red-600/30 rounded-lg p-4 mb-6">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Pending Approvals Alert */}
        {pendingUsers.length > 0 && activeTab !== 'pending' && (
          <div className="flex items-center justify-between bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-400" />
              <span className="text-amber-300 text-sm">
                <strong>{pendingUsers.length}</strong> user{pendingUsers.length > 1 ? 's' : ''} pending approval
              </span>
            </div>
            <button
              onClick={() => setActiveTab('pending')}
              className="text-amber-400 hover:text-amber-300 text-sm font-bold uppercase tracking-tighter"
            >
              Review now →
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-800">
          {[
            { id: 'all', label: `All Users (${users.length})`, color: 'emerald' },
            { id: 'pending', label: 'Pending Approval', color: 'amber', count: pendingUsers.length },
            { id: 'logs', label: 'Audit Logs', color: 'blue' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium transition-colors relative ${
                activeTab === tab.id ? `text-${tab.color}-400` : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {tab.count}
                  </span>
                )}
              </div>
              {activeTab === tab.id && <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-${tab.color}-400`} />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'all' && (
          <div>
            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-8 text-white appearance-none focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Roles</option>
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <UserTable 
              users={filteredUsers}
              handleApprove={handleApprove}
              handleEdit={(user) => { setSelectedUser(user); setShowEditModal(true); }}
              handleDelete={handleDeleteUser}
            />
          </div>
        )}

        {activeTab === 'pending' && (
          <PendingApprovals 
            pendingUsers={pendingUsers}
            handleApprove={handleApprove}
          />
        )}

        {activeTab === 'logs' && (
          <AuditLogTable logs={auditLogs} />
        )}

        {showEditModal && selectedUser && (
          <EditUserModal
            user={selectedUser}
            onSave={(data) => handleUpdateUser(selectedUser.id, data)}
            onClose={() => { setShowEditModal(false); setSelectedUser(null); }}
          />
        )}
      </div>
    </div>
  );
}

export default UserManagement;
