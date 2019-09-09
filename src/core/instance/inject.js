/* @flow */

import { hasOwn } from 'shared/util'
import { warn, hasSymbol } from '../util/index'
import { defineReactive, toggleObserving } from '../observer/index'

export function initProvide (vm: Component) {
  const provide = vm.$options.provide
  if (provide) {
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
  }
}

/**
 * 在inject中default和该组件的父组件的provide中找注入的变量的值， 如果没找到会一直往上找,如果找到了则把数据变成响应式的
 * @export
 * @param {Component} vm
 */
export function initInjections (vm: Component) {
  // inject 选项应该是一个字符串数组或一个对象，该对象的 key 代表了本地绑定的名称，value 为其 key (字符串或 Symbol) 以在可用的注入中搜索。
  const result = resolveInject(vm.$options.inject, vm) // vm.$options.inject是当前组件要注入的变量的key，如： inject: {from: 'test'},
  if (result) {
    toggleObserving(false)
    // 首先通过 resolveInject 方法获取 inject 选项搜索结果
    Object.keys(result).forEach(key => {
      // 如果有搜索结果，遍历搜索结果并为其中的数据添加 setter 和 getter，inject的数据是响应式的
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        defineReactive(vm, key, result[key])
      }
    })
    toggleObserving(true)
  }
}

/**
 * 在inject中default和该组件的父组件的provide中找注入的变量的值，如果没找到会一直往上找
 * @export
 * @param {*} inject
 * @param {Component} vm
 * @returns {?Object}
 */
export function resolveInject (inject: any, vm: Component): ?Object {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    const result = Object.create(null)
    // 获取 inject 选项的 key 数组
    const keys = hasSymbol
      ? Reflect.ownKeys(inject)
      : Object.keys(inject)

    /** 获取 inject 选项的 key 数组，遍历 key 数组，通过向上冒泡来查找 provide 中是否有 key 与 inject 选项中 from 属性同名的，
        如果有，则将这个数据传递给 result；如果没有，检查 inject 是否有 default 选项设定默认值或者默认方法，如果有则将默认值返传给 result，最终返回 result 对象。
    */
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // #6574 in case the inject object is observed...
      if (key === '__ob__') continue
      const provideKey = inject[key].from
      let source = vm
      // 查找 provide 中是否有 key 与 inject 选项中 from 属性同名的
      while (source) {
        if (source._provided && hasOwn(source._provided, provideKey)) {
          result[key] = source._provided[provideKey]
          break
        }
        source = source.$parent // 一直往上找
      }
      if (!source) {
        if ('default' in inject[key]) {
          const provideDefault = inject[key].default
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault
        } else if (process.env.NODE_ENV !== 'production') {
          warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    return result
  }
}
