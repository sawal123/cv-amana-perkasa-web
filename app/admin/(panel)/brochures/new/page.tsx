import BrochureEditor from "@/components/admin/brochure-editor";
import { MAX_BROCHURE_BYTES } from "@/lib/brochures";

export const dynamic = "force-dynamic";

export default function NewBrochurePage() {
  return <BrochureEditor maxBytes={MAX_BROCHURE_BYTES} />;
}
