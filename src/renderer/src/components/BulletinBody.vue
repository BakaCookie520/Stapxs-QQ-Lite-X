<!--
 * @FileDescription: 公告列表项模板
 * @Author: Stapxs
 * @Date: 2022-12-01
 * @Version: 1.0
-->

<template>
    <div class="base"
        @click="showAll = !showAll">
        <header>
            <font-awesome-icon :icon="['fas', 'bookmark']" />
            <span>{{ $t('公告') }}</span>
            <div style="flex: 1" />
            <span>{{ data.time.format() }}</span>
        </header>
        <div :id="'bulletins-msg-' + index"
            :class="{
                body: true,
                all: showAll,
            }">
            <span
                style="margin-right: auto;margin-bottom: auto;"
                @click="textClick"
                v-html="parseText(data.content)" />
            <img v-if="data.getImg()"
                :alt="'[' + $t('图片') + ']'"
                :src="data.getImg()"
                :class="{
                    img: true,
                    all: showAll,
                }"
                @click.stop="imgClick(data.imgData!)">
        </div>
        <span v-show="needShow && !showAll">{{ $t('点击展开') }}</span>
        <div class="info">
            <img :src="data.sender.face"
                :alt="data.sender.name">
            <a>{{ data.sender.name }}</a>
            <div />
            <span v-if="data.read !== undefined">{{
                $t('{readNum} 人已读 | {isRead}', {
                    isRead: data.read ? $t('已读') : $t('未读'),
                    readNum: data.readNum,
                })
            }}</span>
        </div>
    </div>
</template>

<script lang="ts">
    import { Ann } from '@renderer/function/model/ann'
import { Img } from '@renderer/function/model/img'
import { runtimeData } from '@renderer/function/msg'
import { openLink } from '@renderer/function/utils/appUtil'
import { getTrueLang } from '@renderer/function/utils/systemUtil'
import { defineComponent } from 'vue'
import xss from 'xss'

    export default defineComponent({
        name: 'BulletinBody',
        inject: ['viewer'],
        props: {
            data: {
                type: Object as () => Ann,
                required: true,
            },
            index: {
                type: Number,
                required: true,
            },
        },
        data() {
            return {
                trueLang: getTrueLang(),
                runtimeData: runtimeData,
                showAll: false,
                needShow: true,
            }
        },
        mounted() {
            this.$nextTick(() => {
                const tab1 = document.getElementById('info-pan-notices')
                const tab2 = document.getElementById('info-pan-member')
                const pan = document.getElementById(
                    'bulletins-msg-' + this.index,
                )
                if (pan && tab1 && tab2) {
                    // PS：display none 不渲染无法获取实际高度
                    tab1.click()
                    const maxHeight = Number(
                        getComputedStyle(pan).maxHeight.replace('px', ''),
                    )
                    const height = pan.offsetHeight
                    tab2.click()
                    this.needShow = height == maxHeight
                }
            })
        },
        methods: {
            parseText(text: string) {
                text = text.replaceAll('\r', '\n')
                    .replaceAll('\n\n', '\n')
                    .replaceAll('&#10;', '\n')
                text = xss(text, { whiteList: { a: ['href', 'target'] } })
                // 匹配链接
                const reg = /(http|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-.,@?^=%&:/~+#]*[\w\-@?^=%&/~+#])?/gi
                text = text.replaceAll(reg, '<a href="" data-link="$&" onclick="return false">$&</a>')
                return text
            },
            textClick(event: Event) {
                const target = event.target as HTMLElement
                if (target.dataset.link) {
                    // 点击了链接
                    const link = target.dataset.link
                    openLink(link)
                }
            },
            /**
             * 图片点击
             * @param img
             */
            imgClick(img: Img) {
                if (this.viewer) {
                    (this.viewer as any).open(img)
                }
            },
        },
    })
</script>
