import type { SiteSettings } from "@/lib/types";
import BrandMark from "./brand-mark";

export default function PublicFooter({ identity, contact }: { identity: SiteSettings["identity"]; contact: SiteSettings["contact"] }) {
  return <footer className="bg-[#031020] py-10 text-white"><div className="container-shell flex flex-col justify-between gap-8 md:flex-row md:items-end"><BrandMark logo={identity.logo} initials={identity.initials} shortName={identity.shortName} company={identity.company} /><div className="text-sm leading-6 text-slate-400 md:text-right"><div>{contact.address}</div><div className="mt-1">{contact.instagram}</div><div className="mt-5 text-xs text-slate-500">© {new Date().getFullYear()} {identity.company}. {identity.copyright}</div></div></div></footer>;
}
