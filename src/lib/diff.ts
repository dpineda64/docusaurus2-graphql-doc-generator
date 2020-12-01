import * as crypto from "crypto";
import { promises as fs } from "fs";
import * as path from "path";

import { Change, diff } from "@graphql-inspector/core";

import { loadSchema, GraphQLFileLoader, printSchema } from "./graphql";
import { GraphQLSchema } from "graphql";

const SCHEMA_HASH_FILE = ".schema";
const SCHEMA_REF = "schema.graphql";
const COMPARE_METHODS = {
  COMPARE_WITH_SCHEMA_DIFF: "SCHEMA-DIFF",
  COMPARE_WITH_SCHEMA_HASH: "SCHEMA-HASH",
};

export function getSchemaHash(schema: GraphQLSchema): string {
  const printedSchema = printSchema(schema, { commentDescriptions: true });
  const sum = crypto.createHash("sha256");
  sum.update(printedSchema);
  return sum.digest("hex");
}

export async function getDiff(
  schemaNew: GraphQLSchema,
  schemaOld: string
): Promise<Change[]> {
  const schemaRef = await loadSchema(schemaOld, {
    loaders: [new GraphQLFileLoader()],
  });
  return diff(schemaRef, schemaNew);
}

export async function checkSchemaChanges(
  schema: GraphQLSchema,
  outputDir: string,
  method = COMPARE_METHODS.COMPARE_WITH_SCHEMA_DIFF
): Promise<boolean> {
  const hashFile = path.join(outputDir, SCHEMA_HASH_FILE);
  const hashSchema = getSchemaHash(schema);
  let hasDiff = true;
  const schemaRef = path.join(outputDir, SCHEMA_REF);

  const fileExists = async (file: string): Promise<boolean> =>
    await fs
      .stat(file)
      .then(() => true)
      .catch(() => false);

  if (method === COMPARE_METHODS.COMPARE_WITH_SCHEMA_DIFF) {
    if (await fileExists(schemaRef)) {
      const diff = await getDiff(schema, schemaRef);
      hasDiff = diff.length > 0;
    }
  }

  if (method === COMPARE_METHODS.COMPARE_WITH_SCHEMA_HASH) {
    if (await fileExists(hashFile)) {
      const hash = await fs.readFile(hashFile, "utf-8");
      hasDiff = hashSchema != hash;
    }
  }
  return hasDiff;
}

export async function saveSchemaFile(
  schema: GraphQLSchema,
  outputDir: string
): Promise<void> {
  const schemaFile = path.join(outputDir, SCHEMA_REF);
  const schemaPrint = printSchema(schema);
  await fs.writeFile(schemaFile, schemaPrint);
}

export async function saveSchemaHash(
  schema: GraphQLSchema,
  outputDir: string
): Promise<void> {
  const hashFile = path.join(outputDir, SCHEMA_HASH_FILE);
  const hashSchema = getSchemaHash(schema);
  await fs.writeFile(hashFile, hashSchema);
}
