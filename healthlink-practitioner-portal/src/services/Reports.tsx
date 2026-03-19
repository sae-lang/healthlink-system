import React, { useEffect, useState } from 'react';
import api from '../api';
import { PatientReport, TriageLevel } from '../types';
import { 
  Search, 
  Filter, 
  ChevronRight,
  Calendar,
  Clock,
  User,
  Activity,
  X,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

const TriageBadge: React.FC<{ level: TriageLevel }> = ({ level }) => {
  const styles = {
    emergency: "bg-red-100 text-red-700 border-red-200",
    urgent: "bg-orange-100 text-orange-700 border-orange-200",
    routine: "bg-blue-100 text-blue-700 border-blue-200",
    "self-care": "bg-emerald-100 text-emerald-700 border-emerald-200"
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${styles[level]}`}>
      {level}
    </span>
  );
};

export const Reports: React.FC = () => {
  const [reports, setReports] = useState<PatientReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<PatientReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/reports');
      setReports(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesTriage = filter === 'all' || r.triageLevel === filter;
    const matchesSearch = r.userId.toLowerCase().includes(search.toLowerCase()) || 
                         r.symptoms.some(s => s.toLowerCase().includes(search.toLowerCase()));
    return matchesTriage && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" size={18} />
          <input
            type="text"
            placeholder="Search by Patient ID or symptoms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-slate-400 shrink-0" size={18} />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="all">All Triage Levels</option>
            <option value="emergency">Emergency</option>
            <option value="urgent">Urgent</option>
            <option value="routine">Routine</option>
            <option value="self-care">Self-care</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Triage Level</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Symptoms</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading reports...</td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No reports found matching criteria</td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr 
                    key={report.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedReport(report)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${report.reviewed ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                        <span className="text-sm font-semibold text-slate-900">{report.userId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <TriageBadge level={report.triageLevel} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {report.symptoms.map(s => (
                          <span key={s} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase font-bold">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 font-medium">
                        {format(new Date(report.timestamp), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-slate-400">
                        {format(new Date(report.timestamp), 'HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 group-hover:text-emerald-600 transition-all duration-200 group-hover:translate-x-1">
                        <ChevronRight size={20} className="shrink-0" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Detail Modal */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReport(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Report Details</h3>
                    <p className="text-xs text-slate-500">ID: {selectedReport.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient</p>
                    <div className="flex items-center gap-2 text-slate-900 font-semibold">
                      <User size={16} className="text-slate-400" />
                      {selectedReport.userId}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Triage Status</p>
                    <TriageBadge level={selectedReport.triageLevel} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</p>
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                      <Calendar size={16} className="text-slate-400" />
                      {format(new Date(selectedReport.timestamp), 'MMMM d, yyyy')}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time</p>
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                      <Clock size={16} className="text-slate-400" />
                      {format(new Date(selectedReport.timestamp), 'HH:mm')}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Symptoms Reported</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.symptoms.map(s => (
                      <span key={s} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">System Recommendation</p>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {selectedReport.recommendation}
                  </p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="px-6 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Close
                </button>
                <button className="px-6 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2">
                  <CheckCircle size={18} />
                  Mark as Reviewed
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
