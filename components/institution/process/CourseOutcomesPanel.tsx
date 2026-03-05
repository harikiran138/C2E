"use client";

import { Save, Loader2, Target, Sparkles } from "lucide-react";
import { useState } from "react";

export default function CourseOutcomesPanel() {
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center pr-2">
                <div>
                    <h3 className="text-xl font-semibold">Course Outcomes (CO)</h3>
                    <p className="text-sm text-slate-600">
                        Define and refine measurable outcomes for each course in the curriculum.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setIsGenerating(true);
                            setTimeout(() => setIsGenerating(false), 2000);
                        }}
                        disabled={isGenerating}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        ) : (
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                        )}
                        AI Generate COs
                    </button>
                    <button
                        onClick={() => {
                            setIsSaving(true);
                            setTimeout(() => setIsSaving(false), 1000);
                        }}
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Outcomes
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                        <Target className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h4 className="font-semibold text-slate-900">Define Outcomes for Selected Course</h4>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-500 italic text-sm">
                            No Course Outcomes defined yet.
                            <br /> Click "AI Generate COs" or add them manually.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
