import Link from "next/link";
import { ArrowRightIcon, ChevronDownIcon, ShieldIcon } from "@/components/ui/icons";
import styles from "./home-discovery.module.css";

const questions = [
  { question: "What can I do with a licensed beat?", answer: "Each producer defines the terms for their beat. Compare the license, streaming and distribution limits, and producer-credit requirements on the beat page before choosing the fit for your release.", href: "/marketplace", action: "Explore beats and licenses" },
  { question: "How much can I hear before buying?", answer: "Marketplace beats have a producer-selected preview of up to 30 seconds. Our listening demos are full-length player examples, clearly marked as demos and not offered for sale.", href: "/#listening-room", action: "Try the listening room" },
  { question: "What happens after I pay?", answer: "Prices are shown in toman. After your payment is verified, your purchased WAV files and agreed license terms become available in your account’s purchases. Your order keeps the terms you purchased with.", href: "/dashboard/orders", action: "Open purchases and licenses" },
  { question: "How do I start selling my beats?", answer: "With producer access, you can upload original WAV files, choose the 30-second preview, add artwork, and set licenses, prices and timed offers from Producer Studio. Your account keeps your listening library and studio together.", href: "/#producer", action: "Explore Producer Studio" },
];

export function HomeQuestions() {
  return <div id="beat-questions" className={styles.questions} aria-labelledby="beat-questions-title">
    <header className={styles.questionsHeader}><div><p><ShieldIcon />A little clarity before you create</p><h2 id="beat-questions-title">Good music.<span> Clear next steps.</span></h2></div><Link href="/contact" className={styles.help}>Have another question?<ArrowRightIcon /></Link></header>
    <div className={styles.questionGrid}>{questions.map(item=><details key={item.question} className={styles.question}><summary>{item.question}<ChevronDownIcon /></summary><div><p>{item.answer}</p><Link href={item.href} prefetch={false}>{item.action}<ArrowRightIcon /></Link></div></details>)}</div>
  </div>;
}
