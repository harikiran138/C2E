"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";

import { DEGREES, LEVELS } from "@/lib/validation/onboarding";

interface Program {
  id: string;
  program_name: string;
  program_code: string;
  degree: string;
  level: string;
  duration: number;
  intake: number;
  academic_year: string;
  program_chair?: string;
  nba_coordinator?: string;
  vision?: string;
  mission?: string;
}

interface Stakeholder {
  id?: string;
  name: string;
  category: string;
  organization: string;
  contact: string;
  email: string;
}

export default function ProgramDetails() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // New Stakeholder State
  const [newStakeholder, setNewStakeholder] = useState<Stakeholder>({
    name: "",
    category: "Employer",
    organization: "",
    contact: "",
    email: "",
  });
  const [isAddingStakeholder, setIsAddingStakeholder] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const sessionData = localStorage.getItem("inst_session");
      if (!sessionData) {
        router.push("/institution/login");
        return;
      }

      const session = JSON.parse(sessionData);
      const sessionUserId = session.id;
      setUserId(sessionUserId);
      fetchPrograms(sessionUserId);
    };
    checkUser();
  }, []);

  const fetchPrograms = async (uid: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .eq("institution_id", uid);

    if (data && data.length > 0) {
      setPrograms(data);
      setSelectedProgramId(data[0].id); // Default to first
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedProgramId && programs.length > 0) {
      const prog = programs.find((p) => p.id === selectedProgramId) || null;
      setCurrentProgram(prog);
      fetchStakeholders(selectedProgramId);
    }
  }, [selectedProgramId, programs]);

  const fetchStakeholders = async (progId: string) => {
    const { data } = await supabase
      .from("stakeholders")
      .select("*")
      .eq("program_id", progId);
    if (data) setStakeholders(data);
    else setStakeholders([]);
  };

  const handleProgramUpdate = async () => {
    if (!currentProgram || !selectedProgramId) return;
    try {
      const res = await fetch(`/api/institution/programs?id=${selectedProgramId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentProgram),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update program");

      alert("Program details updated!");
      // Update local programs list
      setPrograms((prev) =>
        prev.map((p) => (p.id === selectedProgramId ? currentProgram : p)),
      );
    } catch (error: any) {
      console.error("Error updating program:", error);
      alert("Error updating program: " + error.message);
    }
  };

  const handleAddStakeholder = async () => {
    if (!selectedProgramId) return;

    // Validation
    const phoneRegex = /^[0-9]{10}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!newStakeholder.name || !newStakeholder.organization) {
      alert("Name and Organization are required.");
      return;
    }
    if (!phoneRegex.test(newStakeholder.contact)) {
      alert("Please enter a valid 10-digit contact number.");
      return;
    }
    if (!emailRegex.test(newStakeholder.email)) {
      alert("Please enter a valid email address.");
      return;
    }

    try {
      const { error } = await supabase.from("stakeholders").insert({
        program_id: selectedProgramId,
        ...newStakeholder,
      });

      if (error) throw error;

      setNewStakeholder({
        name: "",
        category: "Employer",
        organization: "",
        contact: "",
        email: "",
      });
      setIsAddingStakeholder(false);
      fetchStakeholders(selectedProgramId);
    } catch (error: any) {
      console.error("Error adding stakeholder:", error);
      alert("Error adding stakeholder: " + error.message);
    }
  };

  const handleDeleteStakeholder = async (id: string) => {
    try {
      const { error } = await supabase
        .from("stakeholders")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setStakeholders((prev) => prev.filter((s) => s.id !== id));
    } catch (error: any) {
      console.error("Error deleting stakeholder:", error);
      alert("Error deleting stakeholder: " + error.message);
    }
  };

  if (loading && programs.length === 0)
    return <div className="p-10 text-center">Loading programs...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Program Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Add and Manage academic programs and stakeholders.
            </p>
          </div>
          <button
            onClick={() => router.push("/institution/dashboard")}
            className="text-sm font-semibold text-[#137fec] hover:underline"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Program Selection Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#137fec]">
              school
            </span>
            Select Program
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programs.map((program) => (
              <div
                key={program.id}
                onClick={() => setSelectedProgramId(program.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedProgramId === program.id ? "border-[#137fec] bg-blue-50 dark:bg-blue-900/20" : "border-slate-100 dark:border-slate-800 hover:border-blue-200"}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-semibold ${selectedProgramId === program.id ? "text-[#137fec]" : "text-slate-700 dark:text-slate-300"}`}
                  >
                    {program.program_name}
                  </span>
                  {selectedProgramId === program.id && (
                    <span className="material-symbols-outlined text-[#137fec]">
                      check_circle
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {currentProgram && (
          <>
            {/* Program Details Form */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#137fec]">
                  edit_document
                </span>
                Program Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-2">
                    Program Name
                  </label>
                  <input
                    value={currentProgram.program_name || ""}
                    onChange={(e) =>
                      setCurrentProgram({
                        ...currentProgram,
                        program_name: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#137fec]"
                    placeholder="e.g. Computer Science and Engineering"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-2">
                    Program Code
                  </label>
                  <input
                    value={currentProgram.program_code || ""}
                    onChange={(e) =>
                      setCurrentProgram({
                        ...currentProgram,
                        program_code: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#137fec]"
                    placeholder="e.g. CSE"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-2">
                    Degree
                  </label>
                  <select
                    value={currentProgram.degree}
                    onChange={(e) =>
                      setCurrentProgram({
                        ...currentProgram,
                        degree: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#137fec]"
                  >
                    {DEGREES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-2">
                    Level
                  </label>
                  <select
                    value={currentProgram.level}
                    onChange={(e) =>
                      setCurrentProgram({
                        ...currentProgram,
                        level: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#137fec]"
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-2">
                    Academic Year
                  </label>
                  <input
                    value={currentProgram.academic_year || ""}
                    onChange={(e) =>
                      setCurrentProgram({
                        ...currentProgram,
                        academic_year: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#137fec]"
                    placeholder="e.g. 2024-25"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-2">
                    Duration (Years)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={currentProgram.duration || 0}
                    onChange={(e) =>
                      setCurrentProgram({
                        ...currentProgram,
                        duration: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#137fec]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-2">
                    Student Intake
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={currentProgram.intake || 0}
                    onChange={(e) =>
                      setCurrentProgram({
                        ...currentProgram,
                        intake: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#137fec]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-2">
                    Program Chair
                  </label>
                  <input
                    value={currentProgram.program_chair || ""}
                    onChange={(e) =>
                      setCurrentProgram({
                        ...currentProgram,
                        program_chair: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#137fec]"
                    placeholder="Enter Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-2">
                    NBA Coordinator
                  </label>
                  <input
                    value={currentProgram.nba_coordinator || ""}
                    onChange={(e) =>
                      setCurrentProgram({
                        ...currentProgram,
                        nba_coordinator: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#137fec]"
                    placeholder="Enter Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-2">
                  Vision
                </label>
                <textarea
                  value={currentProgram.vision || ""}
                  onChange={(e) =>
                    setCurrentProgram({
                      ...currentProgram,
                      vision: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 min-h-[100px] outline-none focus:ring-2 focus:ring-[#137fec]"
                  placeholder="Enter Vision Statement"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-2">
                  Mission
                </label>
                <textarea
                  value={currentProgram.mission || ""}
                  onChange={(e) =>
                    setCurrentProgram({
                      ...currentProgram,
                      mission: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 min-h-[100px] outline-none focus:ring-2 focus:ring-[#137fec]"
                  placeholder="Enter Mission Statement"
                />
              </div>

              <button
                onClick={handleProgramUpdate}
                className="bg-[#137fec] text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-[#137fec]/90 transition-all"
              >
                Save Changes
              </button>
            </div>

            {/* Stakeholders Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#137fec]">
                    groups
                  </span>
                  Stakeholders
                </h2>
                <button
                  className="bg-[#137fec] hover:bg-[#137fec]/90 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                  onClick={() => setIsAddingStakeholder(!isAddingStakeholder)}
                >
                  <span className="material-symbols-outlined text-sm">
                    {isAddingStakeholder ? "close" : "add"}
                  </span>
                  {isAddingStakeholder ? "Cancel" : "Add Stakeholder"}
                </button>
              </div>

              {isAddingStakeholder && (
                <div className="mb-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl space-y-4 border border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      value={newStakeholder.name}
                      onChange={(e) =>
                        setNewStakeholder({
                          ...newStakeholder,
                          name: e.target.value,
                        })
                      }
                      placeholder="Stakeholder Name"
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:border-[#137fec]"
                    />
                    <select
                      value={newStakeholder.category}
                      onChange={(e) =>
                        setNewStakeholder({
                          ...newStakeholder,
                          category: e.target.value,
                        })
                      }
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:border-[#137fec]"
                    >
                      <option>Academia</option>
                      <option>Industry</option>
                      <option>Potential Employers</option>
                      <option>Research Organisations</option>
                      <option>Professional Body</option>
                      <option>Alumni</option>
                      <option>Students</option>
                      <option>Parents</option>
                      <option>Management</option>
                    </select>
                  </div>
                  <input
                    value={newStakeholder.organization}
                    onChange={(e) =>
                      setNewStakeholder({
                        ...newStakeholder,
                        organization: e.target.value,
                      })
                    }
                    placeholder="Organization"
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:border-[#137fec]"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      value={newStakeholder.contact}
                      onChange={(e) =>
                        setNewStakeholder({
                          ...newStakeholder,
                          contact: e.target.value,
                        })
                      }
                      placeholder="Contact No (10 digits)"
                      maxLength={10}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:border-[#137fec]"
                    />
                    <input
                      value={newStakeholder.email}
                      onChange={(e) =>
                        setNewStakeholder({
                          ...newStakeholder,
                          email: e.target.value,
                        })
                      }
                      placeholder="Email"
                      type="email"
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:border-[#137fec]"
                    />
                  </div>
                  <button
                    onClick={handleAddStakeholder}
                    className="w-full bg-[#137fec] text-white font-bold py-3 rounded-lg shadow-md hover:bg-[#137fec]/90"
                  >
                    Confirm Add Stakeholder
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {stakeholders.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-400">No stakeholders added yet.</p>
                  </div>
                ) : (
                  stakeholders.map((sh) => (
                    <div
                      key={sh.id}
                      className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 gap-4"
                    >
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200">
                          {sh.name}
                        </h4>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">
                          {sh.category} • {sh.organization}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {sh.email} • {sh.contact}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <span className="px-2 py-1 bg-white dark:bg-slate-900 rounded text-xs font-semibold text-green-600 border border-green-200">
                          Survey Active
                        </span>
                        <button
                          onClick={() =>
                            sh.id && handleDeleteStakeholder(sh.id)
                          }
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors ml-auto md:ml-0"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            delete
                          </span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
