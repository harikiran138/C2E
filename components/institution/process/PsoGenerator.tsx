"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Sparkles,
  Save,
  RefreshCw,
  Trash2,
  CheckCircle2,
} from "lucide-react";

const LEAD_SOCIETIES = [
  "American Institute of Aeronautics and Astronautics",
  "American Society of Agricultural and Biological Engineers",
  "American Society of Civil Engineers",
  "American Institute of Chemical Engineers",
  "Biomedical Engineering Society",
  "Institute of Electrical and Electronics Engineers",
  "American Society for Engineering Education",
  "Institute of Industrial and Systems Engineers",
  "American Society of Mechanical Engineers",
  "American Academy of Environmental Engineers and Scientists",
  "Society for Fire Protection Engineers",
  "Society for Mining, Metallurgy, and Exploration",
  "Society of Manufacturing Engineers",
  "The Minerals, Metals & Materials Society",
  "American Ceramic Society",
  "Society of Naval Architects and Marine Engineers",
  "American Nuclear Society",
  "Society of Petroleum Engineers",
  "CSAB",
  "National Society of Professional Surveyors",
];

const CO_LEAD_SOCIETIES = [
  "Institute of Electrical and Electronics Engineers",
  "CSAB",
  "International Council on Systems Engineering",
  "American Society of Mechanical Engineers",
  "American Academy of Environmental Engineers and Scientists",
  "American Society of Agricultural and Biological Engineers",
  "American Society of Civil Engineers",
  "SAE International",
];

const COOPERATING_SOCIETIES = [
  "Institute of Electrical and Electronics Engineers",
  "CSAB",
  "International Society of Automation",
  "SAE International",
  "American Society of Heating, Refrigerating and Air-Conditioning Engineers",
  "American Society of Mechanical Engineers",
  "American Institute of Chemical Engineers",
  "American Ceramic Society",
  "The Minerals, Metals & Materials Society",
  "American Society of Civil Engineers",
];

type SelectedSocieties = {
  lead: string[];
  coLead: string[];
  cooperating: string[];
};

type GeneratedPsoDetail = {
  statement: string;
  domain: string;
  abetMappings: string[];
  emergingAreas: string[];
};

type ValidationReport = {
  sourceValidation: {
    passed: boolean;
    message: string;
  };
  domainCoverage: {
    passed: boolean;
    covered: string[];
    missing: string[];
  };
  actionVerbCheck: {
    passed: boolean;
    failures: string[];
  };
  abetMappingCheck: {
    passed: boolean;
    unmapped: string[];
  };
  uniquenessCheck: {
    passed: boolean;
    genericStatements: string[];
    highSimilarityPairs: string[];
  };
};

type SelectionContext = {
  lead: string[];
  coLead: string[];
  cooperating: string[];
  count: number;
};

export default function PsoGenerator() {
  const searchParams = useSearchParams();
  const programId = searchParams.get("programId");

  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<any>(null);
  const [psos, setPsos] = useState<any[]>([]);

  // State for matrix selection
  const [selectedSocieties, setSelectedSocieties] = useState<SelectedSocieties>(
    {
      lead: [],
      coLead: [],
      cooperating: [],
    },
  );

  const [psoCount, setPsoCount] = useState(3);
  const [generatedPsos, setGeneratedPsos] = useState<string[]>([]);
  const [generatedDetails, setGeneratedDetails] = useState<GeneratedPsoDetail[]>(
    [],
  );
  const [validationReport, setValidationReport] =
    useState<ValidationReport | null>(null);
  const [selectionContext, setSelectionContext] =
    useState<SelectionContext | null>(null);
  const [generationPrompt, setGenerationPrompt] = useState("");

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Reset state to prevent cross-program bleeding
    setProgram(null);
    setPsos([]);
    setSelectedSocieties({ lead: [], coLead: [], cooperating: [] });
    setGeneratedPsos([]);
    setGeneratedDetails([]);
    setValidationReport(null);
    setSelectionContext(null);
    setGenerationPrompt("");

    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch Program Details
        const instResponse = await fetch("/api/institution/details");
        if (instResponse.ok) {
          const instData = await instResponse.json();
          if (programId && instData.programs) {
            const currentProgram = instData.programs.find(
              (p: any) => p.id === programId,
            );
            if (currentProgram) {
              setProgram(currentProgram);
              if (currentProgram.lead_society) {
                try {
                  const parsed = JSON.parse(currentProgram.lead_society);
                  // Validate structure
                  if (parsed.lead && Array.isArray(parsed.lead)) {
                    setSelectedSocieties(parsed);
                  } else {
                    // Handle old format (comma separated string)
                    // This is a best-effort migration visual only; user must save to persist new format
                    setSelectedSocieties({
                      lead: [currentProgram.lead_society], // Assign strictly to lead as catch-all
                      coLead: [],
                      cooperating: [],
                    });
                  }
                } catch (e) {
                  // Fallback for plain string
                  setSelectedSocieties({
                    lead: [currentProgram.lead_society],
                    coLead: [],
                    cooperating: [],
                  });
                }
              }
            }
          }
        }

        // Fetch PSOs
        if (programId) {
          const psoResponse = await fetch(
            `/api/institution/psos?programId=${programId}`,
          );
          if (psoResponse.ok) {
            const psoData = await psoResponse.json();
            setPsos(psoData.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [programId]);

  const handleGenerate = async () => {
    // Validation: At least one society must be selected across all categories
    const hasSelection =
      selectedSocieties.lead.length > 0 ||
      selectedSocieties.coLead.length > 0 ||
      selectedSocieties.cooperating.length > 0;

    if (!hasSelection) {
      alert("Please select at least one professional society.");
      return;
    }

    setGenerating(true);
    setValidationReport(null);
    setGeneratedDetails([]);
    setSelectionContext(null);
    setGenerationPrompt("");
    try {
      const response = await fetch("/api/generate/psos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_societies: {
            lead: selectedSocieties.lead,
            co_lead: selectedSocieties.coLead,
            cooperating: selectedSocieties.cooperating,
          },
          number_of_psos: psoCount,
          program_name: program?.program_name || "Engineering Program",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedPsos(data.results);
        setGeneratedDetails(data.details || []);
        setValidationReport(data.validation || null);
        setSelectionContext(data.selectionContext || null);
        setGenerationPrompt(data.prompt || "");
      } else {
        setGeneratedPsos([]);
        alert("Generation failed.");
      }
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddPso = (statement: string) => {
    setPsos([
      ...psos,
      {
        id: `temp-${Date.now()}`,
        pso_statement: statement,
        pso_number: psos.length + 1,
      },
    ]);
  };

  const handleDeletePso = async (id: string) => {
    if (id.startsWith("temp")) {
      setPsos(psos.filter((p) => p.id !== id));
    } else {
      try {
        await fetch(`/api/institution/psos?id=${id}`, { method: "DELETE" });
        setPsos(psos.filter((p) => p.id !== id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const toggleSociety = (
    category: keyof SelectedSocieties,
    society: string,
  ) => {
    setSelectedSocieties((prev) => {
      const currentList = prev[category];
      const newList = currentList.includes(society)
        ? currentList.filter((s) => s !== society)
        : [...currentList, society];

      return { ...prev, [category]: newList };
    });
  };

  const handleSaveAll = async () => {
    if (!programId) return;
    setSaving(true);
    try {
      // Save Lead Society as structured JSON string
      await fetch("/api/institution/program/lead-society", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_id: programId,
          lead_society: JSON.stringify(selectedSocieties),
        }),
      });

      // Save PSOs (Bulk Sync)
      await fetch("/api/institution/psos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_id: programId,
          psos: psos.map((p, i) => ({
            statement: p.pso_statement,
            number: i + 1,
          })),
        }),
      });

      alert("PSOs saved successfully!");

      // Refresh to get real IDs
      const psoResponse = await fetch(
        `/api/institution/psos?programId=${programId}`,
      );
      if (psoResponse.ok) {
        const psoData = await psoResponse.json();
        setPsos(psoData.data);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (!programId) {
    return (
      <div className="p-8 text-center text-slate-500">
        Please select a program first.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary size-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* 1. Lead Society Selection */}
      <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900">
          1. Select your Lead Society
        </h3>
        <p className="text-sm text-slate-500 -mt-4">
          Select relevant societies from the columns below. You can select
          multiple options.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* A. Lead Societies */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-600 border-b pb-2">
              A. Lead Societies
            </h4>
            <div className="space-y-1 bg-white rounded-lg border border-slate-200 p-2">
              {LEAD_SOCIETIES.map((society) => (
                <label
                  key={society}
                  className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer group transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedSocieties.lead.includes(society)}
                    onChange={() => toggleSociety("lead", society)}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300 size-4 shrink-0"
                  />
                  <span
                    className={`text-xs leading-tight transition-colors ${selectedSocieties.lead.includes(society) ? "text-indigo-700 font-bold" : "text-slate-600 group-hover:text-indigo-600"}`}
                  >
                    {society}
                  </span>
                </label>
              ))}
            </div>
            <div className="text-xs text-slate-400 text-right px-1">
              {selectedSocieties.lead.length} selected
            </div>
          </div>

          {/* B. Co-Lead Societies */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-600 border-b pb-2">
              B. Co-Lead Societies
            </h4>
            <div className="space-y-1 bg-white rounded-lg border border-slate-200 p-2">
              {CO_LEAD_SOCIETIES.map((society) => (
                <label
                  key={society}
                  className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer group transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedSocieties.coLead.includes(society)}
                    onChange={() => toggleSociety("coLead", society)}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300 size-4 shrink-0"
                  />
                  <span
                    className={`text-xs leading-tight transition-colors ${selectedSocieties.coLead.includes(society) ? "text-indigo-700 font-bold" : "text-slate-600 group-hover:text-indigo-600"}`}
                  >
                    {society}
                  </span>
                </label>
              ))}
            </div>
            <div className="text-xs text-slate-400 text-right px-1">
              {selectedSocieties.coLead.length} selected
            </div>
          </div>

          {/* C. Cooperating Societies */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-600 border-b pb-2">
              C. Cooperating Societies
            </h4>
            <div className="space-y-1 bg-white rounded-lg border border-slate-200 p-2">
              {COOPERATING_SOCIETIES.map((society) => (
                <label
                  key={society}
                  className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer group transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedSocieties.cooperating.includes(society)}
                    onChange={() => toggleSociety("cooperating", society)}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300 size-4 shrink-0"
                  />
                  <span
                    className={`text-xs leading-tight transition-colors ${selectedSocieties.cooperating.includes(society) ? "text-indigo-700 font-bold" : "text-slate-600 group-hover:text-indigo-600"}`}
                  >
                    {society}
                  </span>
                </label>
              ))}
            </div>
            <div className="text-xs text-slate-400 text-right px-1">
              {selectedSocieties.cooperating.length} selected
            </div>
          </div>
        </div>
      </div>

      {/* 2. Generation Control */}
      <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">
            No. of PSOs:
          </span>
          <input
            type="number"
            min={1}
            max={10}
            value={psoCount}
            onChange={(e) => setPsoCount(Number(e.target.value))}
            className="rounded-lg border border-slate-300 text-sm py-1.5 px-2 w-20"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          {generating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {generating ? "Generating..." : "Generate PSOs"}
        </button>
        {generatedPsos.length > 0 && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="py-2 px-4 rounded-lg bg-white text-slate-700 border border-slate-300 font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="size-4" />
            Regenerate
          </button>
        )}
      </div>

      {/* 3. Generated Results */}
      {generatedPsos.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-500">
            Rule-Validated Suggestions
          </h4>
          {validationReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Source
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {validationReport.sourceValidation.passed ? "Criteria-based" : "Needs review"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {validationReport.sourceValidation.message}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Domains
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {validationReport.domainCoverage.covered.length} covered
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {validationReport.domainCoverage.missing.length === 0
                    ? "All required domains included."
                    : `Missing: ${validationReport.domainCoverage.missing.join(", ")}`}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Action Verbs
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {validationReport.actionVerbCheck.passed ? "All measurable" : "Check wording"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {validationReport.actionVerbCheck.failures.length === 0
                    ? "Each PSO starts with a high-order action verb."
                    : `${validationReport.actionVerbCheck.failures.length} statement(s) need revision.`}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  ABET Map
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {validationReport.abetMappingCheck.passed ? "Mapped" : "Missing links"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {validationReport.abetMappingCheck.unmapped.length === 0
                    ? "Every PSO maps to at least one SO."
                    : `${validationReport.abetMappingCheck.unmapped.length} statement(s) are unmapped.`}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Uniqueness
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {validationReport.uniquenessCheck.passed ? "Program-specific" : "Too generic"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {validationReport.uniquenessCheck.highSimilarityPairs.length === 0
                    ? "No high-overlap PSO pairs detected."
                    : `Overlap found in ${validationReport.uniquenessCheck.highSimilarityPairs.length} pair(s).`}
                </p>
              </div>
            </div>
          )}
          {selectionContext && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                  Lead: {selectionContext.lead.length}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                  Co-Lead: {selectionContext.coLead.length}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                  Cooperating: {selectionContext.cooperating.length}
                </span>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                  PSOs Requested: {selectionContext.count}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                All PSO-side UI selections are now passed into generation separately, so lead, co-lead,
                cooperating societies, and requested count each influence the output.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3">
            {generatedPsos.map((pso, i) => {
              const detail = generatedDetails[i];

              return (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex justify-between items-start gap-4 group hover:bg-indigo-50 transition-colors"
                >
                  <div className="flex-1 space-y-3">
                    <p className="text-sm text-slate-800">{pso}</p>
                    {detail && (
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 border border-indigo-100">
                          {detail.domain}
                        </span>
                        {detail.abetMappings.map((mapping) => (
                          <span
                            key={`${detail.statement}-${mapping}`}
                            className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-700 border border-indigo-100"
                          >
                            {mapping}
                          </span>
                        ))}
                        {detail.emergingAreas.map((area) => (
                          <span
                            key={`${detail.statement}-${area}`}
                            className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-100"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddPso(pso)}
                    className="bg-white text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                  >
                    Add
                  </button>
                </div>
              );
            })}
          </div>
          {generationPrompt && (
            <details className="rounded-xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                Prompt used for PSO generation
              </summary>
              <pre className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                {generationPrompt}
              </pre>
            </details>
          )}
        </div>
      )}

      <div className="h-px bg-slate-200" />

      {/* 4. Final PSO List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            Program Specific Outcomes (PSOs)
          </h3>
          <button
            onClick={handleSaveAll}
            disabled={saving || psos.length === 0}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95"
          >
            {saving ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Save className="size-5" />
            )}
            Save PSOs
          </button>
        </div>

        <div className="space-y-3">
          {psos.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-sm">
              No PSOs added yet. Select a Lead Society and generate outcomes.
            </div>
          ) : (
            psos.map((pso, index) => (
              <div
                key={pso.id}
                className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex gap-4 group hover:border-indigo-200 transition-colors"
              >
                <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 font-bold text-slate-600 text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <textarea
                    value={pso.pso_statement}
                    onChange={(e) => {
                      const newPsos = [...psos];
                      newPsos[index].pso_statement = e.target.value;
                      setPsos(newPsos);
                    }}
                    className="w-full text-sm text-slate-700 bg-transparent border-none focus:ring-0 p-0 resize-none h-auto font-medium"
                    rows={2}
                  />
                </div>
                <button
                  onClick={() => handleDeletePso(pso.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
