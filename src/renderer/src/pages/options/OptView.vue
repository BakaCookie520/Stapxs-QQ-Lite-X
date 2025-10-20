<!--
 * @FileDescription: 设置页面（界面子页面）
 * @Author: Stapxs
 * @Date: 2022/09/26
 * @Version: 1.0
-->

<template>
    <div class="opt-page">
        <div class="ss-card">
            <header>{{ $t('本土化') }}</header>
            <div class="l10n-info">
                <font-awesome-icon :icon="['fas', 'language']" />
                <div>
                    <span>{{ $t('简体中文') }}</span>
                    <span class="author">{{ $t('作者：') }}{{ $t('Stapx Steve') }}</span>
                    <span>{{
                        $t('你好世界！这是 Stapxs QQ Lite 的默认简体中文。')
                    }}</span>
                </div>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('language')" />
                <font-awesome-icon :icon="['fas', 'earth-asia']" />
                <div>
                    <span>{{ $t('语言（Language）') }}</span>
                    <span>{{ $t('喵喵喵喵？') }}</span>
                </div>
                <div class="select-wrapper">
                    <select v-model="runtimeData.sysConfig.language"
                        name="language" title="language"
                        @change="save($event);gaLanguage($event)">
                        <option v-for="item in languages" :key="item.value" :value="item.value">
                            {{ item.name }}
                        </option>
                    </select>
                </div>
            </div>
        </div>
        <div v-if="backend.isMobile()" class="ss-card">
            <header>{{ $t('图标') }}</header>
            <div class="icon-list">
                <div v-for="item in getIconList()"
                    :key="item.name"
                    :class="item.name === usedIcon ? 'selected' : ''"
                    @click="changeIcon(item.name)">
                    <img :src="item.icon">
                    <span>{{ $t(item.name != '' ? item.name : '默认') }}</span>
                </div>
            </div>
        </div>
        <div class="ss-card">
            <header>{{ $t('主题与颜色') }}</header>
            <template v-if="runtimeData.sysConfig.opt_auto_gtk != true">
                <div id="opt_view_dark" class="opt-item">
                    <div :class="checkDefault('opt_view_dark')" />
                    <font-awesome-icon :icon="['fas', 'moon']" />
                    <div>
                        <span>{{ $t('深色模式') }}</span>
                        <span>{{ $t('是五彩斑斓的黑色！') }}</span>
                    </div>
                    <label class="ss-switch">
                        <input v-model="runtimeData.sysConfig.opt_dark"
                            type="checkbox" name="opt_dark" @change="save">
                        <div>
                            <div />
                        </div>
                    </label>
                </div>
                <div class="opt-item">
                    <div :class="checkDefault('opt_auto_dark')" />
                    <font-awesome-icon :icon="['fas', 'toggle-on']" />
                    <div>
                        <span>{{ $t('自动深色模式') }}</span>
                        <span>{{ $t('Biubiu ——，自动变黑！') }}</span>
                    </div>
                    <label class="ss-switch">
                        <input v-model="runtimeData.sysConfig.opt_auto_dark"
                            type="checkbox" name="opt_auto_dark" @change="save">
                        <div>
                            <div />
                        </div>
                    </label>
                </div>
                <template
                    v-if="runtimeData.sysConfig.opt_auto_win_color != true">
                    <div class="opt-item">
                        <div :class="checkDefault('theme_color')" />
                        <font-awesome-icon :icon="['fas', 'palette']" />
                        <div>
                            <span>{{ $t('主题色') }}</span>
                            <span>{{ $t('换个心情 🎵 ~') }}</span>
                        </div>
                        <div class="theme-color-col">
                            <label v-for="(name, index) in colors" :key="'color_id_' + index"
                                :title="name" class="ss-radio">
                                <input type="radio" name="theme_color" :data-id="index"
                                    :checked="runtimeData.sysConfig.theme_color === undefined ?
                                        index === 0 : Number(runtimeData.sysConfig.theme_color) === index"
                                    @change="save($event);gaColor($event)">
                                <div
                                    :style="'background: var(--color-main-' + index + ')'">
                                    <div />
                                </div>
                            </label>
                        </div>
                    </div>
                </template>
            </template>
            <template v-if="backend.isDesktop() && browser.os != 'Linux'">
                <div class="opt-item">
                    <div :class="checkDefault('opt_auto_win_color')" />
                    <font-awesome-icon :icon="['fas', 'wand-magic-sparkles']" />
                    <div>
                        <span>{{ $t('自动跟随主题色') }}</span>
                        <span>{{ $t('自动获取的主题色设置并应用') }}</span>
                    </div>
                    <label class="ss-switch">
                        <input v-model="runtimeData.sysConfig.opt_auto_win_color"
                            type="checkbox" name="opt_auto_win_color" @change="save">
                        <div>
                            <div />
                        </div>
                    </label>
                </div>
            </template>
            <div class="opt-item">
                <div :class="checkDefault('vibrancy')" />
                <font-awesome-icon :icon="['fas', 'window-maximize']" />
                <div>
                    <span>{{ $t('透明模式') }}</span>
                    <span>{{ $t('开启透明模式，颜值翻倍...就是有点吃性能') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.vibrancy"
                        type="checkbox" name="vibrancy" @change="gaVibrancy">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div v-if="runtimeData.sysConfig.vibrancy" class="opt-item">
                <div :class="checkDefault('background_img')" />
                <font-awesome-icon :icon="['fas', 'image']" />
                <div>
                    <span>{{ $t('背景图片') }}</span>
                    <span>{{ $t('嘿嘿嘿（痴呆') }}</span>
                </div>
                <div class="file-choice">
                    <div class="choice-btn"
                        @click="($refs.choiceImg as any)?.click()">
                        {{
                            runtimeData.sysConfig.background_img
                                ? $t('更换背景')
                                : $t('上传背景')
                        }}
                        <input ref="choiceImg"
                            type="file"
                            style="display: none"
                            name="background_img"
                            accept="image/*"
                            @change="setBackground($event)">
                    </div>
                    <div v-if="runtimeData.sysConfig.background_img !== ''"
                        class="rm-btn"
                        @click="removeBackground">
                        <font-awesome-icon :icon="['fas', 'xmark']" />
                    </div>
                </div>
            </div>
            <div v-if="runtimeData.sysConfig.background_img" class="opt-item">
                <div :class="checkDefault('background_img_blur')" />
                <font-awesome-icon :icon="['fas', 'o']" />
                <div>
                    <span>{{ $t('背景模糊') }}</span>
                    <span>{{ $t('什么都看不见了（恼') }}</span>
                </div>
                <div class="ss-range">
                    <input v-model="runtimeData.sysConfig.background_img_blur"
                        :style="`background-size: ${runtimeData.sysConfig.background_img_blur}% 100%;`"
                        type="range" name="background_img_blur" @input="save">
                    <span :style="`color: var(--color-font${ runtimeData.sysConfig.background_img_blur > 50 ? '-r' : ''})`">
                        {{ runtimeData.sysConfig.background_img_blur }}
                        px</span>
                </div>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('auto_hide_side_bar')" />
                <font-awesome-icon :icon="['fas', 'barcode']" />
                <div>
                    <span>{{ $t('自动隐藏侧边栏') }}</span>
                    <span>{{ $t('emm...这里该写些什么东西好呢？不知道，摆（') }}</span>
                </div>
                <div class="select-wrapper">
                    <select v-model="runtimeData.sysConfig.auto_hide_side_bar"
                        name="auto_hide_side_bar" title="auto_hide_side_bar" @change="save">
                        <option value="none">
                            {{ $t('禁用（默认）') }}
                        </option>
                        <option value="fold">
                            {{ $t('折叠') }}
                        </option>
                        <option value="hide">
                            {{ $t('隐藏') }}
                        </option>
                    </select>
                </div>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('side_bar_width')" />
                <font-awesome-icon :icon="['fas', 'arrows-left-right']" />
                <div>
                    <span>{{ $t('侧边栏宽度') }}</span>
                    <span>{{ $t('难以通过拖拽侧边栏调整时，可以用这个') }}</span>
                </div>
                <div class="ss-range">
                    <input v-model="runtimeData.sysConfig.side_bar_width"
                        :style="`background-size: ${(runtimeData.sysConfig.side_bar_width - 250) / 7.5}% 100%;`"
                        min="250"
                        max="1000"
                        type="range" name="side_bar_width" @input="save">
                    <span :style="`color: var(--color-font${ runtimeData.sysConfig.side_bar_width > 625 ? '-r' : ''})`">
                        {{ runtimeData.sysConfig.side_bar_width }}
                        px</span>
                </div>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('hide_chat_head')" />
                <font-awesome-icon :icon="['fas', 'clapperboard']" />
                <div>
                    <span>{{ $t('隐藏聊天顶栏') }}</span>
                    <span>{{ $t('把聊天信息都藏起来') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.hide_chat_head"
                        type="checkbox" name="hide_chat_head" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('hide_chat_bottom')" />
                <font-awesome-icon :icon="['fas', 'rectangle-list']" />
                <div>
                    <span>{{ $t('隐藏发送栏') }}</span>
                    <span>{{ $t('简洁模式') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.hide_chat_bottom"
                        type="checkbox" name="hide_chat_bottom" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
        </div>
        <div class="ss-card">
            <header>{{ $t('页面') }}</header>
            <div class="opt-item">
                <div :class="checkDefault('opt_fast_animation')" />
                <font-awesome-icon :icon="['fas', 'car-side']" />
                <div>
                    <span>{{ $t('更快的动画速度') }}</span>
                    <span>{{ $t('咻咻！此选项将使动画加速到 100ms 并去除部分浪费时间的组动画') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.opt_fast_animation"
                        type="checkbox" name="opt_fast_animation" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div v-if="isMobile() && !backend.isMobile()"
                class="opt-item">
                <div :class="checkDefault('initial_scale')" />
                <font-awesome-icon :icon="['fas', 'up-down-left-right']" />
                <div>
                    <span>{{ $t('缩放比例') }}</span>
                    <span>{{ $t('调整页面在移动端的缩放比例') }}</span>
                </div>
                <div class="ss-range">
                    <input v-model="runtimeData.sysConfig.initial_scale"
                        :style="`background-size: ${(initialScaleShow - 0.5) / 0.01}% 100%`"
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.01"
                        name="initial_scale"
                        @change="scaleSave"
                        @input="setInitialScaleShow">
                    <span :style="`color: var(--color-font${initialScaleShow / 0.05 })`">
                        {{ initialScaleShow }}</span>
                </div>
            </div>
            <div
                v-if="isMobile() && !backend.isMobile()"
                class="opt-item">
                <div :class="checkDefault('fs_adaptation')" />
                <font-awesome-icon :icon="['fas', 'border-top-left']" />
                <div>
                    <span>{{ $t('圆角适配') }}</span>
                    <span>{{ $t('适配全面屏设备防止四角出界') }}</span>
                </div>
                <div class="ss-range">
                    <input v-model="runtimeData.sysConfig.fs_adaptation"
                        :style="`background-size: ${(fsAdaptationShow / 50) * 100}% 100%;`"
                        type="range"
                        min="0"
                        max="50"
                        step="10"
                        name="fs_adaptation"
                        @change="save"
                        @input="setFsAdaptationShow">
                    <span :style="`color: var(--color-font${fsAdaptationShow / 50 > 0.5 ? '-r' : ''})`">
                        {{ fsAdaptationShow }} px
                    </span>
                </div>
            </div>
            <div
                v-if="backend.isDesktop()"
                class="opt-item">
                <div :class="checkDefault('opt_always_top')" />
                <font-awesome-icon :icon="['fas', 'angle-up']" />
                <div>
                    <span>{{ $t('置顶窗口') }}</span>
                    <span>{{
                        $t('你也不想想让 ta 知道你不在看消息吧 ~')
                    }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.opt_always_top"
                        type="checkbox" name="opt_always_top" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('merge_forward_width')" />
                <font-awesome-icon :icon="['fas', 'text-width']" />
                <div>
                    <span>{{ $t('固定合并转发宽度') }}</span>
                    <span>{{ $t('强迫症的福音～') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.merge_forward_width_type"
                        type="checkbox" name="merge_forward_width_type" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('use_favicon_notice')" />
                <font-awesome-icon :icon="['fas', 'bell']" />
                <div>
                    <span>{{ $t('在图标上显示通知') }}</span>
                    <span>{{ $t('呜呜呜——图标都被遮挡的看不到了！') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.use_favicon_notice"
                        type="checkbox" name="use_favicon_notice" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('use_super_face')" />
                <font-awesome-icon :icon="['fas', 'face-laugh-squint']" />
                <div>
                    <span>{{ $t('超级表情') }}</span>
                    <span>{{
                        $t('小黄脸长大了，变成了大黄脸！')
                    }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.use_super_face"
                        type="checkbox" name="use_super_face" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('hide_self_avatar')" />
                <font-awesome-icon :icon="['fas', 'user']" />
                <div>
                    <span>{{ $t('隐藏自己的头像') }}</span>
                    <span>
                        {{ $t('干净整洁多了！') }}
                    </span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.hide_self_avatar"
                        type="checkbox" name="hide_self_avatar" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('self_msg_direction')" />
                <font-awesome-icon :icon="['fas', 'chart-bar']" />
                <div>
                    <span>{{ $t('自己消息位置') }}</span>
                    <span>
                        {{ $t('是靠左边好呢？还是靠右边好呢？') }}
                    </span>
                </div>
                <div class="select-wrapper">
                    <select v-model="runtimeData.sysConfig.self_msg_direction"
                        name="self_msg_direction" title="self_msg_direction" @change="save">
                        <option value="left">
                            {{ $t('左边') }}
                        </option>
                        <option value="right">
                            {{ $t('右边（默认）') }}
                        </option>
                    </select>
                </div>
            </div>
            <div class="opt-item">
                <font-awesome-icon :icon="['fas', 'arrows-rotate']" />
                <div>
                    <span>{{ $t('不要点这个') }}</span>
                    <span>{{ $t('啊吧啊吧（智慧）') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.opt_revolve"
                        type="checkbox" name="opt_revolve" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { getDeviceType } from '@renderer/function/utils/systemUtil'
import { BrowserInfo, detect } from 'detect-browser'
import { defineComponent, toRaw } from 'vue'
import { runtimeData } from '../../function/msg'
import Option, { checkDefault, get, runASWEvent as save } from '../../function/option'

import { sendIdentifyData } from '@renderer/function/utils/appUtil'
import { closePopBox, ensurePopBox, textPopBox } from '@renderer/function/utils/popBox'
import { backend } from '@renderer/runtime/backend'
import languages from '../../assets/l10n/_l10nconfig.json'

    export default defineComponent({
        name: 'ViewOptTheme',
        data() {
            return {
                backend: backend,
                get: get,
                runtimeData: runtimeData,
                checkDefault: checkDefault,
                save: save,
                languages: languages,
                // 别问我为什么微软是紫色的
                colors: [
                    '林槐蓝',
                    '墨竹青',
                    '少女粉',
                    '微软紫',
                    '坏猫黄',
                    '玄素黑',
                ],
                browser: detect() as BrowserInfo,
                initialScaleShow: 0.5,
                fsAdaptationShow: 0,
                usedIcon: ''
            }
        },
        mounted() {
            // 一次性初始化一次缩放级别
            const watch = this.$watch(
                () => runtimeData.sysConfig,
                () => {
                    this.initialScaleShow = toRaw(
                        runtimeData.sysConfig.initial_scale,
                    )
                    this.fsAdaptationShow = toRaw(
                        runtimeData.sysConfig.fs_adaptation,
                    )
                    watch()
                },
            )
            // 获取当前使用的图标
            const Onebot = window.Capacitor?.Plugins?.Onebot
            if (Onebot) {
                Onebot.addListener('onebot:icon', (data: any) => {
                    this.usedIcon = data.name.replace('AppIcon', '')
                })
                Onebot.getUsedIcon()
            }
        },
        methods: {
            gaLanguage(event: Event) {
                const sender = event.target as HTMLInputElement
                sendIdentifyData({'use_language': sender.value})
            },

            gaColor(event: Event) {
                const sender = event.target as HTMLInputElement
                sendIdentifyData({ use_theme_color: this.colors[Number(sender.dataset.id)] })
            },

            async gaVibrancy(event: Event) {
                const sender = event.target as HTMLInputElement
                if (sender.checked) {
                    const re = await ensurePopBox(
                        this.$t('开启透明模式将会对性能产生较为明显的影响，建议不要在性能较差的设备上使用此功能；此功能可能会降低元素可读性。',)
                    )
                    if (!re) {
                        sender.checked = false
                        return
                    }
                    save(event)
                    sendIdentifyData({ use_transparent: true })
                }else {
                    save(event)
                    sendIdentifyData({ use_transparent: false })
                }
            },

            scaleSave(event: Event) {
                save(event)
                // eslint-disable-next-line prefer-const
                let makeSureBoxId: string
                // 5 秒后自动取消防止误操作导致无法恢复
                const timerId = setTimeout(() => {
                    (event.target as HTMLInputElement).value = '0.85'
                    runtimeData.sysConfig.initial_scale = 0.85
                    this.initialScaleShow = 0.85
                    save(event)
                    closePopBox(makeSureBoxId)

                    textPopBox(this.$t('缩放比例调整已取消，已恢复默认缩放比例。'), {
                        svg: 'up-down-left-right',
                        title: this.$t('确认缩放比例'),
                        button: [
                            {
                                text: this.$t('取消'),
                                master: true,
                            }
                        ],
                    })
                }, 5000)
                // 保存提醒
                makeSureBoxId = textPopBox(this.$t('点击确认以应用缩放比例，预览将在 5 秒后取消……'), {
                    svg: 'up-down-left-right',
                    title: this.$t('确认缩放比例'),
                    button: [
                        {
                            text: this.$t('确定'),
                            fun: () => {
                                clearTimeout(timerId)
                            },
                        }
                    ],
                })
            },

            setInitialScaleShow(event: Event) {
                const sender = event.target as HTMLInputElement
                this.initialScaleShow = Number(sender.value)
            },
            setFsAdaptationShow(event: Event) {
                const sender = event.target as HTMLInputElement
                this.fsAdaptationShow = Number(sender.value)
            },

            restartapp() {
                backend.call(undefined, 'win:relaunch', false)
            },

            isMobile() {
                return (
                    getDeviceType() === 'Android' || getDeviceType() === 'iOS'
                )
            },

            getAppendChatView() {
                const chatView = import.meta.glob('@renderer/pages/chat-view/*.vue', { eager: true })
                const chatViewList: string[] = []
                Object.keys(chatView).forEach((key: string) => {
                    const name = key.split('/').pop()?.split('.')[0]
                    if (name && name.startsWith('Chat')) {
                        chatViewList.push(name)
                    }
                })
                return chatViewList
            },

            getIconList() {
                const iconList = import.meta.glob('@renderer/assets/img/icons/*.png', { eager: true })
                const iconListInfo = [] as { name: string, icon: any }[]
                Object.keys(iconList).forEach((key: string) => {
                    const name = key.split('/').pop()?.split('.')[0].replace('AppIcon', '')
                    if(name || name === '') {
                        if(!runtimeData.tags.darkMode && !name.endsWith('Dark')) {
                            iconListInfo.push({ name: name, icon: (iconList[key] as any).default })
                        } else if(runtimeData.tags.darkMode && name.endsWith('Dark')) {
                            iconListInfo.push({ name: name.replace('Dark', ''), icon: (iconList[key] as any).default })
                        }
                    }
                })
                return iconListInfo
            },

            changeIcon(name: string) {
                backend.call('Onebot', 'changeIcon', false, { name: name != '' ? (name + 'AppIcon') : name })
                this.usedIcon = name
            },

            /**
             * 设置背景图片
             */
            setBackground(event: Event) {
                const sender = event.target as HTMLInputElement
                const img = sender.files?.[0]
                if (!img) return
                img.arrayBuffer().then((buffer) => {
                    const base64String = btoa(
                        new Uint8Array(buffer)
                            .reduce((data, byte) => data + String.fromCharCode(byte), ''),
                    )
                    const imgSrc = `data:${img.type};base64,${base64String}`
                    runtimeData.sysConfig.background_img = imgSrc
                    Option.runAS('background_img', imgSrc)
                })
            },
            /**
             * 移除背景图片
             */
            removeBackground() {
                runtimeData.sysConfig.background_img = ''
                Option.runAS('background_img', '')
            },
        },
    })
</script>
