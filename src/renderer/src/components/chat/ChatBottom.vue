<template>
    <div class="chat-bottom"
        :class="{ hide: hide }"
        :style="{
            '--open-reply': session.inputMsg.reply ? '1' : '0',
            '--input-height': textAreaHeight + 'px'
        }"
        @mouseenter="hoverStart()"
        @mouseleave="hoverEnd()">
        <!-- 表情面板 -->
        <Transition name="pan">
            <FacePan v-show="details === 'face' && !focusHide"
                @send-msg="sendMsg" />
        </Transition>
        <!-- 精华消息 -->
        <Transition v-if="session instanceof GroupSession" name="pan">
            <EssenceMsgsPan v-show="details === 'essence' && !focusHide"
                :session="session" :key="session.id" @close="switchDetail('essence')" />
        </Transition>
		<div id="chat-bottom-top" />
        <!-- 图片指示器 -->
        <Transition name="img-pan">
            <div v-show="session.inputMsg.imgCache.size > 0 && !focusHide"
                :class="{
                    'img-pan': true,
                    'ss-card': true,
                }"
                @wheel="($event.currentTarget as HTMLElement).scrollLeft += $event.deltaY">
                <div class="imgs">
                    <div v-for="[key, value] in session.inputMsg.imgCache"
                        :key="'imgCache-' + key">
                        <div class="img-btns">
                            <div @click="editImg(key)">
                                <font-awesome-icon :icon="['fas', 'pencil']" />
                            </div>
                            <hr />
                            <div @click="session.inputMsg.rmImg(key)">
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
        <!-- 输入栏 -->
        <div class="input-pan ss-card">
            <!-- 更多功能 -->
            <div class="more-detail">
                <div
                    :title="$t('图片')"
                    @click="selectImg">
                    <font-awesome-icon :icon="['fas', 'image']" />
                </div>
                <div v-if="!(session instanceof TempSession)"
                    :title="$t('文件')"
                    @click="selectFile">
                    <font-awesome-icon :icon="['fas', 'folder']" />
                </div>
                <div
                    :title="$t('表情')"
                    :class="{'select': details === 'face'}"
                    @click="switchDetail('face')">
                    <font-awesome-icon :icon="['fas', 'face-laugh']" />
                </div>
                <div v-if="session instanceof UserSession"
                    :title="$t('戳一戳')"
                    @click="emit('sendPoke', session.baseUser)">
                    <font-awesome-icon :icon="['fas', 'fa-hand-point-up']" />
                </div>
                <div v-if="session instanceof GroupSession"
                    :class="{'select': details === 'essence'}"
                    :title="$t('精华消息')" @click="switchDetail('essence')">
                    <font-awesome-icon :icon="['fas', 'star']" />
                </div>
                <div class="space" />
                <div class="send"
                    :class="{'disable': session.inputMsg.isVoid}"
                    :title="session.inputMsg.isVoid ? $t('空消息不可以发送哦～') : $t('发送消息')"
                    @click="sendMsg()">
                    <span>{{ $t('发送') }}</span>
                    <font-awesome-icon :icon="['fas', 'angle-right']" />
                </div>
            </div>
            <hr />
            <!-- At 指示器 -->
            <div
                class="at-tag"
                :class="{
                    'show': atFindMode
                }"
                ref="find-bar">
                <div v-for="item, id in atFindList"
                    :key="'atFind-' + item.user_id"
                    :class="{selected: atSelected === id}"
                    ref="at-find-items"
                    @click="choiceAt(id)">
                    <img :src="item.face" :alt="item.name">
                    <div>
                        <span>{{ item.name }}</span>
                        <span v-if="item.role !== Role.User || item.title"
                            v-user-role="item.role">
                            <template v-if="item.title">
                                {{ item.title }}
                            </template>
                            <template v-else-if="item.role === Role.Bot">
                                <font-awesome-icon :icon="['fas', 'robot']" />
                            </template>
                            <template v-else-if="item.role === Role.Owner">
                                {{ $t('群主') }}
                            </template>
                            <template v-else-if="item.role === Role.Admin">
                                {{ $t('管理员') }}
                            </template>
                        </span>
                    </div>
                    <a>{{ item.user_id }}</a>
                </div>
                <div v-if="atFindList.length == 0" class="emp">
                    <span>{{ $t('没有找到匹配的群成员') }}</span>
                </div>
            </div>
            <!-- 回复指示器 -->
            <div :class="{
                'input-special-tag': true,
                'show': session.inputMsg.reply
            }">
                <font-awesome-icon :icon="['fas', 'reply']" />
                <span>
                    {{ session.inputMsg.reply?.preMsg }}
                </span>
                <div @click="session.inputMsg.rmReply()">
                    <font-awesome-icon :icon="['fas', 'xmark']" />
                </div>
            </div>
            <!-- 消息发送框 -->
            <div class="input">
                <textarea
                    ref="main-input"
                    id="main-input"
                    v-model="session.inputMsg.content"
                    type="text"
                    @paste="addImg"
                    @keydown="mainKey"
                    @keyup="mainKeyUp"
                    @click="selectSQIn()"
                    @compositionstart="handleCompositionStart"
                    @compositionend="handleCompositionEnd" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import EssenceMsgsPan from '@renderer/components/EssenceMsgsPan.vue'
import FacePan from '@renderer/components/FacePan.vue'

import { IUser, Member } from '@renderer/function/model/user'
import { GroupSession, Session, TempSession, UserSession } from '@renderer/function/model/session'
import { Logger, LogType, PopInfo, PopType } from '@renderer/function/base'
import imageCompression from 'browser-image-compression'
import app from '@renderer/main'
import { sendMsgRaw } from '@renderer/function/utils/msgUtil'
import { delay } from '@renderer/function/utils/systemUtil'
import { runtimeData } from '@renderer/function/msg'
import { AtSeg } from '@renderer/function/model/seg'
import { useTemplateRef, shallowRef, nextTick, inject, TemplateRef, computed, watchEffect } from 'vue'
import Viewer from '../Viewer.vue'
import { Role } from '@renderer/function/adapter/enmu'
import { vUserRole } from '@renderer/function/utils/vcmd'
import { fitScroll } from '@renderer/function/utils/appUtil'
import { FileSender } from '@renderer/function/utils/fileSender'
import { uploadFile } from '@renderer/function/input'

const viewer: TemplateRef<undefined | InstanceType<typeof Viewer>> = inject('viewer')!

const { session, focusHide = false } = defineProps<{
    session: Session
	focusHide?: boolean
}>()

const emit = defineEmits<{
    sendPoke: [user: IUser],
    scrollBottom: [smooth: boolean],
}>()

const atFindMode = shallowRef(false)
const atFindList = shallowRef<Member[]>([])
const atSelected = shallowRef<number>(0)
const details = shallowRef<'face'|'essence'|undefined>()
const onAtFind = shallowRef(false)

const textAreaHeight = computed(()=>{
    session.inputMsg.content
    if (!mainInput.value) return 0
    const dom = mainInput.value as HTMLTextAreaElement
    dom.style.height = 'auto'
    const height = dom.scrollHeight
    dom.style.height = ''
    return height
})

const hover = shallowRef(false)
const sendTimeout = shallowRef<ReturnType<typeof setTimeout> | undefined>(undefined)
const hide = computed<boolean>(()=>{
	if (focusHide) return true
    if (!runtimeData.sysConfig.hide_chat_bottom) return false
    if (sendTimeout.value) return false
    if (compositionTag.value) return false
    if (!session.inputMsg.isVoid) return false
    return !hover.value
})

const mainInput = useTemplateRef('main-input')
const atFindBar = useTemplateRef('find-bar')
const atFindItems = useTemplateRef('at-find-items')

function $t(key: string): string {
    return app.config.globalProperties.$t(key)
}

let lastInputVoid = session.inputMsg.isVoid
// 延迟1s隐藏
watchEffect(()=>{
    if (lastInputVoid === session.inputMsg.isVoid) return
    lastInputVoid = session.inputMsg.isVoid
    if (!session.inputMsg.isVoid) return

    clearTimeout(sendTimeout.value)
    sendTimeout.value = setTimeout(()=>{
        sendTimeout.value = undefined
    }, 500)
})

/**
 * 初始化
 */
function init() {
    endChoiceAt()
    details.value = undefined
}

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
 * 将焦点移回主发送框
 */
function toMainInput() {
    mainInput.value?.focus()
}

//#region == 发送消息 ==========================================
const compositionTag = shallowRef(false)
function handleCompositionStart() {
    compositionTag.value = true
}
function handleCompositionEnd() {
    compositionTag.value = false
}
/**
 * 发送框按键事件
 * @param event 事件
 */
function mainKey(event: KeyboardEvent) {
    // 处理 At 查找
    if (keyCheck(event)) {
        event.preventDefault()
        event.stopPropagation()
        return
    }

    if (event.key !== 'Enter') return
    if (compositionTag.value) return      // 乱七八糟的输入法忽略
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

    // 补加 enter
    // ctrl + enter
    // meta + enter
    // alt + enter
    // 上述组合不自带enter,需要手动补充
    if(canSend && !session.inputMsg.isVoid) {
        sendMsg()
    } else if(event.key === 'Enter' &&
        (event.ctrlKey || event.metaKey || event.altKey)) {
        // 否则触发回车逻辑，补充换行
        session.inputMsg.content += '\n'
    }
}
function mainKeyUp(event: KeyboardEvent) {
    const logger = new Logger()
    if (event.key !== 'Enter') {
        const content = session.inputMsg.content
        // 获取最后一个输入的符号用于判定 at
        const lastInput = content.at(-1)
        if (
            !onAtFind.value &&
            lastInput == '@' &&
            session instanceof GroupSession
        ) {
            logger.add(LogType.UI, '开始匹配群成员列表 ……')
            atFindMode.value = true
        }
    }
}
/**
 * 发送消息
 */
function sendMsg() {
    // 关闭所有其他的已打开的更多功能弹窗
    switchDetail(undefined)
    // 无消息不发送
    if (session.inputMsg.isVoid) return
    // 为了减少对于复杂图文排版页面显示上的工作量，对于非纯文本的消息依旧处理为纯文本，如：
    // "这是一段话 [SQ:0]，[SQ:1] 你要不要来试试 Stapxs QQ Lite？"
    // 其中 [SQ:n] 结构代表着这是特殊消息以及这个消息具体内容在消息缓存中的 index，像是这样：
    // sendCache = [{type:"face",id:11},{type:"at",qq:1007028430}]
    //               ^^^^^^^ 0 ^^^^^^^   ^^^^^^^^^^ 1 ^^^^^^^^^^
    // 在发送操作触发之后，将会解析此条字符串排列出最终需要发送的消息结构用于发送。

    sendMsgRaw(
        session,
        session.inputMsg.render(),
    )
    // 发送后事务
    session.inputMsg.clear()
    nextTick(async ()=>{
        await delay(100)
        emit('scrollBottom', true)
    })
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
    for (const sq of session.inputMsg.sqList) {
        const start = session.inputMsg.content.indexOf(sq)
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
//#endregion

//#region == At相关 ============================================
// 搜索at信息
watchEffect(()=>{
    if (!atFindMode.value) return

    const content = session.inputMsg.content
    const s = session as GroupSession
    // 获取最后一个输入的符号用于判定 at
    const lastAtIndex = content.lastIndexOf('@')
    if (lastAtIndex === -1) {
        atFindList.value = []
        atFindMode.value = false
        return
    }
    const search = content.substring(lastAtIndex + 1)

    if (search === '') {
        atFindList.value = s.memberList
        return
    }

    // 搜索过滤
    const members = (session as GroupSession).memberList
    atFindList.value = members.filter(m=>m.match(search))
    // 重置选择位置
    if (atSelected.value >= atFindList.value.length) {
        atSelected.value = atFindList.value.length - 1
    }
})
// 限制选择的范围
watchEffect(()=>{
    if (atSelected.value < 0)
        atSelected.value = atFindList.value.length - 1
    if (atSelected.value >= atFindList.value.length)
        atSelected.value = 0

    // 出界滚动
    const container = atFindBar.value
    const item = atFindItems.value?.[atSelected.value]
    if (!container || !item) return
    nextTick(()=>fitScroll(container, item))
})
function keyCheck(event: KeyboardEvent): boolean {
    if (!atFindMode.value) return false
    if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
    ) return false
    switch (event.key) {
        case 'ArrowDown':
            // 下移
            atSelected.value++
            if (atSelected.value >= atFindList.value.length) {
                atSelected.value = 0
            }
            return true
        case 'ArrowUp':
            // 上移
            atSelected.value--
            if (atSelected.value < 0) {
                atSelected.value = atFindList.value.length - 1
            }
            return true
        case 'Enter':
            // 选择
            choiceAt(atSelected.value)
            return true
        case 'Escape':
            // 取消
            endChoiceAt()
        default:
            return false
    }
}

/**
 * 选择 At
 * @param id QQ 号
 */
function choiceAt(id: number) {
    const member = atFindList.value.at(id)
    if (!member) return

    // 删除输入框内的 At 文本
    console.log(session.inputMsg.content.lastIndexOf('@'))
    session.inputMsg.content = session.inputMsg.content.substring(
        0, session.inputMsg.content.lastIndexOf('@')
    )
    // 添加 at 信息
    session.inputMsg.addSq(new AtSeg(member.user_id))

    toMainInput()
    endChoiceAt()
}
function endChoiceAt() {
    onAtFind.value = false
    atFindList.value = []
    atFindMode.value = false
    atSelected.value = 0
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
            const file = item.getAsFile()
            if (!file) continue
            if (!file.type.startsWith('image/')) continue
            setImg(file)
            // 阻止默认行为
            event.preventDefault()
        }
    }
}

/**
 * 手动选择图片
 */
async function selectImg() {
    const img = await uploadFile('image/*')
    if (!img) return
    setImg(img)
}

/**
 * 将图片转换为 base64 并缓存
 * @param file 文件对象
 */
async function setImg(file: File) {
    const popInfo = new PopInfo()
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

    session.inputMsg.addImg(await fileToDataURL(file))
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

/**
 * 编辑图片
 * @param key 图片在缓存中的键
 */
async function editImg(key: number) {
    const img = session.inputMsg.imgCache.get(key)
    if (!img) return
    if (!viewer.value) return
    const dataurl = await viewer.value.edit(img)
    session.inputMsg.imgCache.set(key, dataurl)
}
//#endregion

//#region == 文件处理 ==========================================
/**
 * 发送文件
 */
async function selectFile() {
    await FileSender.autoUploadFile(session as GroupSession | UserSession)
}
//#endregion

//#region == 隐藏处理 ==========================================
let hoverTimeout: ReturnType<typeof setTimeout> | undefined
let staticTime: number | undefined
/**
 * 鼠标移入
 * 可以指定多长时间，才允许鼠标移出后，侧边栏收起
 * @param timeout
 */
function hoverStart(timeout: number = 500) {
    if (!staticTime) {
        hover.value = true
        staticTime = Date.now() + timeout
    }
    clearTimeout(hoverTimeout)
}
/**
 * 鼠标移出
 * @param event 鼠标移除位置检测
 */
function hoverEnd(event?: MouseEvent) {
    if (!staticTime) return
    if (event?.relatedTarget instanceof HTMLElement) {
        if (event.relatedTarget.closest('.menu-component')) return
    }
    const dTime = staticTime - Date.now()
    if (dTime <= 0) {
        hover.value = false
        staticTime = undefined
    }else {
        hoverTimeout = setTimeout(() => {
            hover.value = false
            staticTime = undefined
        }, dTime)
    }
}
//#endregion

defineExpose({
    init,
    toMainInput,
})
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
