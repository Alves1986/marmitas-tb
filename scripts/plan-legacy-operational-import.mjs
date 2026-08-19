import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { planLegacyOperationalImport } from "./lib/legacyOperationalImport.ts";

const snapshotPath = process.env.LEGACY_SNAPSHOT_PATH;

if (!snapshotPath) {
  throw new Error("LEGACY_SNAPSHOT_PATH é obrigatório para simular a importação legada.");
}

const snapshotBytes = await readFile(snapshotPath);
const snapshot = JSON.parse(snapshotBytes.toString("utf8"));
const plan = planLegacyOperationalImport(snapshot, { legacyMaps: [] });

process.stdout.write(`${JSON.stringify({
  mode: plan.mode,
  snapshotSha256: createHash("sha256").update(snapshotBytes).digest("hex"),
  summary: plan.summary,
  conflictCount: plan.conflicts.length,
  unresolvedReferenceCount: plan.unresolvedReferences.length,
}, null, 2)}\n`);
