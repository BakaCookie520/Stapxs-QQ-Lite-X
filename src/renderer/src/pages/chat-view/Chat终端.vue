<!--
 * @FileDescription: 聊天面板页面（命令行样式）
 * @Author: Stapxs
 * @Date: 2023/01/11
 * @Version: 1.0 - 初始版本
 * @Description: 这是个命令行样式的聊天面板，摸鱼专用.gif
-->

<!--
    追加备注
    此界面主题不支持以下功能：
    - 图片预览器，这玩意虽然说是全局的，但是太突兀了（无端）
 -->

<template>
    <div
        id="chat-pan"
        :class="{
            'chat-pan': true,
            'open': runtimeData.tags.openSideBar,
            'withBar': needBar()
        }">
        <div
            id="shell-pan"
            class="shell-pan">
            <div>
                <template
                    v-for="(msgItem, index) in cmdLines"
                    :key="msgItem.uuid">
                    <div
                        v-if="msgItem instanceof Msg"
                        :class="{
                            'shell-msg': true,
                            'revoke': msgItem.exist,
                            'reply': replyMsg === msgItem,
                        }"
                        style="cursor: pointer">
                        <span
                            :class="getCss(msgItem)"
                            @click="copy(String(msgItem.sender.user_id))">
                            {{ msgItem.sender.name }}
                            {{ hasReply(msgItem) ?? '' }}
                            {{ msgItem.sender.user_id == 0 ? '' : ': ' }}
                        </span>
                        <span
                            class="smsg"
                            @click="copy(msgItem.message_id as string)">{{
                            msgItem.plaintext
                        }}</span>
                        <br>
                    </div>
                    <div v-else-if="msgItem instanceof Notice">
                        <span
                            v-if="msgItem instanceof RecallNotice"
                            style="color: yellow">::
                            <span style="color: yellow; opacity: 0.7">{{ msgItem.operator.name }}</span>
                            recalled a message.</span>
                    </div>
                    <div v-else-if="msgItem.commandLine">
                        <div
                            v-if="index == 2"
                            class="line-head">
                            <div>
                                <span>
                                    <font-awesome-icon
                                        :icon="['fas', 'folder-open']" />
                                    {{ chat.showName }}
                                </span>
                                <span style="color: var(--color-main-0)">
                                    <font-awesome-icon
                                        :icon="['fas', 'plug']" />
                                    {{ runtimeData.sysConfig.address }}
                                </span>
                            </div>
                            <div style="flex: 1" />
                            <div>
                                <span style="color: var(--color-main-1)">
                                    {{ packageInfo.version
                                    }}<font-awesome-icon
                                        :icon="['fas', 'code-branch']" />
                                </span>
                                <span>
                                    {{ msgItem.time.time }}<font-awesome-icon
                                        :icon="['fas', 'clock']" />
                                </span>
                            </div>
                        </div>
                        <a class="command-start">• </a>
                        <span>{{ msgItem.str }}</span>
                    </div>
                    <div v-else-if="msgItem.commandOut">
                        <div
                            v-if="msgItem.html"
                            v-html="msgItem.html" />
                        <span
                            v-else
                            :style="'color:' + msgItem.color">{{ msgItem.str }}</span>
                    </div>
                </template>
            </div>
            <div class="shell-input">
                <div class="line-head">
                    <div>
                        <span>
                            <font-awesome-icon
                                :icon="['fas', 'folder-open']" />
                            {{ chat.showName }}
                            {{ replyMsg?.sender.name ? ' -> ' + replyMsg.sender.name : '' }}
                        </span>
                        <span style="color: var(--color-main-0)">
                            <font-awesome-icon :icon="['fas', 'plug']" />{{
                                runtimeData.sysConfig.address
                            }}
                        </span>
                    </div>
                    <div style="flex: 1" />
                    <div>
                        <span
                            v-if="tags.newMsg > 0"
                            style="color: var(--color-main-2)">
                            {{ tags.newMsg
                            }}<font-awesome-icon :icon="['fas', 'envelope']" />
                        </span>
                        <span style="color: var(--color-main-1)">
                            {{ packageInfo.version
                            }}<font-awesome-icon
                                :icon="['fas', 'code-branch']" />
                        </span>
                        <span>
                            {{ timeShow
                            }}<font-awesome-icon :icon="['fas', 'clock']" />
                        </span>
                    </div>
                </div>
                <a class="command-start">• </a>
                <input
                    id="msgInput"
                    v-model="msg"
                    @keyup="sendMsg"
                    @paste="addImg">
            </div>
        </div>
    </div>
</template>

<script lang="ts">
    import SendUtil from '@renderer/function/sender'
    import packageInfo from '../../../../../package.json'
    import Option from '@renderer/function/option'

    import {
        defineComponent,
        markRaw,
        nextTick,
        Reactive,
    } from 'vue'
    import { runtimeData } from '@renderer/function/msg'
    import { copyToClipboard, getTrueLang, needBar } from '@renderer/function/utils/systemUtil'
    import {
        Logger,
        LogType,
        PopInfo,
        popList,
        PopType,
    } from '@renderer/function/base'
    import { changeSession, closeSession, sendMsgRaw } from '@renderer/function/utils/msgUtil'
    import { uptime } from '@renderer/main'
    import { Msg } from '@renderer/function/model/msg'
    import { ImgSeg, ReplySeg, Seg } from '@renderer/function/model/seg'
    import { Session } from '@renderer/function/model/session'
    import { Notice, RecallNotice } from '@renderer/function/model/notice'
    import { Message } from '@renderer/function/model/message'
    import SystemNotice from './SystemNotice.vue'
    import { backend } from '@renderer/runtime/backend'

    export default defineComponent({
        name: 'ChatShell',
        props: {
            chat: {
                type: Object as () => Session,
                required: true,
            },
        },
        data() {
            return {
                backend,
                needBar,
                tags: {
                    fullscreen: false,
                    fistget: true,
                    cmdTags: {} as { [key: string]: any },
                    newMsg: 0,
                },
                popInfo: new PopInfo(),
                packageInfo: packageInfo,
                runMode: import.meta.env.DEV,
                timeLoad: markRaw({
                    time: Intl.DateTimeFormat(getTrueLang(), {
                        hour: 'numeric',
                        minute: 'numeric',
                        second: 'numeric',
                    }).format(new Date()),
                }),
                runtimeData: runtimeData,
                trueLang: getTrueLang(),
                timeShow: '',
                timeSetter: null as unknown,
                msg: '',
                supportCmd: {} as { [key: string]: any },
                imgCache: [] as string[],
                sendCache: [] as Seg[],
                searchListCache: [] as Session[],
                replyMsg: null as Msg | null,
                cmdLines: [] as (Message | any)[],
                headMsg: null as null | Message,      // 头部消息,用来和chat.messageList比对来更新cmdLines
                endMsg: null as null | Message,       // 尾部消息,用来和chat.messageList比对来更新cmdLines
                Msg,
                Notice,
                RecallNotice,
            }
        },
        watch: {
            chat() {
                this.tags.fistget = true
                this.tags.cmdTags = {}
            },
        },
        mounted() {
            this.supportCmd = {
                help: {
                    info: 'Show All Command.',
                    fun: () => {
                        let back = ''
                        Object.keys(this.supportCmd).forEach((name) => {
                            if (name != '')
                                back +=
                                    '<span style="color: var(--color-font-2);"><span style="width: 13ch;display: inline-block;">' +
                                    name +
                                    '</span>: ' +
                                    this.supportCmd[name].info +
                                    '</span><br>'
                        })
                        this.addCommandOut('', '', back)
                    },
                },
                ls: {
                    info: 'List all contacts in the current message queue.',
                    fun: () => {
                        this.searchListCache = [...Session.activeSessions] as unknown as Reactive<Session[]>
                        let str =
                            '  total ' + this.searchListCache.length + '\n'
                        let hasMsg = false
                        this.searchListCache.forEach((item, index) => {
                            if (item.newMsg > 0) {
                                str += '• '
                                hasMsg = true
                            } else str += '  '
                            str += index.toString() + '     '
                            str +=
                                (item.id) +
                                '     '
                            str +=
                                (item.showName) + '     '
                            str += '\n'
                        })
                        if (hasMsg)
                            this.addCommandOut(':: You have message.', 'yellow')
                        this.addCommandOut(str)
                    },
                },
                sql: {
                    info: 'Stapxs QQ Lite X Base Command.',
                    fun: (raw: string, item: string[]) => {
                        switch (item[1]) {
                            // 发送消息
                            case 'send': {
                                const rawMsg = raw.substring(
                                    raw.indexOf('send') + 5,
                                )
                                const msg = SendUtil.parseMsg(
                                    rawMsg,
                                    this.sendCache,
                                    this.imgCache,
                                    this.replyMsg as Msg ?? undefined,
                                )
                                sendMsgRaw(
                                    this.chat,
                                    msg,
                                )
                                // 发送后处理
                                this.sendCache = []
                                this.imgCache = []

                                this.replyMsg = null
                                break
                            }
                            // 寻找联系人
                            case 'list': {
                                const value = item[2]
                                this.searchListCache =
                                    Session.sessionList.filter(
                                        session => session.match(value),
                                    ) as unknown as Reactive<Session[]>
                                let str =
                                    '  total ' +
                                    this.searchListCache.length +
                                    '\n'
                                this.searchListCache.forEach((item, index) => {
                                    str += index.toString() + '     '
                                    str +=
                                        (item.id) + '     '
                                    str +=
                                        (item.showName) + '     '
                                    str += '\n'
                                })
                                this.addCommandOut(str)
                                break
                            }
                            // 回复消息
                            case 'reply': {
                                // 去除回复消息缓存
                                this.replyMsg = null
                                if (item[2] && item[2] != 'clear') {
                                    // 根据 item[2] 寻找这条消息 的名字
                                    const msg = this.chat.messageList.filter(
                                        (msg) => {
                                            if (!(msg instanceof Msg)) return false
                                            return msg.message_id == item[2]
                                        },
                                    )
                                    this.replyMsg = msg[0] as Reactive<Msg>
                                } else if (item[2] && item[2] == 'clear') {
                                    this.replyMsg = null
                                }
                                if (item[3]) {
                                    this.supportCmd['sql'].fun(
                                        'sql send ' + item[3],
                                        ['sql', 'send', item[3]],
                                    )
                                    this.msg = ''
                                }
                                break
                            }
                            // 加载历史记录
                            case 'history': {
                                // 移除顶部的首次加载提示
                                if (this.cmdLines[0].commandOut) {
                                    this.cmdLines.shift()
                                    this.cmdLines.shift()
                                    this.cmdLines.shift()
                                    this.cmdLines.shift()
                                }
                                this.chat.loadHistory()
                                break
                            }
                            default: {
                                this.addCommandOut(
                                    'usage: sql send [msg]: Send a message, you can directly use "/<Message>" to replace it, \n           list [search]: Fuzzy search in the list of friends/groups, \n           reply [msgId] <message>: Use the message id to reply to the message, Click the message to copy the id, \n           history: Load more history.',
                                )
                            }
                        }
                    },
                },
                fullscreen: {
                    info: 'fullscreen chat view.',
                    fun: () => {
                        const pan = document.getElementById('chat-pan')
                        if (pan) {
                            if (!this.tags.fullscreen) {
                                this.tags.fullscreen = true
                                pan.classList.add('full')
                            } else {
                                this.tags.fullscreen = false
                                pan.classList.remove('full')
                            }
                        }
                    },
                },
                neofetch: {
                    info: 'print system info.',
                    fun: () => {
                        const infoList = {
                            Application: 'Stapxs QQ Lite X',
                            Kernel: packageInfo.version + '-web',
                            Shell: 'stsh Basic Shell 1.0',
                            Theme: 'ChatSHell',
                            Uptime:
                                Math.floor(
                                    ((new Date().getTime() - uptime) / 1000) *
                                        100,
                                ) /
                                    100 +
                                ' s',
                            Resolution:
                                window.screen.width +
                                'x' +
                                window.screen.height,
                        } as { [key: string]: string }
                        if (backend.isDesktop()) {
                            infoList.Kernel = packageInfo.version + '-electron'
                        }
                        let info = ''
                        Object.keys(infoList).forEach((key) => {
                            info += `<span>${key}<span>: ${infoList[key]}</span></span>`
                        })
                        this.addCommandOut(
                            '',
                            '',
                            `<div class="shell-neofetch"><span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;***&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*******************&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;***************************&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*******************************&nbsp;&nbsp;&nbsp;&nbsp;<br>&nbsp;&nbsp;&nbsp;**************&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**************&nbsp;&nbsp;<br>&nbsp;&nbsp;*************&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*************&nbsp;<br>&nbsp;**************&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*************<br>&nbsp;*************,&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*************<br>*************,&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;************<br>&nbsp;************&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;***********<br>&nbsp;***********,**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*.***********<br>&nbsp;&nbsp;*************&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*************&nbsp;<br>&nbsp;&nbsp;&nbsp;***********************************&nbsp;&nbsp;<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*******************************&nbsp;&nbsp;&nbsp;&nbsp;<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;***************************&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*******************<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;***</span><div><span>${runtimeData.loginInfo.nickname}<span>@</span>sql-vue</span><a>-----------------</a>${info}<div><div style="background:black"></div><div style="background:red"></div><div style="background:green"></div><div style="background:yellow"></div><div style="background:blue"></div><div style="background:violet"></div></div></div></div>`,
                        )
                    },
                },
                clear: {
                    info: 'clear message list.',
                    fun: () => {
                        // PS：让消息列表不是空的防止输出首次进入信息
                        this.addCommandOut('')
                    },
                },
                cd: {
                    info: 'Alias for "cd /[id]"',
                    fun: (_: string, itemInfo: string[]) => {
                        let id = '0'
                        if (
                            itemInfo.length == 1 &&
                            this.searchListCache.length == 1
                        ) {
                            id = this.searchListCache[0].id.toString()
                        } else {
                            id = itemInfo[1]
                            if (itemInfo[1] == '../') {
                                const pan = document.getElementById('chat-pan')
                                if (pan) {
                                    this.tags.fullscreen = false
                                    pan.classList.remove('full')
                                    closeSession()
                                }
                                return
                            }
                            if (itemInfo[1].startsWith('#')) {
                                const index = Number(itemInfo[1].substring(1))
                                if (this.searchListCache[index]) {
                                    id = this.searchListCache[index].id.toString()
                                } else {
                                    this.addCommandOut(
                                        ':: Search cache id does not exist',
                                        'red',
                                    )
                                    return
                                }
                            }
                        }
                        // 从缓存列表里寻找这个 ID
                        for (const session of Session.sessionList) {
                            const gid = session.id
                            if (String(gid) === id) {
                                // 看看该会话是否激活
                                if (!session.isActive)
                                    session.activate()
                                nextTick(() => {
                                    changeSession(session)
                                })
                                return
                            }
                        }
                        this.addCommandOut(':: No valid contacts found', 'red')

                        this.replyMsg = null
                    },
                },
            }

            this.$watch(() => this.chat.messageList.length, this.updateList)
            this.$watch(() => popList.length, this.showPop)
            this.timeSetter = setInterval(() => {
                this.timeShow = Intl.DateTimeFormat(this.trueLang, {
                    hour: 'numeric',
                    minute: 'numeric',
                    second: 'numeric',
                }).format(new Date())
                // 刷新新消息数
                this.tags.newMsg = [...Session.activeSessions].filter((item) => {
                    return item.newMsg > 0
                }).length
            }, 1000)
            const pan = document.getElementById('chat-pan')
            if (pan) {
                this.tags.fullscreen = true
                pan.classList.add('full')
            }
        },
        methods: {
            hasReply(msg: Msg) {
                if (msg.message) {
                    const repItem = msg.message.filter((item: Seg) => {
                        return item.type === 'reply'
                    })
                    if (repItem.length === 0) return
                    const replySeg: ReplySeg = repItem[0] as ReplySeg
                    const repMsg: Msg[] = this.chat.messageList.filter(
                        (item) => {
                            if (!(item instanceof Msg)) return false
                            return item.message_id === replySeg.id
                        },
                    ) as Msg[]
                    if (repMsg[0]) {
                        return (
                            '->' +
                            (repMsg[0].sender.name)
                        )
                    }
                }
                return null
            },

            /**
             * 消息区滚动到指定位置
             * @param where 位置（px）
             * @param showAnimation 是否使用动画
             */
            scrollTo(where: number | undefined, showAnimation = true) {
                const pan = document.getElementById('shell-pan')
                if (pan !== null && where) {
                    if (showAnimation === false) {
                        pan.style.scrollBehavior = 'unset'
                    } else {
                        pan.style.scrollBehavior = 'smooth'
                    }
                    pan.scrollTop = where
                    pan.style.scrollBehavior = 'smooth'
                }
            },
            scrollBottom(showAnimation = false) {
                const pan = document.getElementById('shell-pan')
                if (pan !== null) {
                    this.scrollTo(pan.scrollHeight + 40, showAnimation)
                }
            },

            updateList(_: number, oldLength: number) {
                if (this.tags.fistget && oldLength == 0) {
                    this.tags.fistget = false
                    this.addCommandOutF(':: joining chat ..', 'yellow')
                    this.addCommandLineF(
                        'cd ' + runtimeData.nowChat?.id,
                        runtimeData.nowChat?.type,
                    )
                    this.addCommandOutF(
                        '* Stapxs QQ Lite X Shell requires "FiraCode Nerd Font" to display complete command line symbols, please ensure the device has installed this font.\n\n* Use the command "fullscreen" or return to the parent directory to exit the full screen mode.\n\n* 使用 "help" 命令查看所有可用命令。\n\n\n',
                        'var(--color-font)',
                    )
                    this.addCommandOutF(
                        `Welcome to Stapxs QQ Lite ${packageInfo.version} (Vue ${packageInfo.devDependencies.vue}-${this.runMode})\n\n`,
                        'var(--color-font)',
                    )
                    this.cmdLines.push(...this.chat.messageList)
                    this.headMsg = this.chat.messageList.at(0) as Reactive<Message> ?? null
                    this.endMsg = this.chat.messageList.at(-1) as Reactive<Message> ?? null
                }
                this.scrollBottom(true)
                // 由于一些原因没有加载的话...
                if (!this.headMsg) {
                    this.headMsg = this.chat.messageList.at(0) as Reactive<Message>
                    this.endMsg = this.chat.messageList.at(-1) as Reactive<Message>
                } else {
                    const head = this.chat.messageList.at(0) as Message
                    const end = this.chat.messageList.at(-1) as Message
                    if (end !== this.endMsg) {
                        // 尾部消息更新
                        this.cmdLines.push(
                            ...this.chat.messageList.slice(
                                this.chat.messageList.indexOf(this.endMsg as Message) + 1,
                            ),
                        )
                        this.endMsg = end as Reactive<Message>
                    }
                    else if (head !== this.headMsg) {
                        // 系统通知跳过
                        if (head instanceof SystemNotice) return
                        const originId = this.chat.messageList.indexOf(this.headMsg as Message)
                        // 查询失败
                        if (originId < 0) {
                            this.headMsg = head as Reactive<Message>
                        } else {
                            // 头部消息更新
                            this.cmdLines.unshift(
                                ...this.chat.messageList.slice(0, originId),
                            )
                            this.headMsg = head as Reactive<Message>
                        }
                    }
                }
            },

            showPop(newLength: number, oldLength: number) {
                if (newLength > oldLength) {
                    const info = popList[popList.length - 1]
                    if (info.svg == PopType.ERR) {
                        this.addCommandOut('::' + info.text, 'red')
                    } else {
                        this.addCommandOut('::' + info.text, 'yellow')
                    }
                }
            },

            addCommandOut(
                raw: string,
                color = 'var(--color-font-2)',
                html = undefined as unknown,
            ) {
                this.cmdLines.push({
                    commandOut: true,
                    color: color,
                    str: raw,
                    html: html,
                })
            },
            addCommandOutF(
                raw: string,
                color = 'var(--color-font-2)',
                html = undefined as unknown,
            ) {
                this.cmdLines.unshift({
                    commandOut: true,
                    color: color,
                    str: raw,
                    html: html,
                })
            },

            addCommandLine(
                str: string,
                dir = runtimeData.nowChat?.showName,
                appendData: { [key: string]: any } = {},
            ) {
                this.cmdLines.push({
                    dir: dir,
                    commandLine: true,
                    str: str,
                    time: markRaw({
                        time: Intl.DateTimeFormat(getTrueLang(), {
                            hour: 'numeric',
                            minute: 'numeric',
                            second: 'numeric',
                        }).format(new Date()),
                    }),
                    data: appendData,
                })
            },
            addCommandLineF(str: string, dir = runtimeData.nowChat?.showName) {
                this.cmdLines.unshift({
                    dir: dir,
                    commandLine: true,
                    str: str,
                    time: markRaw({
                        time: Intl.DateTimeFormat(getTrueLang(), {
                            hour: 'numeric',
                            minute: 'numeric',
                            second: 'numeric',
                        }).format(new Date()),
                    }),
                    data: {},
                })
            },

            sendMsg(event: KeyboardEvent) {
                // 执行指令
                if (event.keyCode === 13) {
                    this.addCommandLine(
                        this.msg,
                        runtimeData.nowChat?.showName,
                        this.tags.cmdTags,
                    )
                    if (this.msg == '') return

                    // 检查是否是支持的指令
                    if (this.msg[0] == '/') {
                        this.msg =
                            'sql send ' + this.msg.substring(1, this.msg.length)
                    }
                    const msgList = this.msg.split(' ')
                    new Logger().add(
                        LogType.DEBUG,
                        'CMD: ' + msgList.toString(),
                    )
                    if (msgList.length > 0 && this.supportCmd[msgList[0]]) {
                        this.supportCmd[msgList[0]].fun(this.msg, msgList)
                        this.msg = ''
                    } else {
                        this.addCommandOut(
                            'stsh: command not found, use the help command to view all available commands.',
                            'red',
                        )
                    }
                    // 发送后处理
                    this.tags.cmdTags = {}
                    if (
                        this.sendCache.filter((item) => {
                            return item.type === 'reply'
                        }).length > 0
                    ) {
                        this.tags.cmdTags.reply = true
                    }
                }
                setTimeout(() => {
                    this.scrollBottom()
                }, 500)
            },

            copy(str: string) {
                const input = document.getElementById('msgInput')
                if (input) {
                    this.msg = 'sql reply ' + str + ' '
                    input.focus()
                }
                copyToClipboard(String(str))
                    .then(
                        this.addCommandOut(
                            ':: Copy messageId successfully.',
                            'gray',
                        )
                    ).catch(
                        this.addCommandOut(':: Copy messageId failed.', 'gray')
                    )
            },

            /**
             * 添加特殊消息段
             * @param seg 特殊消息段
             */
            addSpecialSeg(seg: Seg) {
                const index = this.sendCache.length
                this.sendCache.push(seg)
                this.msg += '[SQ:' + index + ']'
                return index
            },

            addImg(event: ClipboardEvent) {
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
                        this.setImg(item.getAsFile())
                        // 阻止默认行为
                        event.preventDefault()
                    }
                }
            },

            setImg(blob: File | null) {
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
                                    this.addSpecialSeg(data)
                                } else {
                                    // 记录图片信息
                                    // 只要你内存够猛，随便 cache 图片，这边就不做限制了
                                    this.imgCache.push(base64data)
                                }
                            }
                        }
                    } else {
                        popInfo.add(PopType.INFO, this.$t('图片过大'))
                    }
                }
            },
            getCss(msg: Msg) {
                let css = 'sname'
                if (msg.sender?.role === 'admin') css += ' sadmin'
                else if (msg.sender?.role === 'owner') css += ' sowner'
                if (runtimeData.loginInfo.uin == msg.sender.user_id) css += ' smine'
                return css
            }
        },
    })
</script>

<style>
    .shell-pan a,
    .shell-pan span {
        font-family: 'FiraCode Nerd Font', Helvetica, Arial,
             Verdana, Tahoma, sans-serif;
        color: var(--color-font);
        white-space: pre-wrap;
    }
    .shell-pan a:hover {
        color: var(--color-font);
    }

    .line-head {
        margin: 5px 0;
        color: var(--color-font);
        font-size: 0.8rem;
        display: flex;
        justify-content: flex-end;
    }
    .line-head > div:first-child svg {
        margin-right: 10px;
    }
    .line-head > div:last-child svg {
        margin-left: 10px;
    }
    .line-head > div > span {
        background: var(--color-card-1);
        margin-left: 5px;
        padding: 3px 10px;
    }
    .line-head > div > span:first-child {
        border-radius: 10px 0 0 10px;
        margin-left: 0;
    }
    .line-head > div:first-child > span:first-child {
        background: var(--color-main);
        color: var(--color-font-r);
    }
    .line-head > div > span:last-child {
        border-radius: 0 10px 10px 0;
    }
    .command-start {
        color: greenyellow;
    }

    .shell-pan {
        margin-top: 40px;
        padding: 0 20px;
        pointer-events: all;
        overflow-y: scroll;
        overflow-x: hidden;
    }
    .shell-pan > a {
        flex: 1;
    }

    .shell-msg {
        border-radius: 7px;
    }
    .shell-msg.revoke {
        display: none;
    }
    .shell-msg.reply {
        background: var(--color-card-1);
    }
    .shell-msg > span.sname.sadmin {
        color: var(--color-main-1);
    }
    .shell-msg > span.sname.sowner {
        color: var(--color-main-4);
    }
    .shell-msg > span.sname.smine {
        color: var(--color-main-0) !important;
    }
    .shell-msg > span.smsg {
        color: var(--color-font-2);
    }
    .shell-msg img {
        max-width: 50%;
        opacity: 0;
    }
    .shell-msg pre {
        font-family: 'FiraCode Nerd Font', Helvetica, Arial,
            Verdana, Tahoma, sans-serif;
        line-height: 7px;
        font-size: 6px;
    }

    .shell-input {
        margin-bottom: 40px;
    }
    .shell-input > input {
        font-family: 'FiraCode Nerd Font', Helvetica, Arial,
             Verdana, Tahoma, sans-serif;
        caret-color: var(--color-main);
        width: calc(100% - 2rem);
        background: transparent;
        margin-top: -3px;
        border: 0;
    }

    .shell-neofetch {
        display: flex;
        flex-wrap: wrap;
    }
    .shell-neofetch span {
        line-height: 1.2rem;
    }
    .shell-neofetch > span {
        color: var(--color-main-0);
        margin-bottom: 20px;
        margin-right: 20px;
        letter-spacing: -1px;
    }
    .shell-neofetch > div {
        flex-direction: column;
        display: flex;
    }
    .shell-neofetch > div > a {
        font-family: unset;
    }
    .shell-neofetch > div > span {
        color: var(--color-main);
    }
    .shell-neofetch > div > span > span {
        color: var(--color-font);
    }
    .shell-neofetch > div > div {
        margin-top: 1rem;
        display: flex;
    }
    .shell-neofetch > div > div > div {
        height: 1.5rem;
        width: 2rem;
    }
</style>
