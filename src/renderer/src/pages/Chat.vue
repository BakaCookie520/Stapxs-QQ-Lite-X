<!--
 * @FileDescription: 聊天面板页面
 * @Author: Stapxs
 * @Date:
 *      2022/08/14
 *      2022/12/12
 *      2025/08/21
 *      2025/09/29
 * @Version:
 *      1.0 - 初始版本
 *      1.5 - 重构为 ts 版本，代码格式优化
 *      2.0 - 重构为 setup 式Api(Mr.Lee)
 *      2.1 - 简化代码结构，拆分成多个文件(Mr.Lee)
-->

<template>
    <div ref="chat-pan"
        v-move="chatMoveOptions"
        :class="{
            'chat-pan': true,
        }"
        :style="{
            '--bottom-height': bottomHeight + 'px',
            '--head-height': headHeight + 'px',
        }"
        @v-move-right.prevent="exitWin()">
        <!-- 聊天基本信息 -->
        <ChatHead :session="chat" />

        <!-- 消息显示区 -->
        <div id="msgPan" ref="msgPan" class="chat"
            style="scroll-behavior: smooth"
            @scroll="chatScroll">
            <!-- 前缀 -->
            <!-- 通常 -->
            <CustomHr v-if="chat.loadHistoryState === 'loading'">
                <a class="chat-hr-note">{{ $t('获取历史记录ing') }}</a>
            </CustomHr>
            <CustomHr v-else-if="chat.loadHistoryState === 'fail'">
                <a class="chat-hr-note">{{ $t('获取历史记录失败') }}</a>
            </CustomHr>
            <CustomHr v-else-if="chat.loadHistoryState === 'end'">
                <a class="chat-hr-note">{{ $t('没有更多消息啦～') }}</a>
            </CustomHr>
            <MsgBar
                ref="msgBar"
                :key="chat.id"
                :msgs="chat.messageList"
                :show-msg-menu="showMsgMenu"
                :show-user-menu="showUserMenu"
                :user-info-pan="userInfoPanFunc"
                :msg-prev-pan="msgPrevPanFunc"
                :show-self-avatar="runtimeData.sysConfig.hide_self_avatar === false"
                :self-direction="runtimeData.sysConfig.self_msg_direction"
                @image-loaded="imgLoadedScroll"
                @left-move="replyMsg"
                @sender-double-click="(user)=>sendPoke(user)"
                @emoji-click="changeRespond" />
        </div>

        <!-- 滚动到底部悬浮标志 -->
        <div v-hide="!tags.showBottomButton"
            class="new-msg"
            @click="scrollBottom(true)">
            <div class="ss-card">
                <font-awesome-icon :icon="['fas', 'comment']" />
                <span v-if="chat.newMsg > 0">{{ chat.newMsg }}</span>
            </div>
        </div>

        <!-- 多选指示器 -->
        <Transition name="select-tag">
            <div v-if="tags.isMultiselectMode" class="select-tag ss-card">
                <div v-if="msgBar!.multiCanForward()">
                    <font-awesome-icon style="color: var(--color-red)" :icon="['fas', 'fa-xmark']" @click="
                        new PopInfo().add(PopType.ERR, msgBar!.multiCanForward());
                    " />
                    <span>{{ $t('合并转发') }}</span>
                </div>
                <div v-else>
                    <font-awesome-icon :icon="['fas', 'fa-share-from-square']" @click="sendMergeForward" />
                    <span>{{ $t('合并转发') }}</span>
                </div>
                <div v-if="msgBar!.multiCanForward()">
                    <font-awesome-icon style="color: var(--color-red)" :icon="['fas', 'fa-xmark']" @click="
                        new PopInfo().add(PopType.ERR, msgBar!.multiCanForward());
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
                    <font-awesome-icon :icon="['fas', 'trash-can']" @click="delMsgs" />
                    <span>{{ $t('删除') }}</span>
                </div>
                <div>
                    <font-awesome-icon :icon="['fas', 'copy']" @click="copyMsgs" />
                    <span>{{ $t('复制') }}</span>
                </div>
                <div>
                    <span @click="
                        msgBar!.cancelMultiselect();
                        tags.isMultiselectMode=false
                    ">{{ msgBar!.getMultiselectListLength() }}</span>
                    <span>{{ $t('取消') }}</span>
                </div>
            </div>
        </Transition>

        <!-- 底部区域 -->
        <ChatBottom ref="bottom" v-model="inputMsg"
            :session="chat"
            :focus-hide="tags.isMultiselectMode"
            @send-poke="sendPoke"
            @scroll-bottom="scrollBottom" />

        <!-- 合并转发消息预览器 -->
        <MergePan ref="mergePan" />
        <!-- At 信息悬浮窗 -->
        <UserInfoPanComponent :data="userInfoPanData" />
        <!-- msg 预览栏 -->
        <MsgPrevPanComponent :data="msgPrevPanData" />
        <!-- 消息右击菜单 -->
        <Menu ref="msgMenu" name="chat-menu">
            <div>
                <div v-if="chat instanceof GroupSession"
                    v-show="menuDisplay.showRespond"
                    :class="{
                        'ss-card': true,
                        'respond': true,
                        'open': menuDisplay.respond
                    }"
                    @click.stop>
                    <div @wheel="
                        !menuDisplay.respond ?
                            ($event.currentTarget as HTMLElement).scrollLeft += $event.deltaY
                            : ''
                    ">
                        <EmojiFace
                            v-for="num in Emoji.responseId"
                            :key="'respond-' + num"
                            :emoji="Emoji.get(num)"
                            @click="menuDisplay.menuSelectedMsg ?
                                changeRespond(String(num), menuDisplay.menuSelectedMsg as Msg): ''" />
                    </div>
                    <font-awesome-icon :icon="['fas', 'angle-up']" @click="menuDisplay.respond = true" />
                </div>
                <span id="anchor" @click.stop />
                <div class="ss-card msg-menu-body" @click.stop>
                    <div v-show="menuDisplay.add" @click="forwardSelf()">
                        <div><font-awesome-icon :icon="['fas', 'plus']" /></div>
                        <a>{{ $t('+ 1') }}</a>
                    </div>
                    <div v-show="menuDisplay.reply" @click="menuReplyMsg(true)">
                        <div><font-awesome-icon :icon="['fas', 'message']" /></div>
                        <a>{{ $t('回复') }}</a>
                    </div>
                    <div v-show="menuDisplay.forward" @click="showForWard()">
                        <div><font-awesome-icon :icon="['fas', 'share']" /></div>
                        <a>{{ $t('转发') }}</a>
                    </div>
                    <div v-show="menuDisplay.select" @click="intoMultipleSelect()">
                        <div><font-awesome-icon :icon="['fas', 'circle-check']" /></div>
                        <a>{{ $t('多选') }}</a>
                    </div>
                    <div v-show="menuDisplay.copy" @click="copyMsg">
                        <div><font-awesome-icon :icon="['fas', 'clipboard']" /></div>
                        <a>{{ $t('复制') }}</a>
                    </div>
                    <div v-show="menuDisplay.copySelect" @click="copySelectMsg">
                        <div><font-awesome-icon :icon="['fas', 'code']" /></div>
                        <a>{{ $t('复制选中文本') }}</a>
                    </div>
                    <div v-show="menuDisplay.copyImg" @click="copyImg">
                        <div><font-awesome-icon :icon="['fas', 'object-ungroup']" /></div>
                        <a>{{ $t('复制图片') }}</a>
                    </div>
                    <div v-show="menuDisplay.downloadImg != false" @click="downloadImg">
                        <div><font-awesome-icon :icon="['fas', 'floppy-disk']" /></div>
                        <a>{{ $t('下载图片') }}</a>
                    </div>
                    <div v-show="menuDisplay.revoke" @click="recallMsg">
                        <div><font-awesome-icon :icon="['fas', 'xmark']" /></div>
                        <a>{{ $t('撤回') }}</a>
                    </div>
                    <div @click="deleteMsg">
                        <div><font-awesome-icon :icon="['fas', 'fa-trash']" style="color: var(--color-red)" /></div>
                        <a>{{ $t('删除') }}</a>
                    </div>
                    <div v-show="menuDisplay.dev" @click="consoleLogMsg">
                        <div><font-awesome-icon :icon="['fas', 'screwdriver-wrench']" /></div>
                        <a>{{ $t('调试信息') }}</a>
                    </div>
                </div>
            </div>
        </Menu>
        <Menu ref="userMenu" name="chat-menu">
            <div class="ss-card msg-menu-body" @click.stop>
                <div v-show="menuDisplay.at"
                    @click="menuDisplay.menuSelectedUser ?
                                chat.inputMsg.addSq(new AtSeg(menuDisplay.menuSelectedUser!.user_id)): '';
                            chatBottom?.toMainInput();
                            closeUserMenu();">
                    <div><font-awesome-icon :icon="['fas', 'at']" /></div>
                    <a>{{ $t('提及') }}</a>
                </div>
                <div v-show="menuDisplay.poke" @click="menuDisplay.menuSelectedUser ? sendPoke(menuDisplay.menuSelectedUser as Member) : ''">
                    <div><font-awesome-icon :icon="['fas', 'fa-hand-point-up']" /></div>
                    <a>{{ $t('戳一戳') }}</a>
                </div>
                <div v-show="menuDisplay.remove" @click="removeUser">
                    <div><font-awesome-icon :icon="['fas', 'trash-can']" /></div>
                    <a>{{ $t('移出群聊') }}</a>
                </div>
                <!-- TODO <div v-if="menuDisplay.menuSelectedUser instanceof Member" v-show="menuDisplay.config"
                    @click="openChatInfoPan();
                            infoRef?.openMoreConfig(menuDisplay.menuSelectedUser);
                            closeUserMenu();">
                    <div><font-awesome-icon :icon="['fas', 'cog']" /></div>
                    <a>{{ $t('成员设置') }}</a>
                </div> -->
            </div>
        </Menu>
    </div>
</template>

<script setup lang="ts">
import ChatBottom from '@renderer/components/chat/ChatBottom.vue'
import ChatHead from '@renderer/components/chat/ChatHead.vue'
import CustomHr from '@renderer/components/CustomHr.vue'
import EmojiFace from '@renderer/components/EmojiFace.vue'
import Menu from '@renderer/components/Menu.vue'
import MergePan from '@renderer/components/MergePan.vue'
import MsgBar from '@renderer/components/MsgBar.vue'
import MsgPrevPanComponent, { MsgPrevPan } from '@renderer/components/MsgPrevPan.vue'
import UserInfoPanComponent, { UserInfoPan } from '@renderer/components/UserInfoPan.vue'
import { Logger, LogType, PopInfo, PopType } from '@renderer/function/base'
import {
    MenuEventData,
} from '@renderer/function/elements/information'
import Emoji from '@renderer/function/model/emoji'
import { InputMsg } from '@renderer/function/model/inputMsg'
import { Msg } from '@renderer/function/model/msg'
import { AtSeg } from '@renderer/function/model/seg'
import { GroupSession, Session, UserSession } from '@renderer/function/model/session'
import { BaseUser, IUser, Member } from '@renderer/function/model/user'
import { runtimeData } from '@renderer/function/msg'
import { get } from '@renderer/function/option'
import { downloadFile, shouldAutoFocus } from '@renderer/function/utils/appUtil'
import {
    closeSession,
    mergeForward,
    sendMsgRaw,
    singleForward,
} from '@renderer/function/utils/msgUtil'
import { ensurePopBox } from '@renderer/function/utils/popBox'
import {
    copyToClipboard,
    getViewTime,
} from '@renderer/function/utils/systemUtil'
import { vHide, vMove, VMoveOptions } from '@renderer/function/utils/vcmd'
import { useFrame, useKeyboard, useViewportUnits } from '@renderer/function/utils/vuse'
import app from '@renderer/main'
import { backend } from '@renderer/runtime/backend'
import {
    nextTick,
    onMounted,
    shallowReactive,
    useTemplateRef,
    watch,
    shallowRef
} from 'vue'
//#region == 常量声明 ====================================================================
const { chat } = defineProps<{chat: Session}>()
const inputMsg = defineModel<InputMsg>({required: true})

const $t = app.config.globalProperties.$t
const { vh } = useViewportUnits()

//#region  == 模板引用 ======================================
const msgBar = useTemplateRef('msgBar')
const mergePan = useTemplateRef('mergePan')
const msgMenu = useTemplateRef('msgMenu')
const userMenu = useTemplateRef('userMenu')
const msgPan = useTemplateRef('msgPan')
const chatPan = useTemplateRef('chat-pan')
const chatBottom = useTemplateRef('bottom')
//#endregion

//#region == 用户信息栏相关 ================================
const userInfoPanData = shallowReactive<{
    user: undefined | IUser | number,
    x: number,
    y: number,
}>({
    user: undefined,
    x: 0,
    y: 0,
})
const headHeight = shallowRef(0)
const bottomHeight = shallowRef(0)
const userInfoPanFunc: UserInfoPan = {
    open: (user: IUser | number, x: number, y: number) => {
        userInfoPanData.user = user
        userInfoPanData.x = x
        userInfoPanData.y = y
    },
    close: () => {
        userInfoPanData.user = undefined
    },
}
//#endregion
//#region == 消息预览栏相关 ================================
const msgPrevPanData = shallowReactive<{
    msgs: undefined | Msg[] | string,
    x: number,
    y: number,
}>({
    msgs: undefined,
    x: 0,
    y: 0,
})
const msgPrevPanFunc: MsgPrevPan = {
    open: (msgs: Msg[] | string, x: number, y: number) => {
        msgPrevPanData.msgs = msgs
        msgPrevPanData.x = x
        msgPrevPanData.y = y
    },
    close: () => {
        msgPrevPanData.msgs = undefined
    },
}
//#endregion

const tagsDefault = {
    showBottomButton: false,
    isMultiselectMode: false,
}
const tags = shallowReactive({...tagsDefault})
//#endregion

//#region == 初始化 ======================================================================
onMounted(init)

// Capacitor：系统返回操作（Android）
if(backend.type == 'capacitor' &&
    backend.platform === 'android') {
    backend.addListener('App', 'backButton', () => {
        exitWin()
    })
}
// 新消息滚动到底部
Session.beforeNewMessageHook.push(async (session, _msg)=>{
    if (session !== chat) return

    const pan = msgPan.value
    if (!pan) return

    // 计算当前滚动位置距离底部的距离
    const distanceToBottom = pan.scrollHeight - pan.scrollTop - pan.clientHeight
    // 计算vh的像素值
    const vh = window.innerHeight / 100
    // 如果距离底部大于20vh，则不自动滚动
    if (distanceToBottom > 20 * vh) return

    nextTick(()=>{
        // 等待渲染完成
        setTimeout(() => {
            scrollBottom(true)
        }, 100)
    })
})

// 更新顶部高度
useFrame(()=>{
    const headBottom = document.getElementById('chat-head-bottom')
    if (!headBottom) return
    const headRect = headBottom.getBoundingClientRect()
    const height = headRect.bottom
    if (headHeight.value === height) return
    headHeight.value = height
})
// 更新底部高度
useFrame(()=>{
    const bottomTop = document.getElementById('chat-bottom-top')
    if (!bottomTop) return
    const bottomRect = bottomTop.getBoundingClientRect()
    let height = 100 * vh.value - bottomRect.top
    if (tags.isMultiselectMode) height = Math.max(height, 140)
    if (bottomHeight.value === height) return
    bottomHeight.value = height
})

// ctrl+w 关闭聊天框
useKeyboard('ctrl+w', ()=>{
    exitWin()
    return true
})
//#endregion

//#region == 侦测器 ======================================================================
watch(()=>chat?.id,init)
// Web：系统返回操作
watch(() => runtimeData.watch.backTimes, () => {
    exitWin()
})
//#endregion

//#region == 函数 ========================================================================
/**
 * 初始化自身
 */
function init() {
    // 重置部分状态数据
    Object.assign(tags, tagsDefault)
    chatBottom.value?.init()
    initMenuDisplay()
    // 聚焦输入框
    // PS: 有虚拟键盘的设备会弹键盘,要做判断
    if (shouldAutoFocus()) chatBottom.value?.toMainInput()
    // 滑动到底部
    nextTick(() => {
        scrollBottom(false)
    })
}
/**
 * 消息区滚动
 * @param event 滚动事件
 */
function chatScroll(event: Event) {
    const body = event.target as HTMLDivElement
    // 顶部
    if (body.scrollTop === 0 && chat.messageList.length > 0)
        loadHistory()

    // 底部
    if ((body.scrollTop + body.clientHeight + 10) >= body.scrollHeight) {
        chat.setRead()
        tags.showBottomButton = false
    }
    // 显示回到底部
    if (
        body.scrollTop <
            body.scrollHeight - body.clientHeight * 2 &&
        tags.showBottomButton !== true
    ) {
        tags.showBottomButton = true
    }
}

//#region == 右键菜单 ==========================================
const menuDisplayDefault = {
    menuSelectedMsg: null as Msg | null,
    menuSelectedUser: null as IUser | null,
    add: true,
    reply: true,
    forward: true,
    select: true,
    copy: true,
    selectCache: '',
    copySelect: false,
    copyImg: false,
    downloadImg: false as string | false,
    revoke: false,
    at: true,
    poke: false,
    remove: false,
    respond: false,
    showRespond: true,
    config: false,
    dev: false,
}
const menuDisplay = shallowReactive({...menuDisplayDefault})
/**
 * 显示消息右键菜单
 * @param data 右键菜单事件数据
 * @param msg 消息对象
 * @returns 显示菜单的 Promise, 关闭菜单后完成委托
 */
function showMsgMenu(data: MenuEventData, msg: Msg): Promise<void> | undefined {
    new Logger().debug('右击消息：' + data)

    const menu = msgMenu
    if (!menu.value) return
    if (menu.value.isShow()) return

    menuDisplay.menuSelectedMsg = msg

    // 检查消息，确认菜单显示状态
    // 关闭回应功能
    if (get('close_respond') == true) {
        menuDisplay.showRespond = false
    }

    // 判断能不能管理这个消息
    if (chat instanceof GroupSession) {
        let canAdmin = (msg.sender as Member | BaseUser).canBeAdmined(
            chat.getMe().role,
        )
        if (msg.sender.user_id === runtimeData.loginInfo.uin) canAdmin = true

        if (canAdmin) {
            menuDisplay.revoke = true
        }
    }

    // 消息不存在,但还可以多选和转发(x)
    if (!msg.exist) {
        // 已被撤回的自己的消息只显示复制
        menuDisplay.reply = false
        menuDisplay.revoke = false
    }

    const selection = document.getSelection()
    const textBody = selection?.anchorNode?.parentElement
    const textMsg = null as HTMLElement | null


    if (
        textMsg &&
        textMsg.id == data.target.id &&
        textBody &&
        textBody.className.indexOf('msg-text') > -1 &&
        selection.focusNode == selection.anchorNode
    ) {
        // 用于判定是否选中了 msg-text 且开始和结束是同一个 Node（防止跨消息复制）
        menuDisplay.selectCache = selection.toString()
        if (menuDisplay.selectCache.length > 0) {
            menuDisplay.copySelect = true
        }
    }
    // 不能转发卡片消息
    // TODO: 有卡片签名的客户端适配
    if (msg.hasCard()) {
        // 如果包含以上消息类型，不能转发
        menuDisplay.forward = false
        menuDisplay.add = false
    }
    if (data.target.nodeName == 'IMG' && (data.target as HTMLImageElement).src.length > 0) {
        // 右击图片需要显示的内容，这边特例设置为链接
        menuDisplay.downloadImg = (
            data.target as HTMLImageElement
        ).src
        if (runtimeData.tags.canCors) menuDisplay.copyImg = true
    }

    // 开发者工具
    menuDisplay.dev = import.meta.env.DEV


    const promise = menu.value.showMenu(data.x, data.y) as Promise<void>

    // 初始化菜单显示状态
    promise.then(() => {
        setTimeout(() => {
            initMenuDisplay()
        }, 100)
    })
    return promise
}

/**
 * 显示消息右键菜单
 * @param data 右键菜单事件数据
 * @param msg 用户
 * @returns 显示菜单的 Promise, 关闭菜单后完成委托
 */
function showUserMenu(data: MenuEventData, user: IUser) {
    const menu = userMenu
    if (!menu.value) return
    if (menu.value.isShow()) return

    menuDisplay.menuSelectedUser = user

    menuDisplay.showRespond = false
    menuDisplay.at = true
    menuDisplay.poke = true
    menuDisplay.remove = true

    let canAdmin: boolean
    if (!(chat instanceof GroupSession)) canAdmin = false
    else if (!(user instanceof Member)) canAdmin = false
    else if (user.user_id === runtimeData.loginInfo.uin) canAdmin = false
    else if (user.canBeAdmined(chat.getMe().role)) canAdmin = true
    else canAdmin = false

    if (!canAdmin) {
        // 自己、私聊或者没有权限的时候不显示移除
        menuDisplay.remove = false
    }

    // 原来私聊不能@
    if (!(chat instanceof GroupSession)) menuDisplay.at = false

    // 群成员设置
    if(canAdmin) {
        menuDisplay.config = true
    }

    // 显示用户菜单
    const promise = menu.value.showMenu(data.x, data.y) as Promise<void>

    // 初始化菜单显示状态
    promise.then(() => {
        setTimeout(() => {
            initMenuDisplay()
        }, 100)
    })
    return promise
}

/**
 * 初始化菜单状态
 */
function initMenuDisplay() {
    menuDisplay.menuSelectedMsg = null
    menuDisplay.menuSelectedUser = null
    Object.assign(menuDisplay, menuDisplayDefault)
}

/**
 * 回复消息
 */
function replyMsg(msg: Msg) {
    if (!msg.message_id) {
        new PopInfo().add(
            PopType.ERR,
            $t('无法回复该消息'),
            true,
        )
        return
    }

    chat.inputMsg.setReply(msg)
}

/**
 * 发送消息回应
 * @param num
 */
async function changeRespond(id: string, msg: Msg) {
    closeMsgMenu()

    if (!runtimeData.nowAdapter?.setResponse) {
        new PopInfo().add(
            PopType.ERR,
            $t('当前适配器不支持表情回应'),
            true,
        )
        return
    }

    const hasSend = msg?.emojis[id]?.includes(runtimeData.loginInfo.uin) ?? false

    // lgr 贴表情不会根据是否已经有了做判断,而且我拿不到 emoji_id,不知道也没有已经贴上去了
    // 所以采用这个逻辑,添加成功按贴表情成功处理,否则尝试移除表情

    const re = await runtimeData.nowAdapter.setResponse(
        msg, id, !hasSend,
    )

    if (!re) return
    msg.setEmoji(id, runtimeData.loginInfo.uin, !hasSend)
}

/**
 * 移出群聊
 */
async function removeUser() {
    const user = menuDisplay.menuSelectedUser
    if (!user) return
    const ensure = ensurePopBox(
        $t('真的要将 {user} 移出群聊吗', { user: user.name })
    )

    if (!ensure) return

    closeUserMenu()

    if (!runtimeData.nowAdapter?.kickMember) {
        new PopInfo().add(
            PopType.ERR,
            $t('当前适配器不支持移除成员'),
            true,
        )
        return
    }

    await runtimeData.nowAdapter.kickMember(
        chat as GroupSession,
        user as Member,
    )
}

/**
 * 关闭消息菜单
 */
function closeMsgMenu() {
    if (msgMenu.value?.isShow())
        msgMenu.value.closeMenu()
}

/**
 * 关闭用户菜单
 */
function closeUserMenu() {
    if (userMenu.value?.isShow())
        userMenu.value.closeMenu()
}
//#endregion

    // TODO: 虚拟列表优化
    // // 清屏重新加载消息列表（超过 n 条消息、回到底部按钮不显示）
    // // PS：也就是说只在消息底部时才会触发，以防止你是在看历史消息攒满了刷掉
    // if (
    //     list.length > 200 &&
    //     !tags.nowGetHistroy &&
    //     !tags.showBottomButton
    // ) {
    //     loadHistory(false)
    // }

/**
 * 发送戳一戳
 */
async function sendPoke(user: IUser) {
    menuDisplay.poke = false

    if (chat instanceof GroupSession) {
        await sendGroupPoke(user)
    } else if (chat instanceof UserSession) {
        await sendPrivatePoke()
    }
}
async function sendGroupPoke(target: IUser) {
    if (!(target instanceof Member)) {
        new PopInfo().add(
            PopType.ERR,
            $t('无法戳一戳该用户'),
            true,
        )
        return
    }
    if (!runtimeData.nowAdapter?.sendGroupPoke) {
        new PopInfo().add(
            PopType.ERR,
            $t('当前适配器不支持戳一戳'),
            true,
        )
        return
    }

    await runtimeData.nowAdapter.sendGroupPoke(
        chat as GroupSession,
        target,
    )
}
async function sendPrivatePoke() {
    if (!runtimeData.nowAdapter?.sendPrivatePoke) {
        new PopInfo().add(
            PopType.ERR,
            $t('当前适配器不支持戳一戳'),
            true,
        )
        return
    }

    await runtimeData.nowAdapter.sendPrivatePoke(
        chat as UserSession,
    )
}
//#region == 消息菜单相关 ==================================================
/**
 * +1
 */
function forwardSelf() {
    if (!menuDisplay.menuSelectedMsg) return
    sendMsgRaw(
        chat,
        menuDisplay.menuSelectedMsg.message.map(
            item=>item.copy()
        ),
    )
    closeMsgMenu()
}
/**
 * 回复
 * @param closeMenu 是否关闭消息菜单
 */
function menuReplyMsg(closeMenu = true) {
    if (!menuDisplay.menuSelectedMsg) return
    replyMsg(menuDisplay.menuSelectedMsg)
    chatBottom.value?.toMainInput()
    // 关闭消息菜单
    if (closeMenu) {
        closeMsgMenu()
    }
}
/**
 * 转发
 */
function showForWard() {
    if (!menuDisplay.menuSelectedMsg) return

    singleForward([menuDisplay.menuSelectedMsg as Msg])
    closeMsgMenu()
}
/**
 * 多选
 */
function intoMultipleSelect() {
    msgBar.value?.startMultiselect()
    tags.isMultiselectMode = true
    if (menuDisplay.menuSelectedMsg) {
        msgBar.value?.forceAddToMultiselectList(menuDisplay.menuSelectedMsg as Msg)
    }
    closeMsgMenu()
}
/**
 * 复制选中的消息
 */
function copyMsg() {
    const msg = menuDisplay.menuSelectedMsg
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
 * 复制缓存的选中的文本
 */
function copySelectMsg() {
    if (menuDisplay.selectCache === '') return

    const popInfo = new PopInfo()
    copyToClipboard(menuDisplay.selectCache)
        .then(
            () => popInfo.add(PopType.INFO, $t('复制成功'))
        ).catch(
            () => popInfo.add(PopType.ERR, $t('复制失败'))
        )

    closeMsgMenu()
}
/**
 * 复制图片
 */
async function copyImg() {
    if (!menuDisplay.downloadImg) return

    // 关闭菜单
    closeMsgMenu()

    // 类型白名单
    const typeWhiteList = [
        'image/png',
        'image/svg+xml',
    ]

    // 获取图片数据
    const response = await fetch(menuDisplay.downloadImg)
    let blob = await response.blob()

    // 乱七八糟浏览器不一定支持的格式统统转png
    if (!typeWhiteList.includes(blob.type)) {
        // 创建 canvas 来转换格式
        const img = new Image()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = URL.createObjectURL(blob)
        })

        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)

        // 转换为 PNG blob
        blob = await new Promise(resolve => {
            canvas.toBlob((blob)=>{
                resolve(blob as Blob)
            }, 'image/png')
        })

        URL.revokeObjectURL(img.src)
    }
    const item = new ClipboardItem({ [blob.type]: blob })
    try {
        await copyToClipboard([item])
        const popInfo = new PopInfo()
        popInfo.add(PopType.INFO, $t('复制成功'))
    }catch {/**/}
}
/**
 * 下载选中的图片
 */
function downloadImg() {
    const url = menuDisplay.downloadImg
    closeMsgMenu()
    if (!url) return
    downloadFile(url as string, 'img.png', () => undefined, () => undefined)
}
/**
 * 撤回消息
 */
async function recallMsg() {
    const msg = menuDisplay.menuSelectedMsg
    if (!msg) return

    if (!runtimeData.nowAdapter?.recallMsg) {
        new PopInfo().add(
            PopType.ERR,
            $t('当前适配器不支持撤回消息'),
            true,
        )
        return
    }

    // 关闭消息菜单
    closeMsgMenu()

    await runtimeData.nowAdapter.recallMsg(msg as Msg)
}
/**
 * 删除消息
 */
async function deleteMsg() {
    const msg = menuDisplay.menuSelectedMsg
    if (!msg) return

    chat.removeMsg(msg)

    closeMsgMenu()
}
function consoleLogMsg() {
    // eslint-disable-next-line no-console
    console.log(menuDisplay.menuSelectedMsg)
}
//#endregion

//#region == 多选菜单相关 ==================================================
/**
 * 合并转发
 */
function sendMergeForward(){
    if (!msgBar.value) return
    const msgList = msgBar.value.getMultiselectList()
    if (msgList.length === 0) return

    mergeForward(msgList)

    closeMultiselect()
}
/**
 * 逐条转发
 */
function sendSingleForward(){
    if (!msgBar.value) return
    const msgList = msgBar.value.getMultiselectList()
    if (msgList.length === 0) return

    singleForward(msgList)

    closeMultiselect()
}
/**
 * 删除消息
 */
async function delMsgs() {
    if (!msgBar.value) return
    const msgList = [...msgBar.value.getMultiselectList()]

    closeMultiselect()

    for (const msg of msgList) {
        await chat.removeMsg(msg)
    }
}
/**
 * 复制消息
 */
function copyMsgs() {
    if (!msgBar.value) return
    const msgList = msgBar.value.getMultiselectList()
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
    if (!msgBar.value) return
    msgBar.value.cancelMultiselect()
    tags.isMultiselectMode = false
}
//#endregion

//#region == 窗口移动相关 ==================================================
const chatMoveOptions: VMoveOptions<HTMLDivElement> = {
    beforeHook: (_) => {
        // 移除不需要的css
        const target = getTargetWin()
        if (!target) return
        target.style.transition = 'all 0s'
        // 禁用滚动
        const pan = chatPan.value
        if (!pan) return
        const chat = pan.getElementsByClassName('chat')[0] as HTMLDivElement
        if(chat)
            chat.style.overflowY = 'hidden'
    },
    moveHook: (_, move: number) => {
        // 移动距离 css
        const target = getTargetWin()
        if (!target) return
        target.style.transform = 'translateX(' + move + 'px)'
    },
    endHook: (_) => {
        // 复原css
        const pan = chatPan.value
        const chat = pan?.getElementsByClassName('chat')[0] as HTMLDivElement
        if(chat) {
            chat.style.overflowY = 'scroll'
        }
        const target = getTargetWin()
        if (!target) return
        target.style.transition = 'transform 0.3s'
        target.style.transform = ''
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
//#endregion
/**
 * 得到焦点窗口
 */
function getTargetWin(): HTMLDivElement | undefined {
    const pan = chatPan.value
    if (!pan) return
    if(mergePan.value?.isMergeOpen()) {
        // 合并转发面板返回
        return pan.getElementsByClassName('merge-pan')[0] as HTMLDivElement
    } else {
        // 聊天面板底层返回
        return pan as HTMLDivElement
    }
}
/**
 * 退出一层窗口
 */
function exitWin() {
    if(mergePan.value?.isMergeOpen()) {
        // 合并转发栏
        mergePan.value?.closeMergeMsg()
        setTimeout(() => {
            const pan = chatPan.value
            const mergePan = pan?.getElementsByClassName('merge-pan')[0] as HTMLDivElement
            if(mergePan) {
                mergePan.style.transform = ''
            }
        }, 500)
    } else {
        // 自身
        closeSession()
        new Logger().add(LogType.UI, '右滑打开侧边栏触发完成')
    }
}

/**
 * 加载更多历史消息
 */
async function loadHistory() {
    if (chat.loadHistoryState !== 'normal') return

    if (!await chat.loadHistory()) return
}

Session.afterLoadHistoryHook.push((_arg1, _arg2, _arg3) => {
    const pan = msgPan.value
    if (!pan) return
    const oldScrollHeight = pan.scrollHeight

    nextTick(() => {
        new Logger().debug(`滚动前高度：${oldScrollHeight}，当前高度：${pan.scrollHeight}，滚动位置：${pan.scrollHeight - oldScrollHeight}`)
        scrollTo(
            pan.scrollTop + pan.scrollHeight - oldScrollHeight,
            false
        )
    })
})
//#endregion

//#region == 滑动工具 ==========================================
/**
 * 消息区滚动到指定位置
 * @param where 位置（px）
 * @param showAnimation 是否使用动画
 */
function scrollTo(where: number | undefined, showAnimation = true) {
    const pan = msgPan.value
    if (pan !== null && where) {
        if (showAnimation === false) {
            pan.style.scrollBehavior = 'auto'
        } else {
            pan.style.scrollBehavior = 'smooth'
        }
        pan.scrollTop = where
        pan.style.scrollBehavior = 'smooth'
    }
}
function scrollBottom(showAnimation = false) {
    const pan = msgPan.value
    if (!pan) return
    scrollTo(pan.scrollHeight, showAnimation)
}
function imgLoadedScroll(height: number) {
    const pan = msgPan.value
    if (!pan) return

    if(chat.messageList.length <= 20 && !tags.showBottomButton) {
        scrollBottom()
    } else {
        // 纠正滚动位置
        scrollTo(pan.scrollTop + height, false)
    }
}
//#endregion
</script>
