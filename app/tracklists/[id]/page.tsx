import { notFound } from "next/navigation";
import StudioProductModel from "@/models/StudioProduct";
import TrackModel from "@/models/Track";
import UserModel from "@/models/User";
import { connectToDatabase } from "@/lib/db";
import { serializeTracks } from "@/lib/marketplace/server";
import { PublicTracklist } from "@/components/studio/PublicTracklist";
export const dynamic = "force-dynamic";
export default async function TracklistPage({params}:{params:Promise<{id:string}>}){await connectToDatabase();const {id}=await params;if(!/^[a-f\d]{24}$/i.test(id))notFound();const item=await StudioProductModel.findOne({_id:id,kind:"TRACKLIST",status:"PUBLISHED"});if(!item||!await UserModel.exists({_id:item.producerId,roles:"PRODUCER",status:"ACTIVE"}))notFound();const records=await TrackModel.find({_id:{$in:item.trackIds},producerId:item.producerId,status:"PUBLISHED",visibility:"PUBLIC"});const map=new Map(records.map(track=>[String(track._id),track]));const ordered=item.trackIds.flatMap(trackId=>map.get(String(trackId))??[]);const tracks=(await serializeTracks(ordered)).filter(track=>Boolean(track.previewUrl));return <PublicTracklist title={item.title} description={item.description} tracks={tracks}/>;}
