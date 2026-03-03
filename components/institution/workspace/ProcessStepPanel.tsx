"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ProcessStep } from "@/lib/institution/process";
import ProgramAdvisoryCommitteeForm from "@/components/institution/process/ProgramAdvisoryCommitteeForm";
import BoardOfStudiesForm from "@/components/institution/process/BoardOfStudiesForm";
import RepresentativeStakeholdersForm from "@/components/institution/process/RepresentativeStakeholdersForm";
import VisionMissionGenerator from "@/components/institution/process/VisionMissionGenerator";
import ConsistencyMatrix from "@/components/institution/process/ConsistencyMatrix";
import ProgramOutcomesForm from "@/components/institution/process/ProgramOutcomesForm";
import PsoGenerator from "@/components/institution/process/PsoGenerator";
import AcademicCouncilForm from "@/components/institution/process/AcademicCouncilForm";
import OBEFrameworkForm from "@/components/institution/process/OBEFrameworkForm";
import VMPEOFeedbackDashboard from "@/components/institution/VMPEOFeedbackDashboard";
import { Save, Loader2 } from "lucide-react";

const CATEGORY_CELL_FIELDS = [
  "design_percent",
  "courses_t",
  "courses_p",
  "courses_tu",
  "courses_ll",
  "hours_ci",
  "hours_t",
  "hours_li",
  "hours_twd",
  "hours_total",
  "credit",
];

interface ProcessStepPanelProps {
  step: ProcessStep;
}

const CURRICULUM_STRUCTURE_ROWS = [
  { category: "Basic Science", code: "BS", min: 20, max: 25 },
  { category: "Engineering Science", code: "ES", min: 15, max: 20 },
  { category: "Humanities & Social Science", code: "HSS", min: 10, max: 15 },
  { category: "Professional Core", code: "PC", min: 25, max: 30 },
  { category: "Professional Elective", code: "PE", min: 10, max: 15 },
  {
    category: "Open Electives (Inter-departmental)",
    code: "OE",
    min: 10,
    max: 15,
  },
  { category: "Audit / Mandatory Courses", code: "MC", min: 0, max: 0 },
  { category: "Ability Enhancement Courses", code: "AE", min: 5, max: 6 },
  { category: "Skill Enhancement Courses", code: "SE", min: 5, max: 6 },
  { category: "Projects, Internships & Seminar", code: "PR", min: 8, max: 10 },
];

const CONVENTIONAL_ELECTIVE_OPTIONS = [
  "None",
  "BS",
  "ES",
  "HSS",
  "PC",
  "OE",
  "MC",
  "AE",
  "SE",
];
const TRANS_DISCIPLINARY_OPTIONS = [
  "None",
  "Technology & Management",
  "Technology & Economics",
  "Technology & Public Policy",
  "Technology, Society & Ethics",
  "Technology & Design",
  "Technology & Creativity (STEAM)",
  "Technology & Sustainability",
  "Technology & Environment",
  "Technology & Health Sciences",
  "Technology & Life Sciences",
  "Technology & Law & Governance",
  "Technology & Data & Analytics",
  "Technology & Artificial Intelligence (Cross-Domain)",
  "Technology & Human Behaviour",
  "Technology & Indian Knowledge Systems",
  "Technology & Social Impact",
  "Technology & Entrepreneurship & Innovation",
  "Technology & Smart Infrastructure & Urban Systems",
  "Technology & Education & Learning Sciences",
  "Technology & Media, Communication & Storytelling",
];
const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const SEMESTER_CATEGORY_COLUMNS = [
  "BS",
  "ES",
  "HSS",
  "PC",
  "OE",
  "MC",
  "AE",
  "SE",
  "INT",
  "PRO",
  "OTHERS",
];

function CurriculumStructurePanel() {
  const [categoryCredits, setCategoryCredits] = useState<any[]>([]);
  const [conventionalElective, setConventionalElective] = useState("None");
  const [transDisciplinaryElective, setTransDisciplinaryElective] =
    useState("None");
  const [totalCredits, setTotalCredits] = useState("");
  const [totalCreditsError, setTotalCreditsError] = useState("");
  const [semesterCategories, setSemesterCategories] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const searchParams = useSearchParams();
  const programId = searchParams.get("programId");

  useEffect(() => {
    // Initialize default structures
    setCategoryCredits(
      CURRICULUM_STRUCTURE_ROWS.map((r) => ({
        category_code: r.code,
        design_percent: 0,
        courses_t: 0,
        courses_p: 0,
        courses_tu: 0,
        courses_ll: 0,
        hours_ci: 0,
        hours_t: 0,
        hours_li: 0,
        hours_twd: 0,
        hours_total: 0,
        credit: 0,
      })),
    );

    setSemesterCategories(
      SEMESTERS.map((s) => ({
        semester: s,
        no_of_credits: 0,
        courses_bs: 0,
        courses_es: 0,
        courses_hss: 0,
        courses_pc: 0,
        courses_oe: 0,
        courses_mc: 0,
        courses_ae: 0,
        courses_se: 0,
        courses_int: 0,
        courses_pro: 0,
        courses_others: 0,
      })),
    );

    if (programId) {
      fetch(`/api/curriculum/structure?programId=${programId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.categoryCredits?.length > 0) {
            setCategoryCredits((prev) =>
              prev.map((row) => {
                const found = data.categoryCredits.find(
                  (c: any) => c.category_code === row.category_code,
                );
                return found ? { ...row, ...found } : row;
              }),
            );
          }
          if (data.electivesSettings) {
            setConventionalElective(
              data.electivesSettings.conventional_elective || "None",
            );
            setTransDisciplinaryElective(
              data.electivesSettings.trans_disciplinary_elective || "None",
            );
            setTotalCredits(
              data.electivesSettings.total_credits?.toString() || "",
            );
          }
          if (data.semesterCategories?.length > 0) {
            setSemesterCategories((prev) =>
              prev.map((row) => {
                const found = data.semesterCategories.find(
                  (s: any) => s.semester === row.semester,
                );
                return found ? { ...row, ...found } : row;
              }),
            );
          }
        });
    }
  }, [programId]);

  const handleTotalCreditsChange = (value: string) => {
    if (/^\d*$/.test(value)) {
      setTotalCredits(value);
      setTotalCreditsError("");
      return;
    }
    setTotalCreditsError("Total number of credits must be a whole number.");
  };

  const handleCategoryCreditChange = (
    code: string,
    field: string,
    value: string,
  ) => {
    setCategoryCredits((prev) =>
      prev.map((c) =>
        c.category_code === code ? { ...c, [field]: Number(value) } : c,
      ),
    );
  };

  const handleSemesterCategoryChange = (
    semester: string,
    field: string,
    value: string,
  ) => {
    setSemesterCategories((prev) =>
      prev.map((s) =>
        s.semester === semester ? { ...s, [field]: Number(value) } : s,
      ),
    );
  };

  const saveCurriculum = async () => {
    if (!programId) {
      alert("No Program Selected");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/curriculum/structure?programId=${programId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryCredits,
            electivesSettings: {
              conventional_elective: conventionalElective,
              trans_disciplinary_elective: transDisciplinaryElective,
              total_credits: Number(totalCredits) || 0,
            },
            semesterCategories,
          }),
        },
      );
      if (!res.ok) throw new Error("Failed to save");
      // Replace alert with a robust toast once one is integrated, but alert works for this MVP step.
      alert("Curriculum details saved successfully!");
    } catch (e) {
      console.error(e);
      alert("Error saving curriculum details");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2 flex justify-between items-center pr-2">
        <div>
          <h3 className="text-xl font-semibold">
            Generate Curriculum Structure
          </h3>
          <p className="text-sm text-slate-600">
            Curriculum Structure, Learning Hours & Credits
          </p>
        </div>
        <button
          onClick={saveCurriculum}
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? "Saving..." : "Save Curriculum"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1300px] border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-700">
              <th
                rowSpan={2}
                className="border-b border-r border-slate-200 px-3 py-3 text-left font-semibold"
              >
                Category
              </th>
              <th
                rowSpan={2}
                className="border-b border-r border-slate-200 px-3 py-3 text-left font-semibold"
              >
                Code
              </th>
              <th
                colSpan={2}
                className="border-b border-r border-slate-200 px-3 py-3 text-center font-semibold"
              >
                Typical Credit Range (%)
              </th>
              <th
                rowSpan={2}
                className="border-b border-r border-slate-200 px-3 py-3 text-center font-semibold"
              >
                Your Design %
              </th>
              <th
                colSpan={4}
                className="border-b border-r border-slate-200 px-3 py-3 text-center font-semibold"
              >
                Number of Courses
              </th>
              <th
                colSpan={6}
                className="border-b border-slate-200 px-3 py-3 text-center font-semibold"
              >
                Suggested Learning Hours & Credit
              </th>
            </tr>
            <tr className="bg-slate-50 text-slate-600">
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                Min
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                Max
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                T
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                P
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                TU
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                LL
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                CI
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                T
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                LI
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                TW/D
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                Total
              </th>
              <th className="border-b border-slate-200 px-2 py-2 text-center font-semibold">
                Credit
              </th>
            </tr>
          </thead>
          <tbody>
            {CURRICULUM_STRUCTURE_ROWS.map((row) => {
              const rowData =
                categoryCredits.find((c) => c.category_code === row.code) || {};
              return (
                <tr key={row.code} className="hover:bg-slate-50/50">
                  <td className="border-b border-r border-slate-100 px-3 py-2 font-medium text-slate-700">
                    {row.category}
                  </td>
                  <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-600">
                    {row.code}
                  </td>
                  <td className="border-b border-r border-slate-100 px-3 py-2 text-center text-slate-600">
                    {row.min}
                  </td>
                  <td className="border-b border-r border-slate-100 px-3 py-2 text-center text-slate-600">
                    {row.max}
                  </td>
                  {CATEGORY_CELL_FIELDS.map((field, cellIndex) => (
                    <td
                      key={`${row.code}-cell-${cellIndex}`}
                      className="border-b border-r border-slate-100 px-2 py-1.5"
                    >
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={rowData[field] || ""}
                        onChange={(e) =>
                          handleCategoryCreditChange(
                            row.code,
                            field,
                            e.target.value,
                          )
                        }
                        className="w-full rounded-md border border-slate-200 px-2 py-1 text-right text-xs focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        placeholder="0"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Select the type of Elective Category (Conventional)
          </label>
          <select
            value={conventionalElective}
            onChange={(event) => setConventionalElective(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:border-slate-500 focus:outline-none"
          >
            {CONVENTIONAL_ELECTIVE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Select the type of Trans-Disciplinary Electives
          </label>
          <select
            value={transDisciplinaryElective}
            onChange={(event) =>
              setTransDisciplinaryElective(event.target.value)
            }
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:border-slate-500 focus:outline-none"
          >
            {TRANS_DISCIPLINARY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-base font-semibold text-slate-900">
          Select the Semester & Category of Courses
        </h4>
        <div className="max-w-xs">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Total number of Credits
          </label>
          <input
            value={totalCredits}
            onChange={(event) => handleTotalCreditsChange(event.target.value)}
            inputMode="numeric"
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="Whole number"
          />
          {totalCreditsError && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {totalCreditsError}
            </p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1100px] border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-700">
              <th
                rowSpan={2}
                className="border-b border-r border-slate-200 px-3 py-3 text-left font-semibold"
              >
                Semester
              </th>
              <th
                rowSpan={2}
                className="border-b border-r border-slate-200 px-3 py-3 text-left font-semibold"
              >
                No. of Credits
              </th>
              <th
                colSpan={SEMESTER_CATEGORY_COLUMNS.length}
                className="border-b border-slate-200 px-3 py-3 text-center font-semibold"
              >
                Number of Courses
              </th>
            </tr>
            <tr className="bg-slate-50 text-slate-600">
              {SEMESTER_CATEGORY_COLUMNS.map((column) => (
                <th
                  key={column}
                  className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEMESTERS.map((semester) => {
              const semData =
                semesterCategories.find((s) => s.semester === semester) || {};
              return (
                <tr key={semester} className="hover:bg-slate-50/50">
                  <td className="border-b border-r border-slate-100 px-3 py-2 font-semibold text-slate-700">
                    {semester}
                  </td>
                  <td className="border-b border-r border-slate-100 px-2 py-1.5">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={semData.no_of_credits || ""}
                      onChange={(e) =>
                        handleSemesterCategoryChange(
                          semester,
                          "no_of_credits",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-right text-xs focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      placeholder="0"
                    />
                  </td>
                  {SEMESTER_CATEGORY_COLUMNS.map((column) => {
                    const fieldName = `courses_${column.toLowerCase()}`;
                    return (
                      <td
                        key={`${semester}-${column}`}
                        className="border-b border-r border-slate-100 px-2 py-1.5"
                      >
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={semData[fieldName] || ""}
                          onChange={(e) =>
                            handleSemesterCategoryChange(
                              semester,
                              fieldName,
                              e.target.value,
                            )
                          }
                          className="w-full rounded-md border border-slate-200 px-2 py-1 text-right text-xs focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          placeholder="0"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DevelopCurriculumPanel() {
  const headers = [
    "Semester",
    "Course Code",
    "Course Title",
    "Credits",
    "Category",
  ];

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-semibold">Develop Curriculum</h3>
      <p className="text-sm text-slate-600">
        Table opens on the right side. You can fill prescribed format directly
        or use Excel-assisted input.
      </p>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
          Upload Excel (Optional)
        </label>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="block w-full text-sm"
        />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-left font-semibold text-slate-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, index) => (
              <tr key={index}>
                {headers.map((header) => (
                  <td
                    key={header}
                    className="border-b border-slate-100 px-3 py-2"
                  >
                    <input
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                      placeholder={header}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionPanel({ step }: { step: ProcessStep }) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-xl font-semibold">{step.title}</h3>
      <p className="text-sm text-slate-600">{step.description}</p>
      <div className="rounded-xl border border-slate-300 bg-white p-4">
        <p className="text-sm text-slate-700">
          Record status and communication reference numbers for this process
          step.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Mark In Progress
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Mark Completed
          </button>
        </div>
      </div>
    </div>
  );
}

function SharedForm({ step }: { step: ProcessStep }) {
  return (
    <div className="space-y-5">
      <h3 className="text-xl font-semibold">{step.title}</h3>
      <p className="text-sm text-slate-600">{step.description}</p>

      <form className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Title
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            placeholder="Enter title"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Reference ID
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            placeholder="Enter reference"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Notes
          </label>
          <textarea
            className="min-h-[130px] w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            placeholder="Enter details"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="button"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProcessStepPanel({ step }: ProcessStepPanelProps) {
  if (step.key === "council") {
    return <AcademicCouncilForm />;
  }

  if (step.key === "process-1") {
    return <OBEFrameworkForm />;
  }

  if (step.key === "process-3") {
    return <ProgramAdvisoryCommitteeForm />;
  }

  if (step.key === "process-4") {
    return <BoardOfStudiesForm />;
  }

  if (step.key === "process-5") {
    return <RepresentativeStakeholdersForm />;
  }

  if (step.key === "process-6") {
    return <VisionMissionGenerator />;
  }

  if (step.key === "process-7") {
    return <VMPEOFeedbackDashboard />;
  }

  if (step.key === "process-8") {
    return <ConsistencyMatrix />;
  }

  if (step.key === "process-9") {
    return <ProgramOutcomesForm />;
  }

  if (step.key === "process-10") {
    return <PsoGenerator />;
  }

  if (step.key === "process-12") {
    return <CurriculumStructurePanel />;
  }

  if (step.key === "process-14") {
    return <DevelopCurriculumPanel />;
  }

  if (step.kind === "action" || step.kind === "info") {
    return <ActionPanel step={step} />;
  }

  if (
    step.kind === "form" &&
    ![
      "council",
      "process-3",
      "process-4",
      "process-5",
      "process-6",
      "process-7",
      "process-9",
      "process-10",
      "process-12",
      "process-14",
    ].includes(step.key)
  ) {
    return <SharedForm step={step} />;
  }

  return <SharedForm step={step} />;
}
