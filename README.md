<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [babel-plugin-prototype-prop-define](#babel-plugin-prototype-prop-define)
  - [background](#background)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# babel-plugin-prototype-prop-define

A babel plugin for working around javascript's "override mistake" when dealing with frozen Primordials (built-ins).

### background

If your primordials are frozen, such as in [SES](https://github.com/agoric/ses), assigning keys that are found on the prototype will throw an error.

```js
Object.freeze(Object.prototype)

const x = {}
x.toString = () => 'hello'
// => TypeError: Cannot assign to read only property 'toString' of object '#<Object>'
```

Since this is a common, this plugin is provided to transform code into a safe form using `Object.defineProperty`:

```js
Object.freeze(Object.prototype)

const x = {}
Object.defineProperty(x, 'toString', {
  value: () => 'hello',
  writable: true,
  enumerable: true,
  configurable: true,
})
x.toString()
// => 'hello'
```
