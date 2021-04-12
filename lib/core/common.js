const _ = {
  each(obj, callback) {
    if (obj && typeof obj.forEach === 'function') {
      obj.forEach(callback)
    } else if (_.isObject(obj)) {
      Object.keys(obj).forEach(key => callback(obj[key], key))
    }
  },

  some(value, callback) {
    return Object.keys(value)
      .map(key => [value[key], key])
      .some(([val, key]) => callback(val, key))
  },

  every(value, callback) {
    return Object.keys(value)
      .map(key => [value[key], key])
      .every(([val, key]) => callback(val, key))
  },

  isMatch(obj, item) {
    return Object.keys(item).every(key => obj[key] === item[key])
  },

  isEmpty(obj) {
    return Object.keys(obj).length === 0
  },

  isObject(item) {
    return typeof item === 'object' && !Array.isArray(item) && item !== null
  },

  omit(obj, ...keys) {
    const result = {...obj}
    keys.forEach(key => delete result[key])
    return result
  },

  pick(source, ...keys) {
    return keys.reduce((result, key) => {
      if (source[key] !== undefined) result[key] = source[key]
      return result
    }, {})
  },

  // Recursively merge the source object into the target object
  merge(target, source) {
    if (_.isObject(target) && _.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (_.isObject(source[key])) {
          if (!target[key]) {
            Object.assign(target, {[key]: {}})
          }
          _.merge(target[key], source[key])
        } else {
          Object.assign(target, {[key]: source[key]})
        }
      })
    }
    return target
  },
}


module.exports = {
  _,
}
