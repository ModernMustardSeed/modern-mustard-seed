import LaunchFilmPlayer from '@/components/launch-film/LaunchFilmPlayer';
import { FILMS } from '@/lib/films';

/**
 * The partner film, on /partners and /partners/sales-rep. 67 seconds built
 * from real screens: a name goes into /demos from a partner's link, the demo
 * suite builds, the owner calls, and the first check lands. The rig lives in
 * dev/mms/marketing/partner-film-2026-09-30. Every figure in it is
 * partnerMath(); move a price and the film needs a re-cut of scenes F to H.
 */
export default function PartnerFilm() {
  const film = FILMS.partnerFilm;
  return (
    <LaunchFilmPlayer
      cuts={{ webm: film.webm, mp4: film.mp4 }}
      poster={film.poster}
      runtime="1:07"
      film="partner-film"
      title="the partner program film"
    />
  );
}
