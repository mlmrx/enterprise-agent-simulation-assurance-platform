#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { createClient, EasapError } from "../src/client.mjs";

const HELP = `EASAP — executable assurance for enterprise agents

Usage
  npx easap                         Run a hosted STANDARD-reference campaign
  npx easap demo [--trials 12]     Run the campaign and save evidence
  npx easap check <https-url>      Guide an authorized public-agent probe
  npx easap init [directory]       Create a readiness input template
  npx easap assess <input.json>    Generate a deterministic readiness plan
  npx easap doctor                 Check the configured EASAP service

Developer options
  --base-url <url>                 Override https://easap.dev
  --out <file>                     Evidence output path
  --json                           Print machine-readable output

Public-agent check options
  --name <name>                    Agent name (required)
  --protocol <json_message|openai_chat>
  --model <id>                     Model/agent identifier for openai_chat
  --authorized                     Attest ownership and a safe read-only target
  --wait <seconds>                 Poll ownership verification (default: 300)

The hosted connector rejects private networks, credentials, redirects, arbitrary
headers, and unverified targets. Use a self-hosted EASAP deployment for private or
authenticated agents. Passing a reference campaign is not production certification.
`;

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      index += 1;
    } else {
      flags[key] = true;
    }
  }
  return { positional, flags };
}

function integer(value, fallback, minimum, maximum, label) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new EasapError(`${label} must be an integer from ${minimum} to ${maximum}.`);
  }
  return parsed;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/gu, "-");
}

async function saveJson(path, payload) {
  const absolute = resolve(path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return absolute;
}

function line(label, value) {
  process.stdout.write(`${label.padEnd(18)} ${value}\n`);
}

function printDemo(payload, outputPath) {
  const result = payload.data;
  const expiresAt = result.certificate?.payload?.expiresAt;
  const certificateStatus = expiresAt && Date.parse(expiresAt) <= Date.now() ? "expired reference fixture" : "reference fixture";
  process.stdout.write("\nEASAP STANDARD-reference campaign\n\n");
  line("Decision", result.decision?.posture || "UNKNOWN");
  line("Trials", result.summary?.trials ?? "—");
  line("Passed", result.summary?.passed ?? "—");
  line("Findings", result.summary?.findings ?? "—");
  line("Evidence integrity", result.evidence?.verified === true ? "verified" : "not verified");
  line("Certificate", certificateStatus);
  line("Run ID", result.run_id || "—");
  line("Saved", outputPath);
  process.stdout.write("\nBoundary: STANDARD synthetic isolation and a reference signing key; this is not production certification.\n");
}

async function init(directory) {
  const outputPath = resolve(directory || ".", "easap-readiness-input.json");
  const input = {
    agentName: "Customer Resolution Agent",
    description: "Resolves account issues, updates customer records, and sends customer communications.",
    useCase: "customer_service",
    deploymentStage: "pilot",
    autonomy: "approval_required",
    exposure: "customer_facing",
    volume: "operational",
    dataClasses: ["internal", "confidential"],
    capabilities: ["read_records", "write_records", "external_communications"],
    safeguards: ["least_privilege", "human_approval", "audit_logging"],
  };
  await saveJson(outputPath, input);
  process.stdout.write(`Created ${outputPath}\nNext: npx easap assess "${outputPath}"\n`);
}

async function demo(client, flags) {
  const trialCount = integer(flags.trials, 12, 4, 24, "--trials");
  const payload = await client.runDemo({ trialCount });
  const outputPath = await saveJson(flags.out || `easap-evidence-${stamp()}.json`, payload);
  if (flags.json) process.stdout.write(`${JSON.stringify({ ...payload, savedTo: outputPath }, null, 2)}\n`);
  else printDemo(payload, outputPath);
}

async function assess(client, inputPath, flags) {
  if (!inputPath) throw new EasapError("Provide a readiness input JSON file.");
  const input = JSON.parse(await readFile(resolve(inputPath), "utf8"));
  const payload = await client.assessReadiness(input);
  const outputPath = await saveJson(flags.out || `easap-readiness-${stamp()}.json`, payload);
  if (flags.json) process.stdout.write(`${JSON.stringify({ ...payload, savedTo: outputPath }, null, 2)}\n`);
  else {
    process.stdout.write("\nEASAP readiness plan\n\n");
    line("Risk", `${payload.data.risk.tier} (${payload.data.risk.score}/100)`);
    line("Profile", payload.data.risk.profile);
    line("Status", payload.data.readiness.status);
    line("Saved", outputPath);
    process.stdout.write("\nBoundary: this plan is deterministic planning output, not a production approval.\n");
  }
}

async function check(client, endpointUrl, flags) {
  if (!endpointUrl) throw new EasapError("Provide the authorized public HTTPS agent endpoint.");
  if (typeof flags.name !== "string") throw new EasapError("--name is required for a public-agent check.");
  if (flags.authorized !== true) {
    throw new EasapError("Pass --authorized only after confirming you control the endpoint and the read-only probes are safe.");
  }
  const protocol = flags.protocol || "json_message";
  if (!new Set(["json_message", "openai_chat"]).has(protocol)) {
    throw new EasapError("--protocol must be json_message or openai_chat.");
  }
  const registration = await client.registerTarget({
    agentName: flags.name,
    endpointUrl,
    protocol,
    model: flags.model,
    authorized: true,
    safeTarget: true,
  });
  const waitSeconds = integer(flags.wait, 300, 0, 1_200, "--wait");
  process.stdout.write("\nOwnership challenge issued\n\n");
  line("Publish at", registration.verificationUrl);
  line("Exact content", registration.challenge);
  line("Expires", registration.expiresAt);
  if (waitSeconds === 0) {
    const outputPath = await saveJson(flags.out || `easap-registration-${stamp()}.json`, registration);
    line("Registration", outputPath);
    return;
  }
  process.stdout.write(`\nWaiting up to ${waitSeconds}s for the exact plain-text challenge…\n`);
  const deadline = Date.now() + waitSeconds * 1_000;
  let verification;
  let lastError;
  while (Date.now() <= deadline) {
    try {
      verification = await client.verifyTarget(registration.setupToken);
      break;
    } catch (error) {
      lastError = error;
      if (Date.now() + 5_000 > deadline) break;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000));
    }
  }
  if (!verification) {
    const outputPath = await saveJson(flags.out || `easap-registration-${stamp()}.json`, registration);
    throw new EasapError(`Ownership was not verified before the wait expired. Registration saved to ${outputPath}. ${lastError?.message || ""}`.trim());
  }
  process.stdout.write("Ownership verified. Running four bounded read-only probes…\n");
  const payload = await client.runProbe(verification.verifiedTargetToken);
  const outputPath = await saveJson(flags.out || `easap-public-probe-${stamp()}.json`, payload);
  if (flags.json) process.stdout.write(`${JSON.stringify({ ...payload, savedTo: outputPath }, null, 2)}\n`);
  else {
    process.stdout.write("\nEASAP public-agent probe\n\n");
    line("Overall", payload.overall);
    line("Checks", `${payload.summary.passed} pass · ${payload.summary.review} review · ${payload.summary.failed} fail`);
    line("Median latency", `${payload.summary.medianLatencyMs} ms`);
    line("Saved", outputPath);
    process.stdout.write("\nBoundary: four fixed black-box checks are evidence about observed responses, not a safety certification.\n");
  }
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const command = positional[0] || "demo";
  if (command === "help" || command === "--help" || flags.help) {
    process.stdout.write(HELP);
    return;
  }
  if (command === "version" || flags.version) {
    process.stdout.write("0.1.0\n");
    return;
  }
  const client = createClient({ baseUrl: flags["base-url"] });
  if (command === "demo") return demo(client, flags);
  if (command === "init") return init(positional[1]);
  if (command === "doctor") {
    const result = await client.doctor();
    if (flags.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    else {
      process.stdout.write("\nEASAP service check\n\n");
      line("Status", result.ok ? "reachable" : `HTTP ${result.status}`);
      line("Base URL", result.baseUrl);
      line("Latency", `${result.latencyMs} ms`);
      line("Boundary", result.boundary);
    }
    if (!result.ok) process.exitCode = 1;
    return;
  }
  if (command === "assess") return assess(client, positional[1], flags);
  if (command === "check") return check(client, positional[1], flags);
  throw new EasapError(`Unknown command: ${command}. Run npx easap help.`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`EASAP error: ${message}\n`);
  if (error instanceof SyntaxError) process.stderr.write("Check that the input file contains valid JSON.\n");
  process.exitCode = error instanceof EasapError && error.status ? 2 : 1;
});
