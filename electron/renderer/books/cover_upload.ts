import { getPlannerApi } from "../app/planner_api.js";
import { applyUploadedCover } from "./form_state.js";
import type { BookFormRefs } from "./form_refs.js";

const COVER_MIME_PNG = "image/png";
const COVER_MIME_JPEG = "image/jpeg";
const COVER_MIME_WEBP = "image/webp";
const COVER_EXTENSION_PNG = ".png";
const COVER_EXTENSION_JPG = ".jpg";
const COVER_EXTENSION_JPEG = ".jpeg";
const COVER_EXTENSION_WEBP = ".webp";
const KEY_ENTER = "Enter";
const KEY_SPACE = " ";
const ERROR_MISSING_FILE = "Select an image file to upload.";
const ERROR_UNSUPPORTED_FILE = "Use a PNG, JPG, or WEBP image.";
const ERROR_UPLOAD_FAILED = "Could not upload this cover image.";

function fileNameHasSupportedExtension(fileName: string): boolean {
  const lowerName = String(fileName || "")
    .trim()
    .toLowerCase();
  if (lowerName.endsWith(COVER_EXTENSION_PNG)) {
    return true;
  }
  if (lowerName.endsWith(COVER_EXTENSION_JPG)) {
    return true;
  }
  if (lowerName.endsWith(COVER_EXTENSION_JPEG)) {
    return true;
  }
  if (lowerName.endsWith(COVER_EXTENSION_WEBP)) {
    return true;
  }
  return false;
}

function fileIsSupported(file: File): boolean {
  const mimeType = String(file.type || "")
    .trim()
    .toLowerCase();
  if (
    mimeType === COVER_MIME_PNG ||
    mimeType === COVER_MIME_JPEG ||
    mimeType === COVER_MIME_WEBP
  ) {
    return true;
  }
  if (!mimeType) {
    return fileNameHasSupportedExtension(file.name);
  }
  return false;
}

function selectedCoverFile(refs: BookFormRefs): File | null {
  const { files } = refs.coverUploadInput;
  if (!files || files.length <= 0) {
    return null;
  }
  return files[0];
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    const onLoad = () => {
      const { result } = reader;
      if (typeof result !== "string" || !result) {
        reject(new Error(ERROR_UPLOAD_FAILED));
        return;
      }

      const dataUrl = result;
      resolve(dataUrl);
    };

    const onError = () => {
      reject(new Error(ERROR_UPLOAD_FAILED));
    };

    reader.addEventListener("load", onLoad, { once: true });
    reader.addEventListener("error", onError, { once: true });
    reader.readAsDataURL(file);
  });
}

function triggerCoverPicker(refs: BookFormRefs): void {
  refs.coverUploadInput.click();
}

function onCoverPanelKeydown(event: KeyboardEvent, refs: BookFormRefs): void {
  if (event.key !== KEY_ENTER && event.key !== KEY_SPACE) {
    return;
  }
  event.preventDefault();
  triggerCoverPicker(refs);
}

function uploadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return ERROR_UPLOAD_FAILED;
}

function clearCoverUploadInput(refs: BookFormRefs): void {
  refs.coverUploadInput.value = "";
}

async function saveSelectedCover(refs: BookFormRefs): Promise<void> {
  const file = selectedCoverFile(refs);
  if (!file) {
    throw new Error(ERROR_MISSING_FILE);
  }
  if (!fileIsSupported(file)) {
    throw new Error(ERROR_UNSUPPORTED_FILE);
  }

  const dataUrl = await readFileAsDataUrl(file);
  const localCover = await getPlannerApi().saveUploadedCover(
    dataUrl,
    refs.bookId.value,
  );
  applyUploadedCover(refs, localCover, file.name);
}

async function handleCoverUploadChange(refs: BookFormRefs): Promise<void> {
  try {
    await saveSelectedCover(refs);
  } catch (error) {
    refs.lookupMeta.textContent = uploadErrorMessage(error);
  } finally {
    clearCoverUploadInput(refs);
  }
}

export function bindCoverUpload(refs: BookFormRefs): void {
  const runUploadChange = () => {
    handleCoverUploadChange(refs).catch((error) => {
      refs.lookupMeta.textContent = uploadErrorMessage(error);
      clearCoverUploadInput(refs);
    });
  };

  refs.coverPanel.addEventListener("click", (event) => {
    event.preventDefault();
    triggerCoverPicker(refs);
  });
  refs.coverPanel.addEventListener("keydown", (event) => {
    onCoverPanelKeydown(event, refs);
  });
  refs.coverUploadInput.addEventListener("change", () => {
    runUploadChange();
  });
}
