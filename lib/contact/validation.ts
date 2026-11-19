import { z } from "zod";
import { CONTACT_STATUSES, CONTACT_SUBJECTS } from "./types";

const singleLine = /^[^\u0000-\u001f\u007f]+$/;
export const contactSchema = z.object({
  requestId: z.uuid("Please reload the form and try again."),
  name: z.string().trim().min(2, "Enter at least two characters for your name.").max(100, "Use at most 100 characters.").regex(singleLine, "Enter your name on one line."),
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address."),
  subject: z.enum(CONTACT_SUBJECTS.map(subject => subject.value), { error: "Choose a subject." }),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(5000, "Use at most 5,000 characters.").regex(/^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/, "Remove unsupported control characters."),
  website: z.string().max(0, "Please leave this field empty.").optional().default(""),
}).strict();
export const contactStatusSchema = z.object({ status: z.enum(CONTACT_STATUSES), expectedVersion: z.number().int().min(1) }).strict();
export const contactInboxQuery = z.object({ status: z.enum(CONTACT_STATUSES).optional(), q: z.string().trim().max(160).default(""), cursor: z.string().max(400).optional(), limit: z.coerce.number().int().min(1).max(50).default(20) }).strict();
