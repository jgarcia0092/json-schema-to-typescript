import { JSONSchema4Type } from 'json-schema'
import { isPlainObject } from 'lodash'
import { JSONSchema, SCHEMA_TYPE } from './types/JSONSchema'

/**
 * Duck types a JSONSchema schema or property to determine which kind of AST node to parse it into.
 */
export function typeOfSchema(schema: JSONSchema | JSONSchema4Type): SCHEMA_TYPE {
  if (!isSchema(schema)) return 'LITERAL'
  if (schema.allOf) return 'ALL_OF'
  if (schema.anyOf) return 'ANY_OF'
  if (schema.items) return 'TYPED_ARRAY'
  if (schema.enum && schema.tsEnumNames) return 'NAMED_ENUM'
  if (schema.enum) return 'UNNAMED_ENUM'
  if (schema.$ref) return 'REFERENCE'
  if (schema.id) return 'NAMED_SCHEMA'
  if (Array.isArray(schema.type)) return 'UNION'
  switch (schema.type) {
    case 'string': return 'STRING'
    case 'number': return 'NUMBER'
    case 'integer': return 'NUMBER'
    case 'boolean': return 'BOOLEAN'
    case 'object': return 'OBJECT' // TODO: is this ok?
    case 'array': return 'UNTYPED_ARRAY'
    case 'null': return 'NULL'
    case 'any': return 'ANY'
  }
  if (isPlainObject(schema)) return 'UNNAMED_SCHEMA'
  return 'ANY'
}

function isSchema(schema: JSONSchema | JSONSchema4Type): schema is JSONSchema {
  return isPlainObject(schema)
}
