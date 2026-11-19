/** Fill in these public contact details when the official accounts are ready. */
export const contactSettings = {
  email: "",
  phone: "",
  socials: { instagram: "", youtube: "", tiktok: "", x: "", soundcloud: "" },
};

/** Accept real web links only, including when settings are edited later. */
export function socialHref(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
