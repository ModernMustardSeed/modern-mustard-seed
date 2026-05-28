export default function StaticBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 50% 30%, rgba(78,205,196, 0.05) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 80% 70%, rgba(79,146,216, 0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 20% 80%, rgba(143,192,239, 0.04) 0%, transparent 60%)
          `,
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_40%,rgba(14,8,36,0.5)_100%)]" />
    </div>
  );
}
