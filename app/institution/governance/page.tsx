import InstitutionWorkspace from "@/components/institution/workspace/InstitutionWorkspace";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function GovernancePage() {
  return (
    <InstitutionWorkspace
      activeStepKey="governance"
      title="Governance"
      subtitle="Institution-level governance setup and policy oversight"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Governance Scope</h2>
        <p className="text-slate-600">
          Program execution governance is managed inside each program portal.
          Use Programs List to open the required program workspace.
        </p>
        <Link
          href="/institution/programs"
          className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Open Programs List
        </Link>
      </div>
    </InstitutionWorkspace>
  );
}
