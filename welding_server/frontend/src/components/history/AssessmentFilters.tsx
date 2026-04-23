import React from 'react'
import { Search, Calendar, Filter } from 'lucide-react'

interface AssessmentFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dateFilter: string;
  setDateFilter: (date: string) => void;
  scoreFilter: string;
  setScoreFilter: (score: string) => void;
  filteredCount: number;
  totalCount: number;
}

const AssessmentFilters: React.FC<AssessmentFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  dateFilter,
  setDateFilter,
  scoreFilter,
  setScoreFilter,
  filteredCount,
  totalCount
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 sticky top-0 z-10 shadow-xl backdrop-blur-md bg-opacity-90">
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by student name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Date filter */}
        <div className="w-48">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Score filter */}
        <div className="w-44">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none transition-all cursor-pointer"
            >
              <option value="all">All Scores</option>
              <option value="excellent">Excellent (4.2+)</option>
              <option value="good">Good (3.5-4.1)</option>
              <option value="fair">Fair (2.5-3.4)</option>
              <option value="poor">Poor (&lt;2.5)</option>
            </select>
          </div>
        </div>

        {/* Clear filters */}
        {(searchQuery || dateFilter || scoreFilter !== 'all') && (
          <button
            onClick={() => { setSearchQuery(''); setDateFilter(''); setScoreFilter('all') }}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="mt-3 text-sm text-slate-500 flex justify-between items-center">
        <span>Showing {filteredCount} of {totalCount} assessments</span>
        <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Table View Active</span>
      </div>
    </div>
  )
}

export default AssessmentFilters
