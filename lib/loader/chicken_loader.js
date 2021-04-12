const {AppWorkerLoader} = require('egg')

class ChickenLoader extends AppWorkerLoader {}

const loaders = [require('./mixin/service'), require('./mixin/router')]

for (const loader of loaders) {
  Object.assign(ChickenLoader.prototype, loader)
}

module.exports = ChickenLoader
