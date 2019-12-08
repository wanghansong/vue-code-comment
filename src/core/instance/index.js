import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

/**
 * vue构造函数
 * @param {*} options new vue传入的options el、data、methods等
 */
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options) // 初始化vue的options，包括：性能埋点、合并options、初始化生命周期、事件、render、数据
}

initMixin(Vue) // 定义了_init函数,初始化vue的options，包括：性能埋点、合并options、初始化生命周期、事件、render、数据
stateMixin(Vue) // 在prototype上挂载$data、$props、$set、$delete、$watch
eventsMixin(Vue) // Vue.prototype上定义$on $once $off $emit方法
lifecycleMixin(Vue) // Vue.prototype上定义_update方法(更新vnode)、$forceUpdate(强制重新渲染)、$destroy(销毁组件)
renderMixin(Vue) // 功能：在Vue.prototype上定义$nextTick、_render

export default Vue
