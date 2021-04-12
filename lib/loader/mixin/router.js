const path = require('path')

module.exports = {
  loadRouter() {
    const file = path.join(this.options.baseDir, 'app/router')
    const fn = require(file)
    const { router, controller } = this.app
    router.restful = (name, names) => {
      names = `${names || name + 's'}`
      const ctrl = controller[name]
      if (!ctrl) throw new Error(`cannot find '${name}' controller`)
      if (ctrl.find) router.get(`/${names}`, ctrl.find)
      if (ctrl.get) router.get(`/${names}/:id`, ctrl.get)
      if (ctrl.create) router.post(`/${names}`, ctrl.create)
      if (ctrl.update) router.put(`/${names}/:id`, ctrl.update)
      if (ctrl.patch) router.patch(`/${names}/:id`, ctrl.patch)
      if (ctrl.remove) router.delete(`/${names}/:id`, ctrl.remove)
    }
    fn(this.app)
  },
}
