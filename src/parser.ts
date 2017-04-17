import { whiteBright } from 'cli-color'
import { JSONSchema4TypeName } from 'json-schema'
import { map } from 'lodash'
import { typeOfSchema } from './typeOfSchema'
import { AST, ASTWithName, T_ANY, T_ANY_ADDITIONAL_PROPERTIES } from './types/AST'
import { JSONSchema, NormalizedJSONSchema, SchemaSchema } from './types/JSONSchema'
import { log } from './utils'

export function parse(
  schema: JSONSchema,
  name?: string,
  rootSchema: JSONSchema = schema,
  isRequired = false,
  processed = new Map<JSONSchema, AST>()
): AST {
  log(whiteBright.bgBlue('parser'), schema, '<-' + typeOfSchema(schema), processed.has(schema) ? '(CACHED)' : '')
  if (processed.has(schema)) {
    return processed.get(schema)!
  }
  const ast = parseSchema(schema, name, rootSchema, isRequired, processed)
  processed.set(schema, ast)
  return ast
}

function parseSchema(
  schema: JSONSchema,
  name: string | undefined,
  rootSchema: JSONSchema,
  isRequired: boolean,
  processed: Map<JSONSchema, AST>
): AST {
  switch (typeOfSchema(schema)) {
    case 'ALL_OF':
      // TODO: support schema.properties
      return {
        comment: schema.description,
        isRequired,
        name,
        get params() { return schema.allOf!.map(_ => parse(_, undefined, rootSchema, undefined, processed)) },
        standaloneName: schema.title,
        type: 'INTERSECTION'
      }
    case 'ANY':
      return { comment: schema.description, name, isRequired, standaloneName: schema.title, type: 'ANY' }
    case 'ANY_OF':
      return {
        comment: schema.description,
        isRequired,
        name,
        get params() { return schema.anyOf!.map(_ => parse(_, undefined, rootSchema, undefined, processed)) },
        standaloneName: schema.title,
        type: 'UNION'
      }
    case 'BOOLEAN':
      return { comment: schema.description, name, isRequired, standaloneName: schema.title, type: 'BOOLEAN' }
    case 'LITERAL':
      return { isRequired, name, params: schema, type: 'LITERAL' }
    case 'NAMED_ENUM':
      return {
        comment: schema.description,
        isRequired,
        name,
        get params() { return schema.enum!.map((_, n) => parse(_, schema.tsEnumNames![n], rootSchema, undefined, processed) as ASTWithName) },
        standaloneName: name!,
        type: 'ENUM'
      }
    case 'NAMED_SCHEMA':
      return {
        comment: schema.description,
        isRequired,
        name,
        get params() { return parseSchemaSchema(schema as SchemaSchema, rootSchema, processed) },
        standaloneName: computeSchemaName(schema as SchemaSchema, name),
        type: 'INTERFACE'
      }
    case 'NULL':
      return { comment: schema.description, name, isRequired, standaloneName: schema.title, type: 'NULL' }
    case 'NUMBER':
      return { comment: schema.description, name, isRequired, standaloneName: schema.title, type: 'NUMBER' }
    case 'OBJECT':
      return { comment: schema.description, name, isRequired, standaloneName: schema.title, type: 'OBJECT' }
    case 'REFERENCE':
      return parse(resolveReference(schema.$ref as string, rootSchema), '', schema, undefined, processed)
    case 'STRING':
      return { comment: schema.description, name, isRequired, standaloneName: schema.title, type: 'STRING' }
    case 'TYPED_ARRAY':
      if (Array.isArray(schema.items)) {
        return {
          comment: schema.description,
          name,
          isRequired,
          get params() { return schema.items.map(_ => parse(_, undefined, rootSchema, undefined, processed)) },
          standaloneName: schema.title,
          type: 'TUPLE'
        }
      } else {
        return {
          comment: schema.description,
          name,
          isRequired,
          get params() { return parse(schema.items!, undefined, rootSchema, undefined, processed) },
          standaloneName: schema.title,
          type: 'ARRAY'
        }
      }
    case 'UNION':
      return {
        comment: schema.description,
        name,
        isRequired,
        get params() { return (schema.type as JSONSchema4TypeName[]).map(_ => parse({ required: [], type: _ }, undefined, rootSchema, undefined, processed)) },
        standaloneName: schema.title,
        type: 'UNION'
      }
    case 'UNNAMED_ENUM':
      return {
        comment: schema.description,
        isRequired,
        name,
        get params() { return schema.enum!.map(_ => parse(_, undefined, rootSchema, undefined, processed)) },
        standaloneName: schema.title,
        type: 'UNION'
      }
    case 'UNNAMED_SCHEMA':
      return {
        comment: schema.description,
        isRequired,
        name,
        get params() { return parseSchemaSchema(schema as SchemaSchema, rootSchema, processed) },
        standaloneName: computeSchemaName(schema as SchemaSchema, name),
        type: 'INTERFACE'
      }
    case 'UNTYPED_ARRAY':
      return {
        comment: schema.description,
        name,
        isRequired,
        params: T_ANY,
        standaloneName: schema.title,
        type: 'ARRAY'
      }
  }
}

/**
 * Compute a schema name using a series of fallbacks
 */
function computeSchemaName(
  schema: SchemaSchema,
  name?: string // name from schema's filename
): string {
  return schema.title || schema.id || name || 'Interface1' // TODO: increment interface number
}

/**
 * Helper to parse schema properties into params on the parent schema's type
 */
function parseSchemaSchema(
  schema: SchemaSchema,
  rootSchema: JSONSchema,
  processed: Map<JSONSchema, AST>
): ASTWithName[] {
  const asts = map(schema.properties, (value, key) =>
    parse(value, key, rootSchema, (schema.required || []).includes(key!), processed) as ASTWithName
  )
  // handle additionalProperties
  switch (schema.additionalProperties) {
    case undefined:
    case true:
      return asts.concat(T_ANY_ADDITIONAL_PROPERTIES)

    case false:
      return asts

    // pass "true" as the last param because in TS, properties
    // defined via index signatures are already optional
    default:
      return asts.concat(parse(schema.additionalProperties, '[k: string]', rootSchema, true, processed) as ASTWithName)
  }
}

function resolveReference(
  $ref: string,
  rootSchema: JSONSchema
  // definitions: Map<string, TEnum | TInterface>,
  // context: AST[]
): JSONSchema {
  log('resolveReference', $ref)
  const [schemaId, path] = $ref.split('#')
  const schema = schemaId === rootSchema.id
    ? rootSchema
    : resolveSchema(schemaId)

  console.log('schema', schema)
  return resolvePath(schema, path.split('/').slice(1))
}

function resolvePath(schema: NormalizedJSONSchema, path: string[]): NormalizedJSONSchema {
  switch (path.length) {
    case 0: return schema
    default:

      // TODO: move to validator
      if (!(path[0] in schema)) {
        throw new ReferenceError(`Referenced path "${path.join('/')}" does not exist in schema`)
      }

      return resolvePath(schema[path[0]], path.slice(1))
  }
}

// TODO
// TODO: use BigstickCarpet/json-schema-ref-parser
// function resolveSchema(schemaId: string): Promise<JSONSchema> {
//   if (schemaId.startsWith('http://') || schemaId.startsWith('https://')) {
//     throw new ReferenceError(`Error resolving schema "${schemaId}" - HTTP schemas are not yet supported!`)
//   }

//   if (schemaId) {
//     throw new ReferenceError(`Error resolving schema "${schemaId}" - external file schemas are not yet supported!`)
//   }
// }

// function resolveExistingReference(
//   $ref: string,
//   definitions: Map<string, TEnum | TInterface>
// ): JSONSchema {
//   // definitions.
// }
