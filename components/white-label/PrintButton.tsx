'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full border-2 border-[#0b3b44] bg-[#f5b700] px-5 py-2.5 font-sans text-xs font-extrabold uppercase tracking-[0.18em] text-[#0b3b44]"
    >
      Save as PDF
    </button>
  );
}
