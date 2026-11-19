"use client";

import { formatPersianDate } from "@/lib/date-time";
import { useEffect, useState } from "react";
import { ResourceManager, type ResourceConfig } from "@/components/admin/ResourceManager";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { DynamicForm } from "@/components/ui/dynamic/DynamicForm";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { apiRequest, ApiRequestError, errorMessage } from "@/components/studio/shared";
import { useAudioActions } from "@/components/audio/AudioPlayerProvider";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import type { MarketplaceTrack } from "@/lib/marketplace/types";
type Collection = { id: string; name: string; description: string; trackIds: string[]; version: number; createdAt: string };
function Editor({ item, onClose, onSaved }: { item: Collection | null; onClose: () => void; onSaved: () => void }) {
  const [values,setValues] = useState({ name:item?.name ?? "", description:item?.description ?? "" }), [ids,setIds] = useState(item?.trackIds ?? []), [beats,setBeats] = useState<MarketplaceTrack[]>([]), [saving,setSaving] = useState(false), [error,setError] = useState(""), [errors,setErrors] = useState<Record<string,string>>({});
  useEffect(() => { const controller = new AbortController(); void apiRequest<{tracks:MarketplaceTrack[]}>("/api/favorites",{signal:controller.signal,quiet:true}).then(data=>setBeats(data.tracks)).catch(error=>{if(!controller.signal.aborted)setError(errorMessage(error));}); return()=>controller.abort(); },[]);
  async function save() { if(saving)return;setSaving(true);setError("");setErrors({});try { await apiRequest(item?`/api/collections/${item.id}`:"/api/collections",{method:item?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...values,trackIds:ids,...(item?{expectedVersion:item.version}:{})})});onSaved(); } catch(error) { setError(errorMessage(error));if(error instanceof ApiRequestError)setErrors(Object.fromEntries(error.issues.map(issue=>[issue.field,issue.message]))); } finally {setSaving(false);} }
  return <DynamicModal open title={item?"Edit collection":"Create collection"} onClose={()=>{if(!saving)onClose();}} closeOnBackdrop={!saving}><div className="space-y-5">
    <p className="text-sm text-muted">Choose beats from your favorites. Removing a collection keeps the original beats and licenses.</p>
    <fieldset disabled={saving} className="neo-inset max-h-64 space-y-2 overflow-y-auto rounded-[var(--radius-control)] p-4"><legend className="px-2 text-xs text-muted">Beats · {ids.length}/100</legend>
      {beats.length?beats.map(beat=><label key={beat.id} className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-accent" checked={ids.includes(beat.id)} disabled={ids.length>=100&&!ids.includes(beat.id)} onChange={()=>setIds(current=>current.includes(beat.id)?current.filter(id=>id!==beat.id):[...current,beat.id])}/><span className="min-w-0 flex-1 truncate">{beat.title}</span></label>):<p className="text-xs leading-6 text-muted">Save a few beats to Favorites to add them here.</p>}
      {ids.filter(id=>!beats.some(beat=>beat.id===id)).map(id=><label key={id} className="flex min-h-12 items-center gap-3 text-xs"><input type="checkbox" checked className="size-4 accent-accent" onChange={()=>setIds(current=>current.filter(value=>value!==id))}/>Previously added beat</label>)}
    </fieldset>
    <DynamicForm fields={[{name:"name",label:"Collection name",required:true,maxLength:100},{name:"description",label:"Description",type:"textarea",maxLength:1000,rows:3}]} values={values} onValueChange={(name,value)=>setValues(current=>({...current,[name]:value}))} submitLabel="Save collection" isSubmitting={saving} formError={error} errors={errors} onSubmit={event=>{event.preventDefault();void save();}} actions={<NeumorphicButton disabled={saving} onClick={onClose}>Cancel</NeumorphicButton>}/>
  </div></DynamicModal>;
}
function Contents({item}:{item:Collection}) { const [beats,setBeats]=useState<MarketplaceTrack[]>([]),[error,setError]=useState(""),[unavailable,setUnavailable]=useState(0);const audio=useAudioActions();
  useEffect(()=>{const controller=new AbortController();void apiRequest<{tracks:MarketplaceTrack[];unavailableCount:number}>(`/api/collections/${item.id}`,{signal:controller.signal,quiet:true}).then(data=>{setBeats(data.tracks);setUnavailable(data.unavailableCount);}).catch(error=>{if(!controller.signal.aborted)setError(errorMessage(error));});return()=>controller.abort();},[item.id]);
  return <div className="space-y-4"><p className="text-sm leading-7 text-muted">{item.description||"Your curated listening collection."}</p>{error&&<p role="alert" className="text-sm text-error-text">{error}</p>}{beats.map(beat=><div key={beat.id} className="neo-inset flex items-center justify-between gap-3 rounded-xl p-4"><span className="text-sm font-bold">{beat.title}</span><NeumorphicButton size="sm" onClick={()=>audio.toggle(marketplaceAudioTrack(beat))}>Listen</NeumorphicButton></div>)}{unavailable>0&&<p className="text-xs leading-6 text-muted">{unavailable} beats are currently unavailable.</p>}</div>;
}
export function CollectionsWorkspace() { const config:ResourceConfig<Collection>={title:"Collections",description:"Organize your favorite sounds into private listening collections.",endpoint:"/api/collections",label:item=>item.name,canCreate:true,canEdit:true,canDelete:true,createLabel:"Create collection",columns:[{id:"name",header:"Collection",accessor:"name"},{id:"count",header:"Beats",cell:item=>item.trackIds.length},{id:"date",header:"Created",cell:item=>formatPersianDate(item.createdAt)}],editor:props=><Editor {...props}/>,details:item=><Contents item={item}/>};return <ResourceManager config={config}/>; }
