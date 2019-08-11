// const getReplacers = require('./replace')
// const {looksLike} = require('./helpers')

// TODO: WRITE BABEL PLUGIN
// TODO: ???
// TODO: PROFIT

export default () =>
  // {
  // types: t,
  // template,
  // transformFromAst,
  // version
  // },
  {
    return {
      name: 'protoype-prop-define', // optional
      visitor: {
        // Program(path,{file: {opts: fileOpts}}) {},
        // TaggedTemplateExpression(path,{file: {opts: fileOpts}}) {},
        // ImportDeclaration(path,{file: {opts: fileOpts}}) {},
        // CallExpression(path,{file: {opts: fileOpts}}) {},
        AssignmentExpression(path) {

          //
          // match
          //

          // node -> MyClass.prototype.toString = function(){ return "hello" }
          const { node } = path
          // member -> MyClass.prototype.toString
          const member = node.left
          // ensure assigning to a non-computed member
          if (member.type !== 'MemberExpression') return
          if (member.computed) return
          // ensure member is a member expression for "prototype"
          // assignmentParent -> MyClass.prototype
          const assignmentParent = member.object
          if (assignmentParent.type !== 'MemberExpression') return
          if (assignmentParent.computed) return
          // assignmentTarget -> prototype
          const assignmentTarget = assignmentParent.property
          if (assignmentTarget.type !== 'Identifier') return
          if (assignmentTarget.name !== 'prototype') return

          //
          // transform
          //

          // parentStatement -> MyClass.prototype
          const parentStatement = assignmentParent
          // propertyKeyStatement -> toString
          const propertyKeyStatement = memberPropToDefinePropKeyArg(member.property)
          // valueStatement -> function(){ return "hello" }
          const valueStatement = node.right
    
          const definePropertyExpression = createDefinePropertyExpression(
            parentStatement,
            propertyKeyStatement,
            valueStatement
          )

          path.replaceWith(definePropertyExpression)
        },
      },
    }
  }

function createDefinePropertyExpression (parentStatement, propertyKeyStatement, valueStatement) {
  return {
    "type": "CallExpression",
    "callee": {
      "type": "MemberExpression",
      "object": {
        "type": "Identifier",
        "name": "Object"
      },
      "property": {
        "type": "Identifier",
        "name": "defineProperty"
      },
      "computed": false
    },
    "arguments": [
      parentStatement,
      propertyKeyStatement,
      createPropertyDescriptor(valueStatement)
    ]
  }
  
}

function memberPropToDefinePropKeyArg (memberProp) {
  return {
    "type": "StringLiteral",
    "value": memberProp.name,
  }
}

function createPropertyDescriptor (valueStatement) {
  return {
    "type": "ObjectExpression",
    // { value: 1, writable: true, enumerable: true, configurable: true }
    "properties": [
      {
        "type": "ObjectProperty",
        "key": {
          "type": "Identifier",
          "name": "value"
        },
        "value": valueStatement
      },
      {
        "type": "ObjectProperty",
        "key": {
          "type": "Identifier",
          "name": "writable"
        },
        "value": {
          "type": "BooleanLiteral",
          "value": true
        }
      },
      {
        "type": "ObjectProperty",
        "key": {
          "type": "Identifier",
          "name": "enumerable"
        },
        "value": {
          "type": "BooleanLiteral",
          "value": true
        }
      },
      {
        "type": "ObjectProperty",
        "key": {
          "type": "Identifier",
          "name": "configurable"
        },
        "value": {
          "type": "BooleanLiteral",
          "value": true
        }
      },
    ]
  }  
}