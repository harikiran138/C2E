'use client';

import React, { useState } from 'react';
import { X, Building2, Mail, Lock, Loader2, CheckCircle2 } from 'lucide-react';

interface CreateInstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateInstitutionModal({ isOpen, onClose, onCreated }: CreateInstitutionModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/super-admin/institutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution_name: name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create institution');
      }

      setSuccess(true);
      setTimeout(() => {
        onCreated();
        onClose();
        setName('');
        setEmail('');
        setPassword('');
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-8 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Building2 className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Provision New Entity</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Institution + Admin Account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-10 rounded-2xl bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors"
          >
            <X className="size-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {/* Institution Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Institution Name</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Indian Institute of Technology"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:border-slate-900 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Admin Email */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Admin Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@institution.edu"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:border-slate-900 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Admin Password */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Admin Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                minLength={8}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:border-slate-900 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-600">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || success}
            className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
              success
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-[0.99] active:scale-[0.97]'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Provisioning...
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="size-4" />
                Entity Provisioned
              </>
            ) : (
              'Provision Entity'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
