const path = require('path')
const egg = require('egg')
const EGG_PATH = Symbol.for('egg#eggPath')
const EGG_LOADER = Symbol.for('egg#loader')
const ChickenLoader = require('./loader/chicken_loader')
const Controller = require('./core/base_controller')
const Service = require('./core/base_service')

class Application extends egg.Application {
  get [EGG_PATH]() {
    return path.dirname(__dirname)
  }
  get [EGG_LOADER]() {
    return ChickenLoader
  }
}

class Agent extends egg.Agent {
  get [EGG_PATH]() {
    return path.dirname(__dirname)
  }
}

const chicken = Object.create(egg)
Object.assign(chicken, {
  Application,
  Agent,
  Controller,
  Service,
})
module.exports = chicken
