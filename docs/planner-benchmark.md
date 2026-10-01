# Measuring the Rust greedy planner

Run this from the repository root:

```sh
pnpm run bench:planner
```

This builds an optimized Rust executable and runs the **production** input parser,
greedy planner, and report builder. It does not open the desktop app, use the
network, or read or write your book library. Compilation is outside the timers.
The first build may take a while; measurements appear once compilation finishes.

The default plan runs from January 1, 2026 through December 31, 2035, inclusive,
including leap days. Every day has 1,440 available reading minutes, with
15-minute blocks and a base speed of 250 words per minute. Daily book, session,
and per-book block limits allow the entire day to be used. Individual generated
books can restrict their weekdays or daily minutes. Smaller inputs can finish
before the end of the horizon, just as they do in the application.

The benchmark starts with 100 input books and doubles the count until a
**completed greedy run takes more than ten seconds**. It runs each count up to
three times and reports the slowest measurement. After any run exceeds ten
seconds, it skips further repetitions at that count. It then measures additional
counts between the last observed result below one second and the first result
at or above one second, stopping when the gap is within 5% or one book. This is
a measured range, not a guarantee of an exact maximum: timings can vary with
machine load, seed, and compiler settings. The ten-second threshold stops input
growth; it is not a timeout that interrupts the planner.

The table shows:

| Column | Meaning |
| --- | --- |
| Input books | Generated books given to the planner |
| Assigned | Distinct books given at least one reading session |
| Finished | Books with all remaining words assigned |
| Sessions | Book/date reading sessions in the actual report |
| Runs | Completed measurements for that count |
| Greedy | Slowest time in the production greedy solve step |
| Whole plan | Slowest time for parsing, solving, and building the report together |
| Greedy time bar | One `#` per half-second, up to ten seconds |

The final report includes the largest **tested input** below one second, the
actual assignment counts for that input, and separate parsing and report times.
Each time is the slowest observed for that step, so separate step times need not
sum to the displayed whole-plan time. Random data generation, input cloning,
result counting, terminal output, warm-up, and result destruction are excluded.
This measures in-memory planning, excluding Tauri transport, storage, and UI.
The calendar can fill before every supplied book receives a session. Always
compare the assigned and finished columns as well as the input count.

## Random books

The fixed default seed is 42. Larger counts extend the same sequence, so repeated
runs with the same seed and horizon use identical books. Titles and authors are
random hex strings. Authors are generated metadata; the current planner
does not use them for scheduling. Books have 20–1,200 pages, 200–500 words per
page, priorities 1–5, difficulties 1–10, and progress up to 90%. Progress rotates
through words read, pages read, percentage read, and explicit remaining words.
Page and word counts stay consistent, and every book has words left to read.

Books vary their nonempty weekday sets and minimum session lengths. Some have
deadlines within the horizon, daily reading limits, or dependencies on earlier
books. Dependencies always refer to existing books and cannot form cycles. This
is one varied workload, rather than a claim about every possible library.

## Options

```sh
pnpm run bench:planner --help
pnpm run bench:planner --years 1 --seed 123
pnpm run bench:planner --start-books 1000 --samples 1
pnpm run bench:planner --max-books 1000
```

`--years` accepts 1–10; `--samples` accepts 1–10. Book counts must be positive;
`--max-books` must be at least `--start-books`. A maximum count makes short runs
possible and is clearly reported if reached before a run exceeds ten seconds.
There is no default maximum book count. Allocation failures produce an error;
use `--max-books` to control memory use on smaller machines.

The equivalent Cargo command is:

```sh
cargo run --release --locked \
  --manifest-path apps/bartleby/src-tauri/Cargo.toml \
  --bin planner_benchmark -- --years 10 --seed 42
```

To compare algorithm changes, run on the same machine with the same options and
a quiet workload. Keep the full terminal output so both time and actual work
can be compared. The new benchmark regression tests run with `pnpm run test:desktop`.
