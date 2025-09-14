<template>
    <Transition name="merge-pan">
        <Teleport v-if="runtimeData.mergeMsgStack.length > 0 " to="body">
            <div
                class="merge-pan"
                @wheel="chatWheelEvent"
                @touchstart="chatMoveStartEvent"
                @touchmove="chatMoveEvent"
                @touchend="chatMoveEndEvent">
                <div @click="closeMergeMsg" />
                <div ref="mergePan" class="ss-card">
                    <div>
                        <font-awesome-icon style="margin-top: 5px" :icon="['fas', 'message']" />
                        <span>{{ $t('合并消息') }}</span>
                        <font-awesome-icon :icon="['fas', runtimeData.mergeMsgStack.length > 1 ? 'angle-left' : 'xmark']" @click="exitMergeMsg" />
                    </div>
                    <div ref="mergeBar">
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
                            <div v-if="refs().msgBar!.multiCanForward()">
                                <font-awesome-icon style="color: var(--color-red)" :icon="['fas', 'fa-xmark']" @click="
                                    new PopInfo().add(PopType.ERR, refs().msgBar!.multiCanForward());
                                " />
                                <span>{{ $t('合并转发') }}</span>
                            </div>
                            <div v-else>
                                <font-awesome-icon :icon="['fas', 'fa-share-from-square']" @click="sendMergeForward" />
                                <span>{{ $t('合并转发') }}</span>
                            </div>
                            <div v-if="refs().msgBar!.multiCanForward()">
                                <font-awesome-icon style="color: var(--color-red)" :icon="['fas', 'fa-xmark']" @click="
                                    new PopInfo().add(PopType.ERR, refs().msgBar!.multiCanForward());
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
                                ">{{ refs().msgBar!.getMultiselectListLength() }}</span>
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
import { runtimeData } from '@renderer/function/msg'
import { downloadFile } from '@renderer/function/utils/appUtil'
import { wheelMask } from '@renderer/function/utils/input'
import { isShowTime, mergeForward, singleForward } from '@renderer/function/utils/msgUtil'
import { copyToClipboard, getViewTime } from '@renderer/function/utils/systemUtil'
import { useViewportUnits } from '@renderer/function/utils/vuse'
import { defineComponent, nextTick, Reactive } from 'vue'

const { vw } = useViewportUnits()

</script>

<script lang="ts">
    type ComponentRefs = {
        msgBar: InstanceType<typeof MsgBar>
        msgMenu: InstanceType<typeof Menu>
        mergeBar: HTMLDivElement
        mergePan: HTMLDivElement
    }

    export default defineComponent({
        name: 'MergePan',
        data() {
            const stack = runtimeData.mergeMsgStack
            return {
                runtimeData,
                stack,
                nowData: stack.at(-1),
                isShowTime,
                positionCache: [] as number[],
                addMode: true,
                chatMove: {
                    move: 0,
                    onScroll: 'none' as 'none' | 'touch' | 'wheel',
                    lastTime: null as null | number,
                    speedList: [] as number[],
                    touchLast: null as null | TouchEvent,
                },
                menuDisplay: {
                    canForward: false,
                    downloadImgSrc: '',
                    selectMsg: null as null | Msg,
                },
                isMultiselectMode: false,
                PopInfo,
                PopType,
                Message,
            }
        },
        mounted() {
            this.$watch(
                () => runtimeData.mergeMsgStack.length,
                (newLength, oldLength) => {
                    // 最后一个保留下来做展开关闭动画
                    if(this.stack.length !== 0) this.nowData = this.stack.at(-1)

                    // 判断是增加还是减少
                    if (newLength > oldLength) this.addMode = true
                    else if (newLength < oldLength) this.addMode = false
                }
            )
        },
        methods: {
            /**
             * 退出一层合并转发弹窗
             */
            exitMergeMsg() {
                this.stack.length --
            },

            /**
             * 关闭合并转发弹窗
             */
            closeMergeMsg() {
                this.stack.length = 0
                this.positionCache = []
            },

            isMergeOpen() {
                return this.stack.length > 0
            },
            /**
             * 保存滚动位置
             */
            saveScrollPosition() {
                const msgBarElement = this.refs().mergeBar
                if (!msgBarElement) return
                this.positionCache.push(msgBarElement.scrollTop)
            },
            /**
             * 恢复滚动位置
             */
            restoreScrollPosition() {
                const position = this.positionCache.pop()
                const msgBarElement = this.refs().mergeBar
                if (!msgBarElement || position === undefined) return
                nextTick(() => {
                    msgBarElement.scrollTop = position
                })
            },

            //#region == 窗口移动相关 ==================================================
            // 滚轮滑动
            chatWheelEvent(event: WheelEvent) {
                const process = (event: WheelEvent) => {
                    // 正在触屏,不处理
                    if (this.chatMove.onScroll === 'touch') return false
                    const x = event.deltaX
                    const y = event.deltaY
                    const absX = Math.abs(x)
                    const absY = Math.abs(y)
                    // 斜度过大
                    if (absY !== 0 && absX / absY < 2) return false
                    this.dispenseMove('wheel', -x / 3)
                    return true
                }
                if (!process(event)) return
                event.preventDefault()
                // 创建遮罩
                // 由于在窗口移动中,窗口判定箱也在移动,当指针不再窗口外,事件就断了
                // 所以要创建一个不会动的全局遮罩来处理
                wheelMask(process,()=>{
                    this.dispenseMove('wheel', 0, true)
                })
            },

            // 触屏开始
            chatMoveStartEvent(event: TouchEvent) {
                if (this.chatMove.onScroll === 'wheel') return
                // 触屏开始时，记录触摸点
                this.chatMove.touchLast = event
            },

            // 触屏滑动
            chatMoveEvent(event: TouchEvent) {
                if (this.chatMove.onScroll === 'wheel') return
                if (!this.chatMove.touchLast) return
                const touch = event.changedTouches[0]
                const lastTouch = this.chatMove.touchLast.changedTouches[0]
                const deltaX = touch.clientX - lastTouch.clientX
                const deltaY = touch.clientY - lastTouch.clientY
                const absX = Math.abs(deltaX)
                const absY = Math.abs(deltaY)
                // 斜度过大
                if (absY !== 0 && absX / absY < 2) return
                // 触屏移动
                this.chatMove.touchLast = event
                this.dispenseMove('touch', deltaX)
            },

            // 触屏滑动结束
            chatMoveEndEvent(event: TouchEvent) {
                if (this.chatMove.onScroll === 'wheel') return
                const touch = event.changedTouches[0]
                const lastTouch = this.chatMove.touchLast?.changedTouches[0]
                if (lastTouch) {
                    const deltaX = touch.clientX - lastTouch.clientX
                    const deltaY = touch.clientY - lastTouch.clientY
                    const absX = Math.abs(deltaX)
                    const absY = Math.abs(deltaY)
                    // 斜度过大
                    if (absY === 0 || absX / absY > 2) {
                        this.dispenseMove('touch', deltaX)
                    }
                }
                this.dispenseMove('touch', 0, true)
                this.chatMove.touchLast = null
            },
            /**
             * 分发触屏/滚轮情况
             */
            dispenseMove(type: 'touch' | 'wheel', value: number, end: boolean = false) {
                if (!end && this.chatMove.onScroll === 'none') this.startMove(type, value)
                if (this.chatMove.onScroll === 'none') return
                if (end) this.endMove()
                else this.keepMove(value)
            },
            /**
             * 开始窗口移动
             */
            startMove(type: 'touch' | 'wheel', value: number) {
                // 移除不需要的css
                const target = this.refs().mergePan
                target.style.transition = 'all 0s'
                // 禁用滚动
                target.style.overflowY = 'hidden'
                // 记录移动状态
                this.chatMove.onScroll = type
                this.chatMove.move = value
                this.chatMove.lastTime = Date.now()
            },
            /**
             * 保持窗口移动
             */
            keepMove(value: number){
                this.chatMove.move += value
                const nowDate = Date.now()
                if (!this.chatMove.lastTime) return
                const deltaTime = nowDate - this.chatMove.lastTime
                this.chatMove.lastTime = nowDate
                this.chatMove.speedList.push(
                    value / deltaTime
                )
                if (this.chatMove.move < 0) this.chatMove.move = 0
                const move = this.chatMove.move
                const target = this.refs().mergePan as HTMLDivElement
                target.style.width = `${450 - move}px`
            },
            /**
             * 结束窗口移动
             */
            endMove() {
                // 保留自己要的数据
                const move = this.chatMove.move
                const speedList = this.chatMove.speedList
                // 重置数据
                this.chatMove.onScroll = 'none'
                this.chatMove.lastTime = 0
                this.chatMove.speedList = []
                this.chatMove.move = 0
                // 复原css
                const target = this.refs().mergePan as HTMLDivElement
                target.style.overflowY = 'auto'
                target.style.transition = 'transform 0.3s'
                // 如果移动距离大于屏幕宽度的三分之一，视为关闭
                if (move > 150) {
                    return this.closeMergeMsg()
                }
                // 末端速度法
                // 防止误触
                if (move < runtimeData.inch * 0.5) {
                    const endSpeedList = speedList.reverse().slice(0, 10)
                    let endSpeed = 0
                    for (const speed of endSpeedList) {
                        endSpeed += speed
                    }
                    endSpeed /= endSpeedList.length
                    endSpeed /= runtimeData.inch
                    // 如果末端速度大于 5，则视为关闭
                    if (endSpeed > 5) {
                        return this.closeMergeMsg()
                    }
                }
                // 最后再复原大小
                target.style.width = '450px'
            },
            //#endregion

            //#region == 菜单栏相关 ====================================================
            /**
             * 显示消息右键菜单
             * @param data 右键菜单事件数据
             * @param msg 消息对象
             * @returns 显示菜单的 Promise, 关闭菜单后完成委托
             */
            showMsgMenu(data: MenuEventData, msg: Msg): Promise<void> | undefined {
                new Logger().debug('右击消息：' + data)

                const menu = this.refs().msgMenu as InstanceType<typeof Menu>
                if (!menu) return
                if (menu.isShow()) return

                this.menuDisplay.selectMsg = msg as unknown as Reactive<Msg>
                this.menuDisplay.canForward = true
                this.menuDisplay.downloadImgSrc = ''

                // 不能转发卡片消息
                // TODO 有卡片签名的客户端适配
                if (msg.hasCard()) {
                    // 如果包含以上消息类型，不能转发
                    this.menuDisplay.canForward = false
                }
                if (data.target.nodeName == 'IMG') {
                    // 右击图片需要显示的内容，这边特例设置为链接
                    this.menuDisplay.downloadImgSrc = (
                        data.target as HTMLImageElement
                    ).src
                }

                const promise = menu.showMenu(data.x, data.y) as Promise<void>

                return promise
            },
            /**
             * 关闭消息菜单
             */
            closeMsgMenu() {
                const menu = this.refs().msgMenu as InstanceType<typeof Menu>
                if (menu && menu.isShow()) {
                    menu.closeMenu()
                }
            },
            /**
             * 转发
             */
            showForWard() {
                if (!this.menuDisplay.selectMsg) return

                singleForward([this.menuDisplay.selectMsg as unknown as Msg])
                this.closeMsgMenu()
            },
            /**
             * 多选
             */
            intoMultipleSelect() {
                const msgBar = this.refs().msgBar as InstanceType<typeof MsgBar>
                msgBar?.startMultiselect()
                this.isMultiselectMode = true
                if (this.menuDisplay.selectMsg) {
                    msgBar?.forceAddToMultiselectList(this.menuDisplay.selectMsg as unknown as Msg)
                }
                this.closeMsgMenu()
            },
            /**
             * 复制选中的消息
             */
            copyMsg() {
                const msg = this.menuDisplay.selectMsg
                if (!msg) return

                const popInfo = new PopInfo()
                copyToClipboard(msg.plaintext())
                    .then(
                        () => popInfo.add(PopType.INFO, this.$t('复制成功'))
                    ).catch(
                        () => popInfo.add(PopType.ERR, this.$t('复制失败'))
                    )

                this.closeMsgMenu()
            },
            /**
             * 下载选中的图片
             */
            downloadImg() {
                const url = this.menuDisplay.downloadImgSrc
                if (url) {
                    downloadFile(url as string, 'img.png', () => undefined, () => undefined)
                }
                this.closeMsgMenu()
            },
            //#endregion

            //#region == 多选栏相关 ====================================================
            /**
             * 合并转发
             */
            sendMergeForward(){
                const msgBar = this.refs().msgBar
                if (!msgBar) return
                const msgList = msgBar.getMultiselectList()
                if (msgList.length === 0) return

                mergeForward(msgList)

                this.closeMultiselect()
            },
            /**
             * 逐条转发
             */
            sendSingleForward(){
                const msgBar = this.refs().msgBar
                if (!msgBar) return
                const msgList = msgBar.getMultiselectList()
                if (msgList.length === 0) return

                singleForward(msgList)

                this.closeMultiselect()
            },
            /**
             * 删除消息
             */
            delMsgs() {
                new PopInfo().add(
                    PopType.INFO,
                    this.$t('欸嘿，这个按钮只是用来占位置的'),
                )
            },
            /**
             * 复制消息
             */
            copyMsgs() {
                const msgBar = this.refs().msgBar
                if (!msgBar) return
                const msgList = msgBar.getMultiselectList()
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
                        () => popInfo.add(PopType.INFO, this.$t('复制成功'))
                    ).catch(
                        () => popInfo.add(PopType.ERR, this.$t('复制失败'))
                    )
            },
            closeMultiselect() {
                const msgBar = this.refs().msgBar
                if (!msgBar) return
                msgBar.cancelMultiselect()
                this.isMultiselectMode = false
            },
            //#endregion

            /**
             * 带类型的refs()
             */
            refs(): ComponentRefs {
                return this.$refs as ComponentRefs
            }
        }
    })
</script>
