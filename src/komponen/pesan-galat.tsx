"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Pesan galat di puncak halaman. Saat muncul, pesan digulir ke tampilan dan diberi fokus, karena kiriman yang
 * gagal sering dilakukan dari bawah halaman (terutama di HP) dan pesannya tidak akan terlihat. Halaman dipasang
 * ulang setiap kali aksi server mengalihkan, jadi galat yang sama dua kali berturut-turut tetap memicu ini.
 * Kalau ada panel yang terbuka lagi dengan pesannya sendiri, fokus dibiarkan di panel itu.
 */
export function PesanGalat({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const bingkai = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el || document.querySelector("dialog.panel[open]")) return;
      el.scrollIntoView({ block: "start" });
      el.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(bingkai);
  }, []);
  return (
    <p
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="mb-4 scroll-mt-20 rounded-md border border-terpal-gelap/40 bg-[#fde9e5] px-4 py-3 text-sm font-medium text-terpal-gelap focus:outline-none"
    >
      {children}
    </p>
  );
}
