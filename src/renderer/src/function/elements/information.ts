import { Component, Raw } from 'vue'
import { AdapterInterface, LoginInfo } from '../adapter/interface'
import { SessionBox } from '../model/box'
import { ForwardSeg } from '../model/seg'
import { Session } from '../model/session'
import { User } from '../model/user'
import { optDefault } from '../option'

export interface RunTimeDataElem {
    sysConfig: Record<keyof typeof optDefault, any | null>
    connectInfo: {address: string | undefined, token: string | undefined}
    loginInfo: LoginInfo,
    selfInfo?: User
    systemNoticesList?: { [key: string]: any }
    pageView: {
        chatView: any
        msgView: any
    }
    tags: {
        firstLoad: boolean
        canCors: boolean
        sw?: boolean
        darkMode: boolean
        vibrancy: boolean
        noLogin: boolean    // 一次都没有登陆
    }
    cm: number
    watch: {
        // PS: 一些给监听器捕捉用的数据
        backTimes: number
    }
    mergeMsgStack: ForwardSeg[]
    stickerCache?: any[]
    nowChat?: Session
    nowBox?: SessionBox  // 当前的会话盒子
    nowAdapter?: AdapterInterface // 当前适配器
    popBoxList: { id: string, data: PopBoxData }[],
}

export interface MenuEventData {
    x: number
    y: number
    target: HTMLElement
}

export interface PopBoxButton {
	master?: boolean // 是否高亮（主按钮）
	fun?: (() => void | Promise<void>)
		| ((event: Event) => void | Promise<void>) // 按钮回调
	text: string // 按钮文本
	noClose?: boolean // 是否不退出弹窗
}

export interface PopBoxData {
    // 通用弹窗
    svg?: string // 弹窗图标
    title?: string // 弹窗标题（缺省将没有标题栏和关闭按钮）
    template: Raw<Component> // 填充模板
    templateValue?: any // 模板 props
    templateModel?: any // 模板 v-model
    full?: boolean // 是否填充整个页面
    button?: PopBoxButton[]
    allowAutoClose?: boolean // 是否允许自带的关闭操作
    onClose?: () => void // 关闭回调
}

export interface MenuEventData {
    x: number
    y: number
    target: HTMLElement
}

export interface DnsElem {
    value: string
    type: 'A' | 'AAAA' | 'CNAME' | 'SRV' | 'TXT' | 'OTHER'
}
