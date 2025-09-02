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
        :class="{
            'chat-pan': true,
            'open': runtimeData.tags.openSideBar,
        }"
        :style="`background-image: url(${runtimeData.sysConfig.chat_background});`"
        @touchstart="chatMoveStartEvent"
        @touchmove="chatMoveEvent"
        @touchend="chatMoveEndEvent"
        @wheel="chatWheelEvent">
        <!-- 聊天基本信息 -->
        <div class="info">
            <font-awesome-icon :icon="['fas', 'bars-staggered']" @click="openLeftBar" />
            <img :src="chat.face">
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
                    :icon="['fas', 'ellipsis-vertical']" @click="switchChatInfoPan" />
                <font-awesome-icon v-else
                    :icon="['fas', 'spinner']" class="loading" />
            </div>
        </div>
        <!-- 消息显示区 -->
        <div ref="msgPan" id="msgPan" class="chat"
            style="scroll-behavior: smooth"
            @scroll="chatScroll">
            <!-- 前缀 -->
            <!-- 搜索 -->
            <template v-if="details[3].open">
                <div class="note note-nomsg">
                    <hr>
                    <a>{{ $t('没有更多消息啦～') }}</a>
                </div>
            </template>
            <!-- 通常 -->
            <template v-else>
                <div v-if="chat.loadHistoryState === 'loading'"
                    class="note note-nomsg">
                    <hr>
                    <a>{{ $t('获取历史记录ing') }}</a>
                </div>
                <div v-else-if="chat.loadHistoryState === 'fail'"
                    class="note note-nomsg">
                    <hr>
                    <a>{{ $t('获取历史记录失败') }}</a>
                </div>
                <div v-else-if="chat.loadHistoryState === 'end'"
                    class="note note-nomsg">
                    <hr>
                    <a>{{ $t('没有更多消息啦～') }}</a>
                </div>
            </template>
            <MsgBar
                :ref="'msgBar'"
                :key="chat.id"
                :msgs="details[3].open ? (tags.search.list as Message[]) : chat.messageList"
                :show-msg-menu="showMsgMenu"
                :show-user-menu="showUserMenu"
                :user-info-pan="userInfoPanFunc"
                @image-loaded="imgLoadedScroll"
                @left-move="replyMsg"
                @sender-double-click="(user)=>sendPoke(user)"
                @emoji-click="changeRespond" />
        </div>
        <!-- 滚动到底部悬浮标志 -->
        <div v-show="tags.showBottomButton"
            class="new-msg"
            @click="scrollBottom(true)">
            <div class="ss-card">
                <font-awesome-icon :icon="['fas', 'comment']" />
                <span v-if="chat.newMsg > 0">{{ chat.newMsg }}</span>
            </div>
        </div>
        <!-- 底部区域 -->
        <div ref="send-more" class="more">
            <!-- 功能附加 -->
            <div>
                <div>
                    <!-- 表情面板 -->
                    <Transition name="pan">
                        <FacePan v-show="details[1].open"
                            @add-special-seg="addSpecialSeg" @send-msg="sendMsg" />
                    </Transition>
                    <!-- 精华消息 -->
                    <Transition v-if="chat instanceof GroupSession" name="pan">
                        <div v-show="details[2].open"
                            class="ss-card jin-pan">
                            <div>
                                <font-awesome-icon :icon="['fas', 'message']" />
                                <span>{{ $t('精华消息') }}</span>
                                <font-awesome-icon :icon="['fas', 'xmark']" @click="details[2].open = !details[2].open" />
                            </div>
                            <div class="jin-pan-body">
                                <div v-for="(item, index) in chat.essenceList"
                                    :key="'jin-' + index">
                                    <div>
                                        <img :src="item.sender.face">
                                        <div>
                                            <a>{{ item.sender.name }}</a>
                                            <span>{{ item.time?.format() }}
                                                {{ $t('发送') }}</span>
                                        </div>
                                        <span>{{
                                            $t('{time}，由 {name} 设置', {
                                                time: item.operatorTime?.format(),
                                                name: item.operator.name,
                                            })
                                        }}</span>
                                    </div>
                                    <div class="context">
                                        <template
                                            v-for="(seg, indexc) in item.message"
                                            :key="'jinc-' + index + '-' + indexc">
                                            <span v-if="seg instanceof TxtSeg">{{ seg.text }}</span>
                                            <EmojiFace v-if="seg instanceof FaceSeg"
                                                :emoji="seg.face" class="msg-face" />
                                            <img v-if="seg instanceof ImgSeg" :src="seg.src">
                                        </template>
                                    </div>
                                </div>
                                <div v-show="tags.isJinLoading" class="jin-pan-load">
                                    <font-awesome-icon :icon="['fas', 'spinner']" />
                                </div>
                            </div>
                        </div>
                    </Transition>
                </div>
                <!-- 多选指示器 -->
                <Transition name="select-tag">
                    <div v-if="tags.isMultiselectMode" class="select-tag">
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
                <!-- 搜索指示器 -->
                <div :class="{
                    'search-tag': true,
                    'show': details[3].open
                }">
                    <font-awesome-icon :icon="['fas', 'search']" />
                    <span>{{ $t('搜索已加载的消息') }}</span>
                    <div @click="closeSearch">
                        <font-awesome-icon :icon="['fas', 'xmark']" />
                    </div>
                </div>
                <!-- 回复指示器 -->
                <div :class="{
                    'reply-tag': true,
                    'show': msgWhileReply
                }">
                    <font-awesome-icon :icon="['fas', 'reply']" />
                    <span>{{
                        msgWhileReply?.preMsg
                    }}</span>
                    <div @click="cancelReply">
                        <font-awesome-icon :icon="['fas', 'xmark']" />
                    </div>
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
                        <img :src="item.face">
                        <span>{{ item.name }}</span>
                        <a>{{ item.user_id }}</a>
                    </div>
                    <div v-if="atFindList?.length == 0" class="emp">
                        <span>{{ $t('没有找到匹配的群成员') }}</span>
                    </div>
                </div>
                <!-- 更多功能 -->
                <div :class="{
                    'more-detail': true,
                    'show': tags.showMoreDetail
                }">
                    <div
                        :title="$t('图片')"
                        @click="runSelectImg">
                        <font-awesome-icon :icon="['fas', 'image']" />
                        <input id="choice-pic" type="file" style="display: none"
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
                        @click="(details[1].open = !details[1].open),
                                (tags.showMoreDetail = false)">
                        <font-awesome-icon :icon="['fas', 'face-laugh']" />
                    </div>
                    <div v-if="chat instanceof UserSession"
                        :title="$t('戳一戳')"
                        @click="sendPoke(chat.baseUser)">
                        <font-awesome-icon :icon="['fas', 'fa-hand-point-up']" />
                    </div>
                    <div v-if="chat instanceof GroupSession"
                        :title="$t('精华消息')" @click="showJin">
                        <font-awesome-icon :icon="['fas', 'star']" />
                    </div>
                    <div class="space" />
                    <div :title="$t('搜索消息')" @click="openSearch">
                        <font-awesome-icon :icon="['fas', 'search']" />
                    </div>
                </div>
            </div>
            <!-- 消息发送框 -->
            <div>
                <div
                    v-menu.stop.prevent="_=>moreFunClick()"
                    @click="moreFunClick(runtimeData.sysConfig.quick_send)">
                    <font-awesome-icon v-if="tags.showMoreDetail" :icon="['fas', 'minus']" />
                    <font-awesome-icon v-else-if="runtimeData.sysConfig.quick_send == 'default'" :icon="['fas', 'plus']" />
                    <font-awesome-icon v-else-if="runtimeData.sysConfig.quick_send == 'img'" :icon="['fas', 'image']" />
                    <font-awesome-icon v-else-if="runtimeData.sysConfig.quick_send == 'file'" :icon="['fas', 'folder']" />
                    <font-awesome-icon v-else-if="runtimeData.sysConfig.quick_send == 'face'" :icon="['fas', 'face-laugh']" />
                </div>
                <div>
                    <form @submit.prevent="mainSubmit">
                        <input v-if="!Option.get('use_breakline')"
                            ref="main-input"
                            v-model="msgWhileSend"
                            type="text"
                            autocomplete="off"
                            :disabled="runtimeData.tags.openSideBar || getMeBan() !== undefined"
                            :placeholder="
                                getMeBan()
                                    ? $t('已被禁言至：{time}', {
                                        time: getMeBan()?.format(),
                                    }) : ''"
                            @paste="addImg"
                            @keyup="mainKeyUp"
                            @click="selectSQIn()"
                            @input="searchMessage">
                        <textarea v-else
                            ref="main-input"
                            v-model="msgWhileSend"
                            type="text"
                            :disabled="runtimeData.tags.openSideBar"
                            @paste="addImg"
                            @keydown="mainKey"
                            @keyup="mainKeyUp"
                            @click="selectSQIn()"
                            @input="searchMessage" />
                    </form>
                    <div :class="{
                            'disable': msgWhileSend.trim() === ''
                        }"
                        @click="sendMsg">
                        <font-awesome-icon v-if="details[3].open" :icon="['fas', 'search']" />
                        <font-awesome-icon v-else :icon="['fas', 'angle-right']" />
                    </div>
                </div>
            </div>
            <div />
        </div>
        <!-- 合并转发消息预览器 -->
        <MergePan ref="mergePan" />
        <!-- At 信息悬浮窗 -->
        <UserInfoPanComponent :data="userInfoPanData" />
        <!-- 消息右击菜单 -->
        <Menu ref="msgMenu" name="chat-menu">
            <div class="ss-card msg-menu-body">
                <div v-if="chat instanceof GroupSession"
                    v-show="menuDisplay.showRespond"
                    :class="{
                        'ss-card': true,
                        'respond': true,
                        'open': menuDisplay.respond
                    }">
                    <template v-for="(num, index) in Emoji.responseId" :key="'respond-' + num">
                        <EmojiFace :emoji="Emoji.get(num)!" @click="menuDisplay.menuSelectedMsg ?
                            changeRespond(String(num), menuDisplay.menuSelectedMsg as Msg): ''" />
                        <font-awesome-icon v-if="index == 4" :icon="['fas', 'angle-up']" @click="menuDisplay.respond = true" />
                    </template>
                </div>
                <span id="anchor" />
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
                <div v-show="menuDisplay.downloadImg != false" @click="downloadImg">
                    <div><font-awesome-icon :icon="['fas', 'floppy-disk']" /></div>
                    <a>{{ $t('下载图片') }}</a>
                </div>
                <div v-show="menuDisplay.revoke" @click="recallMsg">
                    <div><font-awesome-icon :icon="['fas', 'xmark']" /></div>
                    <a>{{ $t('撤回') }}</a>
                </div>
                <div v-show="menuDisplay.jumpToMsg" @click="jumpSearchMsg">
                    <div><font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" /></div>
                    <a>{{ $t('跳转到消息') }}</a>
                </div>
                <div v-show="menuDisplay.dev" @click="consoleLogMsg">
                    <div><font-awesome-icon :icon="['fas', 'screwdriver-wrench']" /></div>
                    <a>{{ $t('调试信息') }}</a>
                </div>
            </div>
        </Menu>
        <Menu ref="userMenu" name="chat-menu">
            <div class="ss-card msg-menu-body">
                <div v-show="menuDisplay.at"
                    @click="menuDisplay.menuSelectedUser ? addSpecialSeg(new AtSeg(menuDisplay.menuSelectedUser!.user_id)): '';
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
                <div v-if="menuDisplay.menuSelectedUser instanceof Member" v-show="menuDisplay.config"
                    @click="switchChatInfoPan();
                            infoRef?.openMoreConfig(menuDisplay.menuSelectedUser);
                            closeUserMenu();">
                    <div><font-awesome-icon :icon="['fas', 'cog']" /></div>
                    <a>{{ $t('成员设置') }}</a>
                </div>
            </div>
        </Menu>
        <!-- 群 / 好友信息弹窗 -->
        <Transition>
            <Info v-if="tags.openChatInfo" ref="infoRef" :chat="chat"
                @close="switchChatInfoPan" />
        </Transition>
        <!-- 图片发送器 -->
        <Transition>
            <div v-show="imgCache.length > 0" class="img-sender">
                <div class="card ss-card">
                    <div class="hander">
                        <span>{{ $t('发送图片') }}</span>
                        <button class="ss-button" @click="sendMsg">
                            {{ $t('发送') }}
                        </button>
                    </div>
                    <div class="imgs">
                        <div v-for="(img64, index) in imgCache" :key="'sendImg-' + index">
                            <div @click="deleteImg(index)">
                                <font-awesome-icon :icon="['fas', 'xmark']" />
                            </div>
                            <img :src="img64">
                        </div>
                    </div>
                    <div class="sender">
                        <font-awesome-icon :icon="['fas', 'image']" @click="runSelectImg" />
                        <input v-model="msgWhileSend"
                            type="text"
                            :disabled="runtimeData.tags.openSideBar"
                            @paste="addImg"
                            @click="toMainInput">
                    </div>
                </div>
                <div class="bg" @click="imgCache = []" />
            </div>
        </Transition>
        <!-- 背景 -->
        <div class="bg" :style=" runtimeData.sysConfig.chat_background ?
            `backdrop-filter: blur(${runtimeData.sysConfig.chat_background_blur}px);` : ''" />
    </div>
</template>

<script setup lang="ts">
import app from '@renderer/main'
import SendUtil from '@renderer/function/sender'
import Option, { get } from '@renderer/function/option'
import Info from '@renderer/pages/Info.vue'
import MergePan from '@renderer/components/MergePan.vue'
import MsgBar from '@renderer/components/MsgBar.vue'
import imageCompression from 'browser-image-compression'
import FacePan from '@renderer/components/FacePan.vue'
import Menu from '@renderer/components/Menu.vue'

import { downloadFile, shouldAutoFocus } from '@renderer/function/utils/appUtil'
import {
    copyToClipboard,
    delay,
    getViewTime,
} from '@renderer/function/utils/systemUtil'
import {
    sendMsgRaw,
    closeSession,
    mergeForward,
    singleForward,
} from '@renderer/function/utils/msgUtil'
import { scrollToMsg } from '@renderer/function/utils/appUtil'
import { Logger, LogType, PopInfo, PopType } from '@renderer/function/base'
import { runtimeData } from '@renderer/function/msg'
import {
    MenuEventData,
} from '@renderer/function/elements/information'
import { Msg, SelfMsg } from '@renderer/function/model/msg'
import { Seg, FileSeg, TxtSeg, ImgSeg, FaceSeg, AtSeg } from '@renderer/function/model/seg'
import { wheelMask } from '@renderer/function/utils/input'
import { BaseUser, Member, IUser } from '@renderer/function/model/user'
import { GroupSession, Session, UserSession } from '@renderer/function/model/session'
import { Message } from '@renderer/function/model/message'
import { Time } from '@renderer/function/model/data'
import { closePopBox, ensurePopBox, textPopBox } from '@renderer/function/utils/popBox'
import UserInfoPanComponent, { UserInfoPan } from '@renderer/components/UserInfoPan.vue'
import { vMenu } from '@renderer/function/utils/vcmd'
import {
    shallowRef,
    shallowReactive,
    useTemplateRef,
    nextTick,
    watch,
    onMounted,
    computed,
} from 'vue'
import { backend } from '@renderer/runtime/backend'
import Emoji from '@renderer/function/model/emoji'
import EmojiFace from '@renderer/components/EmojiFace.vue'

//#region == 常量声明 ====================================================================
const { chat } = defineProps<{chat: Session}>()

const $t = app.config.globalProperties.$t

//#region  == 模板引用 ======================================
const choiceFile = useTemplateRef<HTMLInputElement>('choiceFile')
const msgBar = useTemplateRef<InstanceType<typeof MsgBar>>('msgBar')
const mergePan = useTemplateRef<InstanceType<typeof MergePan>>('mergePan')
const infoRef = useTemplateRef<InstanceType<typeof Info>>('infoRef')
const msgMenu = useTemplateRef<InstanceType<typeof Menu>>('msgMenu')
const userMenu = useTemplateRef<InstanceType<typeof Menu>>('userMenu')
const mainInput = useTemplateRef<HTMLTextAreaElement|HTMLInputElement>('main-input')
const msgPan = useTemplateRef<HTMLDivElement>('msgPan')
const sendMore = useTemplateRef<HTMLDivElement>('send-more')
const chatPan = useTemplateRef<HTMLDivElement>('chat-pan')
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

const tagsDefault = {
    showBottomButton: false,
    showMoreDetail: false,
    openChatInfo: false,
    isJinLoading: false,
    onAtFind: false,
    search: {
        userId: -1,
        list: chat?.messageList ?? [],
    },
    isMultiselectMode: false,
}
const details = [
    shallowReactive({
        open: false,
    }),
    shallowReactive({
        open: false,
    }),
    shallowReactive({
        open: false,
    }),
    shallowReactive({
        open: false,
    }),
]
const sendCache = shallowReactive<Seg[]>([])
const imgCache = shallowReactive<string[]>([])
const msgWhileSend = shallowRef<string>('')
const tags = shallowReactive({...tagsDefault})
const atFindList = shallowRef<Member[]|null>(null)
const msgWhileReply = shallowRef<undefined | Msg>()
const canSendMsg = computed(() => {
    if (imgCache.length > 0) return true
    return msgWhileSend.value.trim() !== ''
})
//#endregion

//#region == 初始化 ======================================================================
onMounted(()=>{
    init()

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
    sendCache.length = 0
    imgCache.length = 0
    details[0].open = false
    details[1].open = false
    details[2].open = false
    details[3].open = false
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
    const bar = sendMore.value
    // 顶部
    if (body.scrollTop === 0 && chat.messageList.length > 0) {
        if (!details[3].open) loadHistory()
    }
    // 底部
    if ((body.scrollTop + body.clientHeight + 10) >= body.scrollHeight) {
        chat.setRead()
        tags.showBottomButton = false
        // 去除阴影
        if (bar) {
            bar.style.transition = 'background .3s'
            bar.classList.add('btn')
        }
    }
    // 显示回到底部
    if (
        body.scrollTop <
            body.scrollHeight - body.clientHeight * 2 &&
        tags.showBottomButton !== true
    ) {
        tags.showBottomButton = true
    }
    // 添加阴影
    if (
        body.scrollTop <
        body.scrollHeight - body.clientHeight - 10
    ) {
        if (bar) {
            bar.style.transition = 'background 1s'
            bar.classList.remove('btn')
        }
    }
}

//#region == 发送消息 ==========================================
/**
 * 发送框按键事件
 * @param event 事件
 */
function mainKey(event: KeyboardEvent) {
    if (!event.shiftKey && event.key === 'Enter') {
        // enter 发送消息
        if (canSendMsg.value)
            sendMsg()
    }
}
function mainKeyUp(event: KeyboardEvent) {
    const logger = new Logger()
    // 发送完成后输入框会遗留一个换行，把它删掉 ……
    if (
        !event.shiftKey &&
        event.key === 'Enter' &&
        msgWhileSend.value == '\n'
    ) {
        msgWhileSend.value = ''
    }
    if (event.key !== 'Enter') {
        // 获取最后一个输入的符号用于判定 at
        const lastInput = msgWhileSend.value.at(-1)
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
            if (msgWhileSend.value.lastIndexOf('@') < 0) {
                logger.add(LogType.UI, '匹配群成员列表被打断 ……')
                tags.onAtFind = false
                atFindList.value = null
            } else {
                const atInfo = msgWhileSend.value
                    .substring(msgWhileSend.value.lastIndexOf('@') + 1)
                    .toLowerCase()
                if (atInfo != '') {
                    atFindList.value = chat.memberList
                            .filter((item) => { return item.match(atInfo) })
                }
            }
        }
    }
}

/**
 * 通过表单提交方式发送消息
 * PS：主要用来解决一些奇奇怪怪的回车判定导致的问题
 */
function mainSubmit() {
    if (canSendMsg.value)
        sendMsg()
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
    // 获取所有的 SQCode
    const getSQCode = SendUtil.getSQList(msgWhileSend.value)
    if (getSQCode != null) {
        // 遍历寻找 SQCode 位置区间包括光标位置的 SQCode
        getSQCode.forEach((item) => {
            const start = msgWhileSend.value.indexOf(item)
            const end = start + item.length
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
        })
    }
}

/**
 * 选择 At
 * @param id QQ 号
 */
function choiceAt(id: number | undefined) {
    if (id != undefined) {
        // 删除输入框内的 At 文本
        msgWhileSend.value = msgWhileSend.value.substring(0, msgWhileSend.value.lastIndexOf('@'))
        // 添加 at 信息
        addSpecialSeg(new AtSeg(id))
    }
    toMainInput()
    tags.onAtFind = false
    atFindList.value = null
}

/**
 * 添加特殊消息段
 * @param seg 特殊消息段
 */
function addSpecialSeg(seg: Seg) {
    const index = sendCache.length
    sendCache.push(seg)
    msgWhileSend.value += '[SQ:' + index + ']'
    return index
}
//#endregion

//#region == 右键菜单 ==========================================
const menuDisplayDefault = {
    menuSelectedMsg: null as Msg | null,
    menuSelectedUser: null as IUser | null,
    jumpToMsg: false,
    add: true,
    reply: true,
    forward: true,
    select: true,
    copy: true,
    selectCache: '',
    copySelect: false,
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
    // 如果在搜索状态，只显示跳转到消息的菜单
    if (details[3].open) {
        Object.keys(menuDisplay).forEach(
            (name: string) => {
                (menuDisplay as any)[name] = false
            },
        )
        menuDisplay.jumpToMsg = true
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
    if (data.target.nodeName == 'IMG') {
        // 右击图片需要显示的内容，这边特例设置为链接
        menuDisplay.downloadImg = (
            data.target as HTMLImageElement
        ).src
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
    // tx都可以@自己,咱们不能比tx还封闭(x)
    // if (data.sender.user_id === runtimeData.loginInfo.uin) {
    //     // 自己不显示提及
    //     menuDisplay.at = false
    // }
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
    if (msg.message_id) {
        // 显示回复指示器
        msgWhileReply.value = msg
        // 聚焦输入框
        toMainInput()
    }else {
        new PopInfo().add(
            PopType.ERR,
            $t('无法回复该消息'),
            true,
        )
    }
}

/**
 * 取消回复消息
 */
function cancelReply() {
    msgWhileReply.value = undefined
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

/**
 * 打开好友/群组信息页面
 */
function switchChatInfoPan() {
    if (!chat.isActive) return undefined
    tags.openChatInfo = !tags.openChatInfo
    // 加载一些需要显示的消息，有部分判断是用来防止反复加载已存在内容的
    if (!tags.openChatInfo) return

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

//#region == 图片处理 ==========================================
/**
 * 根据 index 删除图片
 * @param { number } index 图片编号
 */
function deleteImg(index: number) {
    imgCache.splice(index, 1)
}

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
    choiceFile.value?.click()
}

/**
 * 手动选择图片
 */
function selectImg(event: Event) {
    tags.showMoreDetail = false
    const sender = event.target as HTMLInputElement
    if (sender && sender.files) {
        setImg(sender.files[0])
    }
}

/**
 * 将图片转换为 base64 并缓存
 * @param blob 文件对象
 */
async function setImg(blob: File | null) {
    const popInfo = new PopInfo()
    if (
        blob !== null &&
        blob.type.indexOf('image/') >= 0 &&
        blob.size !== 0
    ) {
        if (blob.size < 3145728) {
            // 转换为 Base64
            const reader = new FileReader()
            reader.readAsDataURL(blob)
            reader.onloadend = () => {
                const base64data = reader.result as string
                if (base64data !== null) {
                    if (Option.get('close_chat_pic_pan') === true) {
                        // 在关闭图片插入面板的模式下将直接以 SQCode 插入输入框
                        const data = new ImgSeg(
                            'base64://' +
                            base64data.substring(
                                base64data.indexOf('base64,') + 7,
                                base64data.length
                            )
                        )
                        addSpecialSeg(data)
                    } else {
                        // 记录图片信息
                        // 只要你内存够猛，随便 cache 图片，这边就不做限制了
                        imgCache.push(base64data)
                    }
                }
            }
        } else {
            // 压缩图片
            const options = { maxSizeMB: 3, useWebWorker: true }
            try {
                popInfo.add(
                    PopType.INFO,
                    $t('正在压缩图片 ……'),
                )
                const compressedFile = await imageCompression(
                    blob,
                    options,
                )
                new Logger().add(
                    LogType.INFO,
                    '图片压缩成功，原大小：' +
                        blob.size / 1024 / 1024 +
                        ' MB，压缩后大小：' +
                        compressedFile.size / 1024 / 1024 +
                        ' MB',
                )
                setImg(compressedFile)
            } catch (error) {
                popInfo.add(PopType.INFO, $t('压缩图片失败'))
            }
        }
    }
}
//#endregion

//#region == 文件处理 ==========================================
function runSelectFile() {
    const input = document.getElementById('choice-file')
    if (input) {
        input.click()
    }
}

/**
 * 发送文件
 */
async function selectFile(event: Event) {
    tags.showMoreDetail = false
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
    // 在搜索消息的时候不允许发送消息
    if (details[3].open) {
        return
    }
    // 关闭所有其他的已打开的更多功能弹窗
    details.forEach((item) => {
        item.open = false
    })
    // 无消息不发送
    if (!canSendMsg.value) return
    // 为了减少对于复杂图文排版页面显示上的工作量，对于非纯文本的消息依旧处理为纯文本，如：
    // "这是一段话 [SQ:0]，[SQ:1] 你要不要来试试 Stapxs QQ Lite？"
    // 其中 [SQ:n] 结构代表着这是特殊消息以及这个消息具体内容在消息缓存中的 index，像是这样：
    // sendCache = [{type:"face",id:11},{type:"at",qq:1007028430}]
    //               ^^^^^^^ 0 ^^^^^^^   ^^^^^^^^^^ 1 ^^^^^^^^^^
    // 在发送操作触发之后，将会解析此条字符串排列出最终需要发送的消息结构用于发送。
    const msg = SendUtil.parseMsg(
        msgWhileSend.value,
        sendCache,
        imgCache,
        msgWhileReply.value,
    )
    msgWhileReply.value = undefined
    sendMsgRaw(
        chat,
        msg,
    )
    // 发送后事务
    msgWhileSend.value = ''
    sendCache.length = 0
    imgCache.length = 0
    cancelReply()
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
 * 获取显示群精华消息
 */
function showJin() {
    details[2].open = !details[2].open
    if (!(chat instanceof GroupSession)) return
    if (chat.essenceList.length === 0 && !tags.isJinLoading) {
        tags.isJinLoading = true
        chat.reloadEssenceList()
            .then(()=>{
                tags.isJinLoading = false
                })
    }
    tags.showMoreDetail = !tags.showMoreDetail
}

function searchMessage(event: Event) {
    if (details[3].open) {
        const value = (event.target as HTMLInputElement).value
        if (value.length == 0) {
            tags.search.list = chat.messageList
        } else if (value.length > 0) {
            tags.search.list = chat.messageList.filter(
                item => {
                    if (!(item instanceof Msg)) return false

                    if (item.plaintext.includes(value)) return true
                    if (item.sender.match(value)) {
                        // console.log(item.sender.name, item.sender.match(value))
                        return true
                    }
                    return false
                },
            )
        }
    }
}

function openSearch() {
    details[3].open = !details[3].open
    tags.showMoreDetail = !tags.showMoreDetail
    tags.search.list = chat.messageList
    if (shouldAutoFocus()) toMainInput()
}
function closeSearch() {
    details[3].open = !details[3].open
    msgWhileSend.value = ''
}

/**
 * 发送戳一戳
 */
async function sendPoke(user: IUser) {
    tags.showMoreDetail = false
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

/**
 * 更多功能按钮被点击
 */
function moreFunClick(type = 'default') {
    let hasOpen = false
    // 关闭所有其他的已打开的更多功能弹窗
    details.forEach((item) => {
        if (item.open) hasOpen = true
        item.open = false
    })
    // 如果有关闭操作，就不打开更多功能菜单
    if (hasOpen) return

    if (tags.showMoreDetail) {
        // 如果更多功能菜单已经打开，则关闭
        tags.showMoreDetail = false
        return
    }

    // 打开指定的更多功能菜单
    switch(type) {
        case 'default': tags.showMoreDetail = true; break
        case 'img': runSelectImg(); break
        case 'file': runSelectFile(); break
        case 'face': details[1].open = !details[1].open; break
    }
}

function openLeftBar() {
    runtimeData.tags.openSideBar = !runtimeData.tags.openSideBar
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
    copyToClipboard(msg.plaintext)
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
 * 下载选中的图片
 */
function downloadImg() {
    const url = menuDisplay.downloadImg
    if (url != false) {
        downloadFile(url as string, 'img.png', () => undefined, () => undefined)
    }
    closeMsgMenu()
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
function jumpSearchMsg() {
    closeSearch()
    setTimeout(() => {
        if (!menuDisplay.menuSelectedMsg) return
        if (!scrollToMsg(menuDisplay.menuSelectedMsg, true))
            new PopInfo().add(PopType.INFO, $t('无法定位上下文'))
        closeMsgMenu()
    }, 100)
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
            item.plaintext +
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
const chatMove = {
    move: 0,
    onScroll: 'none' as 'none' | 'touch' | 'wheel',
    lastTime: null as null | number,
    speedList: [] as number[],
    touchLast: null as null | TouchEvent,
}
// 滚轮滑动
function chatWheelEvent(event: WheelEvent) {
    const process = (event: WheelEvent) => {
        // 正在触屏,不处理
        if (chatMove.onScroll === 'touch') return false
        const x = event.deltaX
        const y = event.deltaY
        const absX = Math.abs(x)
        const absY = Math.abs(y)
        // 斜度过大
        if (absY !== 0 && absX / absY < 2) return false
        dispenseMove('wheel', -x / 3)
        return true
    }
    if (!process(event)) return
    event.preventDefault()
    // 创建遮罩
    // 由于在窗口移动中,窗口判定箱也在移动,当指针不再窗口外,事件就断了
    // 所以要创建一个不会动的全局遮罩来处理
    wheelMask(process,()=>{
        dispenseMove('wheel', 0, true)
    })
}

// 触屏开始
function chatMoveStartEvent(event: TouchEvent) {
    if (chatMove.onScroll === 'wheel') return
    // 触屏开始时，记录触摸点
    chatMove.touchLast = event
}

// 触屏滑动
function chatMoveEvent(event: TouchEvent) {
    if (chatMove.onScroll === 'wheel') return
    if (!chatMove.touchLast) return
    const touch = event.changedTouches[0]
    const lastTouch = chatMove.touchLast.changedTouches[0]
    const deltaX = touch.clientX - lastTouch.clientX
    const deltaY = touch.clientY - lastTouch.clientY
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    // 斜度过大
    if (absY !== 0 && absX / absY < 2) return
    // 触屏移动
    chatMove.touchLast = event
    dispenseMove('touch', deltaX)
}

// 触屏滑动结束
function chatMoveEndEvent(event: TouchEvent) {
    if (chatMove.onScroll === 'wheel') return
    const touch = event.changedTouches[0]
    const lastTouch = chatMove.touchLast?.changedTouches[0]
    if (lastTouch) {
        const deltaX = touch.clientX - lastTouch.clientX
        const deltaY = touch.clientY - lastTouch.clientY
        const absX = Math.abs(deltaX)
        const absY = Math.abs(deltaY)
        // 斜度过大
        if (absY === 0 || absX / absY > 2) {
            dispenseMove('touch', deltaX)
        }
    }
    dispenseMove('touch', 0, true)
    chatMove.touchLast = null
}
/**
 * 分发触屏/滚轮情况
 */
function dispenseMove(type: 'touch' | 'wheel', value: number, end: boolean = false) {
    if (!end && chatMove.onScroll === 'none') startMove(type, value)
    if (chatMove.onScroll === 'none') return
    if (end) endMove()
    else keepMove(value)
}
/**
 * 开始窗口移动
 */
function startMove(type: 'touch' | 'wheel', value: number) {
    // 移除不需要的css
    const target = getTargetWin()
    if (!target) return
    target.style.transition = 'all 0s'
    // 禁用滚动
    const pan = chatPan.value
    if (!pan) return
    const chat = pan.getElementsByClassName('chat')[0] as HTMLDivElement
    if(chat) {
        chat.style.overflowY = 'hidden'
    }
    chatMove.onScroll = type
    chatMove.move = value
    chatMove.lastTime = Date.now()
}
/**
 * 保持窗口移动
 */
function keepMove(value: number){
    chatMove.move += value
    const nowDate = Date.now()
    if (!chatMove.lastTime) return
    const deltaTime = nowDate - chatMove.lastTime
    chatMove.lastTime = nowDate
    chatMove.speedList.push(
        value / deltaTime
    )
    if (chatMove.move < 0) chatMove.move = 0
    const move = chatMove.move
    const target = getTargetWin()
    if (!target) return
    target.style.transform = 'translateX(' + move + 'px)'
}
/**
 * 结束窗口移动
 */
function endMove() {
    // 保留自己要的数据
    const move = chatMove.move
    const speedList = chatMove.speedList
    // 重置数据
    chatMove.onScroll = 'none'
    chatMove.lastTime = 0
    chatMove.speedList = []
    chatMove.move = 0
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
    // 移动距离大小判定
    const width = target.offsetWidth
    // 如果移动距离大于屏幕宽度的三分之一，视为关闭
    if (move > width / 3) {
        return exitWin()
    }
    // 末端速度法
    // 防止误触
    if (move < runtimeData.inch * 0.5) return
    const endSpeedList = speedList.reverse().slice(0, 10)
    let endSpeed = 0
    for (const speed of endSpeedList) {
        endSpeed += speed
    }
    endSpeed /= endSpeedList.length
    endSpeed /= runtimeData.inch
    // 如果末端速度大于 5，则视为关闭
    if (endSpeed > 5) {
        return exitWin()
    }
}
//#endregion
/**
 * 得到焦点窗口
 */
function getTargetWin(): HTMLDivElement | undefined {
    const pan = chatPan.value
    if (!pan) return
    if(tags.openChatInfo) {
        // 聊天信息面板返回
        return pan.getElementsByClassName('chat-info-pan')[0] as HTMLDivElement
    } else if(mergePan.value?.isMergeOpen()) {
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
    if(tags.openChatInfo) {
        // 会话信息栏
        switchChatInfoPan()
    } else if(mergePan.value?.isMergeOpen()) {
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
        runtimeData.tags.openSideBar = true
        closeSession()
        new Logger().add(LogType.UI, '右滑打开侧边栏触发完成')
    }
}

/**
 * 加载更多历史消息
 */
async function loadHistory() {
    if (chat.loadHistoryState !== 'normal') return

    const pan = msgPan.value
    if (!pan) return
    const oldScrollHeight = pan.scrollHeight

    if (!await chat.loadHistory()) return

    nextTick(() => {
        new Logger().debug(`滚动前高度：${oldScrollHeight}，当前高度：${pan.scrollHeight}，滚动位置：${pan.scrollHeight - oldScrollHeight}`)
        pan.style.scrollBehavior = 'unset'
        // 纠正滚动位置
        pan.scrollTop += pan.scrollHeight - oldScrollHeight
        pan.style.scrollBehavior = 'smooth'
    })
}
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
            pan.style.scrollBehavior = 'unset'
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
