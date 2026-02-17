"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Sparkles, Edit2, Check, X, Loader2 } from 'lucide-react';

interface EditableVisionMissionProps {
  initialVision?: string;
  initialMission?: string;
  onUpdate?: () => void;
}

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

export default function EditableVisionMission({ 
  initialVision, 
  initialMission, 
  onUpdate 
}: EditableVisionMissionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [vision, setVision] = useState(initialVision || "");
  const [mission, setMission] = useState(initialMission || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/institution/vision-mission', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vision, mission })
      });

      if (res.ok) {
        setIsEditing(false);
        if (onUpdate) onUpdate();
      } else {
        console.error("Failed to save vision/mission");
        alert("Failed to save changes. Please try again.");
      }
    } catch (error) {
      console.error("Error saving vision/mission:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setVision(initialVision || "");
    setMission(initialMission || "");
    setIsEditing(false);
  };

  return (
    <div className="relative group">
      {!isEditing && (
        <button 
          onClick={() => setIsEditing(true)}
          className="absolute -top-2 -right-2 p-1.5 bg-white border border-slate-200 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-slate-50"
          title="Edit Vision & Mission"
        >
          <Edit2 className="size-3 text-slate-400" />
        </button>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        {/* Vision Section */}
        <div className={cn(
          "flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-4 py-3 transition-all",
          isEditing && "ring-2 ring-indigo-500/10 border-indigo-500"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <Target className="size-3 text-indigo-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vision</span>
          </div>
          {isEditing ? (
            <textarea
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              className="w-full bg-transparent text-sm font-bold text-slate-900 italic focus:outline-none resize-none h-12"
              placeholder="Enter institution vision..."
              autoFocus
            />
          ) : (
            <p className="text-sm font-bold text-slate-700 italic whitespace-pre-wrap break-words leading-relaxed">
              {initialVision ? `"${initialVision}"` : ""}
            </p>
          )}
        </div>

        {/* Mission Section */}
        <div className={cn(
          "flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-4 py-3 transition-all",
          isEditing && "ring-2 ring-indigo-500/10 border-indigo-500"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="size-3 text-emerald-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mission</span>
          </div>
          {isEditing ? (
            <textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              className="w-full bg-transparent text-sm font-bold text-slate-700 italic focus:outline-none resize-none h-12"
              placeholder="Enter institution mission..."
            />
          ) : (
            <p className="text-sm font-bold text-slate-700 italic whitespace-pre-wrap break-words leading-relaxed">
              {initialMission ? `"${initialMission}"` : ""}
            </p>
          )}
        </div>

        {/* Actions Section (Only when editing) */}
        <AnimatePresence>
          {isEditing && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex sm:flex-col gap-2"
            >
              <button
                onClick={handleSave}
                disabled={loading}
                className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all"
                title="Save Changes"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:bg-slate-50 transition-all"
                title="Cancel"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
