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
                    'menu-component': true,
                }"
                @click="closeMenu()">
                <div ref="content" class="content">
                    <slot />
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
<script setup lang="ts">
import { nextTick, shallowRef, useTemplateRef } from 'vue';
const { name } = defineProps<{
    name: string
}>()

const show = shallowRef(false)
const space = useTemplateRef<HTMLElement>('space')
const content = useTemplateRef<HTMLElement>('content')

let showFinish: undefined | (() => void) = undefined
let targetX = 0
let targetY = 0

/**
 * 显示菜单
 * @param x 菜单x坐标
 * @param y 菜单y坐标
 * @returns 菜单关闭的Promise,如果菜单已经显示则返回undefined
 */
function showMenu(x: number, y: number): Promise<void>|undefined {
    if (show.value) return undefined
    show.value = true
    targetX = x
    targetY = y
    nextTick(()=>keepCalc(true))
    const promise = new Promise<void>(resolve => {
        showFinish = resolve
    })
    return promise
}

/**
 * 关闭菜单
 */
function closeMenu(): void {
    show.value = false
    if (showFinish) {
        showFinish()
        showFinish = undefined
    }
}

/**
 * 菜单是否显示
 * @returns 菜单是否显示
 */
function isShow(): boolean {
    return show.value
}

/**
 * 计算菜单位置
 * @param x 菜单x坐标
 * @param y 菜单y坐标
 * @param xa 锚点x相对坐标
 * @param ya 锚点y相对坐标
 * @param width 菜单宽度
 * @param height 菜单高度
 * @param menu 菜单元素
 */
function calcMenu(
    x: number,
    y: number,
    xa: number,
    ya: number,
    width: number,
    height: number,
    menu: HTMLElement,
): void {
    let positionX = x
    let positionY = y

    // 锚点元素
    const SPACE = 20
    const leftSpace = xa + SPACE
    const rightSpace = width - xa + SPACE
    const topSpace = ya + SPACE
    const bottomSpace = height - ya + SPACE

    // 出界处理
    // 左留白
    if (positionX < leftSpace)
        positionX = leftSpace
    // 右留白
    if (document.body.clientWidth - positionX < rightSpace)
        positionX = document.body.clientWidth - rightSpace
    // 上留白
    if (positionY < topSpace)
        positionY = topSpace
    // 下留白
    if (document.body.clientHeight - positionY < bottomSpace)
        positionY = document.body.clientHeight - bottomSpace

    // 锚点处理
    positionX = positionX - xa
    positionY = positionY - ya

    // 位置计算
    menu.style.marginLeft = positionX + 'px'
    menu.style.marginTop = positionY + 'px'
}

let cacheData = { xa: 0, ya: 0, width: 0, height: 0 }
/**
 * 持续计算菜单位置
 * @param force 跳过变动检查，强制更新
 */
function keepCalc(force: boolean = false): void {
    if (!show.value) return

    const menu = content.value
    if (!menu) return
    const menuRect = menu.getBoundingClientRect()
    const anchorRect = document.getElementById('anchor')?.getBoundingClientRect() ?? {
        x: menuRect.x,
        y: menuRect.y,
    }
    const data = {
        xa: anchorRect.x - menuRect.x,
        ya: anchorRect.y - menuRect.y,
        width: menu.clientWidth,
        height: menu.clientHeight,
    }
    if (
        force ||
        data.xa !== cacheData.xa ||
        data.ya !== cacheData.ya ||
        data.width !== cacheData.width ||
        data.height !== cacheData.height
    ) {
        cacheData = data
        calcMenu(
            targetX,
            targetY,
            data.xa,
            data.ya,
            data.width,
            data.height,
            menu
        )
    }

    requestAnimationFrame(()=>keepCalc())
}

defineExpose({
    showMenu,
    closeMenu,
    isShow,
})
</script>

<style scoped>
.menu-component {
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
