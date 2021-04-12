'use strict'

const path = require('path')

module.exports = {
  loadService(opt) {
    // 载入到 app.serviceClasses
    opt = Object.assign(
      {
        call: true,
        caseStyle: 'lower',
        fieldClass: 'serviceClasses',
        directory: this.getLoadUnits().map(unit => path.join(unit.path, 'app/service')),
        initializer: (obj, opt) => {
          obj.prototype.pathName = opt.pathName
          obj.prototype.fullPath = opt.path
          const arr = opt.pathName.split('.')
          obj.prototype.modelName = arr[arr.length - 1]
          return obj
        },
      },
      opt
    )
    const servicePaths = opt.directory
    this.loadToContext(servicePaths, 'service', opt)
  },
}
