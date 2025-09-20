<!--
 * @FileDescription: 收纳盒列表
 * @Author: Mr.Lee
 * @Date:
 *      2025/08/02
 * @Version:
 *      1.0 - 初始版本
-->
<template>
    <div>
        <div style="margin-top: 15px;" />
        <header v-show="sideBarState === 'open'" class="side-bar-header">
            <div class="base only">
                <span>{{ $t('收纳盒') }}</span>
                <div style="flex: 1" />
                <font-awesome-icon :icon="['fas', 'fa-plus']" @click="newBox" />
            </div>
            <label>
                <input
                    v-auto-focus
                    v-search="searchInfo"
                    type="text"
                    :placeholder="$t('搜索 ……')">
                <font-awesome-icon :icon="['fas', 'magnifying-glass']" />
            </label>
        </header>
        <div class="side-bar-list session-body-container">
            <template v-if="!searchInfo.isSearch">
                <BoxBody
                    :data="BubbleBox.instance"
                    from="friend"
                    @user-click="session=>changeSession(session, BubbleBox.instance)" />
                <BoxBody
                    v-for="box in SessionBox.sessionBoxes"
                    :key="box.id"
                    v-menu.prevent="event => menu?.open('friend', box, event)"
                    :data="box"
                    from="friend"
                    @user-click="session=>changeSession(session, box)" />
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
</template>

<script setup lang="tsx">
import BoxBody from '@renderer/components/BoxBody.vue'
import FriendMenu from '@renderer/components/FriendMenu.vue'

import { BubbleBox, SessionBox } from '@renderer/function/model/box'
import { changeSession } from '@renderer/function/utils/msgUtil'
import { popBox } from '@renderer/function/utils/popBox'
import { vAutoFocus, vMenu, vSearch } from '@renderer/function/utils/vcmd'
import { i18n } from '@renderer/main'
import ConfigBox from '@renderer/popboxes/ConfigBox.vue'
import {
    inject,
    markRaw,
    shallowReactive,
} from 'vue'

const $t = i18n.global.t

const { sideBarState } = defineProps<{
    sideBarState: 'fold' | 'open'
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
