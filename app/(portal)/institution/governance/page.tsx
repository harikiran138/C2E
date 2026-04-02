import InstitutionWorkspace from "@/components/institution/workspace/InstitutionWorkspace";
import { UserManagement } from "@/components/institution/governance/UserManagement";

export const dynamic = "force-dynamic";

export default function GovernancePage() {
  return (
    <InstitutionWorkspace
      activeStepKey="governance"
      title="Governance"
      subtitle="Institutional hierarchical delegation and security oversight"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <UserManagement />
        </div>

        <div className="space-y-6">
            <div className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Governance Notice</h2>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                C2E Master Architecture v5.1 enforces strict hierarchical delegation. 
                Institute Admins can create and manage Program-level accounts here.
                </p>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">Zero-Trust Protocol</p>
                    <p className="text-xs text-amber-700">
                        All program-level actions are audited and sandboxed to the specific program assigned to the user.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </InstitutionWorkspace>
  );
}
