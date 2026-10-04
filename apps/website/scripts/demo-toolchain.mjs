import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { env as ProcessEnvironment } from "node:process";

const WASM_TARGET = "wasm32-unknown-unknown";
const DOWNLOAD_TIMEOUT_MS = 60_000;
const EXECUTABLE_MODE = 0o755;
const RUSTUP_URL = "https://sh.rustup.rs";
const BINDGEN_RELEASE_URL =
    "https://github.com/wasm-bindgen/wasm-bindgen/releases/download";
const LINUX_TARGETS = {
    arm64: "aarch64-unknown-linux-musl",
    x64: "x86_64-unknown-linux-musl",
};

export function runTool(command, args, env = ProcessEnvironment) {
    const RESULT = spawnSync(command, args, { env, stdio: "inherit" });
    if (RESULT.error) {
        throw new Error(`Unable to run ${command}: ${RESULT.error.message}`, {
            cause: RESULT.error,
        });
    }
    if (RESULT.status !== 0) {
        throw new Error(`${command} failed with status ${RESULT.status}.`);
    }
}

function toolVersion(command, env) {
    const RESULT = spawnSync(command, ["--version"], {
        encoding: "utf8",
        env,
    });
    if (RESULT.error?.code === "ENOENT") {
        return null;
    }
    if (RESULT.error || RESULT.status !== 0) {
        throw new Error(`Unable to check ${command}: ${RESULT.stderr}`, {
            cause: RESULT.error,
        });
    }
    return RESULT.stdout.trim();
}

function bindgenVersion(plannerRoot) {
    const MANIFEST = fs.readFileSync(
        path.join(plannerRoot, "Cargo.toml"),
        "utf8",
    );
    const MATCH = /^wasm-bindgen\s*=\s*"=(\d+\.\d+\.\d+)"\s*$/mu.exec(MANIFEST);
    if (!MATCH) {
        throw new Error("Pin wasm-bindgen to an exact version in Cargo.toml.");
    }
    return MATCH[1];
}

async function downloadFile(url, destination) {
    const RESPONSE = await fetch(url, {
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!RESPONSE.ok) {
        throw new Error(`Tool download failed: ${RESPONSE.status} ${url}`);
    }
    fs.writeFileSync(destination, Buffer.from(await RESPONSE.arrayBuffer()));
}

async function installRust(env) {
    const TEMP = fs.mkdtempSync(path.join(tmpdir(), "bartleby-rustup-"));
    const INSTALLER = path.join(TEMP, "rustup-init.sh");
    try {
        await downloadFile(RUSTUP_URL, INSTALLER);
        runTool(
            "sh",
            [
                INSTALLER,
                "-y",
                "--profile",
                "minimal",
                "--default-toolchain",
                "stable",
                "--target",
                WASM_TARGET,
                "--no-modify-path",
            ],
            env,
        );
    } finally {
        fs.rmSync(TEMP, { force: true, recursive: true });
    }
}

function bindgenArtifact(version) {
    const TARGET = LINUX_TARGETS[process.arch];
    if (process.platform !== "linux" || !TARGET) {
        throw new Error("Cloudflare tool setup requires Linux x64 or arm64.");
    }
    return `wasm-bindgen-${version}-${TARGET}`;
}

async function verifiedArchive(version, artifact, directory) {
    const URL = `${BINDGEN_RELEASE_URL}/${version}/${artifact}.tar.gz`;
    const ARCHIVE = path.join(directory, "wasm-bindgen.tar.gz");
    const CHECKSUM = `${ARCHIVE}.sha256sum`;
    await downloadFile(URL, ARCHIVE);
    await downloadFile(`${URL}.sha256sum`, CHECKSUM);
    const EXPECTED = /^[a-f\d]{64}/iu.exec(fs.readFileSync(CHECKSUM, "utf8"));
    const ACTUAL = createHash("sha256")
        .update(fs.readFileSync(ARCHIVE))
        .digest("hex");
    if (ACTUAL !== EXPECTED?.[0].toLowerCase()) {
        throw new Error(
            "The wasm-bindgen download failed checksum verification.",
        );
    }
    return ARCHIVE;
}

async function installBindgen(version, toolsBin, env) {
    const ARTIFACT = bindgenArtifact(version);
    const TEMP = fs.mkdtempSync(path.join(tmpdir(), "bartleby-bindgen-"));
    try {
        const ARCHIVE = await verifiedArchive(version, ARTIFACT, TEMP);
        runTool(
            "tar",
            ["-xzf", ARCHIVE, "-C", TEMP, `${ARTIFACT}/wasm-bindgen`],
            env,
        );
        fs.mkdirSync(toolsBin, { recursive: true });
        const BINARY = path.join(toolsBin, "wasm-bindgen");
        fs.copyFileSync(path.join(TEMP, ARTIFACT, "wasm-bindgen"), BINARY);
        fs.chmodSync(BINARY, EXECUTABLE_MODE);
    } finally {
        fs.rmSync(TEMP, { force: true, recursive: true });
    }
}

function toolEnvironment(toolsBin, env) {
    const CARGO_HOME = env.CARGO_HOME ?? path.join(homedir(), ".cargo");
    const ENV = { ...env };
    ENV.CARGO_HOME = CARGO_HOME;
    ENV.PATH = [toolsBin, path.join(CARGO_HOME, "bin"), env.PATH ?? ""].join(
        path.delimiter,
    );
    return ENV;
}

async function prepareCloudflareTools(version, toolsBin, env) {
    if (toolVersion("rustup", env) === null) {
        await installRust(env);
    }
    runTool("rustup", ["target", "add", WASM_TARGET], env);
    if (toolVersion("wasm-bindgen", env) !== `wasm-bindgen ${version}`) {
        await installBindgen(version, toolsBin, env);
    }
}

export async function prepareDemoToolchain(
    plannerRoot,
    env = ProcessEnvironment,
) {
    const VERSION = bindgenVersion(plannerRoot);
    const TOOLS_BIN = path.join(plannerRoot, "target", "demo-tools", "bin");
    const ENV = toolEnvironment(TOOLS_BIN, env);
    if (ENV.CF_PAGES === "1") {
        await prepareCloudflareTools(VERSION, TOOLS_BIN, ENV);
    }
    if (toolVersion("cargo", ENV) === null) {
        throw new Error(
            `Install Rust with rustup and run: rustup target add ${WASM_TARGET}`,
        );
    }
    if (toolVersion("wasm-bindgen", ENV) !== `wasm-bindgen ${VERSION}`) {
        throw new Error(
            `Install the matching CLI: cargo install wasm-bindgen-cli --version ${VERSION} --locked`,
        );
    }
    return ENV;
}
