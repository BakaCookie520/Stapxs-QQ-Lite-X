/*
 * @FileDescription: 消息处理模块
 * @Author: Stapxs
 * @Date:
 *      2022/11/1
 *      2022/12/7
 *      2024/9/2
 * @Version:
 *      1.0 - 初始版本
 *      2.0 - 重构为 ts 版本，修改 Vue3 相关变更
 *      3.0 - 优化更优雅的代码结构
 * @Description: <del>此模块用于拆分和保存/处理 bot 返回的各类信息，整个运行时数据也保存在这儿。</del>
 *               用于处理受到的事件
 */
import qed from '@renderer/assets/qed.txt?raw'

import app from '@renderer/main'
import { optDefault } from './option'

import Umami from '@stapxs/umami-logger-typescript'

import {
    getInch,
    randomNum,
} from '@renderer/function/utils/systemUtil'
import {
    reloadUsers,
} from '@renderer/function/utils/appUtil'
import {
    reactive,
    markRaw,
    defineAsyncComponent,
    watchEffect
} from 'vue'
import { PopInfo, PopType, Logger, LogType } from './base'
import {
    RunTimeDataElem,
} from './elements/information'
import { Notify } from './notify'
import { Msg, SelfMsg } from './model/msg'
import { Session } from './model/session'
import { htmlPopBox } from './utils/popBox'
import { ProxyUrl } from './model/proxyUrl'

// 其他 tag
const logger = new Logger()

// ==============================================================
const noticeFunctions = {
    /**
     * 请求
     */
    request: (_: string, msg: { [key: string]: any }) => {
        if (runtimeData.systemNoticesList) {
            runtimeData.systemNoticesList.push(msg)
        } else {
            runtimeData.systemNoticesList = [msg]
        }
    },

    /**
     * 好友变动
     */
    friend: (_: string, msg: { [key: string]: any }) => {
        // 重新加载联系人列表
        reloadUsers()
        switch (msg.sub_type) {
            case 'increase': {
                // 添加系统通知
                new PopInfo().add(
                    PopType.INFO,
                    app.config.globalProperties.$t('添加好友 {name} 成功！', {
                        name: msg.nickname,
                    }),
                )
                break
            }
            case 'decrease': {
                // 输出日志（显示为红色字体）
                // eslint-disable-next-line no-console
                console.log(
                    '%c消失了一个好友：' +
                        msg.nickname +
                        '（' +
                        msg.user_id +
                        '）',
                    'color:red;',
                )
                break
            }
        }
    },

    input_status: (_: string, msg: { [key: string]: any }) => {
        const { $t } = app.config.globalProperties
        const session = Session.getSessionById(msg.user_id)
        if (!session) return
        session.appendInfo =  $t('对方正在输入……')
        // TODO: 计时器移除
        setTimeout(() => {
            session.appendInfo = undefined
        }, 10000)
    },
} as { [key: string]: (name: string, msg: { [key: string]: any }) => void | Promise<void> }

const msgFunctions = {
    /**
     * 系统通知后处理
     */
    setFriendAdd: updateSysInfo,
    setGroupAdd: updateSysInfo,
} as {
    [key: string]: (
        name: string,
        msg: { [key: string]: any },
        echoList?: string[],
    ) => void
}

// ==========================================
export function recallMsg(session: Session, msgId: string) {
    // 寻找消息
    let matchMsg: undefined | Msg
    let matchMsgId: undefined | number
    for (const [ id, msg ] of session.messageList.entries()) {
        if (!(msg instanceof Msg)) continue
        if (msg.message_id === String(msgId)) {
            matchMsg = msg as Msg
            matchMsgId = id
            break
        }
    }
    if (!matchMsg || !matchMsgId) {
        logger.error(null, '没有找到这条被撤回的消息 ……')
        return
    }

    // 添加提示,移除消息
    session.removeMsg(matchMsg)

    // 撤回通知
    new Notify().closeAll(String(session.id))
}

let qed_try_times = 0
export async function newMsg(msg: Msg) {

    // 消息基础信息 ============================================
    if (!msg.session) return logger.error(null, '消息没有 session 信息，无法处理消息')
    if (!msg.message_id) return logger.error(null, '消息没有 message_id 信息，无法处理消息')
    const loginId = runtimeData.loginInfo.uin
    const sender = msg.sender.user_id

    // 自己发送消息拦截 ============================================
    if (sender === loginId) {
        if (await SelfMsg.isSendMsg(msg)) return
    }

    // 添加消息
    msg.session.addMessage(msg)

    // 抽个签 (什么鬼？业务逻辑而还没抽签多)
    if (msg.session !== runtimeData.nowChat) return
    const num = randomNum(0, 10000)
    qed_try_times++
    if (num >= 4500 && num <= 5500) {
        logger.add(
            LogType.INFO,
            num.toString() + '，这只是个神秘的数字...',
            undefined,
            true,
        )
    }
    if (num === 495) {  // QED怎么能和芙兰无关？(◣_◢)吃我一发 QED [495年的波纹]
        htmlPopBox(qed, {
            button: [
                { text: '确定(O)' },
            ],
        })
        Umami.trackEvent('show_qed', { times: qed_try_times })
    }
}

/**
 * 刷新系统通知和其他内容，给系统通知响应用的
 */
function updateSysInfo(
    _: string,
    __: { [key: string]: any },
    echoList: string[],
) {
    const flag = echoList[1]
    // 从系统通知列表里删除这条消息
    if (flag !== undefined) {
        const index = runtimeData.systemNoticesList?.findIndex((item: any) => {
            return item.flag == flag
        })
        if (index !== -1) {
            runtimeData.systemNoticesList?.splice(index, 1)
        }
    }
}

// ==============================================================

const baseRuntime = {
    connectInfo: { address: undefined, token: undefined },
    loginInfo: {} as unknown as {nickname: string, uin: number},
    sysConfig: {} as Record<keyof typeof optDefault, any | null>,
    tags: {
        firstLoad: false,
        openSideBar: true,
        darkMode: false,
        canCors: false,
    },
    watch: {
        backTimes: 0,
    },
    pageView: {
        chatView: markRaw(
            defineAsyncComponent(() => import('@renderer/pages/Chat.vue')),
        ),
        msgView: markRaw(
            defineAsyncComponent(
                () => import('@renderer/components/MsgBody.vue'),
            ),
        ),
    },
    systemNoticesList: undefined,
    popBoxList: [],
    mergeMsgStack: [],
    inch: getInch(),
    nowChat: undefined,
    nowBox: undefined,
}

export const runtimeData: RunTimeDataElem = reactive(baseRuntime)

// 重置 Runtime，但是保留应用设置之类已经加载好的应用内容
export function resetRuntime(resetAll = false) {
    runtimeData.watch = reactive(baseRuntime.watch)
    if (resetAll) {
        runtimeData.selfInfo = undefined
        runtimeData.systemNoticesList = reactive([])
        runtimeData.loginInfo = reactive({} as unknown as {nickname: string, uin: number})
    }
}

let testId = 0
const testUrl = 'https://q1.qlogo.cn/g?b=qq&s=0&nk=0'
watchEffect(()=>{
    testId++
    const thisId = testId
    runtimeData.tags.canCors = false
    const url = ProxyUrl.forceProxy(testUrl)
    // 没有代理直接返回
    if (url === testUrl) return
    fetch(url, { method: 'HEAD' }).then(res=>{
            if (testId > thisId) return
            runtimeData.tags.canCors = res.ok
        })
})
