/**
 * @file Book lookup and cover persistence helpers used by IPC handlers.
 */
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { parseCoverDataUrl } from "./cover_data_url";
import { extensionFor, filePathForCover, isHttpProtocol } from "./cover_paths";

export { searchBooks } from "./search";

/**
 * Downloads a remote cover image and stores it in the user data directory.
 * @param coverUrl Remote cover URL candidate.
 * @param bookId Book identifier used in generated file names.
 * @param userDataDir App user-data directory where cover files are saved.
 * @returns File URL for the persisted cover, or empty string when download fails.
 */
export async function downloadCover(
	coverUrl: string | undefined,
	bookId: string | undefined,
	userDataDir: string | undefined,
): Promise<string> {
	const normalizedUrl = String(coverUrl ?? "").trim();
	const normalizedUserDataDir = String(userDataDir ?? "").trim();
	if (normalizedUrl.length === 0 || normalizedUserDataDir.length === 0) {
		return "";
	}
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(normalizedUrl);
	} catch {
		return "";
	}
	if (!isHttpProtocol(parsedUrl.protocol)) {
		return "";
	}
	let response: Response;
	try {
		response = await globalThis.fetch(parsedUrl.toString(), {
			redirect: "follow",
		});
	} catch {
		return "";
	}
	if (!response.ok) {
		return "";
	}
	const bytes = await response.arrayBuffer();
	if (bytes.byteLength === 0) {
		return "";
	}
	const extension = extensionFor(
		response.headers.get("content-type"),
		parsedUrl,
	);
	const filePath = filePathForCover(normalizedUserDataDir, bookId, extension);
	fs.writeFileSync(filePath, new Uint8Array(bytes));
	return pathToFileURL(filePath).href;
}

/**
 * Persists a user-uploaded cover data URL to disk and returns a file URL.
 * @param coverDataUrl Base64 image data URL from upload UI.
 * @param bookId Book identifier used in generated file names.
 * @param userDataDir App user-data directory where cover files are saved.
 * @returns File URL for the persisted cover, or empty string when parsing fails.
 */
export function saveUploadedCover(
	coverDataUrl: string | undefined,
	bookId: string | undefined,
	userDataDir: string | undefined,
): string {
	const normalizedUserDataDir = String(userDataDir ?? "").trim();
	if (normalizedUserDataDir.length === 0) {
		return "";
	}
	const parsed = parseCoverDataUrl(coverDataUrl);
	if (!parsed) {
		return "";
	}
	const filePath = filePathForCover(
		normalizedUserDataDir,
		bookId,
		parsed.extension,
	);
	fs.writeFileSync(filePath, parsed.bytes);
	return pathToFileURL(filePath).href;
}
