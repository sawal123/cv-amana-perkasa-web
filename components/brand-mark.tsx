import Image from "next/image";

/** Logo when one is configured, otherwise the initials mark. Shared header/footer. */
export default function BrandMark({ logo, initials, shortName, company }: { logo: string; initials: string; shortName: string; company: string }) {
  if (logo) {
    return <Image src={logo} alt={company} width={180} height={40} className="h-10 w-auto max-w-[180px] object-contain" />;
  }
  return <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-white/10 text-sm font-black tracking-tight text-white">{initials}</div><div><div className="text-[11px] font-semibold tracking-[.20em] text-blue-200">CV</div><div className="text-sm font-bold tracking-[.07em] text-white">{shortName}</div></div></div>;
}
