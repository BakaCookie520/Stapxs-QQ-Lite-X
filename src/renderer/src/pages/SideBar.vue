<!--
 * @FileDescription: 侧边栏
 * @Author: Mr.Lee
 * @Date: 2025/09/18
 * @Version: 1.0
-->
<template>
    <div class="side-bar"
        :style="get('fs_adaptation') > 0 ? `padding-bottom: ${get('fs_adaptation')}px;` : ''"
        :class="{fold: fold}">

        <transition mode="out-in" :name="`change-side-bar-${changeSideBarDirection}`">
            <component ref="sideBar"
                class="side-bar-main"
                :is="sideBarInfo.template"
                :key="sideBarInfo.type"
                :side-bar-state="fold ? 'fold' : 'open'" />
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
            <div
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
    </div>
</template>

<script setup lang="ts">
import { get } from '@renderer/function/option'
import { popBox } from '@renderer/function/utils/popBox'
import app from '@renderer/main'
import { shallowRef } from 'vue'
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
const fold = shallowRef(false)
const changeSideBarDirection = shallowRef<'left' | 'right'>('right')

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
</script>
