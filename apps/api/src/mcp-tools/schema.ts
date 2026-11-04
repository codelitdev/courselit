import { z } from "zod";

/**
 * Rewrites a REST contract schema into one every MCP client accepts.
 *
 * ChatGPT refuses a whole tool list when any schema node has no `type` or a
 * type array, and the contract's schemas have both: opaque JSON fields
 * (`z.unknown()`, `z.record(z.unknown())`) and nullable primitives, which
 * zod-to-json-schema writes as `type: ["string", "null"]`. This rewrites them
 * as typed `anyOf` members instead.
 *
 * Refinements and transforms are dropped: the tool call goes through the REST
 * dispatcher, which validates the body against the original contract again.
 * A node this does not know is an error, so a new kind of schema cannot reach
 * a client unchecked.
 */

/** A schema node the converter would merge into a `type` array if left bare. */
const alwaysTrue = () => true;
const keepApart = <T extends z.ZodTypeAny>(schema: T) => schema.refine(alwaysTrue);

const anyObject = () => z.object({}).passthrough();

/** Any JSON value, as typed alternatives. */
function jsonValue(): z.ZodTypeAny {
  return z.union([
    keepApart(z.string()),
    keepApart(z.number()),
    keepApart(z.boolean()),
    keepApart(z.null()),
    anyObject(),
    z.array(anyObject()),
    z.array(keepApart(z.string())),
  ]);
}

const PRIMITIVES = [
  z.ZodString,
  z.ZodNumber,
  z.ZodBoolean,
  z.ZodNull,
  z.ZodLiteral,
  z.ZodEnum,
  z.ZodNativeEnum,
  z.ZodBigInt,
  z.ZodDate,
] as const;

function isPrimitive(node: z.ZodTypeAny): boolean {
  return PRIMITIVES.some((kind) => node instanceof kind);
}

export function forMcp(node: z.ZodTypeAny): z.ZodTypeAny {
  if (isPrimitive(node)) return node;
  if (node instanceof z.ZodUnknown || node instanceof z.ZodAny) return jsonValue();
  if (node instanceof z.ZodEffects) return forMcp(node._def.schema);
  if (node instanceof z.ZodOptional) return forMcp(node.unwrap()).optional();
  if (node instanceof z.ZodDefault) {
    return forMcp(node._def.innerType).default(node._def.defaultValue());
  }
  if (node instanceof z.ZodNullable) {
    const inner = forMcp(node.unwrap());
    return z.union([isPrimitive(inner) ? keepApart(inner) : inner, keepApart(z.null())]);
  }
  if (node instanceof z.ZodObject) {
    const shape = Object.fromEntries(
      Object.entries(node.shape as z.ZodRawShape).map(([key, value]) => [
        key,
        forMcp(value),
      ]),
    );
    const object = z.object(shape);
    const policy = node._def.unknownKeys;
    return policy === "passthrough"
      ? object.passthrough()
      : policy === "strict"
        ? object.strict()
        : object;
  }
  if (node instanceof z.ZodArray) {
    return new z.ZodArray({ ...node._def, type: forMcp(node._def.type) });
  }
  if (node instanceof z.ZodRecord) {
    const value = node._def.valueType as z.ZodTypeAny;
    if (value instanceof z.ZodUnknown || value instanceof z.ZodAny) return anyObject();
    return new z.ZodRecord({ ...node._def, valueType: forMcp(value) });
  }
  if (node instanceof z.ZodUnion) {
    const options = (node._def.options as z.ZodTypeAny[]).map((option) => {
      const next = forMcp(option);
      return isPrimitive(next) ? keepApart(next) : next;
    });
    return z.union(options as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
  }
  if (node instanceof z.ZodDiscriminatedUnion) {
    const options = [...(node._def.options as z.ZodObject<z.ZodRawShape>[])].map(
      (option) => forMcp(option) as z.ZodObject<z.ZodRawShape>,
    );
    return z.discriminatedUnion(
      node._def.discriminator,
      options as [z.ZodObject<z.ZodRawShape>, ...z.ZodObject<z.ZodRawShape>[]],
    );
  }
  throw new Error(`MCP schema: unsupported zod type ${node.constructor.name}`);
}
