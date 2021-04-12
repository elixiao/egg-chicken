const error = require('../../lib/core/error')

module.exports = {
  get serviceOptions() {
    return {
      // 默认分页参数
      paginate: {
        default: 50,
      },
      overwrite: false,
    }
  },
  error(status, message, data) {
    return new error[status](message, data)
  },
}
