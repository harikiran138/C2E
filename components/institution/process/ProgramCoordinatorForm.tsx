"use client";

import { useState, useEffect } from "react";
import {
  Edit2,
  Lock,
  Printer,
  Trash2,
  Plus,
  UserPlus,
  Save as SaveIcon,
  Loader2,
  ChevronDown,
  Mail,
  Phone,
  Building,
  Calendar,
  Linkedin,
  Award,
  BookOpen,
  UserCog,
  Info,
  Upload,
  Settings,
  FileBarChart,
  Clock,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const DESIGNATIONS = [
  "Professor",
  "Associate Professor",
  "Assistant Professor",
];

interface ProgramCoordinator {
  id: string;
  name: string;
  designation: string;
  program_id: string;
  program_name?: string;
  email_official: string;
  email_personal: string;
  mobile_official: string;
  mobile_personal: string;
  linkedin_id: string;
}

interface Program {
  id: string;
  program_name: string;
}

export default function ProgramCoordinatorForm() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [coordinators, setCoordinators] = useState<ProgramCoordinator[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    program_id: "",
    email_official: "",
    email_personal: "",
    mobile_official: "",
    mobile_personal: "",
    linkedin_id: "",
  });

  const fetchCoordinators = async () => {
    try {
      const response = await fetch("/api/institution/program-coordinator");
      if (response.ok) {
        const payload = await response.json();
        setCoordinators(payload.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch coordinators:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await fetch("/api/institution/details");
      if (response.ok) {
        const payload = await response.json();
        if (Array.isArray(payload.programs)) {
          setPrograms(payload.programs);
        }
      }
    } catch (error) {
      console.error("Failed to fetch programs", error);
    }
  };

  useEffect(() => {
    fetchCoordinators();
    fetchPrograms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/institution/program-coordinator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId ? { ...formData, id: editingId } : formData,
        ),
      });
      if (response.ok) {
        alert(
          editingId
            ? "Coordinator updated successfully!"
            : "Coordinator added successfully!",
        );
        setFormData({
          name: "",
          designation: "",
          program_id: "",
          email_official: "",
          email_personal: "",
          mobile_official: "",
          mobile_personal: "",
          linkedin_id: "",
        });
        setEditingId(null);
        fetchCoordinators();
      } else {
        const errorData = await response.json();
        alert(`Failed to save: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to save coordinator:", error);
      alert("An error occurred while saving.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (coordinator: ProgramCoordinator, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData({
      name: coordinator.name || "",
      designation: coordinator.designation || "",
      program_id: coordinator.program_id || "",
      email_official: coordinator.email_official || "",
      email_personal: coordinator.email_personal || "",
      mobile_official: coordinator.mobile_official || "",
      mobile_personal: coordinator.mobile_personal || "",
      linkedin_id: coordinator.linkedin_id || "",
    });
    setEditingId(coordinator.id);
    setExpandedId(coordinator.id);

    // Scroll to form
    const formElement = document.getElementById("coordinator-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleDelete = async (
    coordinator: ProgramCoordinator,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to remove this program coordinator?"))
      return;

    try {
      const response = await fetch(
        `/api/institution/program-coordinator?id=${coordinator.id}`,
        {
          method: "DELETE",
        },
      );
      if (response.ok) {
        fetchCoordinators();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("An error occurred while deleting.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const scrollToForm = () => {
    const formElement = document.getElementById("coordinator-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="space-y-8 animate-element">
      {/* Main Form Section */}
      <div
        id="coordinator-form"
        className="group rounded-[1.5rem] border border-slate-200 bg-white p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]"
      >
        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <UserCog className="size-5 text-indigo-600" />
              Coordinator Details
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Manage program coordinators and their permissions
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLocked && (
              <button
                type="button"
                onClick={() => setIsLocked(false)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-white hover:shadow-sm transition-all uppercase tracking-wide"
              >
                <Edit2 className="size-3.5" /> Unlock to Edit
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
            {/* Name Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Full Name
                </label>
              </div>
              <input
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                placeholder="Dr. John Doe"
              />
            </div>

            {/* Designation Field */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Designation
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="size-3 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-medium">
                        Select academic designation
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <select
                  value={formData.designation}
                  onChange={(e) =>
                    setFormData({ ...formData, designation: e.target.value })
                  }
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select Designation</option>
                  {DESIGNATIONS.map((designation) => (
                    <option key={designation} value={designation}>
                      {designation}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Program Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Program
              </label>
              <div className="relative">
                <select
                  value={formData.program_id}
                  onChange={(e) =>
                    setFormData({ ...formData, program_id: e.target.value })
                  }
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none appearance-none cursor-pointer"
                >
                  <option value="">Assign to Program</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.program_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* LinkedIn Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                LinkedIn Profile
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Linkedin className="size-4" />
                </div>
                <input
                  value={formData.linkedin_id}
                  onChange={(e) =>
                    setFormData({ ...formData, linkedin_id: e.target.value })
                  }
                  className="w-full h-11 pl-10 rounded-xl border border-slate-200 bg-slate-50/50 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                  placeholder="linkedin.com/in/username"
                />
              </div>
            </div>

            {/* Official Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Official Email
              </label>
              <input
                type="email"
                value={formData.email_official}
                onChange={(e) =>
                  setFormData({ ...formData, email_official: e.target.value })
                }
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                placeholder="official@institution.edu"
              />
            </div>

            {/* Personal Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Personal Email
              </label>
              <input
                type="email"
                value={formData.email_personal}
                onChange={(e) =>
                  setFormData({ ...formData, email_personal: e.target.value })
                }
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                placeholder="personal@gmail.com"
              />
            </div>

            {/* Official Mobile */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Official Mobile
              </label>
              <input
                value={formData.mobile_official}
                onChange={(e) =>
                  setFormData({ ...formData, mobile_official: e.target.value })
                }
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                placeholder="+91 00000 00000"
              />
            </div>

            {/* Personal Mobile */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Personal Mobile
              </label>
              <input
                value={formData.mobile_personal}
                onChange={(e) =>
                  setFormData({ ...formData, mobile_personal: e.target.value })
                }
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                placeholder="+91 00000 00000"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-slate-100 mt-6">
            {(!isLocked || editingId) && (
              <button
                type="submit"
                disabled={submitting}
                className="group relative overflow-hidden rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 disabled:opacity-50"
              >
                <div className="flex items-center justify-center gap-2 relative z-10">
                  {submitting ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : editingId ? (
                    <>
                      {" "}
                      <SaveIcon className="size-5" /> Update Coordinator{" "}
                    </>
                  ) : (
                    <>
                      {" "}
                      <Plus className="size-5" /> Add Coordinator{" "}
                    </>
                  )}
                </div>
              </button>
            )}

            {!isLocked && coordinators.length > 0 && (
              <button
                type="button"
                onClick={() => setIsLocked(true)}
                className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
              >
                <Lock className="size-5 text-slate-400" /> Lock List
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
            >
              <Printer className="size-5 text-slate-400" /> Print PDF
            </button>

            {isLocked && !editingId && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-500 cursor-not-allowed">
                <Lock className="size-4" /> Locked
              </div>
            )}

            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    name: "",
                    designation: "",
                    program_id: "",
                    email_official: "",
                    email_personal: "",
                    mobile_official: "",
                    mobile_personal: "",
                    linkedin_id: "",
                  });
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List Section */}
      <div className="space-y-4 pt-4">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 px-1">
          <UserCog className="size-4 text-indigo-500" /> Registered Coordinators
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-2">
            {coordinators.length}
          </span>
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
              <Loader2 className="size-8 animate-spin text-indigo-200 mb-3" />
              <p className="text-sm font-medium text-slate-400">
                Loading coordinators...
              </p>
            </div>
          ) : coordinators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[1.5rem] border border-slate-200 border-dashed text-center">
              <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <Users className="size-8 text-slate-300" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">
                No Coordinators Yet
              </h4>
              <p className="text-sm text-slate-500 max-w-xs mt-1 mb-6">
                Start by adding a program coordinator to manage curriculum and
                governance.
              </p>
              <button
                onClick={scrollToForm}
                className="text-indigo-600 font-bold text-sm hover:underline"
              >
                + Add First Coordinator
              </button>
            </div>
          ) : (
            coordinators.map((coordinator, index) => {
              const isExpanded = expandedId === coordinator.id;
              return (
                <motion.div
                  layout
                  key={coordinator.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "group rounded-2xl border bg-white transition-all duration-300 overflow-hidden",
                    isExpanded
                      ? "border-indigo-200 shadow-xl shadow-indigo-100"
                      : "border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200/50 hover:translate-y-[-2px]",
                  )}
                >
                  <div
                    onClick={() => toggleExpand(coordinator.id)}
                    className="p-5 flex items-center gap-5 cursor-pointer select-none"
                  >
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all duration-300",
                        isExpanded
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                          : "bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600",
                      )}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-4">
                        <div className="font-bold text-slate-900 truncate text-lg">
                          {coordinator.name}
                        </div>
                        <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide mt-0.5">
                          {coordinator.designation}
                        </div>
                      </div>

                      <div className="md:col-span-4 hidden md:block">
                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg w-fit">
                          <BookOpen className="size-3.5 text-slate-400" />
                          <span className="truncate max-w-[200px] font-medium">
                            {coordinator.program_name || "No Program"}
                          </span>
                        </div>
                      </div>

                      <div className="md:col-span-4 hidden md:flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleEdit(coordinator, e)}
                          className="size-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        {!isLocked && (
                          <button
                            onClick={(e) => handleDelete(coordinator, e)}
                            className="size-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      className={cn(
                        "size-8 rounded-full flex items-center justify-center transition-all duration-300",
                        isExpanded
                          ? "bg-indigo-50 text-indigo-600 rotate-180"
                          : "bg-transparent text-slate-400 group-hover:bg-slate-50",
                      )}
                    >
                      <ChevronDown className="size-5" />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <div className="px-5 pb-6 pt-0 border-t border-slate-100/80 bg-slate-50/30">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
                            <InfoCard
                              icon={Mail}
                              label="Official Email"
                              value={coordinator.email_official}
                            />
                            <InfoCard
                              icon={Phone}
                              label="Official Mobile"
                              value={coordinator.mobile_official}
                            />
                            <InfoCard
                              icon={Linkedin}
                              label="LinkedIn"
                              value={coordinator.linkedin_id}
                              isLink
                            />

                            <InfoCard
                              icon={Mail}
                              label="Personal Email"
                              value={coordinator.email_personal}
                              secondary
                            />
                            <InfoCard
                              icon={Phone}
                              label="Personal Mobile"
                              value={coordinator.mobile_personal}
                              secondary
                            />

                            {/* Actions for Mobile / Expanded View */}
                            <div className="md:col-span-2 lg:col-span-1 flex items-end justify-end gap-2 h-full min-h-[60px]">
                              <button
                                onClick={(e) => handleEdit(coordinator, e)}
                                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
                              >
                                Edit Details
                              </button>
                              {!isLocked && (
                                <button
                                  onClick={(e) => handleDelete(coordinator, e)}
                                  className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-100 transition-all shadow-sm"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, isLink, secondary }: any) {
  if (!value) return null;
  return (
    <div
      className={cn(
        "p-3.5 rounded-xl border transition-all",
        secondary
          ? "bg-slate-50 border-slate-100/50"
          : "bg-white border-slate-100 shadow-sm",
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
        <Icon className="size-3" /> {label}
      </div>
      <div
        className={cn(
          "text-sm font-medium truncate",
          secondary ? "text-slate-500" : "text-slate-800",
        )}
      >
        {isLink ? (
          <a
            href={value.startsWith("http") ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
