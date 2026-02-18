// @ts-nocheck
import { sortRowsByDateAndSession } from "./utils.js";

export function enrichRows(rows, totals = {}) {
  const progressByBookId = {};
  const sortedRows = sortRowsByDateAndSession(rows);
  return sortedRows.map((row) => {
    const plannedWords = Number(row.words_planned || 0);
    progressByBookId[row.book_id] = (progressByBookId[row.book_id] || 0) + plannedWords;
    const totalWords = Number(totals[row.book_id] || 0);
    const finishesBook = totalWords > 0 && progressByBookId[row.book_id] >= totalWords;
    return { ...row, finish: finishesBook };
  });
}

export function groupRowsByDate(rows = []) {
  return rows.reduce((accumulator, row) => {
    accumulator[row.date] ||= [];
    accumulator[row.date].push(row);
    return accumulator;
  }, {});
}

export function monthKeysFromRows(rows = []) {
  const monthKeySet = new Set(rows.map((row) => row.date.slice(0, 7)));
  return [...monthKeySet].sort();
}

export function firstPlannedRow(rows = []) {
  if (!Array.isArray(rows) || !rows.length) {
    return null;
  }
  const sortedRows = sortRowsByDateAndSession(rows);
  return sortedRows[0] || null;
}
