export const input = {
  "title": "Example Schema",
  "description": 'My cool schema',
  type: "object",
  properties: {
    users: {
      type: "array",
      title: "user id array",
      description: "Array of authorized user ids.",
      items: {
        type: 'string'
      }
    }
  }
}

// TODO: 2nd block comment should annotate UserIdArray, not users
export const output = `/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * Array of authorized user ids.
 */
export type UserIdArray = string[];

/**
 * My cool schema
 */
export interface ExampleSchema {
  users?: UserIdArray;
  [k: string]: any;
}
`
