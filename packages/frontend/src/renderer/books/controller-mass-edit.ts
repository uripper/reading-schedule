import type { Book, BookDialogController } from "../../types/types.ts";
import type { MassEditController } from "./mass-edit-controller.ts";
import { createMassEditController } from "./mass-edit-controller.ts";

interface BindControllerMassEditArgs {
    findBook(bookId: string): Book | null;
    getDialog(): BookDialogController | null;
    rerender(): void;
    toolbar: HTMLElement;
}

function openEditDialog(
    args: BindControllerMassEditArgs,
    bookId: string,
    navigationBookIds: string[],
): void {
    const BOOK = args.findBook(bookId);
    const DIALOG = args.getDialog();
    if (BOOK === null || DIALOG === null) {
        return;
    }
    DIALOG.open(BOOK, { navigationBookIds });
}

function openBulkEditDialog(
    args: BindControllerMassEditArgs,
    bookIds: string[],
): void {
    const DIALOG = args.getDialog();
    if (DIALOG === null) {
        return;
    }
    DIALOG.open(null, { bulkBookIds: bookIds, mode: "bulk" });
}

export function bindControllerMassEdit(
    args: BindControllerMassEditArgs,
): MassEditController {
    return createMassEditController({
        onBulkEdit(bookIds): void {
            openBulkEditDialog(args, bookIds);
        },
        onSingleEdit(bookId, navigationBookIds): void {
            openEditDialog(args, bookId, navigationBookIds);
        },
        rerender: args.rerender,
        toolbar: args.toolbar,
    });
}
