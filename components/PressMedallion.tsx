import s from './PressMedallion.module.css';

/* The homepage medallion for inner-page heroes. Decoration only. */
export default function PressMedallion() {
  return (
    <div className={s.art} aria-hidden="true">
      <i />
      <b />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/mascot-hero-480.avif" alt="" width={480} height={652} decoding="async" />
    </div>
  );
}
