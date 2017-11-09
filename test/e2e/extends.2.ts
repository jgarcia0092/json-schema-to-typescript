export const input = {
  "title": "Extends",
  'type': "object",
  "extends": [
    {
      "$ref": "test/resources/BaseType.1.json"
    },
    {
      "$ref": "test/resources/BaseType.2.json"
    }
  ],
  properties: {
    "foo": {
      "type": "string"
    }
  },
  required: ["foo"],
  additionalProperties: false
}

export const outputs = [
  {
    options: {
      declareExternallyReferenced: true
    },
    output: `/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export interface Extends extends Base1, Base2 {
  foo: string;
}
export interface Base1 {
  firstName: string;
  lastName: string;
}
export interface Base2 {
  age: number;
}
`
  },
  {
    options: {
      declareExternallyReferenced: false
    },
    output: `/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export interface Extends extends Base1, Base2 {
  foo: string;
}
`
  }
]
