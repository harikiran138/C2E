'use client';

import React, { useState, useEffect } from 'react';
import { Clock, User, Building2, GraduationCap, Zap, ChevronDown, Filter } from 'lucide-react';

interface LogEntry {
  id: string;
  event_type: string;
  details: any;
  created_at: string;
  program_id: string;
  program_name?: string;
  institution_name?: string;
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/super-admin/logs');
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const getEventIcon = (type: string) => {
    if (type.includes('PSO') || type.includes('PEO') || type.includes('AI')) return Zap;
    if (type.includes('PROGRAM') || type.includes('program')) return GraduationCap;
    if (type.includes('INSTITUTION') || type.includes('institution')) return Building2;
    return User;
  };

  const getEventColor = (type: string) => {
    if (type.includes('AI') || type.includes('GENERATION')) return 'bg-purple-100 text-purple-700';
    if (type.includes('CREATE') || type.includes('create')) return 'bg-emerald-100 text-emerald-700';
    if (type.includes('DELETE') || type.includes('delete')) return 'bg-rose-100 text-rose-700';
    if (type.includes('UPDATE') || type.includes('update')) return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-700';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Audit Trail</h3>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-slate-900 transition-all">
            <Filter className="size-3" />
            Filter
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[40px] overflow-hidden shadow-sm">
        <div className="p-8 space-y-3">
          {loading ? (
            <div className="py-16 text-center">
              <div className="size-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Loading audit trail...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center">
              <Clock className="size-12 text-slate-100 mx-auto mb-4" />
              <p className="text-sm font-black text-slate-300 uppercase tracking-[0.2em]">No activity recorded yet</p>
              <p className="text-xs text-slate-400 mt-2">System events will appear here</p>
            </div>
          ) : (
            logs.slice(0, 20).map((log, idx) => {
              const IconComp = getEventIcon(log.event_type);
              const colorClass = getEventColor(log.event_type);
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-5 bg-slate-50/50 hover:bg-slate-50 rounded-[24px] transition-all group"
                >
                  <div className="flex items-center gap-5">
                    <div className={`size-10 rounded-2xl flex items-center justify-center ${colorClass}`}>
                      <IconComp className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{log.event_type.replace(/_/g, ' ')}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {log.institution_name && <span>{log.institution_name} · </span>}
                        {log.program_name && <span>{log.program_name} · </span>}
                        {typeof log.details === 'object' && log.details?.message
                          ? log.details.message
                          : typeof log.details === 'string'
                            ? log.details
                            : 'System event'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">
                    {formatTime(log.created_at)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
