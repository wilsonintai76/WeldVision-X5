import React from 'react'
import { X, Filter, RefreshCw, CheckCircle } from 'lucide-react'
import { Course, HomeClass, Student } from '../types'

interface EnrollmentModalProps {
  show: boolean;
  onClose: () => void;
  selectedCourse: Course | null;
  homeClasses: HomeClass[];
  enrollClassFilter: string;
  setEnrollClassFilter: (id: string) => void;
  availableStudents: Student[];
  enrollLoading: boolean;
  selectedEnrollIds: Set<string>;
  toggleEnrollSelection: (id: string | number) => void;
  onEnrollSubmit: () => void;
}

const EnrollmentModal: React.FC<EnrollmentModalProps> = ({
  show,
  onClose,
  selectedCourse,
  homeClasses,
  enrollClassFilter,
  setEnrollClassFilter,
  availableStudents,
  enrollLoading,
  selectedEnrollIds,
  toggleEnrollSelection,
  onEnrollSubmit
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Enroll Students</h3>
            <p className="text-slate-400 text-sm">{selectedCourse?.code}: {selectedCourse?.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-1">Filter by Home Class</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                value={enrollClassFilter}
                onChange={e => setEnrollClassFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select Home Class</option>
                {homeClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto border border-slate-700 rounded-lg bg-slate-900 mb-4">
          {enrollLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
          ) : availableStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {enrollClassFilter ? 'No un-enrolled students in this class' : 'Select a class to see students'}
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-800 border-b border-slate-700 sticky top-0">
                <tr>
                  <th className="p-3 w-10">
                    <div className="w-4 h-4 rounded border border-slate-700" />
                  </th>
                  <th className="p-3 text-xs font-semibold text-slate-400 uppercase">Reg. Number</th>
                  <th className="p-3 text-xs font-semibold text-slate-400 uppercase">Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {availableStudents.map(student => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                    onClick={() => toggleEnrollSelection(student.id)}
                  >
                    <td className="p-3">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedEnrollIds.has(String(student.id))
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-700 bg-slate-900'
                        }`}>
                        {selectedEnrollIds.has(String(student.id)) && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                    </td>
                    <td className="p-3 text-white font-mono text-sm">{student.student_id}</td>
                    <td className="p-3 text-slate-300 text-sm">{student.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-700">
          <div className="text-slate-400 text-sm">
            {selectedEnrollIds.size} student{selectedEnrollIds.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onEnrollSubmit}
              disabled={selectedEnrollIds.size === 0 || enrollLoading}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {enrollLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Enroll Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnrollmentModal
