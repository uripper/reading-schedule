// @ts-nocheck

export function handleLookupKeydown(event, currentItems, activeIndex, setActiveIndex, selectItem, clearResults, searchInput) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (!currentItems.length) {
      return;
    }
    if (activeIndex < 0) {
      setActiveIndex(0);
    } else {
      setActiveIndex(activeIndex + 1);
    }
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (!currentItems.length) {
      return;
    }
    if (activeIndex < 0) {
      setActiveIndex(currentItems.length - 1);
    } else {
      setActiveIndex(activeIndex - 1);
    }
    return;
  }

  if (event.key === "Enter") {
    if (activeIndex < 0 || !currentItems.length) {
      return;
    }
    event.preventDefault();
    selectItem(activeIndex);
    return;
  }

  if (event.key === "Escape") {
    clearResults();
    searchInput.blur();
  }
}
