import { FILMS } from '@/lib/films';

/**
 * The HUNDREDFOLD film: a real walkthrough of the system running a business,
 * narrated by Mr. Mustard.
 *
 * ⚠️ Reads a DECLARATION, never the filesystem. This component used to call
 * `existsSync` on `public/video/...`, which silently returns false on every
 * render that happens on the lambda: this page carries `revalidate = 300`, so
 * five minutes after deploy it regenerated server-side, found no `public/`
 * directory in the traced bundle, and fell back to the no-film card while the
 * file was serving fine from the CDN. See lib/films.ts.
 */

const { mp4: FILM, poster: POSTER, shipped, runtime } = FILMS.hero;

export default function HundredfoldFilm() {
  if (!shipped) {
    return (
      <div className="border-2 border-[#161616] rounded-2xl bg-[#161616] shadow-[7px_7px_0_0_#F5B700] p-9 md:p-12 text-center">
        <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#F5B700] mb-4">
          The walkthrough
        </span>
        <p className="font-display italic font-black text-2xl md:text-3xl text-[#FBF6EA] leading-snug max-w-2xl mx-auto">
          The fastest way to understand this is to be interviewed by it.
        </p>
        <p className="mt-4 text-[#FBF6EA]/70 font-body text-sm md:text-base max-w-xl mx-auto leading-relaxed">
          Twenty minutes with Mr. Mustard tells you more about your business than an hour of watching
          somebody explain a program.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="border-2 border-[#161616] rounded-2xl overflow-hidden shadow-[7px_7px_0_0_#F5B700] bg-[#161616]">
        <video controls playsInline preload="metadata" poster={POSTER} className="w-full h-auto block">
          <source src={FILM} type="video/mp4" />
          Your browser cannot play this video.
        </video>
      </div>
      <p className="mt-3 text-center text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#161616]/45">
        The walkthrough · {runtime}
      </p>
    </div>
  );
}
