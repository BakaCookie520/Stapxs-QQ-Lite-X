<!--
 * @FileDescription: 侧边栏
 * @Author: Mr.Lee
 * @Date: 2025/09/18
 * @Version: 1.0
-->
<template>
    <div class="side-bar"
        ref="side-bar"
        :style="{
            paddingBottom: get('fs_adaptation') > 0 ? `${get('fs_adaptation')}px` : '',
        }"
        :class="{
            fold: foldState === 'fold',
            hide: runtimeData.sysConfig.auto_hide_side_bar === 'hide',
            show: isHover,
        }"
        @mouseenter="hoverStart"
        @mouseleave="hoverEnd">

        <transition mode="out-in" :name="`change-side-bar-${changeSideBarDirection}`">
            <component ref="sideBar"
                class="side-bar-main"
                :is="sideBarInfo.template"
                :key="sideBarInfo.type"
                :side-bar-state="foldState" />
        </transition>

        <div style="margin: auto;" />
        <hr />

        <div class="bottom">
            <div
                class="icon"
                :title="$t('消息')"
                @click="changeSideBar(messageSideBar)"
                :class="{'active': sideBarInfo.type === 'Message'}">
                <font-awesome-icon :icon="['fas', 'envelope']" />
            </div>
            <div
                class="icon"
                :title="$t('联系人')"
                @click="changeSideBar(friendSideBar)"
                :class="{'active': sideBarInfo.type === 'Friend'}">
                <font-awesome-icon :icon="['fas', 'user']" />
            </div>
            <div
                class="icon"
                :title="$t('收纳盒')"
                @click="changeSideBar(boxSideBar)"
                :class="{'active': sideBarInfo.type === 'Box'}">
                <font-awesome-icon :icon="['fas', 'box']" />
            </div>
            <div style="margin: auto;" />
            <div v-if="canControlFold"
                class="icon"
                @click="fold = !fold"
                :title="fold ? $t('展开') : $t('折叠')"
                :class="{'active': fold}">
                <font-awesome-icon :icon="['fas', 'bars-staggered']" />
            </div>
            <div
                class="icon"
                @click="openOptions"
                :title="$t('设置')">
                <font-awesome-icon :icon="['fas', 'gear']" />
            </div>
        </div>

        <!-- 拖拽块 -->
        <div class="drag-region"
            :class="{'grabbing': dragging}"
            @mousedown="startDrag" />

    </div>
</template>

<script setup lang="ts">
import { mousemoveMask } from '@renderer/function/input'
import { runtimeData } from '@renderer/function/msg'
import option, { get } from '@renderer/function/option'
import { popBox } from '@renderer/function/utils/popBox'
import { useEventListener, useKeyboard, useLocalStorage } from '@renderer/function/utils/vuse'
import app from '@renderer/main'
import { computed, shallowRef, useTemplateRef } from 'vue'
import Boxes from './Boxes.vue'
import Friends from './Friends.vue'
import Messages from './Messages.vue'
import Options from './Options.vue'

const $t = app.config.globalProperties.$t

type SideBarType = 'Message' | 'Friend' | 'Box'

type SideBarInfo = {
    id: number
    type: SideBarType
    template: any
}

const messageSideBar: SideBarInfo = {
    type: 'Message',
    template: Messages,
    id: 0,
}
const friendSideBar: SideBarInfo = {
    type: 'Friend',
    template: Friends,
    id: 1,
}
const boxSideBar: SideBarInfo = {
    type: 'Box',
    template: Boxes,
    id: 2,
}

const sideBarInfo = shallowRef<SideBarInfo>(messageSideBar)
const fold = useLocalStorage('side_bar_fold_state', false)
const changeSideBarDirection = shallowRef<'left' | 'right'>('right')
const canControlFold = computed(() => {
    return runtimeData.sysConfig.auto_hide_side_bar === 'none'
})
const isHover = shallowRef(false)
const dragging = shallowRef(false)
const bar = useTemplateRef<HTMLDivElement>('side-bar')
const foldState = computed<'open' | 'fold'>(() => {
    if (canControlFold.value) return fold.value ? 'fold' : 'open'
    switch (runtimeData.sysConfig.auto_hide_side_bar) {
        case 'none':
            return 'open'
        case 'fold':
            if (isHover.value) return 'open'
            return 'fold'
        case 'hide':
            return 'open'
    }
    throw new Error('解析侧边栏折叠状态失败')
})

function changeSideBar(bar: SideBarInfo) {
    if (sideBarInfo.value.type === bar.type) return
    if (bar.id > sideBarInfo.value.id)
        changeSideBarDirection.value = 'right'
    else
        changeSideBarDirection.value = 'left'

    sideBarInfo.value = bar
}

function openOptions() {
    popBox({
        template: Options,
    })
}

let hoverTimeout: ReturnType<typeof setTimeout> | undefined
let staticTime: number | undefined
function hoverStart() {
    if (!staticTime) {
        isHover.value = true
        staticTime = Date.now() + 500
    }
    clearTimeout(hoverTimeout)
}
function hoverEnd() {
    if (!staticTime) return
    const dTime = staticTime - Date.now()
    if (dTime <= 0) {
        isHover.value = false
        staticTime = undefined
    }else {
        hoverTimeout = setTimeout(() => {
            isHover.value = false
            staticTime = undefined
        }, dTime);
    }
}

function startDrag() {
    bar.value!.style.transition = 'none'
    mousemoveMask((event)=>{
        // 拖拽标记
        dragging.value = true
        // 拖拽大小调整
        runtimeData.sysConfig.side_bar_width = event.clientX
        if (runtimeData.sysConfig.side_bar_width < 100) fold.value = true
        else if (runtimeData.sysConfig.side_bar_width > 250) fold.value = false
        // 计算鼠标指针大小
        const el = document.getElementById('mask')!
        el.style.cursor = fold.value ? 'e-resize' : 'ew-resize'
    }, ()=>{
        dragging.value = false
        bar.value!.style.transition = ''
        option.save('side_bar_width', runtimeData.sysConfig.side_bar_width)
    })
}

useEventListener(document, 'mouseout', (event)=>{
    if (runtimeData.sysConfig.auto_hide_side_bar !== 'hide') return
    if (isHover.value) return
    if (event.clientX > 5) return
    hoverStart()
    hoverEnd()
})

useKeyboard('ctrl+b', ()=>{
    if (!canControlFold.value) return
    fold.value = !fold.value
    return true
})
</script>
