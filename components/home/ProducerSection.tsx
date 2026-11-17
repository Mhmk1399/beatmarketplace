import { CreateCta } from "@/components/home/CreateCta";
import { CheckIcon, DiscIcon, FileTextIcon, MusicNoteIcon } from "@/components/ui/icons";

const studioSteps = [
  { title: "Upload your original", detail: "Keep your full WAV protected.", icon: MusicNoteIcon },
  { title: "Choose the moment", detail: "Set the 30 seconds listeners hear.", icon: DiscIcon },
  { title: "Make your terms clear", detail: "Define licenses, prices, and timed offers.", icon: FileTextIcon },
];

export function ProducerSection() {
  return (
    <section id="producer" className="music-home-section music-home-producer" aria-labelledby="producer-title">
      <div className="music-home-container">
        <div className="music-producer-panel">
          <div className="music-producer-copy"><p className="music-home-kicker">The other side of the sound</p><h2 id="producer-title">Made in your studio.<br /><span className="text-gradient">Ready for their story.</span></h2><p>Give your beats a place to be heard. Build your catalog, choose your previews, and set the terms that work for your music.</p><CreateCta label="Start producing" /><span className="music-producer-footnote"><CheckIcon className="size-3.5" /> Your catalog. Your licenses. Your sound.</span></div>
          <div className="music-producer-flow"><div className="music-producer-flow-heading"><span className="music-producer-emblem"><MusicNoteIcon className="size-5" /></span><div><p>Producer Studio</p><span>From your session to their next release</span></div></div><ol>{studioSteps.map(({ title, detail, icon: Icon }, index) => <li key={title}><span className="music-producer-step-icon"><Icon className="size-5" /></span><div><strong>{title}</strong><p>{detail}</p></div><span className="music-producer-step-number">0{index + 1}</span></li>)}</ol><p className="music-producer-flow-footer"><span className="music-status-dot" aria-hidden="true" /> Built around independent producers</p></div>
        </div>
      </div>
    </section>
  );
}
