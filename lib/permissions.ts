// Authorization helpers for the marketplace MVP.
// These checks intentionally keep ownership logic close to the domain so future
// route-level authorization can stay readable and consistent.
import type { Beat, ProducerProfile, User, UserRole } from "@/lib/types";

export function userHasRole(user: Pick<User, "roles"> | null | undefined, role: UserRole) {
  return Boolean(user && user.roles.includes(role));
}

export function userCanManageProducer(user: Pick<User, "id" | "roles"> | null | undefined, producer: Pick<ProducerProfile, "userId">) {
  if (!user) return false;
  return user.id === producer.userId || user.roles.includes("ADMIN");
}

export function userCanManageBeat(user: Pick<User, "id" | "roles"> | null | undefined, beat: Pick<Beat, "producerId">) {
  if (!user) return false;
  return user.id === beat.producerId || user.roles.includes("ADMIN");
}

export function userCanBecomeProducer(user: Pick<User, "roles"> | null | undefined) {
  return Boolean(user && user.roles.includes("USER"));
}
