/** A bounded upload spooled to a private temporary file, never held as one giant Buffer. */
export type UploadedMediaFile = { path: string; name: string; size: number; type: string };
export type MediaUpload = File | UploadedMediaFile;

export function isSpooledFile(file: MediaUpload): file is UploadedMediaFile {
  return typeof (file as UploadedMediaFile).path === "string";
}
