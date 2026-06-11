import PageContainer from './PageContainer.jsx';

export default function AppShell({ header, children, containerSize = 'default' }) {
  return (
    <div className="flex min-h-screen min-h-dvh flex-col bg-slate-50">
      {header}
      <main className="flex-1 py-6 sm:py-8 md:py-10">
        <PageContainer size={containerSize}>{children}</PageContainer>
      </main>
    </div>
  );
}
