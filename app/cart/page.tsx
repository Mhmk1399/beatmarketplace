import { Cart } from "@/components/marketplace/Cart";
import { PublicShell } from "@/components/public/PublicShell";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { ArrowRightIcon } from "@/components/ui/icons";
import styles from "@/components/marketplace/Cart.module.css";

export default function CartPage() {
  return <PublicShell><div className={styles.page}>
    <header className={styles.pageHeader}>
      <div><p className={styles.eyebrow}>Your next release starts here</p><h1>Your cart<span className="text-accent-text">.</span></h1><p>The beats you love. The license that fits your next move.</p></div>
      <NeumorphicLink href="/marketplace" className={styles.continue}>Keep exploring<ArrowRightIcon /></NeumorphicLink>
    </header>
    <Cart />
  </div></PublicShell>;
}
