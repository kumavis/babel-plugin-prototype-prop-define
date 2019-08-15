const primordialKeySet = new Set([
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
          if (node.prototypePropDefineSkip) return

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
          
          const isDynamicAssignment = member.computed && assignmentProperty.type !== 'StringLiteral'
          if (isDynamicAssignment) {
            
            const dynamicAssignmentCheck = createDynamicAssignmentCheck(
              parentStatement,
              assignmentProperty,
              valueStatement,
            )

            path.replaceWith(dynamicAssignmentCheck)

          } else {
            let assignmentKey
            switch (assignmentProperty.type) {
              case 'StringLiteral':
                assignmentKey = assignmentProperty.value
                break
              case 'Identifier':
                assignmentKey = assignmentProperty.name
                break
              default:
                return
            }

            // if (assignmentProperty.type !== 'Identifier') return
            // skip if proeprty not on whitelist
            if (!primordialKeySet.has(assignmentKey)) return

            // propertyKeyStatement -> "toString"
            const propertyKeyStatement = createStringLiteral(
              assignmentKey,
            )

            const definePropertyExpression = createDefinePropertyExpression(
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

function createDefinePropertyExpression(
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

function createStringLiteral (value) {
  return {
    type: 'StringLiteral',
    value,
  }
}

function createPropertyDescriptor (valueStatement) {
  return {
    type: 'ObjectExpression',
    // { value: 1, writable: true, enumerable: true, configurable: true }
    properties: [
      {
        type: 'ObjectProperty',
        key: {
          type: 'Identifier',
          name: 'value',
        },
        value: valueStatement,
      },
      {
        type: 'ObjectProperty',
        key: {
          type: 'Identifier',
          name: 'writable',
        },
        value: {
          type: 'BooleanLiteral',
          value: true,
        },
      },
      {
        type: 'ObjectProperty',
        key: {
          type: 'Identifier',
          name: 'enumerable',
        },
        value: {
          type: 'BooleanLiteral',
          value: true,
        },
      },
      {
        type: 'ObjectProperty',
        key: {
          type: 'Identifier',
          name: 'configurable',
        },
        value: {
          type: 'BooleanLiteral',
          value: true,
        },
      },
    ],
  }
}

// (function(target, key, value){
//   [].includes(key) ?
//     DEFINE_PROP :
//     target[key] = value;
//     return value
// })(a, b, c)

function createDynamicAssignmentCheck (
  parentStatement,
  propertyKeyStatement,
  valueStatement,
) {
  return {
    "type": "CallExpression",
    "callee": {
      "type": "FunctionExpression",
      "id": null,
      "generator": false,
      "async": false,
      "params": [
        {
          "type": "Identifier",
          "name": "target"
        },
        {
          "type": "Identifier",
          "name": "key"
        },
        {
          "type": "Identifier",
          "name": "value"
        }
      ],
      "body": {
        "type": "BlockStatement",
        "body": [
          {
            "type": "ExpressionStatement",
            "expression": {
              "type": "ConditionalExpression",
              "test": {
                "type": "CallExpression",
                "callee": {
                  "type": "MemberExpression",
                  "object": createPrimordialKeyArray(),
                  "property": {
                    "type": "Identifier",
                    "name": "includes"
                  },
                  "computed": false
                },
                "arguments": [
                  {
                    "type": "Identifier",
                    "name": "key"
                  }
                ]
              },
              "consequent": createDefinePropertyExpression(
                {
                  "type": "Identifier",
                  "name": "target"
                },
                {
                  "type": "Identifier",
                  "name": "key"
                },
                {
                  "type": "Identifier",
                  "name": "value"
                },
              ),
              "alternate": {
                "type": "AssignmentExpression",
                "operator": "=",
                "left": {
                  "type": "MemberExpression",
                  "object": {
                    "type": "Identifier",
                    "name": "target"
                  },
                  "property": {
                    "type": "Identifier",
                    "name": "key"
                  },
                  "computed": true
                },
                "right": {
                  "type": "Identifier",
                  "name": "value"
                },
                "prototypePropDefineSkip": true
              }
            }
          },
          {
            "type": "ReturnStatement",
            "argument": {
              "type": "Identifier",
              "name": "value"
            }
          }
        ],
        "directives": []
      }
    },
    "arguments": [
      parentStatement,
      propertyKeyStatement,
      valueStatement,
    ]
  }
  
}

function createPrimordialKeyArray () {
  return {
    "type": "ArrayExpression",
    "elements": Array.from(primordialKeySet).map(key => {
      return {
        type: 'StringLiteral',
        value: key,
      }
    })
  }
}