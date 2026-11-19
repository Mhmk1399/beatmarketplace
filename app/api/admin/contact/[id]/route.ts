import { z } from "zod";
import ContactMessageModel from "@/models/ContactMessage";
import { contactStatusSchema } from "@/lib/contact/validation";
import { ContactError, contactError, contactJson, readContactJson, requireContactAdmin, requireContactOrigin, serializeContactMessage } from "@/lib/contact/server";

export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireContactOrigin(request);
    const auth = await requireContactAdmin(request); if (!auth.ok) return auth.response;
    const id = z.uuid().parse((await context.params).id);
    const { status, expectedVersion } = contactStatusSchema.parse(await readContactJson(request));
    const saved = await ContactMessageModel.findOneAndUpdate({ _id: id, version: expectedVersion }, { $set: { status, updatedBy: auth.user._id }, $inc: { version: 1 } }, { new: true, runValidators: true }).lean();
    if (!saved) {
      if (!await ContactMessageModel.exists({ _id: id })) throw new ContactError("Message not found.", 404);
      throw new ContactError("This message changed. Refresh the inbox and try again.", 409);
    }
    return contactJson({ message: serializeContactMessage(saved) });
  } catch (error) { return contactError(error); }
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) { try { requireContactOrigin(request); const auth = await requireContactAdmin(request); if (!auth.ok) return auth.response; const id = z.uuid().parse((await context.params).id); const { expectedVersion } = z.object({ expectedVersion: z.number().int().min(1) }).strict().parse(await readContactJson(request)); const deleted = await ContactMessageModel.findOneAndDelete({ _id: id, version: expectedVersion }); if (!deleted) throw new ContactError("This message changed or no longer exists. Refresh and try again.", 409); return contactJson({ deleted: true }); } catch (error) { return contactError(error); } }
