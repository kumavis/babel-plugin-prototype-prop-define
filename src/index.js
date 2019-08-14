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
          // ensure basic assignment (not += etc)
          if (node.operator !== '=') return
          // member -> "Xyz.toString"
          const member = node.left
          // ensure assigning to a non-computed member
          if (member.type !== 'MemberExpression') return
          if (member.computed) return
          // ensure member is a member expression for "prototype"
          // assignmentParent -> "Xyz"
          const assignmentParent = member.object
          // assignmentParent -> "toString"
          const assignmentProperty = member.property
          if (assignmentProperty.type !== 'Identifier') return
          if (!primordialKeySet.has(assignmentProperty.name)) return
          // assignmentValue -> "function(){ return "hello" }"
          const assignmentValue = node.right

          //
          // transform
          //

          // parentStatement -> "Xyz"
          const parentStatement = assignmentParent
          // propertyKeyStatement -> "toString"
          const propertyKeyStatement = memberPropToDefinePropKeyArg(
            assignmentProperty,
          )
          // valueStatement -> "function(){ return "hello" }"
          const valueStatement = assignmentValue

          const definePropertyExpression = createDefinePropertyExpression(
            parentStatement,
            propertyKeyStatement,
            valueStatement,
          )

          path.replaceWith(definePropertyExpression)
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

function memberPropToDefinePropKeyArg(memberProp) {
  return {
    type: 'StringLiteral',
    value: memberProp.name,
  }
}

function createPropertyDescriptor(valueStatement) {
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
