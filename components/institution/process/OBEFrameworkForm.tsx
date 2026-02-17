'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Loader2,
  BookOpen,
  Info,
  CheckCircle2,
  Plus,
  X,
  Eye,
  ArrowRight,
  Library,
  Book,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';

interface LibraryItem {
  id: string;
  program_id: string;
  title: string;
  description: string;
  pdf_url: string;
  pdf_name: string;
  created_at?: string;
}

export default function OBEFrameworkForm() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const fetchLibrary = async (programId: string) => {
    if (!programId) return;
    setLoading(true);
    try {
      const response = await fetch('/api/institution/obe-framework');
      if (response.ok) {
        const payload = await response.json();
        // Filter items that have at least a title or pdf (to avoid showing legacy empty records or placeholders)
        const items = payload.data?.filter((item: any) => 
          item.program_id === programId && (item.pdf_url || item.title)
        ) || [];
        setLibraryItems(items);
      }
    } catch (error) {
      console.error('Failed to fetch library items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await fetch('/api/institution/details');
      if (response.ok) {
        const payload = await response.json();
        if (Array.isArray(payload.programs)) {
          setPrograms(payload.programs);
          if (payload.programs.length > 0) {
            setSelectedProgramId(payload.programs[0].id);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch programs", error);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      fetchLibrary(selectedProgramId);
    }
  }, [selectedProgramId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
      } else {
        alert('Please select a PDF file.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !selectedFile) {
      alert('Please provide a title and select a PDF file.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${selectedProgramId}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `library/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('obe-framework')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('obe-framework')
        .getPublicUrl(filePath);

      // 2. Save to Database
      const response = await fetch('/api/institution/obe-framework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: selectedProgramId,
          title: newTitle,
          description: newDescription,
          pdf_url: publicUrl,
          pdf_name: selectedFile.name
        }),
      });

      if (response.ok) {
        setNewTitle('');
        setNewDescription('');
        setSelectedFile(null);
        setShowAddForm(false);
        fetchLibrary(selectedProgramId);
      } else {
        throw new Error('Failed to save document info');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to add document. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: LibraryItem) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    
    setSubmitting(true);
    try {
      // 1. Delete from Storage
      const path = item.pdf_url.split('/').pop();
      if (path) {
        await supabase.storage.from('obe-framework').remove([`library/${path}`]);
      }

      // 2. Delete from Database
      const response = await fetch('/api/institution/obe-framework', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });

      if (response.ok) {
        fetchLibrary(selectedProgramId);
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = libraryItems.filter(item => 
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-element">
      {/* Header section */}
      <div className="group rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-[0_4px_30px_-4px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_12px_40px_-4px_rgba(0,0,0,0.06)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-20"></div>

        {/* Add Document Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-12"
            >
              <div className="rounded-[2rem] bg-slate-50 border border-slate-200 p-8">
                <form onSubmit={handleAddDocument} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Book / Document Title</label>
                       <input 
                         required
                         type="text" 
                         value={newTitle}
                         onChange={(e) => setNewTitle(e.target.value)}
                         placeholder="e.g. 2024 Course Curriculum Standards"
                         className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Brief Description (Optional)</label>
                       <textarea 
                         rows={3}
                         value={newDescription}
                         onChange={(e) => setNewDescription(e.target.value)}
                         placeholder="Describe the purpose or content of this protocol..."
                         className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
                       />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">Upload Protocol PDF</label>
                    <div 
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "group/upload relative cursor-pointer rounded-2xl border-2 border-dashed h-[164px] transition-all flex flex-col items-center justify-center text-center p-6",
                        dragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-300"
                      )}
                    >
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".pdf"
                        className="hidden" 
                        onChange={handleFileSelect}
                      />
                      
                      {selectedFile ? (
                        <div className="flex flex-col items-center gap-2">
                           <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-lg">
                              <FileText className="size-6" />
                           </div>
                           <p className="text-sm font-black text-slate-700">{selectedFile.name}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      ) : (
                        <>
                          <div className="p-3 rounded-xl bg-slate-50 text-slate-400 mb-2 group-hover/upload:bg-indigo-50 group-hover/upload:text-indigo-500 transition-all">
                             <Upload className="size-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-500">Drag & drop or Click to browse</p>
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">PDF Format Only</p>
                        </>
                      )}
                    </div>

                    <button 
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-indigo-600 text-white rounded-2xl py-4 text-sm font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      {submitting ? "ADDING BOOK..." : "SAVE TO LIBRARY"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Library Grid/List */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
             <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                Registered Protocols
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{filteredItems.length}</span>
             </h3>
             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search your library..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 pr-6 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-indigo-300 transition-all w-full md:w-64"
                />
             </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
              <Loader2 className="size-12 animate-spin text-indigo-300 mb-4" />
              <p className="text-sm font-bold text-slate-500">Opening Library Vault...</p>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredItems.map((item, idx) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group/card rounded-3xl border border-slate-200 bg-white p-6 transition-all hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 relative flex flex-col h-full"
                  >
                    <div className="flex items-start justify-between mb-4">
                       <div className="size-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm group-hover/card:bg-indigo-600 group-hover/card:text-white transition-all">
                          <BookOpen className="size-6" />
                       </div>
                       <button 
                         onClick={() => handleDelete(item)}
                         className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                       >
                         <Trash2 className="size-4" />
                       </button>
                    </div>

                    <h4 className="text-lg font-black text-slate-900 mb-2 line-clamp-2 leading-tight">{item.title}</h4>
                    <p className="text-sm font-medium text-slate-500 mb-6 line-clamp-3 leading-relaxed flex-grow">
                      {item.description || "No description provided for this protocol document."}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                        <div className="flex items-center gap-2">
                           <FileText className="size-3 text-slate-300" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate max-w-[100px]">
                              {item.pdf_name}
                           </span>
                        </div>
                        <a 
                          href={item.pdf_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 hover:text-indigo-700 tracking-widest uppercase py-1 px-3 bg-indigo-50 rounded-lg group-hover/card:bg-indigo-600 group-hover/card:text-white transition-all"
                        >
                          VIEW <Eye className="size-3" />
                        </a>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
               <div className="size-20 rounded-3xl bg-white flex items-center justify-center text-slate-200 shadow-sm mb-6">
                  <Book className="size-10" />
               </div>
               <h4 className="text-xl font-bold text-slate-900 mb-2">Empty Library</h4>
               <p className="text-slate-500 font-medium max-w-sm">No books or framework documents found for this program.</p>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
