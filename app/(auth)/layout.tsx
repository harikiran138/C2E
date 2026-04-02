export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-x-hidden pt-12 pb-24 flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-lg p-6">
        {children}
      </div>
    </main>
  );
}
