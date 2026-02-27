type FindDirection = "next" | "prev";

export interface FindBindingsArgs {
  closeFindBar(): void;
  findCloseButton: HTMLButtonElement;
  findInput: HTMLInputElement;
  findNextButton: HTMLButtonElement;
  findPrevButton: HTMLButtonElement;
  runFindCommand(direction: FindDirection, forceNextForSameQuery: boolean): Promise<void>;
}

const runDetached = (operation: Promise<void>): void => {
  operation.catch(() => {
    // Errors are handled and announced by the underlying command callbacks.
  });
};

export const bindFindEvents = (args: FindBindingsArgs): void => {
  args.findInput.addEventListener("input", () => {
    runDetached(args.runFindCommand("next", false));
  });
  args.findInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) {
        runDetached(args.runFindCommand("prev", true));
        return;
      }
      runDetached(args.runFindCommand("next", true));
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      args.closeFindBar();
    }
  });
  args.findPrevButton.addEventListener("click", () => {
    runDetached(args.runFindCommand("prev", true));
    args.findInput.focus();
  });
  args.findNextButton.addEventListener("click", () => {
    runDetached(args.runFindCommand("next", true));
    args.findInput.focus();
  });
  args.findCloseButton.addEventListener("click", () => {
    args.closeFindBar();
  });
};
