import test from 'node:test';
import assert from 'node:assert/strict';

import { runPlanGeneration } from '../dist/renderer/app/plan.js';

function dayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function tomorrowKey() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dayKey(tomorrow);
}

test('runPlanGeneration forces settings.start_date to tomorrow', async () => {
  const calls = [];

  await runPlanGeneration({
    plannerApi: {
      generate: async (payload) => {
        calls.push(payload);
        return { schedule: [], summary: null };
      },
    },
    collectBooks: () => [{ book_id: 'book-1', title: 'Book 1' }],
    collectSettings: () => ({
      start_date: '1999-01-01',
      end_date: '2099-01-01',
      minutes_per_day: 20,
    }),
    setStatus: () => {},
    addLog: () => {},
    announce: () => {},
    onSuccess: async () => {},
    successAnnouncement: '',
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].settings.start_date, tomorrowKey());
  assert.equal(calls[0].settings.end_date, '2099-01-01');
  assert.equal(calls[0].settings.minutes_per_day, 20);
});

test('runPlanGeneration clamps end_date to tomorrow when it is in the past', async () => {
  const calls = [];

  await runPlanGeneration({
    plannerApi: {
      generate: async (payload) => {
        calls.push(payload);
        return { schedule: [], summary: null };
      },
    },
    collectBooks: () => [{ book_id: 'book-1', title: 'Book 1' }],
    collectSettings: () => ({
      end_date: '1999-01-01',
    }),
    setStatus: () => {},
    addLog: () => {},
    announce: () => {},
    onSuccess: async () => {},
    successAnnouncement: '',
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].settings.start_date, tomorrowKey());
  assert.equal(calls[0].settings.end_date, tomorrowKey());
});
