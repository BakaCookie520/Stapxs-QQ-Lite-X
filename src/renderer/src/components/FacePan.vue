<!--
 * @FileDescription: 表情面板模板
 * @Author: Stapxs
 * @Date: missing
 * @Version: 1.0
-->

<template>
    <div class="ss-card face-pan">
        <BcTab>
            <div icon="fa-solid fa-face-laugh-squint">
                <div class="system-face-bar">
                    <div class="title">
                        <span>{{ $t('超级表情') }}</span>
                    </div>
                    <div class="base-face">
                        <template v-for="num in Emoji.superList" :key="'base-face-' + num">
                            <div>
                                <EmojiFace :emoji="Emoji.get(num)" @click="addBaseFace(num)" />
                            </div>
                        </template>
                    </div>
                    <div class="title">
                        <span>{{ $t('小黄脸表情') }}</span>
                    </div>
                    <div class="base-face">
                        <template v-for="num in Emoji.normalList" :key="'base-face-' + num">
                            <div>
                                <EmojiFace :emoji="Emoji.get(num)" @click="addBaseFace(num)" />
                            </div>
                        </template>
                    </div>
                    <div class="title">
                        <span>{{ $t('emoji 表情') }}</span>
                    </div>
                    <div class="base-face">
                        <div v-for="num in Emoji.emojiList" :key="'base-face-' + num">
                            <EmojiFace :emoji="Emoji.get(num)" @click="addBaseFace(num)" />
                        </div>
                    </div>
                </div>
            </div>
            <div icon="fa-solid fa-heart">
                <div class="title">
                    <span>{{ $t('收藏的表情') }}</span>
                    <font-awesome-icon
                        :icon="['fas', 'fa-rotate-right']"
                        @click="reloadRoamingStamp" />
                </div>
                <div class="face-stickers">
                    <template v-if="roamingState === 'no-support'">
                        <div class="ss-card">
                            <font-awesome-icon :icon="['fas', 'face-dizzy']" />
                            <span>{{ $t('当前适配器不支持漫游表情') }}</span>
                        </div>
                    </template>
                    <template v-else-if="roamingState === 'err'">
                        <div class="ss-card">
                            <font-awesome-icon :icon="['fas', 'face-dizzy']" />
                            <span>{{ $t('加载漫游表情失败') }}</span>
                        </div>
                    </template>
                    <template v-else-if="roamingState === 'loading'">
                        <div class="ss-card">
                            <font-awesome-icon :icon="['fas', 'spinner']" spin />
                            <span>{{ $t('正在加载漫游表情') }}</span>
                        </div>
                    </template>
                    <template v-else-if="runtimeData.stickerCache && runtimeData.stickerCache.length > 0">
                        <img v-for="(url, index) in runtimeData.stickerCache"
                            v-show="url != 'end'"
                            :key="'stickers-' + index"
                            loading="lazy"
                            :src="url"
                            :alt="'[' + $t('动画表情') + ']'"
                            @click="addImgFace(url)">
                    </template>
                    <template v-else>
                        <div v-show="runtimeData.stickerCache && runtimeData.stickerCache.length <= 0"
                            class="ss-card">
                            <font-awesome-icon :icon="['fas', 'face-dizzy']" />
                            <span>{{ $t('一无所有') }}</span>
                        </div>
                    </template>
                </div>
            </div>
        </BcTab>
    </div>
</template>

<script setup lang="ts">
import { runtimeData } from '@renderer/function/msg'
import { shallowRef } from 'vue'

import Emoji from '@renderer/function/model/emoji'
import { FaceSeg, ImgSeg, Seg, TxtSeg } from '@renderer/function/model/seg'
import BcTab from 'vue3-bcui/packages/bc-tab'
import EmojiFace from './EmojiFace.vue'

const emit = defineEmits<{
    addSpecialSeg: [seg: Seg]
    sendMsg: []
}>()

const roamingState = shallowRef<
    | 'loading'
    | 'ok'
    | 'err'
    | 'no-support'
>('loading')

// 初次加载漫游表情
initRoamingStamp()


async function initRoamingStamp() {
    if (runtimeData.stickerCache) return

    await loadRomaingStamp()
}
async function reloadRoamingStamp() {
    if (roamingState.value === 'loading') return
    runtimeData.stickerCache = undefined

    await loadRomaingStamp()
}

async function loadRomaingStamp() {
    if (roamingState.value === 'loading') return
    roamingState.value = 'loading'
    if (!runtimeData.nowAdapter?.getCustomFace) {
        roamingState.value = 'no-support'
        return
    }

    const data = await runtimeData.nowAdapter.getCustomFace()
    if (!data) {
        roamingState.value = 'err'
        return
    }

    runtimeData.stickerCache = data
    roamingState.value = 'ok'
}

function addSpecialSeg(seg: Seg) {
    emit('addSpecialSeg', seg)
}
function addBaseFace(id: number) {
    if (id < 5000)
        addSpecialSeg(new FaceSeg(id))
    else
        addSpecialSeg(new TxtSeg(Emoji.get(id)!.value))
}
function addImgFace(url: string) {
    addSpecialSeg(new ImgSeg(url, true))
    // 直接发送表情
    if(runtimeData.sysConfig.send_face == true) {
        emit('sendMsg')
    }
}
</script>
