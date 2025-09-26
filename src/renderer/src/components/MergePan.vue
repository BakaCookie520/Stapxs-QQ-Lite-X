<template>
    <Transition name="merge-pan">
        <Teleport v-if="runtimeData.mergeMsgStack.length > 0 " to="body">
            <div
                v-move="chatMoveOptions"
                class="merge-pan"
                @v-move-right="closeMergeMsg">
                <div @click="closeMergeMsg" />
                <div ref="mergePan" class="ss-card">
                    <div>
                        <font-awesome-icon style="margin-top: 5px" :icon="['fas', 'message']" />
                        <span>{{ $t('合并消息') }}</span>
                        <font-awesome-icon :icon="['fas', runtimeData.mergeMsgStack.length > 1 ? 'angle-left' : 'xmark']" @click="exitMergeMsg" />
                    </div>
                    <div>
                        <Transition
                            :name="addMode ? 'merge-node-add' : 'merge-node-remove'"
                            mode="out-in"
                            @leave="if(addMode){saveScrollPosition();}"
                            @enter="if(!addMode){restoreScrollPosition();}">
                            <div v-if="nowData === undefined && runtimeData.mergeMsgStack.length === 0"
                                class="merge-node">
                                <!-- 无内容 -->
                            </div>
                            <div v-else-if="!nowData?.content" :class=" 'loading show'"
                                class="merge-node">
                                <font-awesome-icon :icon="['fas', 'spinner']" />
                                <span>{{ $t('加载中') }}</span>
                            </div>

                            <KeepAlive v-else>
                                <MsgBar
                                    ref="msgBar"
                                    :key="'merge-' + nowData.id"
                                    :msgs="nowData.content as Message[]"
                                    :show-msg-menu="showMsgMenu"
                                    :special-self="false"
                                    :direction="vw * 100 > 450 ? 'right' : 'left'"
                                    :show-time="false"
                                    class="merge-node" />
                            </KeepAlive>
                        </Transition>
                    </div>
                    <!-- 多选指示器 -->
                    <Transition name="select-tag">
                        <div v-if="isMultiselectMode" class="select-tag">
                            <div v-if="msgBarEl!.multiCanForward()">
                                <font-awesome-icon style="color: var(--color-red)" :icon="['fas', 'fa-xmark']" @click="
                                    new PopInfo().add(PopType.ERR, msgBarEl!.multiCanForward());
                                " />
                                <span>{{ $t('合并转发') }}</span>
                            </div>
                            <div v-else>
                                <font-awesome-icon :icon="['fas', 'fa-share-from-square']" @click="sendMergeForward" />
                                <span>{{ $t('合并转发') }}</span>
                            </div>
                            <div v-if="msgBarEl!.multiCanForward()">
                                <font-awesome-icon style="color: var(--color-red)" :icon="['fas', 'fa-xmark']" @click="
                                    new PopInfo().add(PopType.ERR, msgBarEl!.multiCanForward());
                                " />
                                <span>{{ $t('逐条转发') }}</span>
                            </div>
                            <div v-else>
                                <font-awesome-icon :icon="['fas', 'fa-arrows-turn-right']" @click="sendSingleForward" />
                                <span>{{ $t('逐条转发') }}</span>
                            </div>
                            <div>
                                <font-awesome-icon :icon="['fas', 'scissors']" />
                                <span>{{ $t('截图') }}</span>
                            </div>
                            <div>
                                <font-awesome-icon :icon="['fas', 'copy']" @click="copyMsgs" />
                                <span>{{ $t('复制') }}</span>
                            </div>
                            <div>
                                <span @click="
                                    closeMultiselect();
                                ">{{ msgBarEl!.getMultiselectListLength() }}</span>
                                <span>{{ $t('取消') }}</span>
                            </div>
                        </div>
                    </Transition>
                </div>
            </div>
        </Teleport>
    </Transition>
    <Menu ref="msgMenu" name="chat-menu">
        <div class="ss-card msg-menu-body" @click.stop>
            <div v-show="menuDisplay.canForward" @click="showForWard()">
                <div><font-awesome-icon :icon="['fas', 'share']" /></div>
                <a>{{ $t('转发') }}</a>
            </div>
            <div @click="intoMultipleSelect()">
                <div><font-awesome-icon :icon="['fas', 'circle-check']" /></div>
                <a>{{ $t('多选') }}</a>
            </div>
            <div @click="copyMsg">
                <div><font-awesome-icon :icon="['fas', 'clipboard']" /></div>
                <a>{{ $t('复制') }}</a>
            </div>
            <div v-show="menuDisplay.downloadImgSrc" @click="downloadImg">
                <div><font-awesome-icon :icon="['fas', 'floppy-disk']" /></div>
                <a>{{ $t('下载图片') }}</a>
            </div>
        </div>
    </Menu>
</template>

<script setup lang="ts">
import Menu from './Menu.vue'
import MsgBar from './MsgBar.vue'

import { Logger, PopInfo, PopType } from '@renderer/function/base'
import { MenuEventData } from '@renderer/function/elements/information'
import { Message } from '@renderer/function/model/message'
import { Msg } from '@renderer/function/model/msg'
import { ForwardSeg } from '@renderer/function/model/seg'
import { runtimeData } from '@renderer/function/msg'
import { downloadFile } from '@renderer/function/utils/appUtil'
import { mergeForward, singleForward } from '@renderer/function/utils/msgUtil'
import { copyToClipboard, getViewTime } from '@renderer/function/utils/systemUtil'
import { vMove, VMoveOptions } from '@renderer/function/utils/vcmd'
import { useViewportUnits } from '@renderer/function/utils/vuse'
import app from '@renderer/main'
import { nextTick, shallowReactive, shallowRef, useTemplateRef, watch } from 'vue'

const { vw } = useViewportUnits()
const stack = runtimeData.mergeMsgStack
const nowData = shallowRef<undefined | ForwardSeg>()
const addMode = shallowRef(true)
const positionCache: number[] = []
const menuDisplay = shallowReactive({
    canForward: false,
    downloadImgSrc: '',
    selectMsg: null as null | Msg,
})
const isMultiselectMode = shallowRef(false)

const msgBarEl = useTemplateRef('msgBar')
const menuEl = useTemplateRef('msgMenu')
const mergePanEl = useTemplateRef('mergePan')

const chatMoveOptions: VMoveOptions<HTMLDivElement> = {
    beforeHook: (_) => {
        // 移除不需要的css
        const target = mergePanEl.value!
        target.style.transition = 'all 0s'
        // 禁用滚动
        target.style.overflowY = 'hidden'
    },
    moveHook: (_, move: number) => {
        // 移动距离 css
        const target = mergePanEl.value!
        target.style.width = `${450 - move}px`
    },
    endHook: (_) => {
        // 复原css
        const target = mergePanEl.value!
        target.style.overflowY = 'auto'
        target.style.transition = 'transform 0.3s'
    },
    rightLimit: {
        value: 100,
        type: '%',
    },
    speedCondition: {
        minMove: {
            value: runtimeData.cm,
            type: 'px',
        },
        minSpeed: 10 * runtimeData.cm,
    },
    moveCondition: {
        minMove: {
            value: 33,
            type: '%',
        }
    },
}

watch(
    () => runtimeData.mergeMsgStack.length,
    (newLength, oldLength) => {
        // 最后一个保留下来做展开关闭动画
        if(stack.length !== 0) nowData.value = stack.at(-1)

        // 判断是增加还是减少
        if (newLength > oldLength) addMode.value = true
        else if (newLength < oldLength) addMode.value = false
    }
)

function $t(value: string) {
    return app.config.globalProperties.$t(value)
}

//#region == 操作与状态 ===================================================
/**
 * 退出一层合并转发弹窗
 */
function exitMergeMsg() {
    stack.length --
}
/**
 * 关闭合并转发弹窗
 */
function closeMergeMsg() {
    stack.length = 0
    positionCache.length = 0
}
/**
 * 判断合并转发弹窗是否打开
 * @returns 是否打开
 */
function isMergeOpen() {
    return stack.length > 0
}
//#endregion

//#region == 菜单栏相关 ====================================================
/**
 * 显示消息右键菜单
 * @param data 右键菜单事件数据
 * @param msg 消息对象
 * @returns 显示菜单的 Promise, 关闭菜单后完成委托
 */
function showMsgMenu(data: MenuEventData, msg: Msg): Promise<void> | undefined {
    new Logger().debug('右击消息：' + data)

    if (!menuEl.value) return
    if (menuEl.value.isShow()) return

    menuDisplay.selectMsg = msg
    menuDisplay.canForward = true
    menuDisplay.downloadImgSrc = ''

    // 不能转发卡片消息
    // TODO 有卡片签名的客户端适配
    if (msg.hasCard()) {
        // 如果包含以上消息类型，不能转发
        menuDisplay.canForward = false
    }
    if (data.target.nodeName == 'IMG') {
        // 右击图片需要显示的内容，这边特例设置为链接
        menuDisplay.downloadImgSrc = (
            data.target as HTMLImageElement
        ).src
    }

    const promise = menuEl.value.showMenu(data.x, data.y) as Promise<void>

    return promise
}
/**
 * 关闭消息菜单
 */
function closeMsgMenu() {
    if (menuEl.value && menuEl.value.isShow()) {
        menuEl.value.closeMenu()
    }
}
/**
 * 转发
 */
function showForWard() {
    if (!menuDisplay.selectMsg) return

    singleForward([menuDisplay.selectMsg])
    closeMsgMenu()
}
/**
 * 多选
 */
function intoMultipleSelect() {
    msgBarEl.value?.startMultiselect()
    isMultiselectMode.value = true
    if (menuDisplay.selectMsg) {
        msgBarEl.value?.forceAddToMultiselectList(menuDisplay.selectMsg as unknown as Msg)
    }
    closeMsgMenu()
}
/**
 * 复制选中的消息
 */
function copyMsg() {
    const msg = menuDisplay.selectMsg
    if (!msg) return

    const popInfo = new PopInfo()
    copyToClipboard(msg.plaintext())
        .then(
            () => popInfo.add(PopType.INFO, $t('复制成功'))
        ).catch(
            () => popInfo.add(PopType.ERR, $t('复制失败'))
        )

    closeMsgMenu()
}
/**
 * 下载选中的图片
 */
function downloadImg() {
    const url = menuDisplay.downloadImgSrc
    if (url) {
        downloadFile(url as string, 'img.png', () => undefined, () => undefined)
    }
    closeMsgMenu()
}
//#endregion

//#region == 多选栏相关 ====================================================
/**
 * 合并转发
 */
function sendMergeForward(){
    if (!msgBarEl.value) return
    const msgList = msgBarEl.value.getMultiselectList()
    if (msgList.length === 0) return

    mergeForward(msgList)

    closeMultiselect()
}
/**
 * 逐条转发
 */
function sendSingleForward(){
    if (!msgBarEl.value) return
    const msgList = msgBarEl.value.getMultiselectList()
    if (msgList.length === 0) return

    singleForward(msgList)

    closeMultiselect()
}

/**
 * 复制消息
 */
function copyMsgs() {
    if (!msgBarEl.value) return
    const msgList = msgBarEl.value.getMultiselectList()
    let msg = ''
    let lastDate = ''
    msgList.forEach((item: Msg) => {
        let time: Date | undefined
        // 去除 item.time 时间戳中的时间，只保留日期
        if (item.time) {
            time = new Date(getViewTime(item.time.time))
            const date =
                time.getFullYear() +
                '-' +
                (time.getMonth() + 1) +
                '-' +
                time.getDate()
            if (date != lastDate) {
                msg += '\n—— ' + date + ' ——\n'
                lastDate = date
            }
        }
        if (time) {
            msg += item.sender.name +
            ' ' +
            time.getHours() +
            ':' +
            time.getMinutes() +
            ':' +
            time.getSeconds() +
            '\n' +
            item.plaintext() +
            '\n\n'
        }
        else msg += item.preMsg + '\n\n'

    })
    msg = msg.trim()
    const popInfo = new PopInfo()
    copyToClipboard(msg)
        .then(
            () => popInfo.add(PopType.INFO, $t('复制成功'))
        ).catch(
            () => popInfo.add(PopType.ERR, $t('复制失败'))
        )
}
function closeMultiselect() {
    if (!msgBarEl.value) return
    msgBarEl.value.cancelMultiselect()
    isMultiselectMode.value = false
}
//#endregion

//#region == 滚动辅助函数 =================================================
/**
 * 保存滚动位置
 */
function saveScrollPosition() {
    if (!msgBarEl.value) return
    positionCache.push((msgBarEl.value as any as HTMLDivElement).scrollTop)
}
/**
 * 恢复滚动位置
 */
function restoreScrollPosition() {
    const position = positionCache.pop()
    if (!msgBarEl.value || position === undefined) return
    nextTick(() => {
        (msgBarEl.value as any as HTMLDivElement).scrollTop = position
    })
}
//#endregion

defineExpose({
    isMergeOpen,
    closeMergeMsg,
})
</script>
