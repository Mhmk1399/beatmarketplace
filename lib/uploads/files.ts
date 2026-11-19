type FileDetails = Pick<File, "name" | "size" | "type">;
export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("en", { maximumFractionDigits: 1 })} MB`;
}
export function validateSelectedFile(file: FileDetails, accept: string, maxBytes: number) {
  if (!file.size) return "This file is empty. Choose another file.";
  if (file.size > maxBytes) return `Choose a file of ${formatFileSize(maxBytes)} or smaller.`;
  const rules = accept.toLowerCase().split(",").map(value => value.trim()).filter(Boolean);
  const name = file.name.toLowerCase(), mime = file.type.toLowerCase();
  if (rules.length && !rules.some(rule => rule.startsWith(".") ? name.endsWith(rule) : rule.endsWith("/*") ? mime.startsWith(rule.slice(0, -1)) : mime === rule)) return "This file type is not supported. Choose one of the listed formats.";
  return null;
}
