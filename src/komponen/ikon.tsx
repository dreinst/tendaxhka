// Ikon garis kecil dan lambang usaha. Tiap gambar dibuat pada ukuran pakainya (viewBox sama dengan lebar
// dan tinggi), supaya ukurannya tidak berubah saat halaman diimpor ke Figma.
type Props = { className?: string };

export function IkonCentang({ className }: Props) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className={className}>
      <path d="M2.8 7.4l2.7 2.7 5.7-6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IkonPanah({ className }: Props) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IkonTutup({ className }: Props) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IkonMenu({ className }: Props) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// Lambang usaha: atap tenda dengan pintu berwarna terpal. Versi "terang" dipakai di atas blok teal.
export function LambangTenda({ className, terang }: Props & { terang?: boolean }) {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden className={className}>
      <rect width="30" height="30" rx="8" fill={terang ? "#fbf8f2" : "#0e3138"} />
      <path d="M15 6.5 24.5 22h-19z" fill={terang ? "#0e3138" : "#fbf8f2"} />
      <path d="M15 13.5 18.6 22h-7.2z" fill="#c2410c" />
    </svg>
  );
}
