import { AboutRibbon } from "@/components/about/AboutRibbon";
export function ContactRibbon({ className = "" }: { className?: string }) {
  return <div className={`contact-ribbon ${className}`} aria-hidden="true"><AboutRibbon variant="community" /></div>;
}
