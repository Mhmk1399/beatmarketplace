import Image from "next/image";
import { UsersIcon } from "@/components/ui/icons";
import { AboutLayersIcon, AboutWaveIcon } from "./AboutIcons";

const values = [
  {
    title: "Discover Beats",
    description:
      "Explore original beats across genres and find the sound that fits your next release.",
    Icon: AboutWaveIcon,
  },
  {
    title: "Flexible Licensing",
    description:
      "Clear, producer-defined licenses help you choose the terms that suit your project.",
    Icon: AboutLayersIcon,
  },
  {
    title: "Support Creators",
    description:
      "A space for independent producers to share their work and connect with artists.",
    Icon: UsersIcon,
  },
];

export function AboutWhatWeDo() {
  return (
    <section
      className="about-section about-purpose"
      aria-labelledby="about-purpose-title"
    >
      <div className="about-container about-purpose-grid">
        <div className="about-vinyl" aria-hidden="true">
          <Image
            src="/assets/about/vinyl.webp"
            alt=""
            fill
            sizes="(max-width:699px) 72vw, (max-width:1099px) 35vw, 440px"
          />
        </div>
        <div className="about-purpose-content">
          <p className="about-eyebrow">
            <span aria-hidden="true" />
            What we do
          </p>
          <h2 id="about-purpose-title">
            More than a <span>beat store.</span>
          </h2>
          <p className="about-intro">
            We give music creators the tools, access, and freedom to find the
            right sound, license it with confidence, and build their next
            release.
          </p>
          <div className="about-values">
            {values.map(({ title, description, Icon }) => (
              <article key={title} className="about-value">
                <Icon />
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
