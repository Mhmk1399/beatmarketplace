import { DiscIcon, FileTextIcon, MusicNoteIcon, PlayIcon } from "@/components/ui/icons";

const steps = [
  { label: "Find your feeling", detail: "Explore original beats by sound, genre, and tempo.", icon: DiscIcon },
  { label: "Hear the potential", detail: "Listen to the producer's selected 30-second preview.", icon: PlayIcon },
  { label: "Choose your license", detail: "Read the usage terms and pick the right fit for your release.", icon: FileTextIcon },
  { label: "Make it your own", detail: "Get the full WAV after verified payment and start creating.", icon: MusicNoteIcon },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="music-home-section music-home-how" aria-labelledby="how-it-works-title">
      <div className="music-home-container"><header className="music-home-section-heading"><div><p className="music-home-kicker">Keep the creative flow</p><h2 id="how-it-works-title">From first listen to your next release.</h2></div></header><ol className="music-home-step-grid">{steps.map(({ label, detail, icon: Icon }, index) => <li key={label}><span className="music-home-step-top"><Icon className="size-5" /><span>0{index + 1}</span></span><h3>{label}</h3><p>{detail}</p></li>)}</ol></div>
    </section>
  );
}
