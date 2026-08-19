import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { plannedImprovementDocumentSchema } from "./schema";

export async function loadDemoProject() {
  const fixturePath = path.join(process.cwd(), "fixtures", "demo-project.yaml");
  const source = await readFile(fixturePath, "utf8");
  return parse(source) as { project: { name: string; shortName: string }; services: unknown[] };
}

export function validatePlannedImprovements(source: string) {
  return plannedImprovementDocumentSchema.parse(parse(source));
}
