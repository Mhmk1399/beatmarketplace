import ContactMessageModel from "@/models/ContactMessage";
import { contactInboxQuery, contactSchema } from "@/lib/contact/validation";
import { readContactJson, requireContactOrigin, contactPayloadHash } from "@/lib/contact/server";
import { contactCursor, contactError, contactJson, parseContactCursor, requireContactAdmin, serializeContactMessage } from "@/lib/contact/server";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const auth = await requireContactAdmin(request); if (!auth.ok) return auth.response;
    const query = contactInboxQuery.parse(Object.fromEntries(new URL(request.url).searchParams));
    const cursor = query.cursor ? parseContactCursor(query.cursor) : null;
    const search = query.q ? { $or: ["name", "email", "message"].map(field => ({ [field]: { $regex: query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } })) } : {};
    const messages = await ContactMessageModel.find({ ...(query.status ? { status: query.status } : {}), $and: [search, cursor ? { $or: [{ createdAt: { $lt: cursor.at } }, { createdAt: cursor.at, _id: { $lt: cursor.id } }] } : {}] }).sort({ createdAt: -1, _id: -1 }).limit(query.limit + 1).lean();
    const hasMore = messages.length > query.limit, page = messages.slice(0, query.limit);
    return contactJson({ messages: page.map(serializeContactMessage), hasMore, nextCursor: hasMore ? contactCursor(page[page.length - 1]) : null });
  } catch (error) { return contactError(error); }
}
export async function POST(request: Request) { try { requireContactOrigin(request); const auth = await requireContactAdmin(request); if (!auth.ok) return auth.response; const data = contactSchema.parse(await readContactJson(request)); const message = await ContactMessageModel.create({ _id: data.requestId, name: data.name, email: data.email, subject: data.subject, message: data.message, payloadHash: contactPayloadHash(data), updatedBy: auth.user._id }); return contactJson({ message: serializeContactMessage(message) }, 201); } catch (error) { return contactError(error); } }
