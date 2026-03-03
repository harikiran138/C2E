import InstitutionWorkspace from "@/components/institution/workspace/InstitutionWorkspace";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function InstitutionObeFrameworkPage() {
  return (
    <InstitutionWorkspace
      activeStepKey="obe-framework"
      title="OBE Framework"
      subtitle="Institution-level overview for OBE adoption"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          OBE Framework Access
        </h2>
        <p className="text-slate-600">
          Framework artifacts are maintained within each program portal to
          preserve program-level isolation and audit traceability.
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
