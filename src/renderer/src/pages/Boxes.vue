<!--
 * @FileDescription: 收纳盒列表
 * @Author: Mr.Lee
 * @Date:
 *      2025/08/02
 * @Version:
 *      1.0 - 初始版本
-->
<template>
    <div class="friend-view">
        <div id="friend-list" :class="'friend-list' + (runtimeData.tags.openSideBar ? ' open' : '')">
            <!-- 顶栏 -->
            <div>
                <div class="base only">
                    <span>{{ $t('收纳盒') }}</span>
                    <div style="flex: 1" />
                    <font-awesome-icon :icon="['fas', 'fa-plus']" @click="newBox" />
                </div>
                <div id="friend-small-search"
                    class="small">
                    <label>
                        <input
                            v-auto-focus
                            v-search="searchInfo"
                            :placeholder="$t('搜索 ……')">
                        <font-awesome-icon :icon="['fas', 'magnifying-glass']" />
                    </label>
                    <div class="reload" @click="newBox">
                        <font-awesome-icon :icon="['fas', 'fa-plus']" />
                    </div>
                    <div @click="openLeftBar">
                        <font-awesome-icon :icon="['fas', 'bars-staggered']" />
                    </div>
                </div>
                <label>
                    <input
                        v-auto-focus
                        v-search="searchInfo"
                        type="text"
                        :placeholder="$t('搜索 ……')">
                    <font-awesome-icon :icon="['fas', 'magnifying-glass']" />
                </label>
            </div>
            <!-- 主体 -->
            <div class="session-body-container" :class="runtimeData.tags.openSideBar ? 'open' : ''">
                <template v-if="!searchInfo.isSearch">
                    <BoxBody
                        :data="BubbleBox.instance"
                        from="friend"
                        @user-click="session=>userClick(session, BubbleBox.instance)" />
                    <BoxBody
                        v-for="box in SessionBox.sessionBoxes"
                        :key="box.id"
                        v-menu.prevent="event => menu?.open('friend', box, event)"
                        :data="box"
                        from="friend"
                        @user-click="session=>userClick(session, box)" />
                </template>
                <!-- 搜索用的 -->
                <template v-else>
                    <BoxBody
                        v-for="box in searchInfo.query"
                        :key="box.id"
                        :data="box"
                        from="friend" />
                </template>
            </div>
        </div>
        <div :class="'friend-list-space' + (runtimeData.tags.openSideBar ? ' open' : '')">
            <div v-if="!driver.isConnected() || !runtimeData.nowChat" class="ss-card">
                <font-awesome-icon :icon="['fas', 'inbox']" />
                <span>{{ $t('选择联系人开始聊天') }}</span>
            </div>
            <div v-else class="ss-card">
                <font-awesome-icon :icon="['fas', 'angles-right']" />
                <span>(っ≧ω≦)っ</span>
                <span>{{ $t('别划了别划了被看见了啦') }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="tsx">
import FriendMenu from '@renderer/components/FriendMenu.vue'
import BoxBody from '@renderer/components/BoxBody.vue'

import {
    shallowReactive,
    inject,
    markRaw,
} from 'vue'
import { runtimeData } from '@renderer/function/msg'
import { vMenu } from '@renderer/function/utils/vcmd'
import { Session } from '@renderer/function/model/session'
import { vAutoFocus, vSearch } from '@renderer/function/utils/vcmd'
import { i18n } from '@renderer/main'
import { SessionBox, BubbleBox } from '@renderer/function/model/box'
import driver from '@renderer/function/driver'
import { popBox } from '@renderer/function/utils/popBox'
import ConfigBox from '@renderer/popboxes/ConfigBox.vue'

const $t = i18n.global.t

const emit = defineEmits<{
    userClick: [session: Session, fromBox?: SessionBox],
}>()

const searchInfo = shallowReactive({
    originList: SessionBox.sessionBoxes,
    query: shallowReactive([] as SessionBox[]),
    isSearch: false,
})
const menu: undefined | InstanceType<typeof FriendMenu> = inject('friendMenu')
/**
 * 创建一个新的收纳盒
 */
function newBox() {
    // 参数接下来的组件会自动补全，这里填空就行了
    const newBox = new SessionBox($t('新收纳盒'), '', 0)
    popBox({
        title: $t('新建收纳盒'),
        template: ConfigBox,
        templateValue: { init: true },
        templateModel: markRaw(newBox),
        button: [
            {
                text: $t('取消'),
            },
            {
                text: $t('确定'),
                master: true,
                fun: () => {
                    SessionBox.addBox(newBox)
                    // 更新群组->收纳盒映射
                    SessionBox.saveData()
                },
            },
        ],
    })
}

/**
 * 联系人被点击事件
 * @param session 联系人信息
 * @param event 点击事件
 */
function userClick(session: Session, fromBox: SessionBox) {
    if (runtimeData.tags.openSideBar) {
        openLeftBar()
    }
    // 更新聊天框
    emit('userClick', session, fromBox)
    // 切换标签卡
    const barMsg = document.getElementById('bar-msg')
    if (barMsg !== null) {
        barMsg.click()
    }
}

/**
 * 切换侧边栏状态
 */
function openLeftBar() {
    runtimeData.tags.openSideBar = !runtimeData.tags.openSideBar
}
</script>

<style scoped>
    .exp-body > div {
        transform: scaleY(0);
        height: 0;
    }
    .exp-body.open > div {
        transform: scaleY(1);
        height: unset;
    }
    .exp-body > header > div {
        transition:
            margin-right 0.3s,
            transform 0.3s;
        transform: scaleY(0);
        margin-right: 0;
        width: 0;
    }
    .exp-body.open > header > div {
        transform: scaleY(1);
        margin-right: 10px;
        width: 5px;
    }

    .exp-header {
        color: var(--color-font);
        align-items: center;
        border-radius: 7px;
        cursor: pointer;
        margin: 0 10px;
        padding: 10px;
        display: flex;
    }
    .exp-header:hover {
        background: var(--color-card-2);
    }
    .exp-header > div {
        background: var(--color-main);
        margin-right: 10px;
        border-radius: 7px;
        height: 1rem;
        width: 5px;
    }
    .exp-header > span {
        flex: 1;
    }
    .exp-header > a {
        color: var(--color-font-2);
        font-size: 0.9rem;
    }

    @media (max-width: 700px) {
        .exp-header:not(.open) {
            display: none;
        }
    }
    @media (max-width: 500px) {
        .exp-header > span {
            display: block !important;
        }
    }
</style>
