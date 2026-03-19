import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './components/AuthContext';
import api from '../api';
import { Activity, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    console.log("Submitting login form:", data);
    setIsLoading(true);
    setError('');
    try {
      console.log("Calling API...");
      const response = await api.post('/admin/login', data);
      console.log("API response received:", response.data);
      login(response.data.token, response.data.user);
      navigate('/');
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
            <Activity className="text-emerald-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">HealthLink Portal</h1>
          <p className="text-slate-500 mt-2 text-center">Practitioner & Admin Access Only</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              {...register('email', { required: 'Email is required' })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="dr.smith@healthlink.org"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              {...register('password', { required: 'Password is required' })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="••••••••"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message as string}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            For demonstration, any email and password will work.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
