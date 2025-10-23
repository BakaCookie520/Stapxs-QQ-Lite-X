/*
 * @FileDescription: 弹窗工具
 * @Author: Mr.Lee
 * @Date: 2025/08/05
 * @Version: 1.0
 * @Description: 弹窗工具,用于快速创建弹窗,管理弹窗
 */

import app from '@renderer/main'
import { v4 as uuidv4 } from 'uuid'
import { h, markRaw } from 'vue'
import { PopBoxData } from '../elements/information'
import { runtimeData } from '../msg'
import InputPopBox from '@renderer/popboxes/InputPopBox.vue'

/**
 * 关闭一个弹窗
 * @param id 弹窗id
 * @returns
 */
export function closePopBox(id: string) {
    const index = runtimeData.popBoxList.findIndex(item => item.id === id)
    if (index === -1) return
    runtimeData.popBoxList[index].data.onClose?.()
    runtimeData.popBoxList.splice(index, 1)
}

/**
 * 判断当前是否有弹窗存在
 * @returns
 */
export function hasPopBox(): boolean {
    return runtimeData.popBoxList.length > 0
}

/**
 * 创建一个弹窗
 * @param config 弹窗配置
 * @return 弹窗的唯一标识符
 */
export function popBox(config: PopBoxData): string {
    const id = uuidv4()
    config.template = markRaw(config.template)
    runtimeData.popBoxList.push({
        id,
        data: config
    })
    return id
}

/**
 * 创建一个 HTML 弹窗
 * @param html HTML 内容
 * @param config 弹窗配置
 * @return 弹窗的唯一标识符
 * @deprecated 纯文本请使用 `textPopBox`, 或者 tsx + `popBox` 替代
 */
export function htmlPopBox(html: string, config: Omit<PopBoxData, 'template'> = {}): string {
    const data: PopBoxData = {
        template: () => h('div', { innerHTML: html }),
        ...config
    }
    return popBox(data)
}

/**
 * 创建一个文本弹窗
 * @param text 文本
 * @param config 弹窗配置
 * @returns 弹窗唯一标识符
 */
export function textPopBox(text: string, config: Omit<PopBoxData, 'template'> = {}): string {
    const data: PopBoxData = {
        template: () => h('div', [
            h('span', text)
        ]),
        ...config
    }
    return popBox(data)
}

/**
 * 确认弹窗
 * @param text 询问文本
 * @param mainButtonName 主按钮名称
 * @param closeButtonName 取消按钮名称
 * @returns
 */
export async function ensurePopBox(
    text: string,
    mainButtonName?: string,
    closeButtonName?: string
): Promise<boolean> {
    const { $t } = app.config.globalProperties
    if (!mainButtonName) mainButtonName = $t('确定')
    if (!closeButtonName) closeButtonName = $t('取消')
    let resolve: (value: boolean) => void
    const promise = new Promise<boolean>(res => {
        resolve = res
    })
    textPopBox(text, {
        title: $t('提醒'),
        button: [
            {
                text: closeButtonName,
                master: true,
                fun: () => resolve(false)
            },
            {
                text: mainButtonName,
                fun: () => resolve(true)
            },
        ]
    })
    return promise
}

/**
 * 确认弹窗
 * @param text 确认文本
 * @param buttonName 按钮名称
 * @returns
 */
export async function noticePopBox(text: string, buttonName?: string): Promise<void> {
    const { $t } = app.config.globalProperties
    if (!buttonName) buttonName = $t('知道了')

    let resolve: () => void
    const promise = new Promise<void>(res => {resolve = res})
    textPopBox(text, {
        svg: 'triangle-exclamation',
        title: $t('提醒'),
        button: [
            {
                text: buttonName,
                fun: () => resolve()
            }
        ]
    })
    return promise
}

export async function inputPopBox(config: {
    title?: string,
    svg?: string,
    placeholder?: string,
    value?: string,
}): Promise<string|undefined> {
    const { $t } = app.config.globalProperties
    config.title = config.title ?? $t('输入')
    config.value = config.value ?? ''
    return new Promise(resolve => {
        popBox({
            title: config.title,
            svg: config.svg,
            template: InputPopBox,
            templateValue: {
                placeholder: config.placeholder,
                complete: resolve
            },
            templateModel: markRaw(config),
            button: [{
                text: $t('确定'),
                master: true,
                fun: () => {
                    resolve(config.value)
                }
            }, {
                text: $t('取消'),
                fun: () => {
                    resolve(undefined)
                }
            }]
        })
    })
}
