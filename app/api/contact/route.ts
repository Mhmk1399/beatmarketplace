import { consumeApiQuota } from "@/lib/security/rate-limit";
import { connectToDatabase } from "@/lib/db";
import { contactSchema } from "@/lib/contact/validation";
import { ContactError, contactError, contactJson, contactPayloadHash, consumeContactQuota, isDuplicate, readContactJson, requireContactOrigin } from "@/lib/contact/server";
import ContactMessageModel from "@/models/ContactMessage";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireContactOrigin(request);
    await consumeApiQuota("contact-service", "all", 30, 60_000);
    const data = contactSchema.parse(await readContactJson(request));
    const payloadHash = contactPayloadHash(data);
    await connectToDatabase();
    const existing = await ContactMessageModel.findById(data.requestId).select("+payloadHash");
    if (existing) {
      if (existing.payloadHash !== payloadHash) throw new ContactError("This submission changed. Please submit the form again.", 409);
      return contactJson({ receipt: existing._id, receivedAt: existing.createdAt.toISOString() });
    }
    await consumeContactQuota(data.email);
    try {
      const message = await ContactMessageModel.create({ _id: data.requestId, name: data.name, email: data.email, subject: data.subject, message: data.message, payloadHash });
      return contactJson({ receipt: message._id, receivedAt: message.createdAt.toISOString() }, 201);
    } catch (error) {
      if (!isDuplicate(error)) throw error;
      const saved = await ContactMessageModel.findById(data.requestId).select("+payloadHash");
      if (!saved || saved.payloadHash !== payloadHash) throw new ContactError("This submission changed. Please submit the form again.", 409);
      return contactJson({ receipt: saved._id, receivedAt: saved.createdAt.toISOString() });
    }
  } catch (error) { return contactError(error); }
}
