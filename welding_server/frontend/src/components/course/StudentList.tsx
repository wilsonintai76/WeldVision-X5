import React from 'react'
import { Info, Filter, Upload, FileText, Plus, RefreshCw, Users, GraduationCap, Edit2, Trash2 } from 'lucide-react'
import { Student, HomeClass } from './types'

interface StudentListProps {
  students: Student[];
  homeClasses: HomeClass[];
  filterClassId: string | number;
  setFilterClassId: (id: string | number) => void;
  studentLoading: boolean;
  handleBulkImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setShowBulkModal: (show: boolean) => void;
  openStudentModal: (student: Student | null) => void;
  handleDeleteStudent: (id: number) => void;
  bulkResult: any;
  setBulkResult: (result: any) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const StudentList: React.FC<StudentListProps> = ({
  students,
  homeClasses,
  filterClassId,
  setFilterClassId,
  studentLoading,
  handleBulkImport,
  setShowBulkModal,
  openStudentModal,
  handleDeleteStudent,
  bulkResult,
  setBulkResult,
  fileInputRef
}) => {
  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-blue-300 text-sm">
          <p className="font-medium mb-1">Student Account Note</p>
          <p>When created, username & default password are the <strong>Registration Number</strong>.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <span className="text-slate-300 font-medium">Filter by Class:</span>
          </div>
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Students</option>
            {homeClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-3">
            {/* Bulk Import */}
            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleBulkImport}
                accept=".csv"
                className="hidden"
                id="bulk-import-file"
              />
              <label
                htmlFor="bulk-import-file"
                className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer ${!filterClassId ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={filterClassId ? 'Import from CSV' : 'Select a class first'}
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </label>
            </div>

            <button
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              title="View CSV format info"
            >
              <FileText className="w-4 h-4" />
              Format
            </button>

            <button
              onClick={() => openStudentModal(null)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Student
            </button>
          </div>
        </div>
        {/* Bulk Result Display in Filter Bar */}
        {bulkResult && (
          <div className="mt-4 p-3 bg-slate-800 rounded-lg border border-slate-700 text-sm">
            <strong className="text-white">Import Result: {bulkResult.message}</strong>
            {bulkResult.errors?.length > 0 && (
              <div className="text-red-400 mt-1">Errors: {bulkResult.errors.join(', ')}</div>
            )}
            <button onClick={() => setBulkResult(null)} className="text-xs text-slate-400 hover:text-white mt-1 underline">Dismiss</button>
          </div>
        )}
      </div>

      {/* Students Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {studentLoading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            No students found. Add a student or import data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Reg. Number</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Full Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Class</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4 text-white font-medium font-mono">{student.student_id}</td>
                    <td className="py-4 px-4 text-white">{student.name}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-sm">
                        <GraduationCap className="w-3 h-3" />
                        {student.class_group_name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openStudentModal(student)}
                          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
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
        )}
      </div>
    </div>
  )
}

export default StudentList
