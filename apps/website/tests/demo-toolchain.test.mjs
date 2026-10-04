import assert from "node:assert/strict";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { prepareDemoToolchain, runTool } from "../scripts/demo-toolchain.mjs";

const BINDGEN_VERSION = "0.2.126";
const EXECUTABLE_MODE = 0o755;

function fixture(context) {
    const ROOT = fs.mkdtempSync(path.join(tmpdir(), "bartleby-tools-test-"));
    context.after(() => fs.rmSync(ROOT, { force: true, recursive: true }));
    const BIN = path.join(ROOT, "bin");
    fs.mkdirSync(BIN);
    fs.writeFileSync(
        path.join(ROOT, "Cargo.toml"),
        `wasm-bindgen = "=${BINDGEN_VERSION}"\n`,
    );
    const ENV = {};
    ENV.CARGO_HOME = path.join(ROOT, "cargo");
    ENV.PATH = BIN;
    return { bin: BIN, env: ENV, root: ROOT };
}

function fakeTool(bin, command, version) {
    const SOURCE = `#!${process.execPath}
if (process.argv[2] === '--version') {
    process.stdout.write(${JSON.stringify(version)});
    process.exit(0);
}
process.stdout.write(process.argv.slice(2).join(' '));
`;
    fs.writeFileSync(path.join(bin, command), SOURCE, {
        mode: EXECUTABLE_MODE,
    });
}

test("local builds report missing Rust without downloading or changing the environment", async (context) => {
    const FIXTURE = fixture(context);
    const ORIGINAL = { ...FIXTURE.env };
    await assert.rejects(
        prepareDemoToolchain(FIXTURE.root, FIXTURE.env),
        /Install Rust with rustup/u,
    );
    assert.deepEqual(FIXTURE.env, ORIGINAL);
    assert.equal(fs.existsSync(FIXTURE.env.CARGO_HOME), false);
});

test("a mismatched local CLI gives the exact matching install command", async (context) => {
    const FIXTURE = fixture(context);
    fakeTool(FIXTURE.bin, "cargo", "cargo 1.97.1");
    fakeTool(FIXTURE.bin, "wasm-bindgen", "wasm-bindgen 0.2.125");
    await assert.rejects(
        prepareDemoToolchain(FIXTURE.root, FIXTURE.env),
        /cargo install wasm-bindgen-cli --version 0\.2\.126 --locked/u,
    );
});

test("tools installed in CARGO_HOME are found without a shell profile", async (context) => {
    const FIXTURE = fixture(context);
    const CARGO_BIN = path.join(FIXTURE.env.CARGO_HOME, "bin");
    fs.mkdirSync(CARGO_BIN, { recursive: true });
    fakeTool(CARGO_BIN, "cargo", "cargo 1.97.1");
    fakeTool(CARGO_BIN, "wasm-bindgen", `wasm-bindgen ${BINDGEN_VERSION}`);
    const ENV = await prepareDemoToolchain(FIXTURE.root, FIXTURE.env);
    assert.ok(ENV.PATH.split(path.delimiter).includes(CARGO_BIN));
});

test("Cloudflare reuses installed tools and ensures the WebAssembly target", async (context) => {
    const FIXTURE = fixture(context);
    fakeTool(FIXTURE.bin, "cargo", "cargo 1.97.1");
    fakeTool(FIXTURE.bin, "wasm-bindgen", `wasm-bindgen ${BINDGEN_VERSION}`);
    const CALLS = path.join(FIXTURE.root, "rustup-calls.json");
    const SOURCE = `#!${process.execPath}
import fs from 'node:fs';
if (process.argv[2] === '--version') {
    process.stdout.write('rustup 1.29.0');
} else {
    fs.writeFileSync(${JSON.stringify(CALLS)}, JSON.stringify(process.argv.slice(2)));
}
`;
    fs.writeFileSync(path.join(FIXTURE.bin, "rustup"), SOURCE, {
        mode: EXECUTABLE_MODE,
    });
    FIXTURE.env.CF_PAGES = "1";
    await prepareDemoToolchain(FIXTURE.root, FIXTURE.env);
    assert.deepEqual(JSON.parse(fs.readFileSync(CALLS, "utf8")), [
        "target",
        "add",
        "wasm32-unknown-unknown",
    ]);
});

test("build failures stop the build instead of silently producing stale assets", (context) => {
    const FIXTURE = fixture(context);
    fs.writeFileSync(
        path.join(FIXTURE.bin, "cargo"),
        `#!${process.execPath}\nprocess.exit(1);\n`,
        { mode: EXECUTABLE_MODE },
    );
    assert.throws(
        () => runTool("cargo", ["build"], FIXTURE.env),
        /cargo failed with status 1/u,
    );
});

test("the CLI version must be pinned explicitly", async (context) => {
    const FIXTURE = fixture(context);
    fs.writeFileSync(
        path.join(FIXTURE.root, "Cargo.toml"),
        'wasm-bindgen = "0.2"\n',
    );
    await assert.rejects(
        prepareDemoToolchain(FIXTURE.root, FIXTURE.env),
        /Pin wasm-bindgen/u,
    );
});
