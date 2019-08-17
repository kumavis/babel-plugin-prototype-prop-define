<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [babel-plugin-prototype-prop-define](#babel-plugin-prototype-prop-define)
  - [background](#background)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# babel-plugin-prototype-prop-define

A babel plugin for working around javascript's "override mistake" when dealing with frozen Primordials (built-ins).

### transformation

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
(function (parent, key, value) {
  Object.defineProperty(parent, key, {
    value: value,
    writable: true,
    enumerable: true,
    configurable: true
  })
  return value;
})(x, "toString", () => 'hello');
x.toString()
// => 'hello'
```

The code is transformed into an IIFE in order to ensure the "parent" (`x`), "key" (`y`) and "value" (`() => 'hello'`) statements are evaluated exactly once, and that the whole expression resolves to the value of the "value" statement. This is needed because `Object.defineProperty` calls resolve to `undefined`.

For "computed" assignment, the resulting code is a little uglier.

```js
const x = {};
const y = 'toString';

x[y] = () => 'hello'
```

becomes

```js
const x = {};
const y = 'toString';

(function (parent, key, value) {
  ["constructor", "__defineGetter__", "__defineSetter__", "hasOwnProperty", "__lookupGetter__", "__lookupSetter__", "isPrototypeOf", "propertyIsEnumerable", "toString", "valueOf", "__proto__", "toLocaleString", "length", "concat", "find", "findIndex", "pop", "push", "shift", "unshift", "slice", "splice", "includes", "indexOf", "keys", "entries", "forEach", "filter", "map", "every", "some", "reduce", "reduceRight", "join", "reverse", "sort", "lastIndexOf", "copyWithin", "fill", "values", "name", "arguments", "caller", "apply", "bind", "call", "message"].includes(key) ? Object.defineProperty(parent, key, {
    value: value,
    writable: true,
    enumerable: true,
    configurable: true
  }) : parent[key] = value;
  return value;
})(x, y, () => true);
```

Here the check that is normally performed at parse time (checking if the key is in this whitelist), is performed at runtime to determine if normal assignment or `Object.defineProperty` should be used.