const VideoShowcase: React.FC = () => {
  return (
    <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-16 md:py-24">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-4 block">
            See It In Action
          </span>
          <h2 className="font-sans text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Watch How We <span className="text-gradient-mustard">Build</span>
          </h2>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src="https://www.youtube.com/embed/dXBbadxTa5I"
              title="Modern Mustard Seed"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoShowcase;
