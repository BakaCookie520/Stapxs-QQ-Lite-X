<!--
 * @FileDescription: 消息预览框
 * @Author: Mr.Lee
 * @Date: 2025/09/12
 * @Version: 1.0
-->
<template>
    <Teleport to="body">
        <Transition name="msg-preview">
            <div v-if="data.msgs" class="msg-preview" :style="posInfo">
                <div v-if="typeof data.msgs === 'string'" ref="body" class="ss-card">
                    {{ data.msgs }}
                </div>
                <div v-else ref="body" class="ss-card">
                    <MsgBar
                        :msgs="data.msgs"
                        :can-interaction="false"
                        :show-time="false" />
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { Msg } from '@renderer/function/model/msg'
import {
    shallowReactive,
    useTemplateRef,
    watchEffect
} from 'vue'
import MsgBar from './MsgBar.vue'

const { data } = defineProps<{
    data: {
        x: number,
        y: number,
        msgs?: Msg[] | string
    }
}>()

const body = useTemplateRef<HTMLDivElement>('body')
const posInfo = shallowReactive({
    '--x': '0px',
    '--y': '0px',
})

// 切换css
watchEffect(() => {
    posInfo['--x'] = data.x + 'px'
    posInfo['--y'] = data.y + 'px'

    if (!body.value) return
    // 高度
    const panHeight = body.value.clientHeight
    if (data.y < panHeight + 20) {
        posInfo['--y'] =
            panHeight + 20 + 'px'
    }
    // 宽度
    const menuWidth = body.value.clientWidth
    const bodyWidth = document.body.clientWidth
    if (data.x + menuWidth > bodyWidth - 20) {
        posInfo['--x'] =
            bodyWidth - menuWidth - 10 + 'px'
    }
})
export interface MsgPrevPan {
    open: (msgs: Msg[]|string, x: number, y: number) => void
    close: () => void
}
</script>

<style scoped>
.msg-preview {
    margin-left: var(--x);
    margin-top: var(--y);
    max-width: max(30vw, 400px);
}
.msg-preview :deep(*) {
    pointer-events: none !important;
}
.msg-preview-enter-active, .msg-preview-leave-active {
    animation: none 0.2s;
}
.msg-preview-enter-active > .ss-card, .msg-preview-leave-active > .ss-card {
    transition: all 0.2s;
    transform-origin: top;
}
.msg-preview-enter-from > .ss-card, .msg-preview-leave-to > .ss-card {
    opacity: 0;
    transform: scaleY(0) translate(-20px, calc(-100% - 0.8rem));
}
.msg-preview-enter-to > .ss-card, .msg-preview-leave-from > .ss-card {
    opacity: 1;
    transform: scaleY(1) translate(-20px, calc(-100% - 0.8rem));
}
</style>
