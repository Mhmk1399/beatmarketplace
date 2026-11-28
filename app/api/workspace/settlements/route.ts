import { z } from "zod";
import OrderModel from "@/models/Order";
import { objectIdSchema } from "@/lib/marketplace/validation";
import { producerSaleShare } from "@/lib/payments/splits";
import { json, readJson, requireOrigin, requireUser, WorkspaceError, workspaceError } from "@/lib/workspace/server";

const input = z.object({
  orderId: objectIdSchema,
  producerId: objectIdSchema,
  itemIndex: z.number().int().min(0).max(19),
  reference: z.string().trim().min(3).max(160),
}).strict();

export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const auth = await requireUser(request, "ADMIN");
    if (!auth.ok) return auth.response;
    const { orderId, itemIndex, producerId, reference } = input.parse(await readJson(request));
    const filter = { _id: orderId, status: "PAID", gatewayMode: "live" } as const;
    const order = await OrderModel.findOne(filter);
    const item = order?.items[itemIndex];
    const amount = item && producerSaleShare(item, producerId);
    if (!amount) return json({ error: "No payable share found for this verified sale." }, 404);
    const record = { itemIndex, producerId, amount, reference, recordedBy: auth.user._id, recordedAt: new Date() };
    const result = await OrderModel.updateOne({
      ...filter,
      settlements: { $not: { $elemMatch: { itemIndex, producerId } } },
    }, { $push: { settlements: record } }, { runValidators: true });
    if (!result.modifiedCount) throw new WorkspaceError("This share was already recorded as settled or the order changed.", 409);
    return json({ amount, recordedAt: record.recordedAt }, 201);
  } catch (error) {
    return workspaceError(error);
  }
}
