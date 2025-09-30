<!--
 * @FileDescription: 设置页面（功能子页面）
 * @Author: Stapxs
 * @Date: 2022/11/07
 * @Version: 1.0
-->
<!-- eslint-disable max-len -->

<template>
    <div class="opt-page">
        <div class="ss-card">
            <header>{{ $t('通知选项') }}</header>
            <div class="opt-item">
                <div :class="checkDefault('close_notice')" />
                <font-awesome-icon :icon="['fas', 'volume-xmark']" />
                <div>
                    <span>{{ $t('禁用通知') }}</span>
                    <span>{{ $t('好嘛 …… 不烦你 ……') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.close_notice"
                        type="checkbox" name="close_notice" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('bubble_sort_user')" />
                <font-awesome-icon :icon="['fas', 'box-open']" />
                <div>
                    <span>{{ $t('群收纳盒') }}</span>
                    <span>{{ $t('全都放出来！全都放出来！') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.bubble_sort_user"
                        type="checkbox" name="bubble_sort_user" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div v-if="!runtimeData.sysConfig.bubble_sort_user" class="opt-item">
                <div :class="checkDefault('group_notice_type')" />
                <font-awesome-icon :icon="['fas', 'user-group']" />
                <div>
                    <span>{{ $t('群消息通知方式') }}</span>
                    <span>{{ $t('重要消息将始终发起应用内通知和系统通知') }}</span>
                </div>
                <div class="select-wrapper">
                    <select v-model="runtimeData.sysConfig.group_notice_type"
                        name="group_notice_type" title="group_notice_type" @change="save">
                        <option value="none">
                            {{ $t('不通知（默认）') }}
                        </option>
                        <option value="inner">
                            {{ $t('仅应用内通知') }}
                        </option>
                        <option value="all">
                            {{ $t('应用内通知和系统通知') }}
                        </option>
                    </select>
                </div>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('preview_notice')" />
                <font-awesome-icon :icon="['fas', 'eye']" />
                <div>
                    <span>{{ $t('预览通知') }}</span>
                    <span>{{ $t('诸如撤回消息等事件也会做为预览消息') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.preview_notice"
                        type="checkbox" name="preview_notice" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
        </div>
        <div class="ss-card">
            <header>{{ $t('聊天选项') }}</header>
            <div class="opt-item">
                <font-awesome-icon :icon="['fas', 'box-archive']" />
                <div>
                    <span>{{ $t('消息防撤回') }}</span>
                    <span>{{
                        ndt === 0 ? $t('说出去的话就像泼出去的水 ……') : $t('说了不做这功能就是不做')
                    }}</span>
                </div>
                <label
                    v-if="ndt < 3"
                    class="ss-switch">
                    <input v-model="ndv" type="checkbox" @change="msgND">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('close_respond')" />
                <font-awesome-icon :icon="['fas', 'face-laugh-squint']" />
                <div>
                    <span>{{ $t('关闭回应功能') }}</span>
                    <span>{{
                        $t('如果你不想用它或者 bot 不支持，可以关闭这个功能')
                    }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.close_respond"
                        type="checkbox" name="close_respond" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div v-if="runtimeData.sysConfig.close_respond !== true" class="opt-item">
                <div :class="checkDefault('show_response_message')" />
                <font-awesome-icon :icon="['fas', 'comment']" />
                <div>
                    <span>{{ $t('表情回应通知') }}</span>
                    <span>
                        {{ $t('如果你觉得这东西刷屏或者不礼貌的话，可以关掉') }}
                    </span>
                </div>
                <div class="select-wrapper">
                    <select v-model="runtimeData.sysConfig.show_response_message"
                        name="show_response_message" title="show_response_message" @change="save">
                        <option value="none">
                            {{ $t('不通知') }}
                        </option>
                        <option value="self">
                            {{ $t('仅自己相关（默认）') }}
                        </option>
                        <option value="all">
                            {{ $t('全部消息') }}
                        </option>
                    </select>
                </div>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('msg_taill')" />
                <font-awesome-icon :icon="['fas', 'fish-fins']" />
                <div>
                    <span>{{ $t('小尾巴') }}</span>
                    <span>{{ $t('只会追加在最后一段话后面') }}</span>
                </div>
                <input v-model="runtimeData.sysConfig.msg_taill"
                    class="ss-input" style="width: 150px"
                    type="text" name="msg_taill" @keyup="save">
            </div>
            <div class="opt-item">
                <div :class="checkDefault('send_face')" />
                <font-awesome-icon :icon="['fas', 'square-arrow-up-right']" />
                <div>
                    <span>{{ $t('直接发送表情') }}</span>
                    <span>{{
                        $t('咻！点击发送！')
                    }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.send_face"
                        type="checkbox" name="send_face" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('send_key')" />
                <font-awesome-icon :icon="['fas', 'keyboard']" />
                <div>
                    <span>{{ $t('发送键') }}</span>
                    <span>{{ $t('你可以使用其他组合键来换行') }}</span>
                </div>
                <div class="select-wrapper">
                    <select v-model="runtimeData.sysConfig.send_key"
                        name="send_key" title="send_key" @change="save">
                        <option value="none">
                            Enter
                        </option>
                        <option value="shift">
                            Shift + Enter
                        </option>
                        <option value="ctrl">
                            Ctrl + Enter
                        </option>
                        <option value="alt">
                            Alt + Enter
                        </option>
                        <option value="meta">
                            Meta + Enter
                        </option>
                    </select>
                </div>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('dont_parse_delete')" />
                <font-awesome-icon :icon="['fas', 'delete-left']" />
                <div>
                    <span>{{ $t('禁止解析[已删除]') }}</span>
                    <span>{{ $t('在tx服务器里，被撤回的消息为[已删除]') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.dont_parse_delete"
                        type="checkbox" name="dont_parse_delete" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('jump_forward')" />
                <font-awesome-icon :icon="['fas', 'share']" />
                <div>
                    <span>{{ $t('转发消息跳转群组') }}</span>
                    <span>{{ $t('发到哪里水到哪里～') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.jump_forward"
                        type="checkbox" name="jump_forward" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('default_multiselect_forward')" />
                <font-awesome-icon :icon="['fas', 'fa-list-check']" />
                <div>
                    <span>{{ $t('转发默认多选') }}</span>
                    <span>{{ $t('需要用到这个选项的...应该是和我一样的搬石大王吧？') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.default_multiselect_forward"
                        type="checkbox" name="default_multiselect_forward" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
        </div>
        <div class="ss-card">
            <header>{{ $t('浏览') }}</header>
            <div class="opt-item">
                <div :class="checkDefault('close_browser')" />
                <font-awesome-icon :icon="['fas', 'globe']" />
                <div>
                    <span>{{ $t('禁用内置浏览器') }}</span>
                    <span>{{ $t('让我看看你的浏览器 👀') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.close_browser"
                        type="checkbox" name="close_browser" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
        </div>
        <div class="ss-card">
            <header>{{ $t('分析信息') }}</header>
            <div
                class="opt-item"
                :style="runtimeData.sysConfig.close_ga !== true ?
                    'background: var(--color-card-1);' : ''">
                <div :class="checkDefault('close_ga')" />
                <font-awesome-icon :icon="['fas', 'cloud']" />
                <div>
                    <span>{{ $t('关闭分析') }}</span>
                    <span>{{ $t('真的不让看吗（小声') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.close_ga" type="checkbox"
                        name="close_ga" @change="save">
                    <div style="background: var(--color-card-2)">
                        <div />
                    </div>
                </label>
            </div>
            <div
                v-if="runtimeData.sysConfig.close_ga !== true"
                class="tip">
                {{
                    $t('我们使用 Umami 对应用的使用情况进行分析，它将不会上传精确到用户的信息；你也可以在这儿控制分析功能的开关和额外分析项。')
                }}
            </div>
            <div v-if="runtimeData.sysConfig.close_ga !== true" class="opt-item">
                <font-awesome-icon :icon="['fas', 'file-invoice']" />
                <div>
                    <span>{{ $t('分析统计信息') }}</span>
                    <span>{{ $t('都有些什么数据呢') }}</span>
                </div>
                <button style="width: 100px; font-size: 0.8rem"
                    class="ss-button" @click=" showUmamiInfo">
                    {{ $t('查看') }}
                </button>
            </div>
            <div v-if="runtimeData.sysConfig.close_ga !== true"
                class="opt-item">
                <div :class="checkDefault('open_ga_bot')" />
                <font-awesome-icon :icon="['fas', 'dice']" />
                <div>
                    <span>{{ $t('后端类型分析') }}</span>
                    <span>{{ $t('在连接后上传所使用的 bot 的类型分析') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="runtimeData.sysConfig.open_ga_bot" type="checkbox"
                        name="open_ga_bot" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { runtimeData } from '@renderer/function/msg'
import { checkDefault, runASWEvent as save } from '@renderer/function/option'
import { noticePopBox, popBox } from '@renderer/function/utils/popBox'
import UmamiInfoPan from '@renderer/popboxes/UmamiInfoPan.vue'
import { defineComponent } from 'vue'

    export default defineComponent({
        name: 'ViewOptFunction',
        data() {
            return {
                checkDefault: checkDefault,
                runtimeData: runtimeData,
                save: save,
                ndt: 0,
                ndv: false,
            }
        },
        methods: {
            showUmamiInfo() {
                popBox({
                    template: UmamiInfoPan,
                    full: true,
                })
            },

            msgND: function () {
                this.ndt++
                setTimeout(() => {
                    this.ndv = false
                }, 300)
            },
        },
    })
</script>
<style>
    .ss-switch input:checked ~ div {
        background: var(--color-main) !important;
    }

    .ga-share {
        background: var(--color-card-2);
        border-radius: 7px;
        align-items: center;
        margin-top: 10px;
        cursor: pointer;
        display: flex;
        padding: 10px 20px;
    }

    .ga-share > svg {
        fill: var(--color-font);
        margin-right: 10px;
        width: 20px;
    }

    .ga-share > a {
        text-decoration: underline;
        color: var(--color-font-1);
        font-size: 0.8rem;
    }
</style>
