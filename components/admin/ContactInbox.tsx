"use client";

import { formatPersianDate, formatPersianDateTime } from "@/lib/date-time";
import { useState } from "react";
import { createClientId } from "@/lib/client-id";
import { ResourceManager, type ResourceConfig } from "./ResourceManager";
import { TableIdentity } from "@/components/ui/dynamic/DynamicTable";
import { DynamicSelect } from "@/components/ui/dynamic/DynamicSelect";
import { CONTACT_SUBJECTS, CONTACT_STATUSES, type ContactMessage } from "@/lib/contact/types";
export function ContactInbox() {
 const [status,setStatus] = useState("");
 const config: ResourceConfig<ContactMessage> = { title: "Contact messages", description: "Read and manage messages received from the Contact page. Status updates do not send email.", endpoint: "/api/admin/contact", itemsKey: "messages", query: status ? `status=${status}` : "", label: message => `Message from ${message.name}`, canCreate: true, canEdit: true, canDelete: true, createLabel: "Add message", deleteDescription: "This permanently removes the selected message from the support inbox.",
 columns: [{ id: "sender", header: "Sender", cell: item => <TableIdentity title={item.name} subtitle={item.email} /> }, { id: "subject", header: "Subject", cell: item => CONTACT_SUBJECTS.find(subject=>subject.value===item.subject)?.label ?? item.subject }, { id: "status", header: "Status", cell: item => <span className="workspace-status">{item.status}</span> }, { id: "date", header: "Received", cell: item => formatPersianDate(item.createdAt) }],
 toolbar: <div className="max-w-60"><label htmlFor="inbox-status" className="mb-2 block text-xs text-muted">Message status</label><DynamicSelect id="inbox-status" value={status} onChange={event=>setStatus(event.target.value)} options={[{value:"",label:"All messages"},...CONTACT_STATUSES.map(value=>({value,label:value}))]} /></div>,
 fields: item => item ? [{ name:"status",label:"Message status",type:"select",options:CONTACT_STATUSES.map(value=>({value,label:value})) }] : [{name:"name",label:"Name",required:true,maxLength:100},{name:"email",label:"Email",type:"email",required:true,maxLength:254},{name:"subject",label:"Subject",type:"select",options:CONTACT_SUBJECTS.map(subject=>({value:subject.value,label:subject.label}))},{name:"message",label:"Message",type:"textarea",required:true,minLength:10,maxLength:5000}],
 values: item => ({status:item?.status ?? "NEW",name:"",email:"",subject:"general",message:""}),
 payload: (values,item) => item ? {status:values.status,expectedVersion:item.version} : {name:values.name,email:values.email,subject:values.subject,message:values.message,requestId:createClientId(),website:""},
 details: item => <div className="space-y-4"><TableIdentity title={item.name} subtitle={item.email} /><a href={`mailto:${item.email}`} className="inline-flex min-h-11 items-center text-sm text-accent-muted underline">Reply by email</a><p className="text-xs text-muted">{item.status} · {formatPersianDateTime(item.createdAt)}</p><p className="neo-inset whitespace-pre-wrap break-words rounded-[var(--radius-control)] p-5 text-sm leading-7">{item.message}</p></div>
 };return <ResourceManager key={status} config={config} />;
}
