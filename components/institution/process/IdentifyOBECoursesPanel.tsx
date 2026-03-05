"use client";

import { Save, Loader2, BookOpen } from "lucide-react";
import { useState } from "react";

export default function IdentifyOBECoursesPanel() {
    const [isSaving, setIsSaving] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center pr-2">
                <div>
                    <h3 className="text-xl font-semibold">Identify OBE Courses</h3>
                    <p className="text-sm text-slate-600">
                        Map existing curriculum courses to the Outcome-Based Education framework.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setIsSaving(true);
                        setTimeout(() => {
                            setIsSaving(false);
                            alert("OBE Courses identified and saved!");
                        }, 1000);
                    }}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {isSaving ? "Saving..." : "Save Mappings"}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <BookOpen className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h4 className="font-semibold text-slate-900">Course Identification Matrix</h4>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-700">
                                    <th className="border-b border-slate-200 px-4 py-3 text-left">Course Code</th>
                                    <th className="border-b border-slate-200 px-4 py-3 text-left">Course Title</th>
                                    <th className="border-b border-slate-200 px-4 py-3 text-center">Is OBE Core?</th>
                                    <th className="border-b border-slate-200 px-4 py-3 text-center">Credit Compliance</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">
                                        No courses identified yet. Please upload curriculum or add courses manually.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
