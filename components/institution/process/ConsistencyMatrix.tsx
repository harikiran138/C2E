'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Save, Sparkles, AlertCircle } from 'lucide-react';

export default function ConsistencyMatrix() {
  const searchParams = useSearchParams();
  const programId = searchParams.get('programId');

  const [loading, setLoading] = useState(true);
  const [missionStatements, setMissionStatements] = useState<string[]>([]);
  const [peos, setPeos] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<Record<string, string>>({}); // Key: "M-index_P-id", Value: "1"|"2"|"3"|"-"
  const [institution, setInstitution] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!programId) return;
      
      try {
        setLoading(true);
        // Fetch Program Details (for Mission & Matrix)
        const progResponse = await fetch(`/api/institution/details`);
        if (progResponse.ok) {
           const data = await progResponse.json();
           const currentProgram = data.programs.find((p: any) => p.id === programId);
           if (currentProgram) {
               // Parse Mission
               const missionText = currentProgram.mission || '';
               // Split mission into statements if possible, or just use one if unstructured
               // Assuming simplistic splitting by newline or bullets for now, or just treating entire mission as one block if short.
               // Requirement says "Mission (1)... Mission (n)". 
               // If mission is a single block text, we might need a way to split it. 
               // For now, let's assume specific formatting or just use the whole text as M1.
               const missions = missionText.split(/(?=\d+\.)|(?=\n-)/).filter((m: string) => m.trim().length > 5).map((m: string) => m.replace(/^\d+\.|^-/, '').trim());
               setMissionStatements(missions.length > 0 ? missions : [missionText]);

               // Load existing matrix if any
               if (currentProgram.consistency_matrix) {
                   setMatrix(currentProgram.consistency_matrix);
               }
           }
           setInstitution(data.institution);
        }

        // Fetch PEOs
        const peoResponse = await fetch(`/api/institution/peos?programId=${programId}`);
        if (peoResponse.ok) {
             const peoData = await peoResponse.json();
             setPeos(peoData.data);
        }

      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [programId]);

  const handleCellChange = (mIndex: number, pId: string, value: string) => {
      setMatrix(prev => ({
          ...prev,
          [`${mIndex}_${pId}`]: value
      }));
  };

  const handleAutoFill = async () => {
      setGenerating(true);
      try {
          const response = await fetch('/api/generate/consistency-matrix', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  missions: missionStatements,
                  peos: peos.map(p => p.peo_statement)
              })
          });
          
          if (response.ok) {
              const data = await response.json();
              // data.matrix should be a 2D array or object matching indices
              // let's assume API returns array of rows [ ["3", "2", "-"], ... ]
              const newMatrix: Record<string, string> = { ...matrix };
              data.matrix.forEach((row: string[], mIdx: number) => {
                  row.forEach((val: string, pIdx: number) => {
                      if (peos[pIdx]) {
                          newMatrix[`${mIdx}_${peos[pIdx].id}`] = val;
                      }
                  });
              });
              setMatrix(newMatrix);
          }
      } catch (e) {
          console.error(e);
          alert('Auto-fill failed.');
      } finally {
          setGenerating(false);
      }
  };

  const handleSave = async () => {
      setSaving(true);
      try {
          await fetch('/api/institution/program/consistency-matrix', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  program_id: programId,
                  consistency_matrix: matrix
              })
          });
          alert('Consistency Matrix saved!');
      } catch (e) {
          console.error(e);
          alert('Failed to save.');
      } finally {
          setSaving(false);
      }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary size-8" /></div>;
  if (!programId) return <div className="p-8 text-center text-slate-500">Please select a program first.</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold text-slate-900">Consistency Matrix</h2>
            <p className="text-sm text-slate-500">Map Mission Statements to Program Educational Objectives (PEOs)</p>
        </div>
        <div className="flex gap-3">
             <button
                onClick={handleAutoFill}
                disabled={generating || peos.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium text-sm transition-colors border border-indigo-200"
             >
                 {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                 AI Auto-Fill
             </button>
             <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium text-sm transition-colors shadow-sm"
             >
                 {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                 Save Matrix
             </button>
        </div>
      </div>

      {/* Institute Mission Context */}
      {institution?.mission && (
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles className="size-24 -mr-8 -mt-8 text-emerald-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-100 rounded text-emerald-600">
                <Sparkles className="size-3.5" />
              </div>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">Institute Mission Context</h4>
            </div>
            <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
              "{institution.mission}"
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
          <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                      <th className="px-6 py-4 font-bold min-w-[300px]">Mission Statements</th>
                      {peos.map((peo, i) => (
                          <th key={peo.id} className="px-4 py-4 text-center min-w-[100px] border-l border-slate-100">
                              <div className="font-bold text-indigo-600 mb-1">PEO {i + 1}</div>
                              <div className="text-[10px] text-slate-400 font-normal line-clamp-2 leading-tight w-24 mx-auto" title={peo.peo_statement}>
                                  {peo.peo_statement}
                              </div>
                          </th>
                      ))}
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {missionStatements.length === 0 ? (
                      <tr>
                          <td colSpan={peos.length + 1} className="p-8 text-center text-slate-400">
                              No mission statements found. Please define Institution/Program Mission first.
                          </td>
                      </tr>
                  ) : (
                      missionStatements.map((mission, mIdx) => (
                          <tr key={mIdx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                  <span className="font-bold text-slate-400 mr-2">M{mIdx + 1}</span>
                                  <span className="text-slate-700">{mission}</span>
                              </td>
                              {peos.map((peo) => (
                                  <td key={peo.id} className="px-2 py-4 text-center border-l border-slate-100">
                                      <select 
                                        value={matrix[`${mIdx}_${peo.id}`] || '-'}
                                        onChange={(e) => handleCellChange(mIdx, peo.id, e.target.value)}
                                        className="w-16 text-center text-sm border-slate-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-700 bg-white"
                                      >
                                          <option value="-">-</option>
                                          <option value="1">1</option>
                                          <option value="2">2</option>
                                          <option value="3">3</option>
                                      </select>
                                  </td>
                              ))}
                          </tr>
                      ))
                  )}
              </tbody>
          </table>
      </div>
      
      <div className="flex gap-4 p-4 bg-yellow-50 text-yellow-800 rounded-lg text-xs items-start">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <p>
              <strong>Legend:</strong> 1 = Low Correlation, 2 = Medium Correlation, 3 = High Correlation, - = No Correlation.
          </p>
      </div>

    </div>
  );
}
