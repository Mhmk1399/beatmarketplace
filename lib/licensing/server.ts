import { createHash } from "node:crypto";
import { licenseConditions } from "./conditions";
import type { ContractFields } from "@/models/Contract";

/** Same canonical terms drive checkout consent, the order snapshot and the purchased agreement. */
export function licenseSnapshot(contract: Pick<ContractFields, "title" | "description" | "version" | "terms" | "territory" | "filesToDeliver">) {
  return {
    title: contract.title, description: contract.description ?? "", version: contract.version,
    licenseType: contract.terms.licenseType,
    conditions: licenseConditions(contract.terms, contract.territory),
    customTerms: contract.terms.customTerms ?? "",
    files: contract.filesToDeliver.map(file => ({ format: file.format, label: file.label, required: file.required })),
  };
}
export function licenseTermsHash(contract: Parameters<typeof licenseSnapshot>[0]) {
  return createHash("sha256").update(JSON.stringify(licenseSnapshot(contract))).digest("hex");
}
