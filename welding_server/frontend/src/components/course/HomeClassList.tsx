import React from 'react'
import { Plus, GraduationCap, Edit, Trash2 } from 'lucide-react'
import { HomeClass } from './types'

interface HomeClassListProps {
  homeClasses: HomeClass[];
  handleCreateClass: () => void;
  handleEditClass: (cls: HomeClass) => void;
  handleDeleteClass: (id: number) => void;
}

const HomeClassList: React.FC<HomeClassListProps> = ({
  homeClasses,
  handleCreateClass,
  handleEditClass,
  handleDeleteClass
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={handleCreateClass}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Home Class
        </button>
      </div>

      {homeClasses.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center">
          <GraduationCap className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">No home classes yet.</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Class Name</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Description</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Students</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {homeClasses.map(cls => (
                <tr key={cls.id} className="hover:bg-slate-700/30">
                  <td className="px-6 py-4">
                    <span className="text-white font-medium">{cls.name}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm max-w-xs truncate">
                    {cls.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {cls.student_count || 0}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEditClass(cls)}
                      className="text-yellow-400 hover:text-yellow-300 p-2 mr-1"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClass(cls.id)}
                      className="text-red-400 hover:text-red-300 p-2"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default HomeClassList
