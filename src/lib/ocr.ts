// Reads text from a receipt or invoice entirely on the user's device. The file is never uploaded or stored.
export const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]; const MAX = 10 * 1024 * 1024;
export async function readReceiptText(file: File, progress: (s: string) => void): Promise<string> {
  if (!RECEIPT_TYPES.includes(file.type)) throw new Error("Use a JPEG, PNG, WebP or PDF file.");
  if (file.size > MAX) throw new Error("File is too large (10 MB max).");
  if (file.type === "application/pdf") {
    progress("Reading PDF…");
    const pdfjs = await import("pdfjs-dist"); const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default; pdfjs.GlobalWorkerOptions.workerSrc = worker;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise; let text = "";
    for (let i = 1; i <= Math.min(doc.numPages, 3); i++) { const page = await doc.getPage(i); const c = await page.getTextContent(); let last = -1; for (const it of c.items as any[]) { const y = it.transform?.[5]; text += (last !== -1 && Math.abs(y - last) > 2 ? "\n" : " ") + it.str; last = y; } text += "\n"; }
    if (!text.trim()) throw new Error("This PDF has no readable text (it may be a scan). Take a photo or screenshot of it and upload that instead.");
    return text;
  }
  progress("Loading text reader (one-time download)…");
  const { createWorker } = await import("tesseract.js");
  const w = await createWorker("eng", 1, { logger: m => { if (m.status === "recognizing text") progress(`Reading… ${Math.round(m.progress * 100)}%`); } });
  try { const { data } = await w.recognize(file); return data.text; } finally { await w.terminate(); }
}
