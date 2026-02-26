'use client';

import { FormEvent, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, UserRound, Lock, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StakeholderLoginCardProps {
  compact?: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
}

export default function StakeholderLoginCard({
  compact = false,
  className,
  title = 'Stakeholder Login',
  subtitle = 'Industry professionals, alumni, and experts can securely submit VMPEO feedback.',
}: StakeholderLoginCardProps) {
  const router = useRouter();
  const [instituteName, setInstituteName] = useState('');
  const [stakeholderId, setStakeholderId] = useState('');
  const [stakeholderPassword, setStakeholderPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!instituteName.trim() || !stakeholderId.trim() || !stakeholderPassword) {
      setError('All fields are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/stakeholder/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institute_name: instituteName.trim(),
          stakeholder_id: stakeholderId.trim(),
          stakeholder_password: stakeholderPassword,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to login');
      }

      router.push('/stakeholder/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 md:p-8',
        compact ? 'max-w-lg' : '',
        className
      )}
    >
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          icon={Building2}
          label="Institute Name"
          value={instituteName}
          onChange={setInstituteName}
          placeholder="Enter institute name"
        />
        <Field
          icon={UserRound}
          label="Stakeholder ID"
          value={stakeholderId}
          onChange={setStakeholderId}
          placeholder="Enter stakeholder ID"
        />
        <Field
          icon={Lock}
          label="Stakeholder Password"
          value={stakeholderPassword}
          onChange={setStakeholderPassword}
          placeholder="Enter stakeholder password"
          type="password"
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Signing in...
            </>
          ) : (
            <>
              Sign In <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: 'text' | 'password';
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
        />
      </div>
    </label>
  );
}
