export const input = {
  title: 'Schema with Subschema',
  properties: {
    firstName: {
      type: 'string'
    },
    friend: {
      properties: {
        knowsFrom: {
          enum: ['work', 'school', 'other']
        }
      },
      required: ['knowsFrom']
    },
    coworker: {
      properties: {
        company: {
          properties: {
            name: {
              type: 'string'
            }
          },
          required: ['name'],
          additionalProperties: false
        }
      },
      additionalProperties: {
        enum: [10, 20, 30],
        tsEnumNames: ['red', 'green', 'blue']
      }
    }
  },
  required: ['firstName']
}

export const output = `/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export interface SchemaWithSubschema {
  firstName: string;
  friend?: {
    knowsFrom: "work" | "school" | "other";
    [k: string]: any;
  };
  coworker?: {
    company?: {
      name: string;
    };
    [k: string]: KString;
  };
  [k: string]: any;
}

export const enum KString {
  red = 10,
  green = 20,
  blue = 30
}
`
