import { supabase, demo } from "./supabase";
import { insertRow, deleteRow } from "./data";
export interface PhotoRow { id: string; property_id: string; path: string; caption: string | null; created_at: string; }
const BUCKET = "property-photos"; export const ALLOWED = ["image/jpeg", "image/png", "image/webp"]; export const MAX_UPLOAD = 15 * 1024 * 1024;

// Re-encodes through a canvas: proves it's a real image, shrinks it, and drops EXIF data such as GPS location.
export async function prepareImage(file: File): Promise<Blob> {
  if (!ALLOWED.includes(file.type)) throw new Error(`${file.name}: only JPEG, PNG or WebP images are accepted.`);
  if (file.size > MAX_UPLOAD) throw new Error(`${file.name}: file is too large (15 MB max).`);
  const bmp = await createImageBitmap(file).catch(() => { throw new Error(`${file.name}: couldn’t read this as an image.`); });
  const max = demo ? 800 : 1600; const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("Couldn’t process image."))), "image/jpeg", demo ? 0.7 : 0.82));
}
const toDataUrl = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
export async function addPhoto(propertyId: string, userId: string, file: File, caption: string) {
  const blob = await prepareImage(file);
  let path: string;
  if (demo) path = await toDataUrl(blob);
  else { path = `${userId}/${propertyId}/${crypto.randomUUID()}.jpg`; const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" }); if (error) throw new Error(error.message); }
  return insertRow("property_photos", { user_id: userId, property_id: propertyId, path, caption: caption || null });
}
export async function photoUrls(rows: PhotoRow[]): Promise<Record<string, string>> {
  if (demo) return Object.fromEntries(rows.map(r => [r.id, r.path]));
  if (!rows.length) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(rows.map(r => r.path), 3600);
  return Object.fromEntries(rows.map((r, i) => [r.id, data?.[i]?.signedUrl ?? ""]));
}
export async function removePhoto(r: PhotoRow) { if (!demo) await supabase.storage.from(BUCKET).remove([r.path]); await deleteRow("property_photos", r.id); }
// Call before deleting a property so its image files aren't left behind in storage.
export async function removeAllPhotos(propertyId: string) {
  if (demo) return; const { data } = await supabase.from("property_photos").select("path").eq("property_id", propertyId);
  const paths = ((data as { path: string }[]) ?? []).map(r => r.path); if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}
