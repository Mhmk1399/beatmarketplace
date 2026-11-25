import { notFound } from "next/navigation";
import StudioProductModel from "@/models/StudioProduct";
import UserModel from "@/models/User";
import { connectToDatabase } from "@/lib/db";
import { PublicShell } from "@/components/public/PublicShell";
export const dynamic="force-dynamic";
export default async function VideoPage({params}:{params:Promise<{id:string}>}){await connectToDatabase();const{id}=await params;if(!/^[a-f\d]{24}$/i.test(id))notFound();const item=await StudioProductModel.findOne({_id:id,kind:"VIDEO",status:"PUBLISHED"}).lean();if(!item||!await UserModel.exists({_id:item.producerId,roles:"PRODUCER",status:"ACTIVE"}))notFound();return <PublicShell><main className="mx-auto min-h-[70vh] max-w-3xl px-5 py-16"><p className="workspace-page-eyebrow">Producer video</p><h1 className="mt-3 text-3xl font-extrabold">{item.title}</h1><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-muted">{item.description}</p><a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="neo-button neo-button-accent mt-8 inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-5 font-bold">Watch safely on {item.videoProvider==="VIMEO"?"Vimeo":"YouTube"}</a></main></PublicShell>;}
