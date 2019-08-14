import path from 'path'
import pluginTester from 'babel-plugin-tester'
import plugin from '../'

const projectRoot = path.join(__dirname, '../../')

expect.addSnapshotSerializer({
  print(val) {
    return val.split(projectRoot).join('<PROJECT_ROOT>/')
  },
  test(val) {
    return typeof val === 'string'
  },
})

pluginTester({
  plugin,
  snapshot: true,
  babelOptions: {filename: __filename},
  tests: {
    'should ignore': `

      const x = {}
      x.a = () => true
  
    `,
    'on object': `

      const x = {}
      x.toString = () => true
    
    `,
    'on prototype': `

      function MyClass () {}
      MyClass.prototype.toString = () => true

    `,
    'on array': `

      const x = []
      x.splice = () => true

    `,
    'on function': `

      const x = () => {}
      x.bind = () => true

    `,
    'ignore alternate assigment expressions': `

      const x = {}
      x.toString += 1
    
    `,
    // 'key as string': `

    //   const x = {}
    //   x["toString"] = () => true

    // `,
  },
})
