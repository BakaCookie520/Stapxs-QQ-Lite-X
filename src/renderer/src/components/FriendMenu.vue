<!--
 * @FileDescription: 会话右键菜单
 * @Author: Mr.Lee
 * @Date:
 *      2025/08/02
 * @Version:
 *      1.0 - 初始版本
 * @Description:
 *      原本的只能在Message.vue中使用的右键菜单，现在抽离出来，方便其他组件使用
-->
<template>
    <Menu ref="menu" name="chat-menu">
        <div class="ss-card msg-menu-body" @click.stop>
            <div v-if="displayTag.top" @click="clickTop">
                <div><font-awesome-icon :icon="['fas', 'fa-thumbtack']" /></div>
                <a>{{ $t('置顶') }}</a>
            </div>
            <div v-if="displayTag.cancelTop" @click="clickCancelTop">
                <div><font-awesome-icon :icon="['fas', 'fa-grip-lines']" /></div>
                <a>{{ $t('取消置顶') }}</a>
            </div>
            <div v-if="displayTag.remove" @click="clickRemove">
                <div><font-awesome-icon :icon="['fas', 'fa-trash-can']" /></div>
                <a>{{ $t('卸载') }}</a>
            </div>
            <div v-if="displayTag.reload" @click="clickReload">
                <div><font-awesome-icon :icon="['fas', 'fa-undo']" /></div>
                <a>{{ $t('重载') }}</a>
            </div>
            <div v-if="displayTag.readed" @click="clickReaded">
                <div><font-awesome-icon :icon="['fas', 'fa-check-to-slot']" /></div>
                <a>{{ $t('标记已读') }}</a>
            </div>
            <div v-if="displayTag.read" @click="clickRead">
                <div><font-awesome-icon :icon="['fas', 'fa-flag']" /></div>
                <a>{{ $t('标记未读') }}</a>
            </div>
            <div v-if="displayTag.noticeOpen" @click="clickNoticeOpen">
                <div><font-awesome-icon :icon="['fas', 'fa-volume-high']" /></div>
                <a>{{ $t('开启通知') }}</a>
            </div>
            <div v-if="displayTag.noticeClose" @click="clickNoticeClose">
                <div><font-awesome-icon :icon="['fas', 'fa-volume-xmark']" /></div>
                <a>{{ $t('关闭通知') }}</a>
            </div>
            <div v-if="displayTag.putInBox" @click="clickPutInBox">
                <div><font-awesome-icon :icon="['fas', 'fa-box']" /></div>
                <a>{{ $t('收纳盒') }}</a>
            </div>
            <div v-if="displayTag.configBox" @click="clickConfigBox">
                <div><font-awesome-icon :icon="['fas', 'fa-gear']" /></div>
                <a>{{ $t('设置') }}</a>
            </div>
            <div v-if="displayTag.leaveBox" @click="clickLeaveBox">
                <div><font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" /></div>
                <a>{{ $t('离开盒子') }}</a>
            </div>
            <div v-if="displayTag.deleteBox" @click="clickDeleteBox">
                <div><font-awesome-icon :icon="['fas', 'fa-trash']" style="color: var(--color-red)" /></div>
                <a style="color: var(--color-red)">{{ $t('删除') }}</a>
            </div>
        </div>
    </Menu>
</template>

<script setup lang="ts">
import Menu from './Menu.vue'

import { MenuEventData } from '@renderer/function/elements/information'
import { BubbleBox, SessionBox } from '@renderer/function/model/box'
import { GroupSession, Session } from '@renderer/function/model/session'
import { runtimeData } from '@renderer/function/msg'
import { ensurePopBox, popBox } from '@renderer/function/utils/popBox'
import { i18n } from '@renderer/main'
import ConfigBox from '@renderer/popboxes/ConfigBox.vue'
import SelectBox from '@renderer/popboxes/SelectBox.vue'
import {
    markRaw,
    ref,
    Ref,
    shallowReactive,
    ShallowReactive,
    shallowRef,
    ShallowRef,
} from 'vue'

//#region == 声明变量 ================================================================
const $t = i18n.global.t
const menu: Ref<undefined|InstanceType<typeof Menu>> = ref()
const selectSession: ShallowRef<Session|undefined> = shallowRef(undefined)
const selectBox: ShallowRef<SessionBox|undefined> = shallowRef(undefined)
const from: ShallowRef<'message' | 'friend'> = shallowRef('message')
const displayTag: ShallowReactive<{
    top: boolean,
    cancelTop: boolean,
    remove: boolean,
    reload: boolean,
    readed: boolean,
    read: boolean,
    noticeOpen: boolean,
    noticeClose: boolean,
    putInBox: boolean,
    configBox: boolean,
    leaveBox: boolean,
    deleteBox: boolean,
}> = shallowReactive({
    top: false,
    cancelTop: false,
    remove: false,
    reload: false,
    readed: false,
    read: false,
    noticeOpen: false,
    noticeClose: false,
    putInBox: false,
    configBox: false,
    leaveBox: false,
    deleteBox: false,
})

// 导出
defineExpose({
    selectSession,
    selectBox,
    open,
})
//#endregion

//#region == 方法函数 ================================================================
async function open(
    fromComponent: 'message' | 'friend',
    session: Session | SessionBox,
    event: MenuEventData,
    fromBox?: SessionBox
): Promise<void> {
    if (!menu.value) return
    if (menu.value?.isShow()) return

    from.value = fromComponent
    if (session instanceof SessionBox) {
        selectBox.value = session
        selectSession.value = undefined
    } else {
        selectSession.value = session
        selectBox.value = fromBox
    }

    for (const key in displayTag)
        displayTag[key] = false

    if (session instanceof Session) checkSessionMenuConfig(fromComponent, session, fromBox)
    else checkBoxMenuConfig(fromComponent, session)

    await menu.value.showMenu(event.x, event.y)

    selectSession.value = undefined
    selectBox.value = undefined
}

/**
 * 检查会话菜单配置
 * @param fromComponent
 * @param session
 */
function checkSessionMenuConfig(
    fromComponent: 'message' | 'friend',
    session: Session,
    box?: SessionBox,
): void {
    // 检测需要显示的菜单项
    // 置顶
    if (session.alwaysTop) {
        displayTag.top = false
        displayTag.cancelTop = true
    } else {
        displayTag.top = true
        displayTag.cancelTop = false
    }
    // 删除
    if (fromComponent === 'message' && session.isActive) {
        if (runtimeData.nowChat?.id === session.id) {
            displayTag.remove = false
            displayTag.reload = true
        } else {
            displayTag.remove = true
            displayTag.reload = false
        }
    } else {
        displayTag.remove = false
        displayTag.reload = false
    }
    // 已读与未读
    if (fromComponent === 'message') {
        if (session.showNotice) {
            displayTag.read = false
            displayTag.readed = true
        } else {
            displayTag.read = true
            displayTag.readed = false
        }
    }else {
        displayTag.readed = false
        displayTag.read = false
    }
    // 通知开关
    if (session instanceof GroupSession) {
        if (session.notice) {
            displayTag.noticeOpen = false
            displayTag.noticeClose = true
        } else {
            displayTag.noticeOpen = true
            displayTag.noticeClose = false
        }
    }else {
        displayTag.noticeOpen = false
        displayTag.noticeClose = false
    }
    displayTag.putInBox = true
    // 移除收纳盒
    if (box && box.id !== BubbleBox.instance.id) {
        displayTag.leaveBox = true
    } else {
        displayTag.leaveBox = false
    }
}

/**
 * 检查收纳盒菜单配置
 * @param session
 */
function checkBoxMenuConfig(
    fromComponent: 'message' | 'friend',
    session: SessionBox,
): void {
    if (session.id === BubbleBox.instance.id) {
        return checkBubbleBoxConfig(fromComponent, session)
    }
    // 检测需要显示的菜单项
    // 置顶
    if (session.alwaysTop) {
        displayTag.top = false
        displayTag.cancelTop = true
    } else {
        displayTag.top = true
        displayTag.cancelTop = false
    }
    // 删除
    if (fromComponent === 'message') {
        if (session.isActive) {
            displayTag.remove = true
        } else {
            displayTag.remove = false
        }
    } else {
        displayTag.remove = false
    }
    // 已读与未读
    if (fromComponent === 'message') {
        if (session.showNotice) {
            displayTag.readed = true
        } else {
            displayTag.readed = false
        }
    }else {
        displayTag.readed = false
    }

    // 设置
    displayTag.configBox = true
    // 删除
    displayTag.deleteBox = true
}


/**
 * 检查群收纳盒的菜单配置
 */
function checkBubbleBoxConfig(
    fromComponent: 'message' | 'friend',
    session: BubbleBox,
): void {
    // 删除
    if (fromComponent === 'message') {
        if (session.isActive) {
            displayTag.remove = true
        } else {
            displayTag.remove = false
        }
    } else {
        displayTag.remove = false
    }
    // 已读与未读
    if (fromComponent === 'message') {
        if (session.showNotice) {
            displayTag.readed = true
        } else {
            displayTag.readed = false
        }
    }else {
        displayTag.readed = false
    }
}

function close(): void {
    if (!menu.value) return
    menu.value.closeMenu()
}

function getTarget(): Session | SessionBox {
    if (selectSession.value) return selectSession.value
    else if (selectBox.value) return selectBox.value
    else throw new Error('没有选择会话或收纳盒')
}

function clickTop() {
    getTarget().setAlwaysTop(true)
    close()
}
function clickCancelTop() {
    getTarget().setAlwaysTop(false)
    close()
}
function clickRemove() {
    getTarget().unactive()
    close()
}
function clickReload() {
    const target = getTarget() as Session
    target.unactive()
    setTimeout(() => {
        target.activate()
    }, 1000)
    close()
}
function clickReaded() {
    getTarget().setRead()
    close()
}
function clickRead() {
    if (!selectSession.value) return
    selectSession.value.showNotice = true
    close()
}
function clickNoticeOpen() {
    (getTarget() as GroupSession)?.setNotice(true)
    close()
}
function clickNoticeClose() {
    (getTarget() as GroupSession)?.setNotice(false)
    close()
}
function clickPutInBox() {
    popBox({
        title: $t('放入收纳盒'),
        template: SelectBox,
        templateValue: { session: markRaw(getTarget()) },
        button: [
            {
                text: $t('确定'),
                master: true,
            },
        ],
    })
    close()
}
function clickConfigBox() {
    popBox({
        title: $t('收纳盒设置'),
        template: ConfigBox,
        templateModel: markRaw(getTarget()),
        button: [{
            text: $t('确定'),
            master: true,
        },],
    })
    close()
}
function clickLeaveBox() {
    if (selectBox.value && selectSession.value) {
        selectBox.value.removeSession(selectSession.value)
        SessionBox.saveData()
    }
    close()
}
function clickDeleteBox() {
    const target = getTarget() as SessionBox
    ensurePopBox($t('确定要删除收纳盒吗？它会永远消失的！'))
        .then(ensure => {
            if (ensure) target.remove()
        })
    close()
}
//#endregion
</script>
