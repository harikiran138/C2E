"use client";

import { Save, Loader2, MessageSquare, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function CurriculumFeedbackPanel() {
    const [isSaving, setIsSaving] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center pr-2">
                <div>
                    <h3 className="text-xl font-semibold">Curriculum Feedback & Analysis</h3>
                    <p className="text-sm text-slate-600">
                        Collect and analyze feedback from stakeholders to refine the curriculum structure.
                    </p>
                </div>
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
                    Complete Feedback Phase
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <MessageSquare className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h4 className="font-semibold text-slate-900">Stakeholder Input Summary</h4>
                    </div>

                    <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-500 italic">No feedback collected yet.</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <h4 className="font-semibold text-slate-900">Compliance Checklist</h4>
                    </div>

                    <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-500 italic">Alignment check pending.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
