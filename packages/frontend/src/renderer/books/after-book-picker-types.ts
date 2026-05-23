import type {
    Book,
    BookFormRefs,
    GetBooks,
    PickerState,
} from "../../types/types.ts";

export interface CreateRefreshFilteredArgs {
    clearSelection: () => void;
    refs: BookFormRefs;
    render: () => void;
    state: PickerState;
}

export interface SelectBookArgs {
    clearResults: () => void;
    refs: BookFormRefs;
    render: () => void;
    state: PickerState;
}

export interface OpenForBookArgs {
    clearResults: () => void;
    refreshOptions: () => void;
    refs: BookFormRefs;
    render: () => void;
    state: PickerState;
}

export interface BindPickerEventsArgs {
    clearResults: () => void;
    refreshFiltered: (clearChangedSelection: boolean) => void;
    refs: BookFormRefs;
    render: () => void;
    selectBook: (book: Book | null | undefined) => void;
    state: PickerState;
}

export interface PickerActions {
    clearResults: () => void;
    openForBook: (book?: Book | null) => void;
    refreshFiltered: (clearChangedSelection: boolean) => void;
    render: () => void;
    selectBook: (book: Book | null | undefined) => void;
}

export interface PickerActionDeps {
    clearResults: () => void;
    clearSelection: () => void;
    getBooks: GetBooks;
    refs: BookFormRefs;
    render: () => void;
    state: PickerState;
}
