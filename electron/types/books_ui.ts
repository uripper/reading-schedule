import type { bindDialogFocus } from "../renderer/accessibility/index.js";

import type { Book, BookGroup } from "./books_types.js";

export interface BookFormRefs {
  dialog: HTMLDialogElement;
  dialogTitle: HTMLElement;
  form: HTMLFormElement;
  bookId: HTMLInputElement;
  coverUrl: HTMLInputElement;
  coverLocal: HTMLInputElement;
  author: HTMLInputElement;
  searchInput: HTMLInputElement;
  searchResults: HTMLElement;
  lookupMeta: HTMLElement;
  coverPanel: HTMLElement;
  coverUploadInput: HTMLInputElement;
  titleInput: HTMLInputElement;
  wordsInput: HTMLInputElement;
  pagesTotalInput: HTMLInputElement;
  pagesReadInput: HTMLInputElement;
  progressInput: HTMLInputElement;
  priorityInput: HTMLInputElement;
  difficultyInput: HTMLInputElement;
  minBlocksInput: HTMLInputElement;
  maxMinutesInput: HTMLInputElement;
  deadlineInput: HTMLInputElement;
  afterBookInput: HTMLInputElement;
  afterBookResults: HTMLElement;
  blockedByInput: HTMLInputElement;
  statusSelectInput: HTMLSelectElement;
  finishedAtField: HTMLElement;
  finishedAtInput: HTMLInputElement;
  shelfSelectInput: HTMLSelectElement;
  scheduledDaysField: HTMLElement;
  applyScheduledDaysToShelfInput: HTMLInputElement;
  shelfPromptDialog: HTMLDialogElement;
  shelfPromptForm: HTMLFormElement;
  shelfPromptInput: HTMLInputElement;
  coverPreview: HTMLImageElement;
  saveBtn: HTMLButtonElement;
  cancelBtn: HTMLButtonElement;
}

export interface BookDialogOptions {
  getBooks?(): Book[];
}

export interface LookupControl {
  clearResults(): void;
}

export interface AfterBookPickerControl {
  openForBook(book: Book | null): void;
}

export interface OpenDialogOptions {
  defaultShelf?: string;
}

export interface OpenBookDialogArgs {
  refs: BookFormRefs;
  dialogFocus: ReturnType<typeof bindDialogFocus>;
  lookupControl: LookupControl;
  afterBookPicker: AfterBookPickerControl;
  getBooks(): Book[];
  book: Book | null;
  dialogOptions: OpenDialogOptions;
}

export interface BookSubmitPayload {
  book: Book;
  applyScheduledDaysToShelf: boolean;
}

export interface ProgressSyncRefs {
  pagesTotalInput: HTMLInputElement;
  pagesReadInput: HTMLInputElement;
  progressInput: HTMLInputElement;
}

export interface OptionDefinition {
  label: string;
  value: string;
}

export interface PickerState {
  activeIndex: number;
  currentBookId: string;
  filtered: Book[];
  options: Book[];
  selectedBookId: string;
}

export interface BindingArgs {
  clearResults(): void;
  refs: BookFormRefs;
  refreshFiltered(clearChangedSelection: boolean): void;
  render(): void;
  selectBook(book: Book | null | undefined): void;
  state: PickerState;
}

export interface PickerInteraction {
  targetIsInput: boolean;
  targetIsInResults: boolean;
}

export type GetBooks = () => Book[];

export interface AfterBookPicker {
  openForBook(book?: Book | null): void;
}

export interface HoloPointerVars {
  pointerX: string;
  pointerY: string;
  bgShiftX: string;
  bgShiftY: string;
}

export interface CardNavigationActions {
  onEstimatedFinishNavigate(dateKey: string): void;
}

export interface CardHandlers {
  onEdit(bookId: string): void;
  onRemove(bookId: string): void;
}

export interface CardRenderContext extends CardNavigationActions {
  finishDateByBookId: Record<string, string>;
  showBlockerMeta: boolean;
  showShelfMeta: boolean;
  showWordCount: boolean;
  titleById: Record<string, string>;
}

export interface ScrollSettleState {
  lastLeft: number;
  lastTop: number;
  stableFrames: number;
  startedAtMs: number;
}

export interface RenderBookGridOptions {
  grid: HTMLElement;
  empty: HTMLElement;
  books: Book[];
  groups?: BookGroup[];
  allBooks?: Book[];
  finishDateByBookId?: Record<string, string>;
  onEstimatedFinishNavigate(dateKey: string): void;
  showBlockerMeta?: boolean;
  showShelfMeta?: boolean;
  showWordCount?: boolean;
  onEdit(bookId: string): void;
  onRemove(bookId: string): void;
}

export interface StatusGroupDefinition {
  label: string;
  statuses: string[];
}
