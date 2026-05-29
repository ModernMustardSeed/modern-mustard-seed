import Clouds from './Clouds';

/**
 * PageBackground. Sits behind every page on z-0.
 *
 * Deep blue sky gradient, drifting fluffy white clouds, gentle vignette so
 * the content stays the focus. No WebGL, no smoky shader. Just sky.
 */
export default function PageBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      {/* Deep sky gradient: midnight up top deepening into a softer blue mid */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #080c16 0%, #0F1422 22%, #16305C 55%, #1F4280 100%)',
        }}
      />

      {/* Drifting cloud field across the whole sky */}
      <Clouds density="medium" />

      {/* Mobile readability veil. On phones the narrow text column sits right on
          top of the bright clouds, so we dim the whole field on small screens
          to keep body copy legible. Hidden on md+ where the desktop look is kept
          exactly as designed. */}
      <div className="absolute inset-0 md:hidden bg-[#080c16]/40" />

      {/* Soft vignette to focus content over the sky */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(8,12,22,0.65)_100%)]" />
    </div>
  );
}
