<!--
 * @FileDescription: 右键菜单
 * @Author: Mr.Lee
 * @Date:
 *      2025/07/25
 * @Version:
 *      1.0 - 初始版本
 * @description:
 *      右键菜单组件,自带空白关闭,支持改变动画效果,支持通过id='anchor'来确定锚点元素
-->
<template>
    <Teleport to="body">
        <Transition :name="name">
            <div v-if="show" ref="space"
                :class="{
                    'menu': true,
                }"
                @click="spaceClick">
                <div ref="content" class="content">
                    <slot />
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
<script lang="ts">
import { runtimeData } from '@renderer/function/msg'
import { backend } from '@renderer/runtime/backend'
import { defineComponent, nextTick } from 'vue'

export default defineComponent({
    name: 'Menu',
    props: {
        name: {
            type: String,
            default: 'default-menu',
            required: false,
        },
    },
    data() {
        return {
            runtimeData,
            backend,
            show: false,
            showFinish: null as null | (() => void),
        }
    },
    methods: {
        showMenu(x: number, y: number): Promise<void>|undefined {
            if (this.show) return undefined
            this.show = true
            nextTick(()=>this.calcMenu(x, y))
            const promise = new Promise<void>(resolve => {
                this.showFinish = resolve
            })
            return promise
        },
        closeMenu(): void {
            this.show = false
            if (this.showFinish) {
                this.showFinish()
                this.showFinish = null
            }
        },
        isShow(): boolean {
            return this.show
        },
        calcMenu(x: number, y: number): void {
            const menu = this.$refs?.content as HTMLElement|undefined
            if (!menu) throw new Error('Menu element not found')

            let positonX = x
            let positonY = y

            // 锚点计算
            const anchorNode = menu.querySelector('[id="anchor"]') as HTMLElement | null
            if (anchorNode) {
                const anchorRect = anchorNode.getBoundingClientRect()
                positonX = positonX - anchorRect.left
                positonY = positonY - anchorRect.top
                if (positonX < 0) positonX = 0
                if (positonY < 0) positonY = 0
            }

            // 位置计算
            menu.style.marginLeft = positonX + 'px'
            menu.style.marginTop = positonY + 'px'

            // 出界处理
            nextTick(()=>{
                // 高度
                const menuHeight = menu.clientHeight
                const bodyHeight = document.body.clientHeight
                if (y + menuHeight > bodyHeight - 20) {
                    menu.style.marginTop =
                        bodyHeight - menuHeight - 10 + 'px'
                }
                // 宽度
                const menuWidth = menu.clientWidth
                const bodyWidth = document.body.clientWidth
                if (x + menuWidth > bodyWidth - 20) {
                    menu.style.marginLeft =
                        bodyWidth - menuWidth - 10 + 'px'
                }
            })
        },
        spaceClick(event: MouseEvent): void {
            if (event.target === this.$refs.space) {
                this.closeMenu()
            }
        }
    }
})
</script>
<style scoped>
.menu {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0);
    display: flex;
    z-index: 999;
}
.content {
    position: absolute;
}
.default-menu-enter-active {
    animation: default-menu-enter 0.2s ease-in-out;
}
.default-menu-leave-active {
    animation: default-menu-enter 0.2s ease-in-out reverse;
}
@keyframes default-menu-enter {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}
</style>
