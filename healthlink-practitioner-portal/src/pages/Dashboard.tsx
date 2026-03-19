import React, { useEffect, useState } from 'react';
import api from '../api';
import { PatientReport, TriageLevel } from '../types';
import { 
  Users, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

const StatCard: React.FC<{ 
  label: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color: string;
  trend?: string;
}> = ({ label, value, icon, color, trend }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group cursor-default">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} transition-transform duration-300 group-hover:scale-110 shrink-0`}>
        {icon}
      </div>
      {trend && (
        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          <TrendingUp size={12} className="shrink-0" />
          {trend}
        </span>
      )}
    </div>
    <p className="text-sm text-slate-500 font-medium">{label}</p>
    <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
  </div>
);

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

export const Dashboard: React.FC = () => {
  const [reports, setReports] = useState<PatientReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/admin/reports');
        setReports(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    { 
      label: 'Total Reports Today', 
      value: reports.length, 
      icon: <Users size={24} />, 
      color: 'bg-blue-50 text-blue-600',
      trend: '+12%'
    },
    { 
      label: 'Emergency Cases', 
      value: reports.filter(r => r.triageLevel === 'emergency').length, 
      icon: <AlertTriangle size={24} />, 
      color: 'bg-red-50 text-red-600' 
    },
    { 
      label: 'Pending Reviews', 
      value: reports.filter(r => !r.reviewed).length, 
      icon: <Clock size={24} />, 
      color: 'bg-orange-50 text-orange-600' 
    },
    { 
      label: 'Reviewed Reports', 
      value: reports.filter(r => r.reviewed).length, 
      icon: <CheckCircle2 size={24} />, 
      color: 'bg-emerald-50 text-emerald-600' 
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Recent Reports</h2>
            <Link to="/reports" className="text-emerald-600 hover:text-emerald-700 text-sm font-semibold flex items-center gap-1 transition-colors group">
              View All <ArrowRight size={16} className="shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Triage</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Symptoms</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Loading reports...</td>
                    </tr>
                  ) : reports.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">No recent reports</td>
                    </tr>
                  ) : (
                    reports.slice(0, 5).map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900">{report.userId}</span>
                        </td>
                        <td className="px-6 py-4">
                          <TriageBadge level={report.triageLevel} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {report.symptoms.slice(0, 2).map(s => (
                              <span key={s} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase font-bold">
                                {s}
                              </span>
                            ))}
                            {report.symptoms.length > 2 && <span className="text-[10px] text-slate-400">+{report.symptoms.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {format(new Date(report.timestamp), 'HH:mm')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Emergency Alerts</h2>
          <div className="space-y-4">
            {reports.filter(r => r.triageLevel === 'emergency' && !r.reviewed).map((alert) => (
              <motion.div 
                key={alert.id}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-red-600 shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-bold text-red-900">Critical: {alert.userId}</p>
                    <p className="text-xs text-red-700 mt-1 line-clamp-2">{alert.recommendation}</p>
                    <p className="text-[10px] text-red-500 mt-2 font-medium uppercase">
                      {format(new Date(alert.timestamp), 'MMM d, HH:mm')}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
            {reports.filter(r => r.triageLevel === 'emergency' && !r.reviewed).length === 0 && (
              <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center">
                <CheckCircle2 className="text-emerald-500 mx-auto mb-2" size={32} />
                <p className="text-sm text-slate-500">No active emergency alerts</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
