const qs = require('qs')

module.exports = {
  get query() {
    const str = this.querystring
    const c = (this._querycache = this._querycache || {})
    return c[str] || (c[str] = qs.parse(str))
  },
  set query(obj) {
    this.querystring = qs.stringify(obj)
  },
}
