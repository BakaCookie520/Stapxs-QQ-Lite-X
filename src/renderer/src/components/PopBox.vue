<template>
    <div
        v-esc="closeSelf"
        class="pop-box">
        <div
            :class="{
                'pop-box-body': true,
                'ss-card': true,
                'full': full,
                'window': true
            }"
            :style="{
                marginBottom: runtimeData.sysConfig.fs_adaptation > 0 ?
                    `${40 + Number(runtimeData.sysConfig.fs_adaptation)}px` : '',
                transform: 'translate(-50%, -50%)'
            }"
            ref="main">
            <header v-if="title">
                <div v-if="svg">
                    <font-awesome-icon :icon="['fas', svg]" />
                </div>
                <a>{{ title }}</a>
                <font-awesome-icon v-if="allowAutoClose"
                    :icon="['fas', 'xmark']" @click="autoClose" />
            </header>
            <component
                :is="template"
                v-bind="templateValue"
                v-model="templateModel"
                @close-pop-box="closeSelf" />
            <div v-if="buttons.length > 0" class="button">
                <button v-for="(button, index) in buttons"
                    :key="'pop-box-btn' + index"
                    v-focus="button.master"
                    :class="{
                        'ss-button': true,
                        'master': button.master,
                    }"
                    @click="clickButton($event, button)">
                    {{ button.text }}
                </button>
            </div>
        </div>
        <div @click="autoClose" />
    </div>
</template>

<script setup lang="ts">
import { PopBoxData } from '@renderer/function/elements/information'
import { runtimeData } from '@renderer/function/msg'
import { closePopBox } from '@renderer/function/utils/popBox'
import { useEventListener } from '@renderer/function/utils/vuse'
import { vEsc, vFocus } from '@renderer/function/utils/vcmd'
import { useTemplateRef } from 'vue'
import anime from 'animejs'

const { props } = defineProps<{props: {id: string, data: PopBoxData}}>()

const id = props.id

const {
    svg,
    title,
    template,
    templateValue,
    templateModel,
    full = false,
    button: buttons = [],
    allowAutoClose = true,
} = props.data

const popBoxEl = useTemplateRef('main')

function autoClose() {
    if (!allowAutoClose) {
        if (!popBoxEl.value) return
        const animeBody = popBoxEl.value
        const timeLine = anime.timeline({ targets: animeBody })
        // 使用 animejs 实现一个沿中心左右摇晃的动画，摇晃三次
        timeLine.add({
            rotate: [
                { value: -10, duration: 75, easing: 'easeInOutSine' },
                { value: 8, duration: 150, easing: 'easeInOutSine' },
                { value: -5, duration: 150, easing: 'easeInOutSine' },
                { value: 0, duration: 75, easing: 'easeInOutSine' },
            ],
            duration: 200,
            easing: 'easeInOutSine',
        })
        return
    }
    closeSelf()
}

function closeSelf() {
    closePopBox(id)
}

function clickButton(
    event: Event,
    button: NonNullable<PopBoxData['button']>[number],
) {
    event.stopPropagation()
    event.preventDefault()

    if (button.fun?.length === 0) (button.fun as ()=>void)()
    else if (button.fun?.length === 1) button.fun(event)

    if (button.noClose) return
    closeSelf()
}

useEventListener(document, 'keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return
    for (const button of buttons) {
        if (button.master) {
            clickButton(event, button)
            return
        }
    }
})
</script>
