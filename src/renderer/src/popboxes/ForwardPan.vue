<!--
 * @FileDescription: 转发栏组件
 * @Author: Mr.Lee
 * @Date: 2025/07/27
 *        2025/07/31
 *        2025/08/18
 * @Version: 1.0
 *           2.0 重构为弹窗
-->
<template>
    <div class="forward-pan">
        <div>
            <input
                v-auto-focus
                v-search="searchInfo"
                :placeholder="$t('搜索 ……')">
            <button v-if="!multiselectMode"
                @click="multiselectMode=true">
                多选
            </button>
            <button v-if="multiselectMode"
                @click="runForward">
                发送
            </button>
        </div>
        <div>
            <TinySessionBody v-for="session in displaySession"
                :key="session.id"
                :session="session"
                :selected="selected.includes(session)"
                @click="clickChat(session)" />
        </div>
    </div>
</template>

<script setup lang="ts">
import TinySessionBody from '@renderer/components/TinySessionBody.vue'
import MsgBar from '@renderer/components/MsgBar.vue'

import { runtimeData } from '@renderer/function/msg'
import { markRaw } from 'vue'
import { Msg, SelfMsg, SelfPreMsg } from '@renderer/function/model/msg'
import { Session } from '@renderer/function/model/session'
import {
    shallowRef,
    ShallowRef,
    shallowReactive,
    computed,
    nextTick,
} from 'vue'
import { delay } from '@renderer/function/utils/systemUtil'
import app from '@renderer/main'
import { changeSession } from '@renderer/function/utils/msgUtil'
import { vSearch } from '@renderer/function/utils/vcmd'
import { popBox } from '@renderer/function/utils/popBox'
import { vAutoFocus } from '@renderer/function/utils/vcmd'

//#region == 声明/导出变量 ===========================================================
// 变量
const { $t } = app.config.globalProperties
const selected: ShallowRef<Session[]> = shallowRef([])
const multiselectMode: ShallowRef<boolean> = shallowRef(false)
const refreshDisplaySession = shallowRef(0)
const searchInfo = shallowReactive({
    originList: shallowReactive<Session[]>([]),
    query: shallowReactive([]),
    isSearch: false,
})
const displaySession = computed(() => {
    refreshDisplaySession.value
    const headSession = selected.value
    const mainSession = searchInfo.isSearch ?searchInfo.query :searchInfo.originList
    return [...headSession, ...mainSession]
})

const {
    msgs,
    type
} = defineProps<{
    msgs: Msg[],
    type: 'single' | 'merge',
}>()

const emit = defineEmits<{
    closePopBox: []
}>()

init()
//#endregion

//#region == 方法函数 ====================================================================
/**
 * 初始化乱七八糟的参数
 */
function init(){
    const activeChat = Array.from(Session.activeSessions).sort((a, b) => {
        if (!a.preMessage?.time) return 1
        if (!b.preMessage?.time) return -1
        return b.preMessage.time.time - a.preMessage.time.time
    })
    const allChat = Session.sessionList.filter(item => !activeChat.includes(item))

    searchInfo.originList = shallowReactive([...activeChat, ...allChat])
    multiselectMode.value = runtimeData.sysConfig.default_multiselect_forward ?? false
}
/**
 * 运行发送消息确认框
 */
function runForward(){
    close()
    let previewMsg: SelfPreMsg[]
    let title: string
    let whileSendMsg: SelfMsg[]
    if (type === 'single') {
        title = $t('转发消息')
        previewMsg = createSinglePreview(msgs)
        whileSendMsg = createSingleSendMsgs(msgs)
    } else {
        title = $t('合并转发消息')
        previewMsg = createMergePreview(msgs)
        whileSendMsg = createMergeSendMsg(msgs)
    }

    popBox({
        title: title,
        template: MsgBar,
        templateValue: markRaw({ msgs: previewMsg, config: {
            canInteraction: false,
            showIcon: false,
            dimNonExistentMsg: false,
        } }),
        button: [{
            text: $t('取消'),
        }, {
            text: $t('确定'),
            master: true,
            fun: () => sendMsg(whileSendMsg),
        },],
    })

    if(!runtimeData.sysConfig.jump_forward)return
    if(selected.value.length > 1)return
    const chat = selected.value[0]
    nextTick(() => {changeSession(chat)})
}
/**
 * 直接发送消息的函数
 * @param msgs
 */
async function sendMsg(msgs: SelfMsg[]){
    for (const msg of msgs) {
        msg.session.addMessage(msg)
        msg.send()
        await delay(300) // 避免发的太快了,乱序...
    }
}
function close(){
    emit('closePopBox')
}
/**
 * 创建单条转发消息预览
 * @param msgs
 */
function createSinglePreview(msgs: Msg[]): SelfPreMsg[]{
    const out: SelfPreMsg[] = []
    msgs.forEach((msg: Msg)=>{
        out.push(SelfPreMsg.create(msg.message))
    })
    return out
}
/**
 * 创建合并转发消息预览
 * @param msg
 */
function createMergePreview(msgs: Msg[]): SelfPreMsg[]{
    const Msg = SelfPreMsg.createMerge(msgs)
    return [Msg]
}
/**
 * 创建单条转发消息发送内容
 * @param msgs
 */
function createSingleSendMsgs(msgs: Msg[]): SelfMsg[]{
    const out: SelfMsg[] = []
    for (const chat of selected.value) {
        for (const msg of msgs) {
            out.push(SelfMsg.create(
                msg.message.map(item => item.copy()),
                chat,
            ))
        }
    }
    return out
}
/**
 * 创建合并转发消息发送内容
 * @param msgs
 */
function createMergeSendMsg(msgs: Msg[]): SelfMsg[]{
    const out: SelfMsg[] = []
    for (const chat of selected.value) {
        out.push(SelfMsg.createMerge(
            msgs.map(item => item.copy()),
            chat,
        ))
    }
    return out
}
function clickChat(chat: Session) {
    if(!multiselectMode.value){
        selected.value = [chat]
        runForward()
    }else {
        const index = selected.value.indexOf(chat)
        if (index > -1) {
            selected.value.splice(index, 1)
            searchInfo.originList.unshift(chat)
        }
        else {
            selected.value.push(chat)
            const index = searchInfo.originList.indexOf(chat)
            if (index > -1)
                searchInfo.originList.splice(index, 1)
        }
        refreshDisplaySession.value ++
    }
}
//#endregion
</script>
