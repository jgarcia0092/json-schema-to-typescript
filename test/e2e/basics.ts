export const input = {
  title: 'Example Schema',
  type: 'object',
  properties: {
    firstName: {
      type: 'string'
    },
    lastName: {
      id: 'lastName',
      type: 'string'
    },
    age: {
      description: 'Age in years',
      type: 'integer',
      minimum: 0
    },
    height: {
      type: 'number'
    },
    favoriteFoods: {
      type: 'array'
    },
    likesDogs: {
      type: 'boolean'
    }
  },
  required: ['firstName', 'lastName']
}

export const output = `/**
* This file was automatically generated by json-schema-to-typescript.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run json-schema-to-typescript to regenerate this file.
*/

export type LastName = string;

export interface ExampleSchema {
  firstName: string;
  lastName: LastName;
  /**
   * Age in years
   */
  age?: number;
  height?: number;
  favoriteFoods?: any[];
  likesDogs?: boolean;
  [k: string]: any;
}
`
