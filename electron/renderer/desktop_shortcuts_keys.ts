export function isCommandPressed(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey;
}

export function isZoomInShortcut(event: KeyboardEvent): boolean {
  return event.key === '+' || event.key === '=' || event.code === 'NumpadAdd';
}

export function isZoomOutShortcut(event: KeyboardEvent): boolean {
  return event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract';
}

export function isZoomResetShortcut(event: KeyboardEvent): boolean {
  return event.key === '0';
}
