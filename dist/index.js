"use strict";
const lodash_1 = require('lodash');
const fs_1 = require('fs');
const stream_1 = require('stream');
const pretty_printer_1 = require('./pretty-printer');
var RuleType;
(function (RuleType) {
    RuleType[RuleType["TypedArray"] = 0] = "TypedArray";
    RuleType[RuleType["Enum"] = 1] = "Enum";
    RuleType[RuleType["OneOf"] = 2] = "OneOf";
    RuleType[RuleType["Reference"] = 3] = "Reference";
    RuleType[RuleType["Schema"] = 4] = "Schema";
    RuleType[RuleType["String"] = 5] = "String";
    RuleType[RuleType["Number"] = 6] = "Number";
    RuleType[RuleType["Void"] = 7] = "Void";
    RuleType[RuleType["Object"] = 8] = "Object";
    RuleType[RuleType["Array"] = 9] = "Array";
    RuleType[RuleType["Boolean"] = 10] = "Boolean";
    RuleType[RuleType["Literal"] = 11] = "Literal";
})(RuleType || (RuleType = {}));
var TsType;
(function (TsType) {
    class Any {
        constructor() {
        }
        toString() {
            return 'any';
        }
    }
    TsType.Any = Any;
    class Array {
        constructor(type) {
            this.type = type;
        }
        toString() {
            return `${this.type ? this.type.toString() : (new TsType.Any()).toString()}[]`;
        }
    }
    TsType.Array = Array;
    class Boolean {
        constructor() {
        }
        toString() {
            return 'boolean';
        }
    }
    TsType.Boolean = Boolean;
    class Class {
        constructor(name) {
            this.name = name;
        }
        toString() {
            return this.name;
        }
    }
    TsType.Class = Class;
    class Literal {
        constructor(value) {
            this.value = value;
        }
        toString() {
            return `"${this.value}"`; // TODO: support Number, Boolean, Array, and Object literals
        }
    }
    TsType.Literal = Literal;
    class Number {
        constructor() {
        }
        toString() {
            return 'number';
        }
    }
    TsType.Number = Number;
    class Object {
        constructor() {
        }
        toString() {
            return 'Object';
        }
    }
    TsType.Object = Object;
    class String {
        constructor() {
        }
        toString() {
            return 'string';
        }
    }
    TsType.String = String;
    class Union {
        constructor(data) {
            this.data = data;
        }
        toString() {
            return this.data.join('|');
        }
    }
    TsType.Union = Union;
    class Void {
        constructor() {
        }
        toString() {
            return 'void';
        }
    }
    TsType.Void = Void;
})(TsType || (TsType = {}));
class Compiler {
    constructor(schema) {
        this.schema = schema;
        this.state = {
            interfaces: []
        };
    }
    isRequired(propertyName, schema) {
        return schema.required.indexOf(propertyName) > -1;
    }
    supportsAdditionalProperties(schema) {
        return !(schema.additionalProperties === false);
    }
    toInterfaceName(a) {
        return lodash_1.upperFirst(lodash_1.camelCase(a));
    }
    getRuleType(rule) {
        if (rule.type === 'array' && rule.items && rule.items.type) {
            return RuleType.TypedArray;
        }
        if (rule.enum) {
            return RuleType.Enum;
        }
        if (rule.properties) {
            return RuleType.Schema;
        }
        if (rule.oneOf) {
            return RuleType.OneOf;
        }
        if (rule.$ref) {
            return RuleType.Reference;
        }
        switch (rule.type) {
            case 'array': return RuleType.Array;
            case 'boolean': return RuleType.Boolean;
            case 'integer':
            case 'number': return RuleType.Number;
            case 'null': return RuleType.Void;
            case 'object': return RuleType.Object;
            case 'string': return RuleType.String;
        }
        return RuleType.Literal; // TODO: is it safe to do this as a catchall?
    }
    // eg. "#/definitions/diskDevice" => ["definitions", "diskDevice"]
    parsePath(path) {
        return (path.slice(0, 2) === '#/' ? path.slice(2) : path).split('/');
    }
    getReference(path, root) {
        switch (path.length) {
            case 0: throw ReferenceError(`$ref "#{path.join('/')}" points at invalid reference`);
            case 1: return root[path[0]];
            default: return this.getReference(path.slice(1), root[path[0]]);
        }
    }
    getInterface(name) {
        return this.state.interfaces.find(_ => _.name === this.toInterfaceName(name));
    }
    toTsType(rule, root, name) {
        let def, path;
        switch (this.getRuleType(rule)) {
            case RuleType.Schema:
                def = this.getInterface(name);
                if (def) {
                    return new TsType.Class(def.name);
                }
                else {
                    def = this.generateInterface(rule, name);
                    this.state.interfaces.push(def);
                    return new TsType.Class(def.name);
                }
            case RuleType.Enum: return new TsType.Union(rule.enum.map(_ => this.toTsType(_, root)));
            case RuleType.Literal: return new TsType.Literal(rule);
            case RuleType.TypedArray: return new TsType.Array(this.toTsType(rule.items, root));
            case RuleType.Array: return new TsType.Array;
            case RuleType.Boolean: return new TsType.Boolean;
            case RuleType.Number: return new TsType.Number;
            case RuleType.Object: return new TsType.Object;
            case RuleType.String: return new TsType.String;
            case RuleType.Void: return new TsType.Void;
            case RuleType.OneOf:
                return new TsType.Union(rule.oneOf.map(_ => {
                    const path = this.parsePath(_.$ref);
                    return this.toTsType(_, root, lodash_1.last(path));
                }));
            case RuleType.Reference:
                path = this.parsePath(rule.$ref);
                def = this.getInterface(lodash_1.last(path));
                if (def) {
                    return def.name;
                }
                else {
                    return this.toTsType(this.getReference(path, root), root, lodash_1.last(path));
                }
        }
    }
    generateInterface(schema, title) {
        schema = lodash_1.merge({}, Compiler.DEFAULT_SCHEMA, schema);
        const props = lodash_1.map(schema.properties, (v, k) => new Property({
            isRequired: this.isRequired(k, schema),
            key: k,
            value: this.toTsType(v, schema),
            description: v.description
        }));
        if (this.supportsAdditionalProperties(schema)) {
            props.push(new Property({
                key: '[k: string]',
                isRequired: true,
                value: new TsType.Any
            }));
        }
        return new Interface({
            name: this.toInterfaceName(title || schema.title),
            description: schema.description,
            props: props
        });
    }
    toString() {
        return pretty_printer_1.format(this.state.interfaces
            .concat(this.generateInterface(this.schema))
            .map(_ => _.toString())
            .join('\n'));
    }
}
Compiler.DEFAULT_SCHEMA = {
    properties: {},
    required: [],
    type: 'object'
};
class Property {
    constructor(data) {
        this.data = data;
    }
    toString() {
        return [
            this.data.key,
            `${this.data.isRequired ? '' : '?'}: `,
            `${this.data.value.toString()};`,
            this.data.description ? ` // ${this.data.description}` : ''
        ].join('');
    }
}
class Interface {
    constructor(data) {
        this.data = data;
    }
    get name() { return this.data.name; }
    toBlockComment(a) {
        return `/*
    ${a}
  */
    `;
    }
    toString() {
        return `${this.data.description
            ? this.toBlockComment(this.data.description)
            : ''}interface ${this.data.name} {
        ${this.data.props.join('\n')}
      }`;
    }
}
function compile(schema) {
    return new Compiler(schema).toString();
}
exports.compile = compile;
function compileFromFile(inputFilename) {
    return new Promise((resolve, reject) => fs_1.readFile(inputFilename, (err, data) => {
        if (err) {
            reject(err);
        }
        else {
            resolve(compile(JSON.parse(data.toString())));
        }
    }));
}
exports.compileFromFile = compileFromFile;
function streamFromString(string) {
    var s = new stream_1.Readable();
    s._read = function noop() { };
    s.push(string);
    s.push(null);
    return s;
}
//# sourceMappingURL=index.js.map