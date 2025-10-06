<!--
 * @FileDescription: 聊天面板页面
 * @Author: Stapxs
 * @Date:
 *      2022/08/14
 *      2022/12/12
 *      2025/08/21
 * @Version:
 *      1.0 - 初始版本
 *      1.5 - 重构为 ts 版本，代码格式优化
 *      2.0 - 重构为 setup 式Api(Mr.Lee)
-->

<template>
    <div ref="chat-pan"
        v-move="chatMoveOptions"
        :class="{
            'chat-pan': true,
        }"
        :style="{ '--input-line': chat.inputMsg.lines }"
        @v-move-right.prevent="exitWin()">
        <!-- 聊天基本信息 -->
        <div class="info">
            <img :src="chat.face" :alt="chat.showName">
            <div class="info">
                <p>
                    {{ chat.showName }}
                    <template v-if="chat instanceof GroupSession">
                        ({{ chat.memberList.length }})
                    </template>
                </p>
                <span>
                    <template v-if="chat.appendInfo">
                        {{ chat.appendInfo }}
                    </template>
                    {{
                        chat.preMessage ? $t('上次消息 - {time}', {
                            time: chat.preMessage.time?.format()
                        }) : $t('暂无消息')
                    }}
                </span>
            </div>
            <div class="space" />
            <div class="more">
                <font-awesome-icon v-if="chat.isActive"
                    :icon="['fas', 'ellipsis-vertical']" @click="openChatInfoPan" />
                <font-awesome-icon v-else
                    :icon="['fas', 'spinner']" class="loading" />
            </div>
        </div>
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
        <!-- 底部区域 -->
        <div class="chat-bottom">
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
            <!-- 表情面板 -->
            <Transition name="pan">
                <FacePan v-show="details === 'face'"
                    @send-msg="sendMsg" />
            </Transition>
            <!-- 精华消息 -->
            <Transition v-if="chat instanceof GroupSession" name="pan">
                <EssenceMsgsPan v-show="details === 'essence'"
                    :session="chat" :key="chat.id" @close="switchDetail('essence')" />
            </Transition>
            <Transition name="img-pan">
                <!-- 图片指示器 -->
                <div v-show="chat.inputMsg.imgCache.size > 0"
                    :class="{
                        'img-pan': true,
                        'ss-card': true,
                    }"
                    @wheel="
                        !menuDisplay.respond ?
                            ($event.currentTarget as HTMLElement).scrollLeft += $event.deltaY
                            : ''
                    ">
                    <div class="imgs">
                        <div v-for="[key, value] in chat.inputMsg.imgCache"
                            :key="'imgCache-' + key">
                            <div class="img-btns">
                                <div>
                                    <font-awesome-icon :icon="['fas', 'pencil']" />
                                </div>
                                <hr />
                                <div @click="chat.inputMsg.rmImg(key)">
                                    <font-awesome-icon style="color: var(--color-red)" :icon="['fas', 'xmark']" />
                                </div>
                            </div>
                            <div class="img">
                                <img :src="value" :alt="`[SQ:${key}]`"/>
                            </div>
                            <span>[SQ:{{ key }}]</span>
                        </div>
                    </div>
                </div>
            </Transition>
            <div class="input-pan ss-card">
                <!-- 功能附加 -->
                <div>
                    <div>
                    </div>
                    <!-- At 指示器 -->
                    <div
                        :class="{
                            'at-tag': true,
                            'show': atFindList != null
                        }"
                        contenteditable="true"
                        @blur="choiceAt(undefined)">
                        <div v-for="item in atFindList != null ? atFindList : []"
                            :key="'atFind-' + item.user_id"
                            @click="choiceAt(item.user_id)">
                            <img :src="item.face" :alt="item.name">
                            <span>{{ item.name }}</span>
                            <a>{{ item.user_id }}</a>
                        </div>
                        <div v-if="atFindList?.length == 0" class="emp">
                            <span>{{ $t('没有找到匹配的群成员') }}</span>
                        </div>
                    </div>
                </div>
                <!-- 更多功能 -->
                <div class="more-detail">
                    <div
                        :title="$t('图片')"
                        @click="runSelectImg">
                        <font-awesome-icon :icon="['fas', 'image']" />
                        <input ref="choice-pic" type="file" style="display: none"
                            @change="selectImg">
                    </div>
                    <div
                        :title="$t('文件')"
                        @click="runSelectFile">
                        <font-awesome-icon :icon="['fas', 'folder']" />
                        <input ref="choiceFile" type="file"
                            style="display: none" @change="selectFile">
                    </div>
                    <div
                        :title="$t('表情')"
                        :class="{'select': details === 'face'}"
                        @click="switchDetail('face')">
                        <font-awesome-icon :icon="['fas', 'face-laugh']" />
                    </div>
                    <div v-if="chat instanceof UserSession"
                        :title="$t('戳一戳')"
                        @click="sendPoke(chat.baseUser)">
                        <font-awesome-icon :icon="['fas', 'fa-hand-point-up']" />
                    </div>
                    <div v-if="chat instanceof GroupSession"
                        :class="{'select': details === 'essence'}"
                        :title="$t('精华消息')" @click="switchDetail('essence')">
                        <font-awesome-icon :icon="['fas', 'star']" />
                    </div>
                    <div class="space" />
                    <div class="send"
                        :class="{'disable': chat.inputMsg.isVoid}"
                        :title="chat.inputMsg.isVoid ? $t('空消息不可以发送哦～') : $t('发送消息')"
                        @click="sendMsg()">
                        <span>{{ $t('发送') }}</span>
                        <font-awesome-icon :icon="['fas', 'angle-right']" />
                    </div>
                </div>
                <hr />
                <!-- 回复指示器 -->
                <div :class="{
                    'input-special-tag': true,
                    'show': chat.inputMsg.reply
                }">
                    <font-awesome-icon :icon="['fas', 'reply']" />
                    <span>{{ chat.inputMsg.reply?.preMsg }}</span>
                    <div @click="chat.inputMsg.rmReply()">
                        <font-awesome-icon :icon="['fas', 'xmark']" />
                    </div>
                </div>
                <!-- 消息发送框 -->
                <div class="input">
                    <textarea
                        ref="main-input"
                        v-model="chat.inputMsg.content"
                        type="text"
                        @paste="addImg"
                        @keydown="mainKey"
                        @keyup="mainKeyUp"
                        @click="selectSQIn()" />
                </div>
            </div>
        </div>

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
                            toMainInput();
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
import CustomHr from '@renderer/components/CustomHr.vue'
import EmojiFace from '@renderer/components/EmojiFace.vue'
import EssenceMsgsPan from '@renderer/components/EssenceMsgsPan.vue'
import FacePan from '@renderer/components/FacePan.vue'
import Menu from '@renderer/components/Menu.vue'
import MergePan from '@renderer/components/MergePan.vue'
import MsgBar from '@renderer/components/MsgBar.vue'
import MsgPrevPanComponent, { MsgPrevPan } from '@renderer/components/MsgPrevPan.vue'
import UserInfoPanComponent, { UserInfoPan } from '@renderer/components/UserInfoPan.vue'
import { Logger, LogType, PopInfo, PopType } from '@renderer/function/base'
import {
    MenuEventData,
} from '@renderer/function/elements/information'
import { Time } from '@renderer/function/model/data'
import Emoji from '@renderer/function/model/emoji'
import { Msg, SelfMsg } from '@renderer/function/model/msg'
import { AtSeg, FileSeg } from '@renderer/function/model/seg'
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
import { closePopBox, ensurePopBox, popBox, textPopBox } from '@renderer/function/utils/popBox'
import {
    copyToClipboard,
    delay,
    getViewTime,
} from '@renderer/function/utils/systemUtil'
import { vHide, vMove, VMoveOptions } from '@renderer/function/utils/vcmd'
import { useKeyboard } from '@renderer/function/utils/vuse'
import app from '@renderer/main'
import Info from '@renderer/pages/Info.vue'
import { backend } from '@renderer/runtime/backend'
import imageCompression from 'browser-image-compression'
import {
    nextTick,
    onMounted,
    shallowReactive,
    shallowRef,
    useTemplateRef,
    watch,
} from 'vue'
//#region == 常量声明 ====================================================================
const { chat } = defineProps<{chat: Session}>()

const $t = app.config.globalProperties.$t

//#region  == 模板引用 ======================================
const choiceFile = useTemplateRef('choiceFile')
const choicePic = useTemplateRef('choice-pic')
const msgBar = useTemplateRef('msgBar')
const mergePan = useTemplateRef('mergePan')
const msgMenu = useTemplateRef('msgMenu')
const userMenu = useTemplateRef('userMenu')
const mainInput = useTemplateRef('main-input')
const msgPan = useTemplateRef('msgPan')
const chatPan = useTemplateRef('chat-pan')
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
    onAtFind: false,
    isMultiselectMode: false,
}
const details = shallowRef<'face'|'essence'|undefined>()
const tags = shallowReactive({...tagsDefault})
const atFindList = shallowRef<Member[]|null>(null)
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
    details.value = undefined
    initMenuDisplay()
    // 聚焦输入框
    // PS: 有虚拟键盘的设备会弹键盘,要做判断
    if (shouldAutoFocus()) toMainInput()
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

//#region == 发送消息 ==========================================
let checkNewLineFlag = false
/**
 * 发送框按键事件
 * @param event 事件
 */
function mainKey(event: KeyboardEvent) {
    if (event.key !== 'Enter') return
    let canSend = false
    switch (runtimeData.sysConfig.send_key) {
        case 'none':
            if (event.shiftKey) break
            if (event.ctrlKey) break
            if (event.altKey) break
            if (event.metaKey) break
            canSend = true
            break
        case 'shift':
            if (!event.shiftKey) break
            canSend = true
            break
        case 'ctrl':
            if (!event.ctrlKey) break
            canSend = true
            break
        case 'alt':
            if (!event.altKey) break
            canSend = true
            break
        case 'meta':
            if (!event.metaKey) break
            canSend = true
            break
    }

    if (canSend && !chat.inputMsg.isVoid) sendMsg()
    else
    // 补加 enter
    // ctrl + enter
    // meta + enter
    // alt + enter
    // 上述组合不自带enter,需要手动补充
    if (
        event.key === 'Enter' &&
        (event.ctrlKey || event.metaKey || event.altKey)
    ) chat.inputMsg.content += '\n'
}
function mainKeyUp(event: KeyboardEvent) {
    const logger = new Logger()
    // 发送完成后输入框会遗留一个换行，把它删掉 ……
    if (checkNewLineFlag){
        checkNewLineFlag = false
        if (chat.inputMsg.content == '\n'){
            chat.inputMsg.content = ''
        }
    }

    if (event.key !== 'Enter') {
        const content = chat.inputMsg.content
        // 获取最后一个输入的符号用于判定 at
        const lastInput = content.at(-1)
        if (
            !tags.onAtFind &&
            lastInput == '@' &&
            chat instanceof GroupSession
        ) {
            logger.add(LogType.UI, '开始匹配群成员列表 ……')
            tags.onAtFind = true
        }
        if (tags.onAtFind) {
            if (!(chat instanceof GroupSession)) return
            if (content.lastIndexOf('@') < 0) {
                logger.add(LogType.UI, '匹配群成员列表被打断 ……')
                tags.onAtFind = false
                atFindList.value = null
            } else {
                const atInfo = content
                    .substring(content.lastIndexOf('@') + 1)
                    .toLowerCase()
                if (atInfo != '') {
                    atFindList.value = chat.memberList
                            .filter((item) => { return item.match(atInfo) })
                }
            }
        }
    }
}
//#endregion

//#region == 特殊消息段 ========================================
/**
 * 选中光标在其内部的那个 SQLCode
 */
function selectSQIn() {
    if (!mainInput.value) return
    // 如果文本框里本来就选中着什么东西就不触发了
    if (mainInput.value.selectionStart !== mainInput.value.selectionEnd) return

    let cursorPosition = -1
    if (typeof mainInput.value.selectionStart === 'number') {
        cursorPosition = mainInput.value.selectionStart
    }

    // 遍历寻找 SQCode 位置区间包括光标位置的 SQCode
    for (const sq of chat.inputMsg.sqList) {
        const start = chat.inputMsg.content.indexOf(sq)
        const end = start + sq.length
        if (
            start !== -1 &&
            cursorPosition > start &&
            cursorPosition < end
        ) {
            nextTick(() => {
                mainInput.value!.selectionStart = start
                mainInput.value!.selectionEnd = end
            })
        }
    }
}

/**
 * 选择 At
 * @param id QQ 号
 */
function choiceAt(id: number | undefined) {
    if (id != undefined) {
        // 删除输入框内的 At 文本
        chat.inputMsg.content = chat.inputMsg.content.substring(
            0, chat.inputMsg.content.lastIndexOf('@')
        )
        // 添加 at 信息
        chat.inputMsg.addSq(new AtSeg(id))
    }
    toMainInput()
    tags.onAtFind = false
    atFindList.value = null
}
//#endregion

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


//#region == 按钮处理 ==========================================
/**
 * 切换辅助面板
 * @param detail
 */
function switchDetail(detail: 'face'|'essence' | undefined) {
    if (details.value === detail){
        details.value = undefined
    }else {
        details.value = undefined
        // 等待消失动画
        setTimeout(() => {
            details.value = detail
        }, 300);
    }
}
/**
 * 打开好友/群组信息页面
 */
function openChatInfoPan() {
    // 加载一些需要显示的消息，有部分判断是用来防止反复加载已存在内容的

    popBox({
        template: Info,
        title: chat.type === 'group' ? $t('群信息') : $t('好友信息'),
        svg: chat.type === 'group' ? 'users' : 'user',
        templateValue: { chat: chat },
    })

    // // 加载基础信息
    // TODO:
    // if (
    //     chat.show.type === 'group' &&
    //     chat.info.group_info.gc !== chat.show.id
    // ) {
    //     const url = `https://qinfo.clt.qq.com/cgi-bin/qun_info/get_group_info_all?gc=${chat.show.id}&bkn=${runtimeData.loginInfo.bkn}`
    //     Connector.send(
    //         'http_proxy',
    //         { url: url },
    //         'getMoreGroupInfo',
    //     )
    // }
}
//#endregion

//#region == 图片处理 ==========================================
/**
 * 添加图片缓存
 * @param event 事件
 */
function addImg(event: ClipboardEvent) {
    // 判断粘贴类型
    if (!(event.clipboardData && event.clipboardData.items)) {
        return
    }
    for (
        let i = 0, len = event.clipboardData.items.length;
        i < len;
        i++
    ) {
        const item = event.clipboardData.items[i]
        if (item.kind === 'file') {
            setImg(item.getAsFile())
            // 阻止默认行为
            event.preventDefault()
        }
    }
}

function runSelectImg() {
    choicePic.value?.click()
}

/**
 * 手动选择图片
 */
function selectImg(event: Event) {
    const sender = event.target as HTMLInputElement
    if (sender && sender.files) {
        setImg(sender.files[0])
    }
}

/**
 * 将图片转换为 base64 并缓存
 * @param file 文件对象
 */
async function setImg(file: File | null) {
    const popInfo = new PopInfo()
    if (!file) return
    if (!file.type.includes('image/')) return
    if (file.size === 0) return

    // 图片太大
    if (file.size > 3145728) {
        const options = { maxSizeMB: 3, useWebWorker: true }
        try {
            popInfo.add(
                PopType.INFO,
                $t('正在压缩图片 ……'),
            )
            const compressedFile = await imageCompression(
                file,
                options,
            )
            new Logger().add(
                LogType.INFO,
                '图片压缩成功，原大小：' +
                    file.size / 1024 / 1024 +
                    ' MB，压缩后大小：' +
                    compressedFile.size / 1024 / 1024 +
                    ' MB',
            )
            setImg(compressedFile)
        } catch (error) {
            new Logger().error(error as Error, '图片压缩失败')
            popInfo.add(PopType.INFO, $t('压缩图片失败'))
        }
        return
    }

    chat.inputMsg.addImg(await fileToDataURL(file))
}

/**
 * 将文件转换为 data URL
 * @param file 文件对象
 * @returns data URL
 */
function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = function(event) {
            if (!event.target) reject(new Error('读取文件失败'))
            else resolve(event.target.result as string) // 这就是 data URL
        }

        reader.onerror = function(error) {
            reject(error)
        }

        reader.readAsDataURL(file)
    })
}
//#endregion

//#region == 文件处理 ==========================================
function runSelectFile() {
    choiceFile.value?.click()
}

/**
 * 发送文件
 */
async function selectFile(event: Event) {
    const sender = event.target as HTMLInputElement
    if (sender.files != null) {
        const file = sender.files[0]
        const fileName = file.name
        const size = file.size
        // 如果文件大于 1G，提醒一下
        if (size > 1073741824) {
            const ensure = await ensurePopBox(
                $t('文件大于 1GB。发送速度可能会非常缓慢；确认要发送吗？'),
                $t('发送')
            )
            if (!ensure) return
        }

        sendFile(file, fileName)

        // 清空 input
        sender.value = ''
    }
}

async function sendFile(file: File, fileName: string | null) {
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '')
    const base64 = btoa(binary)

    const message = [new FileSeg(
        base64,
        fileName ?? $t('未知文件'),
        file.size
    )]

    const selfMsg = SelfMsg.create(
        message,
        chat,
    )

    // 提示
    const popId = textPopBox($t('正在发送文件中……'), {
        title: $t('提醒'),
        allowAutoClose: false,
    })
    await selfMsg.send()
    closePopBox(popId)
}
//#endregion

/**
 * 将焦点移回主发送框
 * PS：我实在懒得再做一次回车发送了。所以当点击图片发送框的输入框后，焦点会被移动到主输入框上以方便回车发送
 */
function toMainInput() {
    mainInput.value?.focus()
}

/**
 * 发送消息
 */
function sendMsg() {
    // 关闭所有其他的已打开的更多功能弹窗
    switchDetail(undefined)
    // 无消息不发送
    if (chat.inputMsg.isVoid) return
    // 为了减少对于复杂图文排版页面显示上的工作量，对于非纯文本的消息依旧处理为纯文本，如：
    // "这是一段话 [SQ:0]，[SQ:1] 你要不要来试试 Stapxs QQ Lite？"
    // 其中 [SQ:n] 结构代表着这是特殊消息以及这个消息具体内容在消息缓存中的 index，像是这样：
    // sendCache = [{type:"face",id:11},{type:"at",qq:1007028430}]
    //               ^^^^^^^ 0 ^^^^^^^   ^^^^^^^^^^ 1 ^^^^^^^^^^
    // 在发送操作触发之后，将会解析此条字符串排列出最终需要发送的消息结构用于发送。

    sendMsgRaw(
        chat,
        chat.inputMsg.render(),
    )
    // 发送后事务
    chat.inputMsg.clear()
    checkNewLineFlag = true
    nextTick(async ()=>{
        await delay(100)
        scrollBottom(true)
    })
}
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

function getMeBan(): Time | undefined {
    if (!chat) return undefined
    if (!chat.isActive) return undefined
    if (!(chat instanceof GroupSession)) return
    const me = chat.getMe()
    return me.banTime
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
    replyMsg(menuDisplay.menuSelectedMsg as Msg)
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
function delMsgs() {
    new PopInfo().add(
        PopType.INFO,
        $t('欸嘿，这个按钮只是用来占位置的'),
    )
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

<style scoped>
    /* 更多功能面板动画 */
    .pan-enter-active,
    .pan-leave-active {
        transition: opacity 0.3s;
    }

    .pan-enter-from {
        transform: translateX(20px);
        opacity: 0;
    }

    .pan-leave-to {
        opacity: 0;
    }
</style>
