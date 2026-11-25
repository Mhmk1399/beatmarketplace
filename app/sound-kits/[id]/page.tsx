import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import StudioProductModel from "@/models/StudioProduct";
import UserModel from "@/models/User";
import ProducerProfileModel from "@/models/ProducerProfile";
import { PublicShell } from "@/components/public/PublicShell";
import { SoundKitBuyButton } from "@/components/sound-kits/SoundKitBuyButton";
import { formatFileSize } from "@/lib/uploads/files";
export const dynamic = "force-dynamic";
export default async function SoundKitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connectToDatabase();
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  const item = await StudioProductModel.findOne({
    _id: id,
    kind: "SOUND_KIT",
    status: "PUBLISHED",
    encryptedAsset: { $exists: true },
    assetVersion: { $gt: 0 },
    priceToman: { $gte: 1000 },
  }).lean();
  if (
    !item ||
    !(await UserModel.exists({
      _id: item.producerId,
      roles: "PRODUCER",
      status: "ACTIVE",
    }))
  )
    notFound();
  const profile = await ProducerProfileModel.findOne({
    userId: item.producerId,
  })
    .select("stageName")
    .lean();
  return (
    <PublicShell>
      <main className="mx-auto min-h-[70vh] max-w-3xl px-5 py-16">
        <p className="workspace-page-eyebrow">
          Sound kit · {profile?.stageName || "Producer"}
        </p>
        <h1 className="mt-3 text-3xl font-extrabold">{item.title}</h1>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-muted">
          {item.description ||
            "A producer-ready sound kit delivered as a ZIP archive."}
        </p>
        <div className="neo-inset my-8 space-y-2 rounded-[var(--radius-card)] p-5">
          <p className="font-bold">{item.assetName}</p>
          <p className="text-sm text-muted">
            ZIP archive · {formatFileSize(item.assetSizeBytes ?? 0)} · Version{" "}
            {item.assetVersion}
          </p>
        </div>
        <p className="mb-6 text-2xl font-extrabold">
          {item.priceToman!.toLocaleString("en-US")} Toman
        </p>
        <SoundKitBuyButton
          kitId={id}
          version={item.version}
          assetVersion={item.assetVersion}
          price={item.priceToman!}
        />
        <p className="mt-5 text-xs leading-6 text-muted">
          Payment is verified before the encrypted archive is unlocked. Your
          purchased version remains in Downloads even if this listing changes
          later.
        </p>
      </main>
    </PublicShell>
  );
}
