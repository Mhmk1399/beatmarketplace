export const CONTACT_SUBJECTS = [
  { value: "general", label: "General question" },
  { value: "licensing", label: "Beats & licensing" },
  { value: "payments", label: "Orders & payments" },
  { value: "technical", label: "Technical support" },
  { value: "collaboration", label: "Collaboration & business" },
] as const;
export const CONTACT_STATUSES = ["NEW", "READ", "CLOSED"] as const;
export type ContactSubject = typeof CONTACT_SUBJECTS[number]["value"];
export type ContactStatus = typeof CONTACT_STATUSES[number];
export type ContactMessage = {
  id: string; name: string; email: string; subject: ContactSubject; message: string;
  status: ContactStatus; version: number; createdAt: string; updatedAt: string;
};
export type ContactInboxPage = { messages: ContactMessage[]; hasMore: boolean; nextCursor: string | null };
