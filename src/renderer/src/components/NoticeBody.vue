<!--
 * @FileDescription: 通知消息模板
 * @Author: Stapxs
 * @Date:
 *      2022/12/04
 *      2025/08/01
 * @Version:
 *         1.0 - 初始版本
 *         2.0 - 重构为setup语法
-->

<template>
    <div :id="'notice-' + id" class="note">
        <div class="note-base">
            <!-- #region == 接收到的消息 ========================================== -->
            <!-- 撤回 -->
            <template v-if="data instanceof RecallNotice">
                <template v-if="data.selfRevoke">
                    <NoticeUser :user="data.user" :user-info-pan="userInfoPan" />
                    <span>
                        {{ $t('撤回了一条消息') }}
                        <template v-if="data.suffix">
                            ，{{ data.suffix }}
                        </template>
                    </span>
                </template>
                <template v-else>
                    <NoticeUser :user="data.operator" :user-info-pan="userInfoPan" />
                    <span>{{ $t('撤回了') }}</span>
                    <NoticeUser :user="data.user" :user-info-pan="userInfoPan" />
                    <span>{{ $t('的消息') }}</span>
                </template>
            </template>
            <!-- 禁言 -->
            <template v-else-if="data instanceof BanNotice">
                <NoticeUser :user="data.operator" :user-info-pan="userInfoPan" />
                <span>{{ $t('禁言了') }}</span>
                <NoticeUser :user="data.user" :user-info-pan="userInfoPan" />
                <span>{{ data.fTime }}</span>
            </template>
            <!-- 解除禁言 -->
            <template v-else-if="data instanceof BanLiftNotice">
                <NoticeUser :user="data.operator" :user-info-pan="userInfoPan" />
                <span>{{ $t('解除了') }}</span>
                <NoticeUser :user="data.user" :user-info-pan="userInfoPan" />
                <span>{{ $t('的禁言') }}</span>
            </template>
            <!-- 戳一戳 -->
            <template v-else-if="data instanceof PokeNotice">
                <NoticeUser :user="data.user" :user-info-pan="userInfoPan" />
                <img :src="data.ico" :alt="data.action">
                <span>{{ data.action }}</span>
                <NoticeUser :user="data.target" :user-info-pan="userInfoPan" />
                <span>{{ data.suffix }}</span>
                <div class="space" />
            </template>
            <template v-else-if="data instanceof JoinNotice">
                <template v-if="data.operator">
                    <NoticeUser :user="data.operator" :user-info-pan="userInfoPan" />
                    <span>{{ $t('通过了') }}</span>
                </template>
                <template v-if="data.invitor">
                    <NoticeUser :user="data.invitor" :user-info-pan="userInfoPan" />
                    <span>{{ $t('邀请') }}</span>
                </template>
                <NoticeUser :user="data.user" :user-info-pan="userInfoPan" />
                <span>{{ $t('加入了群聊') }}</span>
            </template>
            <template v-else-if="data instanceof LeaveNotice">
                <template v-if="data.kick">
                    <NoticeUser :user="data.operator" :user-info-pan="userInfoPan" />
                    <span>{{ $t('将') }}</span>
                    <NoticeUser :user="data.user" :user-info-pan="userInfoPan" />
                    <span>{{ $t('移出群聊') }}</span>
                </template>
                <template v-else>
                    <NoticeUser :user="data.user" :user-info-pan="userInfoPan" />
                    <span>{{ $t('离开了群聊') }}</span>
                </template>
            </template>
            <!-- #endregion -->

            <!-- #region == 内部系统消息 ========================================== -->
            <!-- 缺失消息 -->
            <template v-else-if="data instanceof DeleteNotice">
                <span>{{ $t('这条消息迷失在虚空里了') }}</span>
            </template>
            <!-- 时间 -->
            <template v-else-if="data instanceof TimeNotice && data.time != undefined">
                <span>{{ pastTime }}</span>
            </template>
            <!-- 通知 -->
            <template v-else-if="data instanceof InfoNotice">
                <span>{{ data.message }}</span>
            </template>
            <!-- #endregion -->
        </div>
    </div>
</template>

<script setup lang="ts">
import {
    BanLiftNotice,
    BanNotice,
    DeleteNotice,
    InfoNotice,
    JoinNotice,
    LeaveNotice,
    Notice,
    PokeNotice,
    RecallNotice,
    TimeNotice
} from '@renderer/function/model/notice'
import { usePasttime } from '@renderer/function/utils/vuse'
import {
    ComputedRef,
} from 'vue'
import NoticeUser from './NoticeUser.vue'
import { UserInfoPan } from './UserInfoPan.vue'
const { data, id, userInfoPan } = defineProps<{
    data: Notice
    id?: string
    userInfoPan?: UserInfoPan
}>()

let pastTime: ComputedRef<string> | undefined
if (data instanceof TimeNotice && data.time != undefined) {
    pastTime = usePasttime(data.time.time)
}
</script>
