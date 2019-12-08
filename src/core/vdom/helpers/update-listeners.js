/* @flow */

import {
  warn,
  invokeWithErrorHandling
} from 'core/util/index'
import {
  cached,
  isUndef,
  isTrue,
  isPlainObject
} from 'shared/util'

const normalizeEvent = cached((name: string): {
  name: string,
  once: boolean,
  capture: boolean,
  passive: boolean,
  handler?: Function,
  params?: Array<any>
} => {
  const passive = name.charAt(0) === '&'
  name = passive ? name.slice(1) : name
  const once = name.charAt(0) === '~' // Prefixed last, checked first
  name = once ? name.slice(1) : name
  const capture = name.charAt(0) === '!'
  name = capture ? name.slice(1) : name
  return {
    name,
    once,
    capture,
    passive
  }
})

/**
 * 创建统一的回调函数 invoker
 * @param {*} fns 监听事件的回调函数
 * @param {*} vm 
 */
export function createFnInvoker (fns: Function | Array<Function>, vm: ?Component): Function {
  function invoker () {
    const fns = invoker.fns
    if (Array.isArray(fns)) {
      const cloned = fns.slice()
      for (let i = 0; i < cloned.length; i++) {
        invokeWithErrorHandling(cloned[i], null, arguments, vm, `v-on handler`)
      }
    } else {
      // return handler return value for single handlers
      return invokeWithErrorHandling(fns, null, arguments, vm, `v-on handler`)
    }
  }
  invoker.fns = fns
  return invoker
}

/**
 * 子组件拿到父组件的监听列表，创建、更新监听事件和统一的回调
 * @param {*} on 父组件上的监听列表
 * @param {*} oldOn 
 * @param {*} add $on方法
 * @param {*} remove $off方法
 * @param {*} createOnceHandler 
 * @param {*} vm 
 */
export function updateListeners (
  on: Object,
  oldOn: Object,
  add: Function,
  remove: Function,
  createOnceHandler: Function,
  vm: Component
) {
  let name, def, cur, old, event
  for (name in on) {
    def = cur = on[name] // 回调函数
    old = oldOn[name]
    event = normalizeEvent(name) // 前面对不同事件修饰符在name上做了标记,如‘~’,现在需要把它们作为Boolean返回并从name去掉
    /* istanbul ignore if */
    if (__WEEX__ && isPlainObject(def)) {
      cur = def.handler
      event.params = def.params
    }

    if (isUndef(cur)) { // 当前的监听事件name是undefined
      process.env.NODE_ENV !== 'production' && warn(
        `Invalid handler for event "${event.name}": got ` + String(cur),
        vm
      )
    } else if (isUndef(old)) { // 旧事件列表中找不到当前name的事件，表示它是个新事件
      if (isUndef(cur.fns)) { // 如果未创建了统一的回调函数
        cur = on[name] = createFnInvoker(cur, vm)
      }
      if (isTrue(event.once)) { // v-on.once情况
        cur = on[name] = createOnceHandler(event.name, cur, event.capture)
      }
      add(event.name, cur, event.capture, event.passive, event.params) // 在子组件上监听,使用$on方式监听
    } else if (cur !== old) {
      old.fns = cur
      on[name] = old
    }
  }
  // 去掉一些过期的监听事件
  for (name in oldOn) {
    if (isUndef(on[name])) { // 当前监听列表中没有的事件remove掉
      event = normalizeEvent(name)
      remove(event.name, oldOn[name], event.capture)
    }
  }
}
