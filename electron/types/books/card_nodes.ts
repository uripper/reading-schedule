import type { CardNavigationActions } from "../../renderer/books/card_navigation_buttons.js";

export interface CardRenderContext extends CardNavigationActions {
  finishDateByBookId: Record<string, string>;
  showBlockerMeta: boolean;
  showShelfMeta: boolean;
  showWordCount: boolean;
  titleById: Record<string, string>;
}
