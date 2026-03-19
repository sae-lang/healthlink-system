import React, { useEffect, useState } from 'react';
import api from '../../api';
import { DiagnosticRule, TriageLevel } from '../../types';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'motion/react';

const TriageBadge: React.FC<{ level: TriageLevel }> = ({ level }) => {
  const styles = {
    emergency: "bg-red-100 text-red-700 border-red-200",
    urgent: "bg-orange-100 text-orange-700 border-orange-200",
    routine: "bg-blue-100 text-blue-700 border-blue-200",
    "self-care": "bg-emerald-100 text-emerald-700 border-emerald-200"
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${styles[level]}`}>
      {level}
    </span>
  );
};

export const Rules: React.FC = () => {
  const [rules, setRules] = useState<DiagnosticRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DiagnosticRule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/rules');
      setRules(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (rule?: DiagnosticRule) => {
    if (rule) {
      setEditingRule(rule);
      setValue('condition', rule.condition);
      setValue('symptoms', rule.symptoms.join(', '));
      setValue('recommendation', rule.recommendation);
      setValue('triageLevel', rule.triageLevel);
      setValue('isActive', rule.isActive);
    } else {
      setEditingRule(null);
      reset({
        condition: '',
        symptoms: '',
        recommendation: '',
        triageLevel: 'routine',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    const formattedData = {
      ...data,
      symptoms: data.symptoms.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '')
    };

    try {
      if (editingRule) {
        await api.put(`/admin/rules/${editingRule.id}`, formattedData);
      } else {
        await api.post('/admin/rules', formattedData);
      }
      fetchRules();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (rule: DiagnosticRule) => {
    try {
      await api.put(`/admin/rules/${rule.id}`, { isActive: !rule.isActive });
      setRules(rules.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await api.delete(`/admin/rules/${id}`);
      fetchRules();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Diagnostic Rules</h2>
          <p className="text-slate-500 text-sm mt-1">Manage the knowledge base that drives patient recommendations.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-200"
        >
          <Plus size={20} />
          Add New Rule
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-400">Loading knowledge base...</div>
        ) : rules.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400">No rules defined yet.</div>
        ) : (
          rules.map((rule) => (
            <motion.div 
              layout
              key={rule.id}
              className={`bg-white rounded-2xl border p-6 shadow-sm transition-all ${rule.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <TriageBadge level={rule.triageLevel} />
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleOpenModal(rule)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2">{rule.condition}</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Symptoms</p>
                  <div className="flex flex-wrap gap-1">
                    {rule.symptoms.map(s => (
                      <span key={s} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recommendation</p>
                  <p className="text-sm text-slate-600 line-clamp-2 italic">"{rule.recommendation}"</p>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 text-xs font-bold ${rule.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {rule.isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button 
                    onClick={() => toggleStatus(rule)}
                    className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${
                      rule.isActive 
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {rule.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Rule Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingRule ? 'Edit Diagnostic Rule' : 'Create New Rule'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Condition Name</label>
                  <input
                    {...register('condition', { required: 'Condition name is required' })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g., Seasonal Allergies"
                  />
                  {errors.condition && <p className="text-red-500 text-xs mt-1">{errors.condition.message as string}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Symptoms (comma separated)</label>
                  <input
                    {...register('symptoms', { required: 'At least one symptom is required' })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g., sneezing, itchy eyes, runny nose"
                  />
                  {errors.symptoms && <p className="text-red-500 text-xs mt-1">{errors.symptoms.message as string}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Triage Level</label>
                    <select
                      {...register('triageLevel')}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="emergency">Emergency</option>
                      <option value="urgent">Urgent</option>
                      <option value="routine">Routine</option>
                      <option value="self-care">Self-care</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" {...register('isActive')} className="w-4 h-4 text-emerald-600 rounded" />
                      <span className="text-sm font-bold text-slate-700">Active Status</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Recommendation Text</label>
                  <textarea
                    {...register('recommendation', { required: 'Recommendation is required' })}
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                    placeholder="Provide clear instructions for the patient..."
                  />
                  {errors.recommendation && <p className="text-red-500 text-xs mt-1">{errors.recommendation.message as string}</p>}
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (editingRule ? 'Update Rule' : 'Create Rule')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
