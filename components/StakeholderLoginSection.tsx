import Link from 'next/link';
import { ArrowRight, Building2, Users } from 'lucide-react';

export default function StakeholderLoginSection() {
  return (
    <section id="stakeholder-login" className="bg-slate-100 px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
          <h2 className="text-2xl font-bold text-slate-900">Portal Login</h2>
          <p className="mt-2 text-sm text-slate-500">
            Select your access type to continue.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/institution/login"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Building2 className="size-4" />
              Institute Login
            </Link>
            <Link
              href="http://localhost:3001/institution/login?type=stakeholder"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              <Users className="size-4" />
              Stakeholder Login
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
