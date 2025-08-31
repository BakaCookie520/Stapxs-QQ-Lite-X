import {
    markRaw,
} from 'vue'
import { URL } from './model/data'
import { PopInfo, PopType } from './base'
import { AdapterInterface } from './adapter/interface'
import { resetRuntime, runtimeData } from './msg'
import app from '@renderer/main'
import { reloadUsers, sendStatEvent, updateMenu } from './utils/appUtil'
import { User } from './model/user'
import { backend } from '@renderer/runtime/backend'

const popInfo = new PopInfo()

function $t(key: string): string {
    return app.config.globalProperties.$t(key)
}

const adapters = import.meta.glob('@renderer/function/adapter/*/adapter.ts', { eager: true })
const adapterMap = new Map<string, AdapterInterface>()
for (const key in adapters) {
    const adapter: AdapterInterface = (adapters as any)[key].default
    if (adapter) {
        adapterMap.set(adapter.protocol, adapter)
    }
}

/**
 * 尝试登录
 * @param originUrl
 * @param token
 * @returns true表示登录成功，字符串表示失败原因
 */
async function tryLogin(originUrl: string, token: string): Promise<true | string>{
    const parseUrl = new URL(originUrl)
    let protocol: string = parseUrl.protocol
    const ssl: boolean = parseUrl.ssl
    const url: string = `${parseUrl.host}:${parseUrl.port}`
    if (protocol === 'ws') {
        popInfo.add(PopType.INFO, $t('协议仅支持ob/mk,详情请看如何连接.ws默认按ob处理'))
        protocol = 'ob'
    }

    // 查询适配器
    if (!adapterMap.has(protocol))
        return $t('不支持的协议: ') + protocol

    let adapter = adapterMap.get(protocol) as AdapterInterface
    runtimeData.nowAdapter = markRaw(adapter)
    const re = await adapter.connect(url, ssl, token,)
    if (!re)
        return $t('连接失败')

    // 初始化连接
    const redirect = await adapter.redirect?.()
    if (redirect) {
        adapter = redirect
        runtimeData.nowAdapter = markRaw(redirect)
    }

    // 获取登陆信息
    const loginData = await adapter.getLoginInfo()
    if (!loginData)
        return $t('获取登录信息失败')

    // 重置runtimeData
    resetRuntime(runtimeData.loginInfo.uin !== loginData.uin)

    // 完成登陆初始化
    runtimeData.loginInfo = loginData

    // 获取个人信息
    const selfInfo = await adapter.getUserInfo(loginData.uin)
    if (!selfInfo)
        return $t('获取个人信息失败')

    // 设置个人信息
    runtimeData.selfInfo = new User(selfInfo)

    // 上报协议端类型
    if (runtimeData.sysConfig.open_ga_bot) {
        const implInfo = await runtimeData.nowAdapter.getImplInfo()
        sendStatEvent('connect', { method: implInfo?.name ?? '（未知）' })
    }


    // 显示账户菜单
    updateMenu({
        parent: 'account',
        id: 'userName',
        action: 'label',
        value: loginData.nickname,
    })
    const title = `${loginData.nickname}（${loginData.uin}）`
    if(backend.type == 'web') {
        document.title = title + '- Stapxs QQ Lite X'
    } else {
        document.title = title
        backend.call(undefined, 'win:setTitle', false, title)
    }

    // 跳转标签卡
    const barMsg = document.getElementById('bar-msg')
    if (barMsg != null) barMsg.click()

    // 加载列表消息
    await reloadUsers()

    return true
}

export async function login(originUrl: string, token: string): Promise<boolean> {
    // 提前工作
    runtimeData.connectInfo.address = originUrl
    runtimeData.connectInfo.token = token

    // 登陆
    const re = await tryLogin(originUrl, token)

    // 登陆成功
    if (re === true) return re

    // 登陆失败的垃圾回收
    new PopInfo().add(PopType.ERR, $t('登录失败: ') + re)
    runtimeData.connectInfo.address = undefined
    runtimeData.connectInfo.token = undefined
    runtimeData.nowAdapter?.close()
    runtimeData.nowAdapter = undefined
    return false
}
