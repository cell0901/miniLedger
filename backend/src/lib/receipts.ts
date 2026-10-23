import multer from "multer"; // used for processing or handleing file uploads in form data in api request
import { fileURLToPath } from "node:url";

// Keep uploads in backend/uploads even if Node starts from another directory.
export const uploadsDirectory = fileURLToPath(new URL("../../uploads/", import.meta.url));

// Hold one small image in memory until the loan fields have been validated.
export const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 3 }, // 5mb limit
});

export function receiptExtension(buffer: Buffer) {
  // Check the actual file bytes, not just a filename or a client-supplied MIME type.
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return ".jpg";
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return ".png";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return ".webp";
  return null;
}
