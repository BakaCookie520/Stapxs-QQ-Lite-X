<template>
    <!-- 顶栏 -->
    <div v-if="win.withBar"
        class="top-bar"
        name="appbar"
        data-tauri-drag-region="true">
        <div class="bar-button" @click="barMainClick()" />
        <div class="space" />
        <div class="controller">
            <div class="min" @click="win.minimize()">
                <font-awesome-icon :icon="['fas', 'minus']" />
            </div>
            <div class="max" @click="win.switchMaximize()">
                <font-awesome-icon :icon="['far', 'square']" />
            </div>
            <div class="close" @click="win.close()">
                <font-awesome-icon :icon="['fas', 'xmark']" />
            </div>
        </div>
    </div>
    <!-- 拖拽区域 -->
    <div v-if="backend.platform == 'darwin'" class="controller mac-controller"
        data-tauri-drag-region="true" />
    <div id="base-app">
        <div class="main-body" :style="{'--side-bar-width': runtimeData.sysConfig.side_bar_width + 'px'}">
            <SideBar />
            <div class="main-box">
                <Chat
                    v-if="driver.isConnected() && runtimeData.nowChat"
                    :chat="runtimeData.nowChat"
                    ref="chat" />
                <!-- 背景 -->
                <div v-if="!runtimeData.tags.vibrancy || !runtimeData.nowChat"
                    class="main-box-bg">
                    <div class="ss-card choice-chat">
                        <template v-if="runtimeData.nowChat">
                            <font-awesome-icon :icon="['fas', 'angles-right']" />
                            <span>(っ≧ω≦)っ</span>
                            <span>{{ $t('别划了别划了被看见了啦') }}</span>
                        </template>
                        <template v-else>
                            <font-awesome-icon :icon="['fas', 'inbox']" />
                            <span>{{ $t('选择联系人开始聊天') }}</span>
                        </template>
                    </div>
                </div>
            </div>
        </div>

        <!-- 通知列表 -->
        <TransitionGroup class="app-msg" name="appmsg" tag="div">
            <div v-for="msg in popList" :key="'appmsg-' + msg.id">
                <div><font-awesome-icon :icon="['fas', msg.svg]" /></div>
                <a>{{ msg.text }}</a>
                <div v-if="!msg.autoClose" @click="new PopInfo().remove(msg.id)">
                    <font-awesome-icon :icon="['fas', 'xmark']" />
                </div>
            </div>
        </TransitionGroup>

        <!-- 弹窗列表 -->
        <!-- 弹窗列表 -->
        <TransitionGroup name="pop-box">
            <template v-for="(pop, index) in runtimeData.popBoxList" :key="'pop-box-' + pop.id">
                <div v-hide="index !== runtimeData.popBoxList.length - 1"
                    class="pop-box-background" />
                <PopBox :props="pop" />
            </template>
        </TransitionGroup>


        <!-- 全局搜索栏 -->
        <GlobalSessionSearchBar />
        <Viewer ref="viewer" />

        <!-- 菜单 -->
        <FriendMenu ref="friendMenu" />
        <div id="mobile-css" />
    </div>
</template>

<script setup lang="ts">
import Option from '@renderer/function/option'
import Umami from '@stapxs/umami-logger-typescript'
import Spacing from 'spacingjs/src/spacing'
import * as App from './function/utils/appUtil'

import { Logger, LogType, PopInfo, popList } from '@renderer/function/base'
import { runtimeData } from '@renderer/function/msg'
import { i18n, uptime } from '@renderer/main'
import {
    onMounted,
    provide,
    shallowReactive,
    useTemplateRef
} from 'vue'
import driver from './function/driver'
import { Notify } from './function/notify'
import { ensurePopBox } from './function/utils/popBox'
import { getDeviceType, getVersion, openLoginPan } from './function/utils/systemUtil'

import FriendMenu from './components/FriendMenu.vue'
import GlobalSessionSearchBar from './components/GlobalSessionSearchBar.vue'
import PopBox from './components/PopBox.vue'
import Viewer from './components/Viewer.vue'
import { vHide } from './function/utils/vcmd'
import { useDailyDo, useKeyboard } from './function/utils/vuse'
import Chat from './pages/Chat.vue'
import SideBar from './pages/SideBar.vue'
import { backend } from './runtime/backend'
import win from './runtime/win'

//#region == 定义变量 ===================================================
type PageType = 'Home' | 'Options' | 'Friends' | 'Messages' | 'Boxes'
const dev = import.meta.env.DEV
const logger = new Logger()
const pageInfo = shallowReactive<{
    page: PageType
    showChat: boolean
}>({
    page: 'Home',
    showChat: false,
})
const fps = shallowReactive({
    last: Date.now(),
    ticks: 0,
    value: 0,
})
const $t = i18n.global.t
//#endregion

//#region == 更新标题 ===================================================
const titleList = [
    '也试试 Icalingua Plus Plus 吧！',
    '点击阅读《社交功能限制提醒》',
    '登录失败，Code 45',
    '你好世界！',
    '这只是个普通的彩蛋！'
]
if (dev) {
    document.title = 'Stapxs QQ Lite X(Dev)'
}else {
    const title = titleList[Math.floor(Math.random() * titleList.length)]
    if(backend.platform == 'web') {
        document.title = title + '- Stapxs QQ Lite X'
    } else {
        document.title = title
        backend.call(undefined, 'win:setTitle', false, title)
    }
}
//#endregion

//#region == 全局监听 ===================================================
// moYu彩蛋
window.moYu = () => { return '\x75\x6e\x64\x65\x66\x69\x6e\x65\x64' }
// 页面加载完成后
onMounted(init)
window.onbeforeunload = () => {
    logger.system('开发者阁下—— 唔，阁下离开的太匆忙了！让我来帮开发者阁下收拾下东西吧。')
    new Notify().clear()
    runtimeData.nowAdapter?.close()
    runtimeData.nowAdapter = undefined
}
// 绑定 runtimeData
window.runtimeData = runtimeData

useKeyboard('f12', ()=>{
    if (!import.meta.env.DEV) return
    backend.call(undefined, 'win:openDevTools', false)
})
//#endregion

//#region == 方法函数 ===================================================
/**
 * 初始化
 */
async function init() {
    if(dev)
        // eslint-disable-next-line
        console.log('[ SSystem Bootloader Complete took ' + (new Date().getTime() - uptime) + 'ms, welcome to sar-dos on stapxs-qq-lite.su ]')
    else
        // eslint-disable-next-line
        console.log('[ SSystem Bootloader Complete took ' + (new Date().getTime() - uptime) + 'ms, welcome to ssqq on stapxs-qq-lite.user ]')

    // AMAP：初始化高德地图
    window._AMapSecurityConfig = import.meta.env.VITE_APP_AMAP_SECRET

    //#region == 初始化功能 =====================================
    App.createMenu() // Electron：创建菜单
    App.createIpc() // Electron：创建 IPC 通信
    // 加载开发者相关功能
    if (dev) {
        document.title = 'Stapxs QQ Lite X (Dev)'
        // 布局检查工具
        Spacing.start()
        // FPS 检查
        rafLoop()
    }

    if(dev) {
        logger.debug('stapxs-qq-lite.su:$/mnt/boot/dawnHunt/bin/core --pour /mnt/app/bin/main', true)
        logger.system('[ dawnHuntCore Version: 1.0 Beta, dawnHuntDB: 2025-04-24 ]')
    } else {
        logger.debug('stapxs-qq-lite.user:$/mnt/app/bin/main', true)
    }
    logger.add(LogType.DEBUG, '系统配置', runtimeData.sysConfig)
    // PS：重新再应用部分需要加载完成后才能应用的设置
    Option.run('opt_dark', Option.get('opt_dark'))
    Option.run('opt_auto_dark', Option.get('opt_auto_dark'))
    Option.run('theme_color', Option.get('theme_color'))
    Option.run(
        'merge_forward_width_type',
        Option.get('merge_forward_width_type'),
    )

    // 基础初始化完成
    logger.system('欢迎回来，开发者。Stapxs QQ Lite X 正处于 ' + (dev ? 'development' : 'production') + ' 模式。正在为您加载更多功能。')
    // 加载移动平台特性
    App.loadMobile()
    // 服务发现
    backend.call('Onebot', 'sys:findService', false)
    backend.call('OneBot', 'sys:frontLoaded', false)
    //#endregion

    //#region == popstate监听 ==================================
    if(backend.platform == 'web' && (getDeviceType() === 'Android' || getDeviceType() === 'iOS')) {
        window.addEventListener('popstate', () => {
            if(!driver.isConnected()) {
                // 离开提醒
                ensurePopBox(
                    $t('离开 Stapxs QQ Lite X？'),
                    $t('离开')
                ).then(ensure => {
                    if (ensure) history.back()
                    else history.pushState('ssqqweb', '', location.href)
                })
            } else {
                // 内部的页面返回处理，此处使用 watch backTimes 监听
                runtimeData.watch.backTimes += 1
                history.pushState('ssqqweb', '', location.href)
            }
        })
        if (history.state != 'ssqqweb') {
            history.pushState('ssqqweb', '', location.href)
        }
    }
    //#endregion

    //#region == 加载 Umami 统计功能 ============================
    if (!Option.get('close_ga') && !dev) {
        const config = {
            baseUrl: import.meta.env.VITE_APP_MU_ADDRESS,
            websiteId: import.meta.env.VITE_APP_MU_ID
        } as any
        // 给页面添加一个来源域名方便在 electron 中获取
        if(!backend.isWeb()) {
            config.hostName = backend.type + '.stapxs.cn'
        }
        Umami.initialize(config)
        // 上报一些应用基础信息
        App.sendIdentifyData({
            'app_version': import.meta.env.VITE_APP_CLIENT_TAG + ',' + getVersion(),
            'os_version': backend.release,
            'os_arch': backend.arch,
        })
    } else if (dev) {
        logger.system('开发者，由于 Stapxs QQ Lite X 运行在调试模式下，分析组件并未初始化 …… 系统将无法捕获开发者阁下的访问状态，请悉知。')
    }
    useDailyDo(`client-tag-${import.meta.env.VITE_APP_CLIENT_TAG}`, ()=>{
        App.sendStatEvent('cilent', {
            tag: import.meta.env.VITE_APP_CLIENT_TAG + ',' + getVersion()
        })
    })
    //#endregion

    //#region == 公告弹窗 ======================================
    openLoginPan()          // 打开登录面板
    App.checkUpdate()       // 检查更新
    App.checkOpenTimes()    // 检查打开次数
    App.checkNotice()       // 检查公告
    //#endregion

    if (new Date().getMonth() == 3 && new Date().getDate() == 1)
        document.getElementById('connect_btn')?.classList.add('afd')
}

//#region == 页面相关 ==============================
/**
 * 切换主标签卡判定
 * @param view 虚拟路径名称
 * @param show 是否显示聊天面板
 */
function changeTab(view: PageType, show: boolean) {
    // UM：发送页面路由分析
    if (!Option.get('close_ga') && !dev) {
        Umami.trackPageView('/' + view)
    }
    pageInfo.showChat = show
    pageInfo.page = view
    // 附加操作
    const optTab = document.getElementsByClassName('opt-main-tab')[0] as HTMLDivElement
    switch (view) {
        case 'Options': {
            if (optTab) {
                optTab.style.opacity = '1'
            }
            break
        }
        case 'Home': {
            if (optTab) {
                optTab.style.opacity = '0'
            }
            break
        }
    }
}

function barMainClick() {
    if (driver.isConnected()) {
        changeTab('Messages', true)
    } else {
        changeTab('Home', false)
    }
}
//#endregion

/**
 * 刷新页面 fps 数据
 * @param timestamp 时间戳
 */
function rafLoop() {
    fps.ticks += 1
    //每30帧统计一次帧率
    if (fps.ticks >= 30) {
        const now = Date.now()
        const diff = now - fps.last
        const fpsValue = Math.round(1000 / (diff / fps.ticks))
        fps.last = now
        fps.ticks = 0
        fps.value = fpsValue
    }
    requestAnimationFrame(rafLoop)
}
//#endregion

//#region == 组件实例注册 ===============================================
const friendMenu = useTemplateRef<InstanceType<typeof FriendMenu>>('friendMenu')
const viewer = useTemplateRef<InstanceType<typeof Viewer>>('viewer')
provide('friendMenu', friendMenu)
provide('viewer', viewer)
//#endregion
</script>

<style scoped>
/* 应用通知动画 */
.appmsg-move,
.appmsg-enter-active,
.appmsg-leave-active {
    transition: all 0.2s;
}

.appmsg-leave-active {
    position: absolute;
}

.appmsg-enter-from,
.appmsg-leave-to {
    transform: translateX(-20px);
    opacity: 0;
}

/* 标题栏变更动画 */
.appbar-enter-active,
.appbar-leave-active {
    transition: all 0.2s;
}

.appbar-enter-from,
.appbar-leave-to {
    transform: translateY(-60px);
}
</style>
