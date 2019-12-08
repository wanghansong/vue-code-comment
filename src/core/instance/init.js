/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

/**
 * 初始化vue的options，包括：性能埋点、合并options、初始化生命周期、事件、render、数据
 * @param {*} Vue 
 */
export function initMixin (Vue: Class<Component>) {
  // 定义了_init函数
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) { // 用于性能分析
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    vm._isVue = true
    // merge options 合并options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options) // 局部组件注册
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm) // 作用：把当前组件配置挂到父组件上，初始化一些状态
    initEvents(vm) // 子组件初始化事件监听
    initRender(vm) // 往vm上定义各类渲染选项,并对一些属性进行监听
    callHook(vm, 'beforeCreate') // 初始化vue-router
    /* 在inject中default和该组件的父组件们的provide中找注入的变量的值， 如果没找到会一直往上找
    * 官网:https://cn.vuejs.org/v2/guide/components-edge-cases.html#%E4%BE%9D%E8%B5%96%E6%B3%A8%E5%85%A5
    *       https://cn.vuejs.org/v2/api/#provide-inject
    * 使用示例：https://codesandbox.io/s/vue-provide-bbzkp
    * 数据是非响应式的
    */
    initInjections(vm) // resolve injections before data/props 依赖注入,它在初始化数据之前，因此这里面不能使用props、data、computed数据
    initState(vm) // 对 props, methods, data, computed 和 watch 进行初始化
    initProvide(vm) // resolve provide after data/props 把provide挂到vm._provided上
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el) // 挂载dom
    }
  }
}

/**
 * 拿到父组件上的一些东西，比如父组件的监听事件、要传入的props等
 * @param {*} vm 当前组件
 * @param {*} options 当前组件
 */
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  /**
   * _parentVnode: {
   *    componentOptions: {...}
   *    children: {}
   *    tag: 'xxx'
   * }
   */
  const parentVnode = options._parentVnode // parentVnode是当前要注册的组件在父组件中的包裹容器
  opts.parent = options.parent // parent是当前要注册的组件的父组件
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions // vnodeComponentOptions是当前要注册的组件从父组件的角度看过去要传入的东西
  // 直接把父组件要给注册组件传入的propsData、listeners、children、tag挂到opts上
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
