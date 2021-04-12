const { Service } = require('egg')
const errors = require('./error')
const { _ } = require('./common')
const { filterQuery } = require('./filterQuery')
const assert = require('assert')

const errorHandler = error => {
  if (error.code === 11000 || error.code === 11001) {
    // NOTE (EK): Error parsing as discussed in this github thread
    // https://github.com/Automattic/mongoose/issues/2129
    const match1 = error.message.match(/_?([a-zA-Z]*)_?\d?\s*dup key/i)
    const match2 = error.message.match(/\s*dup key:\s*\{\s*:\s*"?(.*?)"?\s*\}/i)

    const key = match1 ? match1[1] : 'path'
    let value = match2 ? match2[1] : 'value'

    if (value === 'null') {
      value = null
    } else if (value === 'undefined') {
      value = undefined
    }

    error.message = `${key}: ${value} already exists.`
    error.errors = {
      [key]: value,
    }

    return Promise.reject(new errors.Conflict(error))
  }
  if (error.name) {
    switch (error.name) {
      case 'ValidationError':
      case 'ValidatorError':
      case 'CastError':
      case 'VersionError':
        return Promise.reject(new errors.BadRequest(error))
      case 'OverwriteModelError':
        return Promise.reject(new errors.Conflict(error))
      case 'MissingSchemaError':
      case 'DivergentArrayError':
        return Promise.reject(new errors.GeneralError(error))
      case 'MongoError':
        return Promise.reject(new errors.GeneralError(error))
    }
  }
  return Promise.reject(error)
}

function select(params, ...otherFields) {
  const fields = params && params.query && params.query.$select
  if (Array.isArray(fields) && otherFields.length) {
    fields.push(...otherFields)
  }
  const convert = result => {
    if (!Array.isArray(fields)) {
      return result
    }
    return _.pick(result, ...fields)
  }
  return result => {
    if (Array.isArray(result)) {
      return result.map(convert)
    }
    return convert(result)
  }
}

class BaseService extends Service {
  constructor(ctx) {
    super(ctx)
    this.options = Object.assign(
      {
        id: '_id',
        filters: {
          $populate(value) {
            return value
          },
        },
        whitelist: ['$regex', '$and'],
      },
      ctx.serviceOptions
    )
    assert(this.modelName, '模型名称必须存在')
    this.discriminatorKey = this.Model.schema.options.discriminatorKey
    this.discriminators = {}
    ;(this.options.discriminators || []).forEach(element => {
      if (element.modelName) {
        this.discriminators[element.modelName] = element
      }
    })
    this.lean = this.options.lean === undefined ? true : this.options.lean
    this.overwrite = this.options.overwrite === true
    this.useEstimatedDocumentCount = !!this.options.useEstimatedDocumentCount
  }

  get Model() {
    const modelName = this.modelName.charAt(0).toUpperCase() + this.modelName.slice(1)
    return this.ctx.model[modelName]
  }

  get id() {
    return this.options.id
  }

  get events() {
    return this.options.events
  }

  filterQuery(params, opts = {}) {
    const paginate = typeof params.paginate !== 'undefined' ? params.paginate : this.options.paginate
    const { query = {} } = params
    const options = Object.assign(
      {
        operators: this.options.whitelist || [],
        filters: this.options.filters,
        paginate,
      },
      opts
    )
    const result = filterQuery(query, options)
    return Object.assign(result, { paginate })
  }

  _getOrFind(params = {}) {
    return params.id === null ? this.find(params) : this.get(params)
  }

  find(params = {}) {
    const { filters, query, paginate } = this.filterQuery(params)
    const discriminator = (params.query || {})[this.discriminatorKey] || this.discriminatorKey
    const model = this.discriminators[discriminator] || this.Model
    const q = model.find(query).lean(this.lean)
    // $select uses a specific find syntax, so it has to come first.
    if (Array.isArray(filters.$select)) {
      q.select(
        filters.$select.reduce(
          (res, key) =>
            Object.assign(res, {
              [key]: 1,
            }),
          {}
        )
      )
    } else if (typeof filters.$select === 'string' || typeof filters.$select === 'object') {
      q.select(filters.$select)
    }
    if (filters.$sort) q.sort(filters.$sort)
    if (params.collation) q.collation(params.collation)
    if (typeof filters.$limit !== 'undefined') q.limit(filters.$limit)
    if (filters.$skip) q.skip(filters.$skip)
    if (filters.$populate) q.populate(filters.$populate)
    let executeQuery = total =>
      q
        .session(params.mongoose && params.mongoose.session)
        .exec()
        .then(data => {
          return {
            total,
            limit: filters.$limit,
            skip: filters.$skip || 0,
            data,
          }
        })
    if (filters.$limit === 0) {
      executeQuery = total =>
        Promise.resolve({
          total,
          limit: filters.$limit,
          skip: filters.$skip || 0,
          data: [],
        })
    }
    if (paginate && paginate.default) {
      return model
        .where(query)
        [this.useEstimatedDocumentCount ? 'estimatedDocumentCount' : 'countDocuments']()
        .session(params.mongoose && params.mongoose.session)
        .exec()
        .then(executeQuery)
    }
    return executeQuery().then(page => page.data)
  }

  get(params = {}) {
    const { query, filters } = this.filterQuery(params)
    query.$and = (query.$and || []).concat([{ [this.id]: params.id }])
    const discriminator = query[this.discriminatorKey] || this.discriminatorKey
    const model = this.discriminators[discriminator] || this.Model
    let modelQuery = model.findOne(query)
    // Handle $populate
    if (filters.$populate) modelQuery = modelQuery.populate(filters.$populate)
    // Handle $select
    if (filters.$select && filters.$select.length) {
      const fields = { [this.id]: 1 }
      for (const key of filters.$select) {
        fields[key] = 1
      }
      modelQuery.select(fields)
    } else if (filters.$select && typeof filters.$select === 'object') {
      modelQuery.select(filters.$select)
    }
    return modelQuery
      .session(params.mongoose && params.mongoose.session)
      .lean(this.lean)
      .exec()
      .then(data => {
        if (!data) throw new errors.NotFound(`No record found for id '${params.id}'`)
        return data
      })
      .catch(errorHandler)
  }

  create(params = {}) {
    const discriminator = (params.query || {})[this.discriminatorKey] || this.discriminatorKey
    const model = this.discriminators[discriminator] || this.Model
    const { query: { $populate } = {}, body } = params
    const isMulti = Array.isArray(body)
    const data = isMulti ? body : [body]
    return model
      .create(data, params.mongoose)
      .then(results => {
        if ($populate) {
          return Promise.all(results.map(result => this.Model.populate(result, $populate)))
        }
        return results
      })
      .then(results => {
        if (this.lean) {
          results = results.map(item => (item.toObject ? item.toObject() : item))
        }
        return isMulti ? results : results[0]
      })
      .then(select(params, this.id))
      .catch(errorHandler)
  }

  update(params = {}) {
    const { id, body } = params
    let data = body
    if (id === null) {
      return Promise.reject(new errors.BadRequest('Not replacing multiple records. Did you mean `patch`?'))
    }
    // Handle case where data might be a mongoose model
    if (typeof data.toObject === 'function') data = data.toObject()
    const { query, filters } = this.filterQuery(params)
    const options = Object.assign(
      {
        new: true,
        overwrite: this.overwrite,
        runValidators: true,
        context: 'query',
        setDefaultsOnInsert: true,
      },
      params.mongoose
    )

    query.$and = (query.$and || []).concat({ [this.id]: id })

    if (this.id === '_id') {
      // We can not update default mongo ids
      data = _.omit(data, this.id)
    } else {
      // If not using the default Mongo _id field set the id to its previous value. This prevents orphaned documents.
      data = { ...data, [this.id]: id }
    }
    const discriminator = query[this.discriminatorKey] || this.discriminatorKey
    const model = this.discriminators[discriminator] || this.Model
    let modelQuery = model.findOneAndUpdate(query, data, options)
    if (filters.$populate) modelQuery = modelQuery.populate(filters.$populate)
    return modelQuery
      .lean(this.lean)
      .exec()
      .then(result => {
        if (result === null) throw new errors.NotFound(`No record found for id '${id}'`)
        return result
      })
      .then(select(params, this.id))
      .catch(errorHandler)
  }

  patch(params = {}) {
    const { id, body } = params
    let data = body
    const { query } = this.filterQuery(params)
    const mapIds = data => (Array.isArray(data) ? data.map(current => current[this.id]) : [data[this.id]])

    // By default we will just query for the one id. For multi patch
    // we create a list of the ids of all items that will be changed
    // to re-query them after the update
    const ids = this._getOrFind({ ...params, paginate: false }).then(mapIds)
    // Handle case where data might be a mongoose model
    if (typeof data.toObject === 'function') data = data.toObject()
    // ensure we are working on a copy
    data = Object.assign({}, data)
    // If we are updating multiple records
    const options = Object.assign(
      {
        multi: id === null,
        runValidators: true,
        context: 'query',
      },
      params.mongoose
    )

    if (id !== null) {
      query.$and = (query.$and || []).concat({ [this.id]: id })
    }

    if (this.id === '_id') {
      // We can not update default mongo ids
      delete data[this.id]
    } else if (id !== null) {
      // If not using the default Mongo _id field set the id to its
      // previous value. This prevents orphaned documents.
      data[this.id] = id
    }
    // NOTE (EK): We need this shitty hack because update doesn't return a promise properly when runValidators is true. WTF!
    try {
      return ids
        .then(idList => {
          const { query: { $populate } = {} } = params
          // Create a new query that re-queries all ids that were originally changed
          const updatedQuery = { [this.id]: { $in: idList } }
          const findParams = Object.assign({}, params, {
            paginate: false,
            query: $populate ? Object.assign(updatedQuery, { $populate }) : updatedQuery,
          })
          // If params.query.$populate was provided, remove it from the query sent to mongoose.
          const discriminator = query[this.discriminatorKey] || this.discriminatorKey
          const model = this.discriminators[discriminator] || this.Model
          return model
            .updateMany(query, data, options)
            .lean(this.lean)
            .exec()
            .then(writeResult => {
              if (options.writeResult) {
                return writeResult
              }
              if ('upserted' in writeResult) {
                return this._getOrFind(Object.assign({}, params, { query: { [this.id]: { $in: writeResult.upserted.map(doc => doc._id) } } }, { paginate: false }))
              }
              return this._getOrFind(findParams)
            })
        })
        .then(select(params, this.id))
        .catch(errorHandler)
    } catch (e) {
      return errorHandler(e)
    }
  }

  remove(params = {}) {
    const { id } = params
    const { query } = this.filterQuery(params)
    if (params.collation) query.collation = params.collation
    const findParams = { ...params, paginate: false, query }
    if (id !== null) query.$and = (query.$and || []).concat({ [this.id]: id })
    // NOTE (EK): First fetch the record(s) so that we can return it/them when we delete it/them.
    return this._getOrFind(findParams)
      .then(data => {
        if (id !== null) {
          return this.Model.deleteOne(query, params.mongoose)
            .lean(this.lean)
            .exec()
            .then(() => data)
            .then(select(params, this.id))
        }
        return this.Model.deleteMany(query, params.mongoose)
          .lean(this.lean)
          .exec()
          .then(() => data)
          .then(select(params, this.id))
      })
      .catch(errorHandler)
  }
}

module.exports = BaseService
