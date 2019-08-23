const primordialPropSet = new Set([
  ...Object.getOwnPropertyNames(Object.prototype),
  ...Object.getOwnPropertyNames(Array.prototype),
  ...Object.getOwnPropertyNames(Function.prototype),
  ...Object.getOwnPropertyNames(Error.prototype),
])
// Set {
//   'constructor',
//   '__defineGetter__',
//   '__defineSetter__',
//   'hasOwnProperty',
//   '__lookupGetter__',
//   '__lookupSetter__',
//   'isPrototypeOf',
//   'propertyIsEnumerable',
//   'toString',
//   'valueOf',
//   '__proto__',
//   'toLocaleString',
//   'length',
//   'concat',
//   'find',
//   'findIndex',
//   'pop',
//   'push',
//   'shift',
//   'unshift',
//   'slice',
//   'splice',
//   'includes',
//   'indexOf',
//   'keys',
//   'entries',
//   'forEach',
//   'filter',
//   'map',
//   'every',
//   'some',
//   'reduce',
//   'reduceRight',
//   'join',
//   'reverse',
//   'sort',
//   'lastIndexOf',
//   'copyWithin',
//   'fill',
//   'values',
//   'name',
//   'arguments',
//   'caller',
//   'apply',
//   'bind',
//   'call',
//   'message' }

const primordialSymbolSet = new Set([
  ...Object.getOwnPropertySymbols(Object.prototype),
  ...Object.getOwnPropertySymbols(Array.prototype),
  ...Object.getOwnPropertySymbols(Function.prototype),
  ...Object.getOwnPropertySymbols(Error.prototype),
  Symbol.asyncIterator,
  Symbol.toStringTag,
].map(symbol => symbol.toString().slice(14,-1)))
// Set {
//   'iterator',
//   'unscopables',
//   'hasInstance',
//   'asyncIterator',
//   'toStringTag' }

const SKIP_PARSE_FLAG = 'prototype-prop-define-skip'

module.exports = () =>
  // {
  // types: t,
  // template,
  // transformFromAst,
  // version
  // },
  {
    return {
      name: 'prototype-prop-define', // optional
      visitor: {
        // Program(path,{file: {opts: fileOpts}}) {},
        // TaggedTemplateExpression(path,{file: {opts: fileOpts}}) {},
        // ImportDeclaration(path,{file: {opts: fileOpts}}) {},
        // CallExpression(path,{file: {opts: fileOpts}}) {},
        AssignmentExpression(path) {

          //
          // match
          //

          // node -> "Xyz.toString = function(){ return "hello" }"
          const {node} = path

          // internal flag to skip node
          if (node[SKIP_PARSE_FLAG]) return

          // ensure basic assignment (not += etc)
          if (node.operator !== '=') return
          // member -> "Xyz.toString"
          const member = node.left
          // ensure assigning to a non-computed member
          if (member.type !== 'MemberExpression') return

          // assignmentParent -> "Xyz"
          const assignmentParent = member.object
          // assignmentPropertyr -> "toString"
          const assignmentProperty = member.property
          // assignmentValue -> "function(){ return "hello" }"
          const assignmentValue = node.right

          // parentStatement -> "Xyz"
          const parentStatement = assignmentParent
          // valueStatement -> "function(){ return "hello" }"
          const valueStatement = assignmentValue

          const isDotPropAssignment = !member.computed
          const isStringAssignment =  member.computed && assignmentProperty.type === 'StringLiteral'
          const isSymbolAssignment =  member.computed && assignmentProperty.type === 'MemberExpression' && assignmentProperty.object.name === 'Symbol'
          const isDynamicAssignment = !(isDotPropAssignment || isStringAssignment || isSymbolAssignment)

          if (isDynamicAssignment) {

            const dynamicAssignmentCheck = createDynamicAssignmentCheck(
              parentStatement,
              assignmentProperty,
              valueStatement,
            )

            path.replaceWith(dynamicAssignmentCheck)

          } else {

            let assignmentKey
            if (isDotPropAssignment) {
              assignmentKey = assignmentProperty.name
            } else if (isStringAssignment) {
              assignmentKey = assignmentProperty.value
            } else if (isSymbolAssignment) {
              assignmentKey = assignmentProperty.property.name
            } else {
              return
            }

            // if (assignmentProperty.type !== 'Identifier') return
            // skip if property not on whitelist
            const keyInWhitelist = primordialPropSet.has(assignmentKey) || primordialSymbolSet.has(assignmentKey)
            if (!keyInWhitelist) return

            // propertyKeyStatement -> "toString"
            let propertyKeyStatement
            if (isDotPropAssignment || isStringAssignment) {
              propertyKeyStatement = createStringLiteral(
                assignmentKey,
              )
            } else if (isSymbolAssignment) {
              propertyKeyStatement = createSymbolIdentifier(
                assignmentKey
              )
            } else {
              return
            }

            const definePropertyExpression = createDefinePropertyAndResolveExpression(
              parentStatement,
              propertyKeyStatement,
              valueStatement,
            )

            path.replaceWith(definePropertyExpression)
          }
        },
      },
    }
  }

// (function(parent, key, value){
//   Object.defineProperty(parent, key, value);
//   return value
// })(a, b, c)
function createDefinePropertyAndResolveExpression (
  parentStatement,
  propertyKeyStatement,
  valueStatement,
) {
  const body = [
    createDefinePropertyExpression(
      createIdentifier('parent'),
      createIdentifier('key'),
      createIdentifier('value'),
    ),
    {
      "type": "ReturnStatement",
      "argument": createIdentifier('value')
    }
  ]

  const args = [
    ['parent', parentStatement],
    ['key', propertyKeyStatement],
    ['value', valueStatement],
  ]

  return createIife (args, body)
}

// Object.defineProperty(parent, key, value)
function createDefinePropertyExpression (
  parentStatement,
  propertyKeyStatement,
  valueStatement,
) {
  return {
    type: 'CallExpression',
    callee: {
      type: 'MemberExpression',
      object: {
        type: 'Identifier',
        name: 'Object',
      },
      property: {
        type: 'Identifier',
        name: 'defineProperty',
      },
      computed: false,
    },
    arguments: [
      parentStatement,
      propertyKeyStatement,
      createPropertyDescriptor(valueStatement),
    ],
  }
}

// { value: 1, writable: true, enumerable: true, configurable: true }
function createPropertyDescriptor (valueStatement) {
  return {
    type: 'ObjectExpression',
    properties: [
      {
        type: 'ObjectProperty',
        key: createIdentifier('value'),
        value: valueStatement,
      },
      {
        type: 'ObjectProperty',
        key: createIdentifier('writable'),
        value: {
          type: 'BooleanLiteral',
          value: true,
        },
      },
      {
        type: 'ObjectProperty',
        key: createIdentifier('enumerable'),
        value: {
          type: 'BooleanLiteral',
          value: true,
        },
      },
      {
        type: 'ObjectProperty',
        key: createIdentifier('configurable'),
        value: {
          type: 'BooleanLiteral',
          value: true,
        },
      },
    ],
  }
}

// (function(parent, key, value){
//   [].includes(key) ?
//     Object.defineProperty(parent, key, value) :
//     parent[key] = value;
//     return value
// })(a, b, c)
function createDynamicAssignmentCheck (
  parentStatement,
  propertyKeyStatement,
  valueStatement,
) {
  const body = [
    {
      "type": "ExpressionStatement",
      "expression": {
        "type": "ConditionalExpression",
        "test": {
          "type": "CallExpression",
          "callee": {
            "type": "MemberExpression",
            "object": createPrimordialKeyArray(),
            "property": createIdentifier('includes'),
            "computed": false
          },
          "arguments": [
            createIdentifier('key'),
          ]
        },
        "consequent": createDefinePropertyExpression(
          createIdentifier('parent'),
          createIdentifier('key'),
          createIdentifier('value'),
        ),
        "alternate": {
          "type": "AssignmentExpression",
          // prevent this plugin from transforming
          [SKIP_PARSE_FLAG]: true,
          "operator": "=",
          "left": {
            "type": "MemberExpression",
            "object": createIdentifier('parent'),
            "property": createIdentifier('key'),
            "computed": true
          },
          "right": createIdentifier('value')
        }
      }
    },
    {
      "type": "ReturnStatement",
      "argument": createIdentifier('value')
    }
  ]

  const args = [
    ['parent', parentStatement],
    ['key', propertyKeyStatement],
    ['value', valueStatement],
  ]

  return createIife(args, body)  
}

function createIife (args, body) {
  return {
    "type": "CallExpression",
    "callee": {
      "type": "FunctionExpression",
      "id": null,
      "generator": false,
      "async": false,
      "params": args.map(([argName]) => createIdentifier(argName)),
      "body": {
        "type": "BlockStatement",
        body,
        "directives": []
      }
    },
    "arguments": args.map(([_, argValue]) => argValue)
  }
}

function createPrimordialKeyArray () {
  return {
    "type": "ArrayExpression",
    "elements": [].concat(
      Array.from(primordialPropSet).map(createStringLiteral),
      Array.from(primordialSymbolSet).map(createSymbolIdentifier),
    )
  }
}

function createIdentifier (name) {
  return {
    "type": "Identifier",
    name,
  }
}

function createSymbolIdentifier (name) {
  return {
    type: 'MemberExpression',
    object: createIdentifier('Symbol'),
    property: createIdentifier(name),
    computed: false,
  }
}

function createStringLiteral (value) {
  return {
    type: 'StringLiteral',
    value,
  }
}