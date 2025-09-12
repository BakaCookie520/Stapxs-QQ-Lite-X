<!--
 * @FileDescription: 消息栏，用于绘制 MsgBody 和 NoticeBody
 * @Author: Mr.Lee
 * @Date: 2025/07/07
 * @Version: 1.0
-->
<template>
    <TransitionGroup
        :name="runtimeData.sysConfig.opt_fast_animation ? '' : 'msglist'"
        class="message-body-container"
        :class="{
            'disable-interaction': !allowInteraction || multiselectMode,
        }"
        tag="div">
        <template v-for="(msgIndex, index) in msgs">
            <!-- 时间戳 -->
            <NoticeBody
                v-if="msgIndex.time && isShowTime(msgs.at(index - 1)?.time?.time, msgIndex.time.time)"
                :key="'notice-time-' + (msgIndex.time.time / ( 4 * 60 )).toFixed(0)"
                :data="SystemNotice.time(msgIndex.time.time)" />
            <!-- [已删除]消息 -->
            <NoticeBody
                v-if="
                    !runtimeData.sysConfig.dont_parse_delete &&
                        msgIndex instanceof Msg &&
                        msgIndex.isDelete"
                :key="'delete-' + msgIndex.uuid"
                :data="SystemNotice.delete()" />
            <!-- 消息体 -->
            <MsgBody v-else-if="msgIndex instanceof Msg"
                :key="'msg-' + msgIndex.uuid"
                :selected="isSelected(msgIndex)"
                :data="msgIndex"
                :config="config"
                :user-info-pan="userInfoPan"
                :msg-prev-pan="msgPrevPan"
                @click="msgClick($event, msgIndex)"
                @image-loaded="arg=>$emit('imageLoaded', arg)"
                @show-msg-menu="(eventData, msg) => openMsgMenu(eventData, msg)"
                @show-user-menu="(eventData, user) => openUserMenu(eventData, user)"
                @left-move="arg => $emit('leftMove', arg)"
                @right-move="arg => $emit('rightMove', arg)"
                @sender-double-click="arg => $emit('senderDoubleClick', arg)"
                @emoji-click="(id, msg) => $emit('emojiClick', id, msg)" />
            <!-- 其他通知消息 -->
            <NoticeBody v-else-if="msgIndex instanceof Notice"
                :id="msgIndex.uuid"
                :key="'notice-' + index"
                :user-info-pan="userInfoPan"
                :data="msgIndex"
                :msg-prev-pan="msgPrevPan" />
        </template>
    </TransitionGroup>
</template>
<script setup lang="ts">
import {
    shallowReactive,
    shallowRef,
} from 'vue'
import MsgBody, { MsgBodyConfig } from './MsgBody.vue'
import NoticeBody from './NoticeBody.vue'

import { MenuEventData } from '@renderer/function/elements/information'
import { Message } from '@renderer/function/model/message'
import { Msg } from '@renderer/function/model/msg'
import { Notice, SystemNotice } from '@renderer/function/model/notice'
import { IUser } from '@renderer/function/model/user'
import { runtimeData } from '@renderer/function/msg'
import { isShowTime } from '@renderer/function/utils/msgUtil'
import app from '@renderer/main'
import { MsgPrevPan } from './MsgPrevPan.vue'
import { UserInfoPan } from './UserInfoPan.vue'

//#region ====定义与导出============================================
const {
    msgs,
    showMsgMenu,
    showUserMenu,
    config = {
        canInteraction: true,
        specialMe: true,
        showIcon: true,
        dimNonExistentMsg: true,
    },
    userInfoPan,
    msgPrevPan,
} = defineProps<{
    msgs: Message[],
    showMsgMenu?: (eventData: MenuEventData, msg: Msg) => (Promise<void> | void),
    showUserMenu?: (eventData: MenuEventData, user: IUser) => (Promise<void> | void),
    config?: MsgBodyConfig & { canInteraction?: boolean },
    userInfoPan?: UserInfoPan,
    msgPrevPan?: MsgPrevPan,
}>()

const emit = defineEmits<{
    msgClick: [event: MouseEvent, msg: Msg],
    imageLoaded: [height: number],
    leftMove: [msg: Msg],
    rightMove: [msg: Msg],
    senderDoubleClick: [user: IUser],
    emojiClick: [id: string, msg: Msg],
}>()

const allowInteraction = shallowRef<boolean>(config.canInteraction ?? true)
const multiselectMode = shallowRef<boolean>(false)
const multipleSelectList = shallowReactive<Set<Msg>>(new Set)
const multipleSelectListCardNum = shallowRef<number>(0)
const selectMsg = shallowRef<undefined|Msg>()

defineExpose({
    setAllowInteraction,
    getAllowInteraction,
    startMultiselect,
    cancelMultiselect,
    isMultiselectMode,
    forceAddToMultiselectList,
    getMultiselectListLength,
    getMultiselectList,
    multiCanForward,
})
//#endregion

//#region ====交互相关==============================================
/**
 * 设置是否允许交互
 * @param allow 是否允许交互
 */
function setAllowInteraction(allow: boolean) {
    allowInteraction.value = allow
}
/**
 * 获取是否允许交互
 * @returns {boolean} true: 允许交互，false: 不允许交互
 */
function getAllowInteraction(): boolean {
    return allowInteraction.value
}
//#endregion

//#region ====消息互动相关==========================================
function msgClick(event: MouseEvent, msg: Msg) {
    if (multiselectMode.value) {
        // 如果处于多选模式，添加或移除消息到多选列表
        toggleMsgInMultiselectList(msg)
    } else {
        // 否则，触发单击事件
        emit('msgClick', event, msg)
    }
}
function openMsgMenu(eventData: MenuEventData, msg: Msg) {
    if (!showMsgMenu) return
    selectMsg.value = msg
    // 打开菜单
    const closePromise = showMsgMenu(eventData, msg)
    if (!closePromise) return
    // 等待菜单关闭
    closePromise.then(() => {
        selectMsg.value = undefined
    })
}
function openUserMenu(eventData: MenuEventData, user: IUser) {
    if (!showUserMenu) return
    showUserMenu(eventData, user)
}
//#endregion


//#region ====多选模式相关==========================================
/**
 * 开始多选模式
 */
function startMultiselect() {
    multiselectMode.value = true
}
/**
 * 取消多选模式
 */
function cancelMultiselect() {
    multiselectMode.value = false
    multipleSelectList.clear()
    multipleSelectListCardNum.value = 0
}
/**
 * 是否处于多选模式
 * @returns {boolean} true: 多选模式，false: 非多选模式
 */
function isMultiselectMode(): boolean {
    return multiselectMode.value
}
/**
 * 强制添加消息到多选列表
 * @param msg 消息对象
 */
function forceAddToMultiselectList(msg: Msg) {
    if (!multiselectMode.value) throw new Error('多选模式未开启，无法添加消息到多选列表。')
    if (!multipleSelectList.has(msg)) multipleSelectList.add(msg)
}
/**
 * 获取多选列表长度
 * @returns {number} 多选列表长度
 */
function getMultiselectListLength(): number {
    if (!multiselectMode.value) throw new Error('多选模式未开启，无法获取多选列表长度。')
    return multipleSelectList.size
}
/**
 * 获取多选列表
 * 该列表已经过排序,可以直接使用
 * 如果仅需要列表长度,不要用该函数,用`getMultiselectListLength`
 * @returns {Msg[]} 多选列表
 */
function getMultiselectList(): Msg[] {
    const out: Msg[] = []
    for (const msg of msgs) {
        if (!(msg instanceof Msg)) continue
        if (multipleSelectList.has(msg)) {
            out.push(msg)
        }
    }
    return out
}
/**
 * 判断能否转发,并给出理由,可以转发时给出空字符串
 * @returns {string} 不可转发原因
 */
function multiCanForward(): string {
    const { $t } = app.config.globalProperties
    if (multipleSelectListCardNum.value > 0) return $t('暂不支持转发卡片消息')
    if (multipleSelectList.size === 0) return $t('请选择要转发的消息')
    if (multipleSelectList.size > 99) return $t('最多只能转发99条消息')
    return ''
}
function toggleMsgInMultiselectList(msg: Msg) {
    if (!multiselectMode.value) {
        throw new Error('多选模式未开启，无法添加消息到多选列表。')
    }
    if (!multipleSelectList.has(msg)) {
        multipleSelectList.add(msg)
        if (msg.hasCard()) multipleSelectListCardNum.value ++
    }
    else {
        multipleSelectList.delete(msg)
        if (msg.hasCard()) multipleSelectListCardNum.value --
    }
}
//#endregion


//#region ====工具函数==============================================
function isSelected(msg: Msg): boolean{
    return multipleSelectList.has(msg) || selectMsg.value === msg
}
//#endregion
</script>
<style scoped>
/* 消息动画 */
.msglist-move {
    transition: all 0.3s;
}

.msglist-enter-active {
    transition: all 0.4s;
}

.msglist-leave-active {
    transition: all 0.2s;
}

.msglist-enter-from {
    transform: translateX(-20px);
    opacity: 0;
}

.msglist-leave-to {
    opacity: 0;
}

.disable-interaction :deep(*) {
    pointer-events: none;
}
.disable-interaction {
    pointer-events: auto;
}
.disable-interaction > div {
    pointer-events: auto;
}
</style>
