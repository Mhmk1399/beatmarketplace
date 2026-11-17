import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { marketplaceError, MarketplaceError, requireMarketplaceRole, serializeStudioLicense } from "@/lib/marketplace/server";
import { contractPatchSchema, objectIdSchema } from "@/lib/marketplace/validation";
import ContractModel from "@/models/Contract";
import TrackModel from "@/models/Track";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authentication = await requireMarketplaceRole(request, "PRODUCER");
    if (!authentication.ok) return authentication.response;
    const id = objectIdSchema.parse((await context.params).id);
    const data = contractPatchSchema.parse(await request.json());
    const contract = await ContractModel.findOne({ _id: id, producerId: authentication.user._id });
    if (!contract) throw new MarketplaceError("This license could not be found.", 404);
    if (!contract.isActive) throw new MarketplaceError("An inactive license cannot be edited. Create a new license instead.", 409);
    const trackIds = data.trackIds ?? contract.trackIds.map(String);
    const ownedCount = await TrackModel.countDocuments({ _id: { $in: trackIds }, producerId: authentication.user._id, status: { $ne: "ARCHIVED" } });
    if (ownedCount !== trackIds.length) throw new MarketplaceError("Select only your own available tracks.", 403);
    if (data.title !== undefined) contract.title = data.title;
    if (data.price !== undefined) contract.price = mongoose.Types.Decimal128.fromString(data.price);
    if (data.currency !== undefined) contract.currency = data.currency;
    if (data.trackIds !== undefined) contract.trackIds = data.trackIds.map((trackId) => new mongoose.Types.ObjectId(trackId));
    if (data.formats !== undefined) contract.filesToDeliver = data.formats.map((format) => ({ format, label: "Uncompressed WAV master", required: true }));
    if (data.licenseType !== undefined) contract.terms.licenseType = data.licenseType;
    if (data.streamingLimit !== undefined) contract.terms.streamingLimit = data.streamingLimit;
    if (data.distributionLimit !== undefined) contract.terms.distributionLimit = data.distributionLimit;
    if (data.customTerms !== undefined) contract.terms.customTerms = data.customTerms;
    contract.version += 1;
    await contract.save();
    return NextResponse.json({ contract: serializeStudioLicense(contract) });
  } catch (error) { return marketplaceError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authentication = await requireMarketplaceRole(request, "PRODUCER");
    if (!authentication.ok) return authentication.response;
    const id = objectIdSchema.parse((await context.params).id);
    const contract = await ContractModel.findOne({ _id: id, producerId: authentication.user._id });
    if (!contract) throw new MarketplaceError("This license could not be found.", 404);
    if (contract.isActive) {
      contract.isActive = false;
      contract.version += 1;
      await contract.save();
    }
    return NextResponse.json({ contract: serializeStudioLicense(contract) });
  } catch (error) { return marketplaceError(error); }
}
