const Service = require('egg').Service

module.exports = class extends Service {
  async crow() {
    return 'chicken service'
  }
}
