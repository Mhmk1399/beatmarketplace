import { NextResponse } from "next/server";
import { orderAllowsDownload } from "@/lib/payments/orders";
import { producerSaleShare } from "@/lib/payments/splits";
import { z } from "zod";
import mongoose from "mongoose";
import OrderModel, { type OrderFields } from "@/models/Order";
import UserModel from "@/models/User";
import {
  cursorFilter,
  escapeRegex,
  json,
  requireUser,
  resourcePage,
  workspaceError,
} from "@/lib/workspace/server";
import {
  MAX_SALES_EXPORT_ORDERS,
  safeCsvCell,
  salesExportExceedsLimit,
} from "@/lib/workspace/csv";

const querySchema = z
  .object({
    scope: z.enum(["admin", "producer", "personal"]),
    q: z.string().trim().max(160).default(""),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().max(256).optional(),
    status: z.enum(["PAID", "PENDING", "CANCELLED"]).optional(),
    format: z.enum(["json", "csv"]).default("json"),
    mode: z.enum(["live", "sandbox"]).optional(),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    beat: z.string().trim().max(160).default(""),
    license: z.string().trim().max(160).default(""),
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ["from"],
    message: "Start date must be before end date.",
  });

export async function GET(request: Request) {
  try {
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const auth = await requireUser(
      request,
      query.scope === "admin"
        ? "ADMIN"
        : query.scope === "producer"
          ? "PRODUCER"
          : undefined,
    );
    if (!auth.ok) return auth.response;
    const producer = query.scope === "producer";
    if (query.format === "csv" && !producer)
      return json(
        { error: "CSV export is available for producer sales only." },
        403,
      );
    const producerId = new mongoose.Types.ObjectId(auth.user.id);
    const itemCriteria: Record<string, unknown> = producer
      ? { $or: [{ producerId }, { "revenueAllocations.userId": producerId }] }
      : {};
    if (producer && (query.q || query.beat))
      itemCriteria.title = {
        $regex: escapeRegex(query.beat || query.q),
        $options: "i",
      };
    if (producer && query.license)
      itemCriteria.licenseTitle = {
        $regex: escapeRegex(query.license),
        $options: "i",
      };
    const createdAt = {
      ...(query.from ? { $gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
      ...(query.to
        ? {
            $lt: new Date(
              new Date(`${query.to}T00:00:00.000Z`).getTime() + 86_400_000,
            ),
          }
        : {}),
    };
    const filter: Record<string, unknown> = {
      ...(query.scope === "admin"
        ? {}
        : producer
          ? { items: { $elemMatch: itemCriteria } }
          : { buyerId: auth.user._id }),
      ...(producer
        ? { status: "PAID" }
        : query.status
          ? { status: query.status }
          : {}),
      ...(query.mode ? { gatewayMode: query.mode } : {}),
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
      ...(!producer && query.q
        ? { "items.title": { $regex: escapeRegex(query.q), $options: "i" } }
        : {}),
    };
    const beatPattern = query.beat
      ? new RegExp(escapeRegex(query.beat), "i")
      : null;
    const queryPattern = query.q ? new RegExp(escapeRegex(query.q), "i") : null;
    const licensePattern = query.license
      ? new RegExp(escapeRegex(query.license), "i")
      : null;
    const itemMatches = (item: OrderFields["items"][number]) =>
      !producer ||
      (producerSaleShare(item, producerId) !== undefined &&
        (!beatPattern || beatPattern.test(item.title)) &&
        (!queryPattern || queryPattern.test(item.title)) &&
        (!licensePattern || licensePattern.test(item.licenseTitle)));
    if (query.format === "csv") {
      const orders = await OrderModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(MAX_SALES_EXPORT_ORDERS + 1)
        .select("items status gatewayMode createdAt")
        .lean();
      if (salesExportExceedsLimit(orders.length))
        return json(
          {
            error: `This export contains more than ${MAX_SALES_EXPORT_ORDERS.toLocaleString("en-US")} orders. Narrow the date, beat, or license filters and try again.`,
          },
          422,
        );
      const rows: (string | number)[][] = [
        [
          "Order ID",
          "Date",
          "Beat",
          "License",
          "Amount (Toman)",
          "Your share (Toman)",
          "Payment",
          "Mode",
        ],
        ...orders.flatMap((order) =>
          order.items
            .filter(itemMatches)
            .map((item) => [
              String(order._id),
              order.createdAt.toISOString(),
              item.title,
              item.licenseTitle,
              item.price,
              producerSaleShare(item, producerId) ?? 0,
              order.status,
              order.gatewayMode,
            ]),
        ),
      ];
      const csv = `\uFEFF${rows.map((row) => row.map(safeCsvCell).join(",")).join("\r\n")}`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="producer-sales-${new Date().toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    const orders = await OrderModel.find({
      ...filter,
      ...cursorFilter(query.cursor),
    })
      .select(query.scope === "personal" ? "+items.deliverables" : "+settlements")
      .sort({ createdAt: -1, _id: -1 })
      .limit(query.limit + 1);
    const result = resourcePage(orders, query.limit),
      buyers =
        query.scope === "admin"
          ? await UserModel.find({
              _id: { $in: result.page.map((order) => order.buyerId) },
            }).select("email firstName lastName")
          : [];
    const names = new Map(
      buyers.map((user) => [
        String(user._id),
        { email: user.email, name: `${user.firstName} ${user.lastName}` },
      ]),
    );
    const items = result.page.map((order) => {
      const visible = producer ? order.items.filter(itemMatches) : order.items;
      return {
        id: String(order._id),
        status: order.status,
        total: producer
          ? visible.reduce((sum, item) => sum + item.price, 0)
          : order.total,
        yourShare: producer ? visible.reduce((sum, item) => sum + (producerSaleShare(item, producerId) ?? 0), 0) : undefined,
        gatewayMode: order.gatewayMode,
        createdAt: order.createdAt.toISOString(),
        referenceId: query.scope !== "producer" ? order.referenceId : undefined,
        buyer:
          query.scope === "admin"
            ? names.get(String(order.buyerId))
            : undefined,
        items: visible.map((item, index) => ({
          title: item.title,
          licenseTitle: item.licenseTitle,
          price: item.price,
          yourShare: producer ? producerSaleShare(item, producerId) : undefined,
          settled: producer && order.settlements?.some(record =>
            record.itemIndex === order.items.indexOf(item) && String(record.producerId) === String(producerId),
          ),
          allocations: query.scope === "admin" && order.status === "PAID" && order.gatewayMode === "live"
            ? (item.revenueAllocations ?? [{ userId: item.producerId, amount: item.price }])
              .filter(share => share.amount > 0)
              .map(share => ({
                producerId: String(share.userId), amount: share.amount,
                settlement: order.settlements?.find(record => record.itemIndex === index && String(record.producerId) === String(share.userId)),
              })).map(({ settlement, ...share }) => ({
                ...share, reference: settlement?.reference, recordedAt: settlement?.recordedAt,
              }))
            : undefined,
          terms: query.scope === "personal" ? item.terms : undefined,
          agreementUrl:
            item.agreementVersion === 1 &&
            query.scope === "personal" &&
            orderAllowsDownload(order)
              ? `/api/orders/${order._id}/agreement?item=${index}`
              : null,
          downloadUrl:
            query.scope === "personal" && orderAllowsDownload(order)
              ? `/api/orders/${order._id}/download?item=${index}`
              : null,
          downloads:
            query.scope === "personal" && orderAllowsDownload(order)
              ? item.deliverables?.length
                ? item.deliverables.map((file) => ({
                    format: file.format,
                    url: `/api/orders/${order._id}/download?item=${index}&format=${file.format}`,
                  }))
                : [
                    {
                      format: "WAV",
                      url: `/api/orders/${order._id}/download?item=${index}`,
                    },
                  ]
              : [],
        })),
      };
    });
    return json({
      items,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    return workspaceError(error);
  }
}
