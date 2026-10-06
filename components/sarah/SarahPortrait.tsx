/**
 * Sarah's portrait (hair up, black sweater), hung the way the homepage hangs
 * its Mr. Mustard card: a cream mat, a gold top edge, an ink offset shadow.
 * 4:5, cut from public/admin/my-content/profile/profile-c-up.jpg.
 */
export default function SarahPortrait({
  caption,
  priority = false,
  className = '',
}: {
  caption?: React.ReactNode;
  priority?: boolean;
  className?: string;
}) {
  const sizes = '(min-width: 1024px) 420px, (min-width: 640px) 50vw, 90vw';
  return (
    <figure className={`relative bg-[#f3ecd5] border-t-[3px] border-[#f5b700] shadow-[7px_7px_0_0_#103c54] p-3 sm:p-4 ${className}`}>
      <picture>
        <source type="image/avif" srcSet="/brand/sarah-portrait-480.avif 480w, /brand/sarah-portrait-864.avif 864w" sizes={sizes} />
        <source type="image/webp" srcSet="/brand/sarah-portrait-480.webp 480w, /brand/sarah-portrait-864.webp 864w" sizes={sizes} />
        <img
          src="/brand/sarah-portrait-864.jpg"
          width={864}
          height={1080}
          alt="Sarah Scarano, founder of Modern Mustard Seed, smiling, hair up, in a black sweater"
          className="block w-full h-auto"
          fetchPriority={priority ? 'high' : 'auto'}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      </picture>
      {caption ? (
        <figcaption className="pt-3.5 pb-1 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#103c54]/75">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
