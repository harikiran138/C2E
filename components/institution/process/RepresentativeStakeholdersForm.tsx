"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  Linkedin,
  Award,
  Info,
  UserCog,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STAKEHOLDER_CATEGORIES = [
  "Industry professionals",
  "Alumni",
  "Academic experts",
  "Employer representatives",
  "Advisory board members",
];

import { memberSchema } from "@/lib/schemas";

function StakeholdersFormContent() {
  const searchParams = useSearchParams();
  const programId = searchParams.get("programId");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    member_name: "",
    member_id: "",
    organization: "",
    email: "",
    mobile_number: "",
    specialisation: "",
    category: "",
    linkedin_id: "",
  });

  const fetchMembers = async () => {
    if (!programId) return;
    try {
      setLoading(true);
      const response = await fetch(
        `/api/institution/stakeholders?programId=${programId}`,
      );
      if (response.ok) {
        const payload = await response.json();
        setMembers(payload.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch stakeholders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [programId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programId) return;

    // Validate form data
    const result = memberSchema.safeParse(formData);
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }

    setErrors({}); // Clear errors if validation passes

    setSubmitting(true);
    try {
      const response = await fetch("/api/institution/stakeholders", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId
            ? { ...formData, id: editingId, program_id: programId }
            : { ...formData, program_id: programId },
        ),
      });

      if (response.ok) {
        const payload = await response.json();

        if (editingId) {
          alert("Stakeholder updated successfully!");
        } else {
          alert(
            `Stakeholder added successfully!\nStakeholder ID: ${payload?.data?.member_id || "generated"}\nDefault Password: ${payload?.defaults?.password || "apassword"}`,
          );
        }

        setFormData({
          member_name: "",
          member_id: "",
          organization: "",
          email: "",
          mobile_number: "",
          specialisation: "",
          category: "",
          linkedin_id: "",
        });
        setEditingId(null);
        fetchMembers();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || "Failed to save stakeholder"}`);
      }
    } catch (error) {
      console.error("Failed to save stakeholder:", error);
      alert("Failed to save stakeholder. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (member: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormData({
      member_name: member.member_name || "",
      member_id: member.member_id || "",
      organization: member.organization || "",
      email: member.email || "",
      mobile_number: member.mobile_number || "",
      specialisation: member.specialisation || "",
      category: member.category || "",
      linkedin_id: member.linkedin_id || "",
    });
    setEditingId(member.id);
    setExpandedId(member.id);

    // Scroll to form
    const formElement = document.getElementById("stakeholder-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this stakeholder?")) return;

    try {
      const response = await fetch(`/api/institution/stakeholders?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchMembers();
      } else {
        alert("Failed to delete stakeholder");
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleToggleApproval = async (member: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = !member.is_approved;
    try {
      const response = await fetch("/api/institution/stakeholders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, is_approved: newStatus }),
      });
      if (response.ok) {
        fetchMembers();
      } else {
        alert("Failed to update approval status");
      }
    } catch (error) {
      console.error("Approval toggle error:", error);
    }
  };

  const handlePrintPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Representative Stakeholders</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; }
            h1 { text-align: center; color: #000; margin-bottom: 5px; text-transform: uppercase; font-size: 18pt; }
            h2 { text-align: center; color: #333; margin-top: 0; font-size: 14pt; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11pt; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; vertical-align: top; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .header-info { margin-bottom: 30px; text-align: center; color: #000; font-size: 12pt; }
          </style>
        </head>
        <body>
          <h1>Representative Stakeholders</h1>
          <div class="header-info">Institutional Resource Planning - Stakeholder Consultation Report</div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%">S.No</th>
                <th style="width: 25%">Name of Member</th>
                <th style="width: 20%">Category</th>
                <th style="width: 30%">Organization & Designation</th>
                <th style="width: 20%">Contact</th>
              </tr>
            </thead>
            <tbody>
              ${members
        .map(
          (m, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>
                    <strong>${m.member_name}</strong><br/>
                    <small>ID: ${m.member_id || "-"}</small>
                  </td>
                  <td>${m.category}</td>
                  <td>${m.organization}<br/><small>${m.specialisation || ""}</small></td>
                  <td>
                    ${m.email}<br/>
                    ${m.mobile_number}
                  </td>
                </tr>
              `,
        )
        .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const scrollToForm = () => {
    const formElement = document.getElementById("stakeholder-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  if (!programId) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50">
        <div className="size-20 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm ring-8 ring-slate-100/50">
          <Lock className="size-10 text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">
          Program Not Selected
        </h3>
        <p className="text-slate-500 max-w-sm mt-2 font-medium">
          Please select a program from the dashboard to add Representative
          Stakeholders.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-element">
      {/* Main Form Section */}
      <div
        id="stakeholder-form"
        className="group rounded-[1.5rem] border border-slate-200 bg-white p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]"
      >
        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <UserPlus className="size-6 text-indigo-600" />
              Representative Stakeholders
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Add stakeholders for consultation and validation
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
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Name of the Member
              </label>
              <input
                required
                value={formData.member_name}
                onChange={(e) =>
                  setFormData({ ...formData, member_name: e.target.value })
                }
                className={cn(
                  "w-full h-11 rounded-xl border bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 transition-all outline-none",
                  errors.member_name
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                    : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10",
                )}
                placeholder="Full name"
              />
              {errors.member_name && (
                <p className="text-xs font-semibold text-red-500 mt-1">
                  {errors.member_name[0]}
                </p>
              )}
            </div>

            {/* Member ID Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Member ID
              </label>
              <input
                value={formData.member_id}
                onChange={(e) =>
                  setFormData({ ...formData, member_id: e.target.value })
                }
                readOnly
                className={cn(
                  "w-full h-11 rounded-xl border bg-slate-100/60 px-4 text-sm font-semibold text-slate-600 placeholder:text-slate-400 outline-none cursor-not-allowed",
                  errors.member_id
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                    : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10",
                )}
                placeholder="Auto-generated on save"
              />
              <p className="text-[11px] font-medium text-slate-500">
                Generated format: `INSTCODE-PROGCODE-001` | Default password:
                `apassword`
              </p>
              {errors.member_id && (
                <p className="text-xs font-semibold text-red-500 mt-1">
                  {errors.member_id[0]}
                </p>
              )}
            </div>

            {/* Category Field */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Category
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="size-3 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-medium">
                        Select the stakeholder role/classification
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <select
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className={cn(
                    "w-full h-11 rounded-xl border bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 focus:bg-white focus:ring-4 transition-all outline-none appearance-none cursor-pointer",
                    errors.category
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10",
                  )}
                >
                  <option value="">Select Category</option>
                  {STAKEHOLDER_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              </div>
              {errors.category && (
                <p className="text-xs font-semibold text-red-500 mt-1">
                  {errors.category[0]}
                </p>
              )}
            </div>

            {/* Organization Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Organisation
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Building className="size-4" />
                </div>
                <input
                  value={formData.organization}
                  onChange={(e) =>
                    setFormData({ ...formData, organization: e.target.value })
                  }
                  className={cn(
                    "w-full h-11 pl-10 rounded-xl border bg-slate-50/50 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 transition-all outline-none",
                    errors.organization
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10",
                  )}
                  placeholder="Current Organisation"
                />
              </div>
              {errors.organization && (
                <p className="text-xs font-semibold text-red-500 mt-1">
                  {errors.organization[0]}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Email ID
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="size-4" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={cn(
                    "w-full h-11 pl-10 rounded-xl border bg-slate-50/50 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 transition-all outline-none",
                    errors.email
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10",
                  )}
                  placeholder="email@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs font-semibold text-red-500 mt-1">
                  {errors.email[0]}
                </p>
              )}
            </div>

            {/* Mobile Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Phone className="size-4" />
                </div>
                <input
                  value={formData.mobile_number}
                  onChange={(e) =>
                    setFormData({ ...formData, mobile_number: e.target.value })
                  }
                  className={cn(
                    "w-full h-11 pl-10 rounded-xl border bg-slate-50/50 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 transition-all outline-none",
                    errors.mobile_number
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10",
                  )}
                  placeholder="+91 00000 00000"
                />
              </div>
              {errors.mobile_number && (
                <p className="text-xs font-semibold text-red-500 mt-1">
                  {errors.mobile_number[0]}
                </p>
              )}
            </div>

            {/* Specialisation */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Specialisation
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Award className="size-4" />
                </div>
                <input
                  value={formData.specialisation}
                  onChange={(e) =>
                    setFormData({ ...formData, specialisation: e.target.value })
                  }
                  className={cn(
                    "w-full h-11 pl-10 rounded-xl border bg-slate-50/50 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 transition-all outline-none",
                    errors.specialisation
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10",
                  )}
                  placeholder="Area of expertise"
                />
              </div>
              {errors.specialisation && (
                <p className="text-xs font-semibold text-red-500 mt-1">
                  {errors.specialisation[0]}
                </p>
              )}
            </div>

            {/* LinkedIn */}
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
                  className={cn(
                    "w-full h-11 pl-10 rounded-xl border bg-slate-50/50 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 transition-all outline-none",
                    errors.linkedin_id
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10",
                  )}
                  placeholder="linkedin.com/in/username"
                />
              </div>
              {errors.linkedin_id && (
                <p className="text-xs font-semibold text-red-500 mt-1">
                  {errors.linkedin_id[0]}
                </p>
              )}
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
                      <SaveIcon className="size-5" /> Update Stakeholder{" "}
                    </>
                  ) : (
                    <>
                      {" "}
                      <Plus className="size-5" /> Save & Add{" "}
                    </>
                  )}
                </div>
              </button>
            )}

            {!isLocked && members.length > 0 && (
              <button
                type="button"
                onClick={() => setIsLocked(true)}
                className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
              >
                <Lock className="size-5 text-slate-400" /> Lock Stakeholders
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintPDF}
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
                    member_name: "",
                    member_id: "",
                    organization: "",
                    email: "",
                    mobile_number: "",
                    specialisation: "",
                    category: "",
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
          <UserCog className="size-4 text-indigo-500" /> Stakeholder List
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-2">
            {members.length}
          </span>
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
              <Loader2 className="size-8 animate-spin text-indigo-200 mb-3" />
              <p className="text-sm font-medium text-slate-400">
                Loading stakeholders...
              </p>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[1.5rem] border border-slate-200 border-dashed text-center">
              <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <UserPlus className="size-8 text-slate-300" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">
                No Stakeholders Added
              </h4>
              <p className="text-sm text-slate-500 max-w-xs mt-1 mb-6">
                Start by adding representative stakeholders for this program.
              </p>
              <button
                onClick={scrollToForm}
                className="text-indigo-600 font-bold text-sm hover:underline"
              >
                + Add Stakeholder
              </button>
            </div>
          ) : (
            members.map((member, index) => {
              const isExpanded = expandedId === member.id;
              return (
                <motion.div
                  layout
                  key={member.id}
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
                    onClick={() => toggleExpand(member.id)}
                    className="p-5 flex items-center gap-5 cursor-pointer select-none"
                  >
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all duration-300",
                        isExpanded
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                          : "bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600",
                      )}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-4">
                        <div className="font-bold text-slate-900 truncate text-lg">
                          {member.member_name}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                            {member.member_id || "STAKEHOLDER"}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              member.is_approved
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700",
                            )}
                          >
                            {member.is_approved ? "Approved" : "Pending"}
                          </span>
                        </div>
                      </div>

                      <div className="md:col-span-4 hidden md:block">
                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg w-fit">
                          <Award className="size-3.5 text-slate-400" />
                          <span className="truncate max-w-[200px] font-medium">
                            {member.category}
                          </span>
                        </div>
                      </div>
                      <div className="md:col-span-4 hidden md:flex items-center justify-end gap-3 transition-opacity">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={(e) => handleToggleApproval(member, e)}
                            className={cn(
                              "h-8 px-3 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm",
                              member.is_approved
                                ? "bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100"
                            )}
                            title={member.is_approved ? "Revoke Approval" : "Grant Approval"}
                          >
                            {member.is_approved ? (
                              <><XCircle className="size-3.5" /> Revoke</>
                            ) : (
                              <><CheckCircle2 className="size-3.5" /> Approve</>
                            )}
                          </button>
                        </div>
                        <button
                          onClick={(e) => handleEdit(member, e)}
                          className="size-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                          title="Edit"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(member.id, e)}
                          className="size-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
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
                              label="Email Address"
                              value={member.email}
                            />
                            <InfoCard
                              icon={Phone}
                              label="Mobile Number"
                              value={member.mobile_number}
                            />
                            <InfoCard
                              icon={Building}
                              label="Organization"
                              value={member.organization}
                            />
                            <InfoCard
                              icon={Lock}
                              label="Feedback Access"
                              value={
                                member.is_approved
                                  ? "Approved"
                                  : "Pending Approval"
                              }
                            />

                            <InfoCard
                              icon={Award}
                              label="Specialisation"
                              value={member.specialisation}
                              secondary
                            />
                            <InfoCard
                              icon={Linkedin}
                              label="LinkedIn"
                              value={member.linkedin_id}
                              isLink
                              secondary
                            />

                            <div className="md:col-span-2 lg:col-span-3 flex items-end justify-end gap-2 pt-2">
                              <button
                                onClick={(e) => handleEdit(member, e)}
                                className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
                              >
                                Edit Stakeholder
                              </button>
                              <button
                                onClick={(e) => handleDelete(member.id, e)}
                                className="rounded-xl border border-red-100 bg-red-50 px-6 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition-all shadow-sm"
                              >
                                Remove
                              </button>
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
    </div >
  );
}

export default function RepresentativeStakeholdersForm() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col justify-center items-center py-20">
          <Loader2 className="size-10 animate-spin text-indigo-600 mb-4" />
          <p className="text-slate-500 font-medium">
            Initialising Stakeholders...
          </p>
        </div>
      }
    >
      <StakeholdersFormContent />
    </Suspense>
  );
}

function InfoCard({ icon: Icon, label, value, isLink, secondary }: any) {
  if (!value) return null;
  return (
    <div
      className={cn(
        "p-3.5 rounded-xl border transition-all",
        secondary
          ? "bg-slate-100/30 border-slate-200/50"
          : "bg-white border-slate-100 shadow-sm",
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
        <Icon className="size-3" /> {label}
      </div>
      <div
        className={cn(
          "text-sm font-medium truncate",
          secondary ? "text-slate-600" : "text-slate-900",
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
