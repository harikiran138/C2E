"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Save, 
  Loader2, 
  MessageSquare, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Star,
  User,
  AlertCircle
} from "lucide-react";

interface FeedbackEntry {
  id: string;
  stakeholder_email: string;
  feedback_text: string;
  rating: number;
  created_at: string;
}

export default function CurriculumFeedbackPanel() {
  const searchParams = useSearchParams();
  const programId = searchParams.get("programId") ?? "";

  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // New entry form state
  const [formData, setFormData] = useState({
    email: "",
    text: "",
    rating: 5
  });

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!programId) return;
    loadFeedback();
  }, [programId]);

  const loadFeedback = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/curriculum/feedback?programId=${programId}`);
      if (!res.ok) throw new Error("Failed to fetch feedback");
      const data = await res.json();
      setFeedbackList(data.feedback || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load feedback", false);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/curriculum/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          stakeholderEmail: formData.email,
          feedbackText: formData.text,
          rating: formData.rating,
        }),
      });

      if (!res.ok) throw new Error("Failed to save feedback");
      
      showToast("Feedback added successfully", true);
      setFormData({ email: "", text: "", rating: 5 });
      loadFeedback();
    } catch (err) {
      console.error(err);
      showToast("Error saving feedback", false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;
    
    try {
      const res = await fetch(`/api/curriculum/feedback?id=${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete");
      setFeedbackList(prev => prev.filter(f => f.id !== id));
      showToast("Feedback deleted", true);
    } catch (err) {
      console.error(err);
      showToast("Error deleting feedback", false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${
          toast.ok ? "bg-emerald-600" : "bg-red-500"
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex justify-between items-center pr-2">
        <div>
          <h3 className="text-xl font-semibold">Curriculum Feedback & Analysis</h3>
          <p className="text-sm text-slate-600">
            Collect and analyze feedback from stakeholders to refine the curriculum structure.
          </p>
        </div>
        <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-700">Phase Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feedback List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                </div>
                <h4 className="font-semibold text-slate-900">Stakeholder Testimonials</h4>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {feedbackList.length} Entries
              </span>
            </div>

            {isLoading ? (
               <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-sm">Fetching feedback data...</p>
               </div>
            ) : feedbackList.length === 0 ? (
               <div className="p-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center">
                  <MessageSquare className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500 font-medium">No feedback collected for this program yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Add stakeholder feedback using the form on the right.</p>
               </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {feedbackList.map((feedback) => (
                  <div key={feedback.id} className="group p-4 bg-slate-50/80 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all relative">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{feedback.stakeholder_email || "Anonymous Stakeholder"}</p>
                          <p className="text-[10px] text-slate-500">
                            {new Date(feedback.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-bold text-slate-700">{feedback.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed italic">
                      "{feedback.feedback_text}"
                    </p>
                    <button 
                      onClick={() => handleDelete(feedback.id)}
                      className="absolute top-4 right-1 translate-x-full opacity-0 group-hover:opacity-100 group-hover:translate-x-[-12px] p-1.5 bg-white shadow-sm border border-slate-200 rounded-lg text-red-500 hover:bg-red-50 transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Feedback Form */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 sticky top-6">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Add New Feedback
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Stakeholder Email (Optional)</label>
                <input 
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="stakeholder@institution.edu"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Feedback Content</label>
                <textarea 
                  required
                  value={formData.text}
                  onChange={e => setFormData({...formData, text: e.target.value})}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  placeholder="Provide detailed feedback on curriculum structure, course relevance, or industry alignment..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Rating (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({...formData, rating: star})}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                        formData.rating >= star 
                          ? "bg-amber-50 border-amber-200 text-amber-500" 
                          : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}
                    >
                      <Star className={`w-5 h-5 ${formData.rating >= star ? "fill-amber-500" : ""}`} />
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving || !formData.text.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Submit Feedback
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
               <div className="flex items-start gap-2 text-[10px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p>Feedback entries are analyzed for keywords like "Skill Gap", "Industry Alignment", and "Theory Overload" to generate curriculum optimization insights.</p>
               </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
