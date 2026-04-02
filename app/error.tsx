"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home, Terminal, Server, Database, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-100 p-8 flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-full">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">500 | Internal Server Error</h1>
            <p className="text-slate-600">Something went wrong on our end.</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          <div className="grid md:grid-cols-2 gap-8 text-sm">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Server className="w-4 h-4" /> Understanding the Problem
              </h2>
              <p className="text-slate-600 leading-relaxed">
                A 500 Internal Server Error is an HTTP status code that signals a problem with the web server. 
                Unlike client-side errors (4xx), 5xx errors mean the server itself failed to process a valid request. 
                The issue lies within the server's operations, not with your request format or connectivity.
              </p>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <h3 className="font-medium text-slate-800 mb-2">Common Causes:</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Programming Errors (Bugs or Logic flaws)</li>
                  <li>Server Misconfigurations (e.g., .htaccess issues)</li>
                  <li>Database connectivity problems</li>
                  <li>Insufficient Server Resources (CPU/Memory)</li>
                  <li>Third-party API dependencies failure</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4" /> How to Troubleshoot
              </h2>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="p-2 h-fit bg-blue-50 rounded text-blue-600 font-bold">1</div>
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-800">Check DevTools:</span> Open Network Tab (F12), refresh, and look for red entries to see response details.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="p-2 h-fit bg-blue-50 rounded text-blue-600 font-bold">2</div>
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-800">Review Server Logs:</span> Apache/Nginx error logs or Node.js console output often contain stack traces.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="p-2 h-fit bg-blue-50 rounded text-blue-600 font-bold">3</div>
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-800">Reproduce:</span> Try the same steps again to see if it's persistent or intermittent (resource exhaustion).
                  </p>
                </div>
              </div>
              
              <div className="pt-4">
                 <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4" /> Suggested Fixes
                </h2>
                <p className="text-slate-600 leading-relaxed italic">
                  Examine logs thoroughly, verify file permissions, check database query efficiency, and isolate issues by deactivating recent plugins or code changes.
                </p>
              </div>
            </section>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
            <Button
              onClick={() => reset()}
              className="bg-primary hover:bg-primary/90 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </Button>
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">
                <Home className="w-4 h-4" /> Back to Home
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 px-8 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Terminal className="w-3 h-3" />
            <span>ERROR_ID: {error.digest || "INTERNAL_GENERIC"}</span>
          </div>
          <span className="text-xs text-slate-400 uppercase tracking-widest">Compliance to Excellence</span>
        </div>
      </div>
    </div>
  );
}
