import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * The HUNDREDFOLD film: a real walkthrough of the system running a business,
 * with the owner and Mr. Mustard talking over it.
 *
 * Checked on disk rather than hard-coded, so the hero degrades to a real
 * invitation instead of a broken player on any deploy where the cut has not
 * landed yet. A dead play button on the flagship page is worse than no player.
 */

const FILM = '/video/hundredfold-film.mp4';
const POSTER = '/video/hundredfold-film.jpg';

export default function HundredfoldFilm() {
  const root = path.join(process.cwd(), 'public');
  const hasFilm = existsSync(path.join(root, 'video', 'hundredfold-film.mp4'));
  const hasPoster = existsSync(path.join(root, 'video', 'hundredfold-film.jpg'));

  if (!hasFilm) {
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
    <div className="border-2 border-[#161616] rounded-2xl overflow-hidden shadow-[7px_7px_0_0_#F5B700] bg-[#161616]">
      <video
        controls
        playsInline
        preload="metadata"
        poster={hasPoster ? POSTER : undefined}
        className="w-full h-auto block"
      >
        <source src={FILM} type="video/mp4" />
        Your browser cannot play this video.
      </video>
    </div>
  );
}
