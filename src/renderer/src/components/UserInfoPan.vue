<!--
 * @FileDescription: 群成员消息悬浮窗
 * @Author: Mr.Lee
 * @Date: 2025/09/01
 * @Version: 1.0
-->
<template>
    <Teleport to="body">
        <Transition name="member-info">
            <div v-if="data.user" class="member-info" :style="posInfo">
                <!-- 群成员 -->
                <div v-if="data.user instanceof Member"
                    ref="body"
                    class="ss-card"
                    :class="{
                        leave: data.user.leave,
                    }">
                    <div>
                        <img :src="data.user.face" :alt="data.user.name">
                        <div>
                            <span name="id">{{ data.user.user_id }}</span>
                            <div>
                                <a>{{ data.user.name }}</a>
                                <span v-user-role="data.user.role">
                                    <template v-if="data.user.role === Role.Bot">
                                        <font-awesome-icon :icon="['fas', 'robot']" />
                                    </template>
                                    <template v-if="data.user.level">
                                        {{ 'Lv.' + data.user.level }}
                                    </template>
                                    <template v-if="data.user.title">
                                        {{ data.user.title.replace(/[\u202A-\u202E\u2066-\u2069]/g, '') }}
                                    </template>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="member">
                        <div>
                            <template v-if="data.user.banTime">
                                <font-awesome-icon style="color: var(--color-red)" :icon="['fas', 'fa-volume-mute']" />
                                {{ $t('禁言中') }}
                            </template>
                        </div>
                        <span v-if="data.user.join_time">
                            {{
                                $t('{time} 加入群聊', {
                                    time: data.user.join_time.format(
                                        'year',
                                        'day',
                                    ),
                                })
                            }}
                        </span>
                    </div>
                </div>
                <!-- 已退群 -->
                <div v-else-if="typeof data.user === 'number'"
                    ref="body"
                    class="ss-card leave">
                    <div>
                        <img :src="'https://q1.qlogo.cn/g?b=qq&s=0&nk=' + data.user" :alt="String(data.user)">
                        <div>
                            <span name="id">{{ data.user }}</span>
                            <div>
                                <a>{{ $t('已退群( {userId} )', { userId: data.user }) }}</a>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- 好友 -->
                <div v-else-if="data.user instanceof User"
                    ref="body"
                    class="ss-card">
                    <div>
                        <img :src="data.user.face" :alt="data.user.name">
                        <div>
                            <span name="id">{{ data.user.user_id }}</span>
                            <div>
                                <a>{{ data.user.name }}</a>
                                <div>
                                    等级: <span>Lv {{ data.user.level }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-if="data.user.longNick" class="user">
                        {{ data.user.longNick }}
                    </div>
                </div>
                <!-- 保底的 -->
                <div v-else
                    ref="body"
                    class="ss-card">
                    <div>
                        <img :src="data.user.face" :alt="data.user.name">
                        <div>
                            <span name="id">{{ data.user.user_id }}</span>
                            <div>
                                <a>{{ data.user.name }}</a>
                                <div>
                                    <span v-if="data.user.role === Role.Owner">
                                        {{ $t('群主') }}
                                    </span>
                                    <span v-else-if="data.user.role === Role.Admin">
                                        {{ $t('管理员') }}
                                    </span>
                                    <span v-else-if="data.user.role === Role.Bot">
                                        {{ $t('机器人') }}
                                    </span>
                                    <span v-if="data.user.level">Lv {{ data.user.level }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { Role } from '@renderer/function/adapter/enmu'
import { IUser, Member, User } from '@renderer/function/model/user'
import { vUserRole } from '@renderer/function/utils/vcmd'
import {
    reactive,
    Reactive,
    ref,
    type Ref,
    watchEffect,
} from 'vue'

const { data } = defineProps<{
    data: {
        x: number,
        y: number,
        user?: IUser | number
    }
}>()

const body: Ref<HTMLElement|undefined> = ref(undefined)
const posInfo: Reactive<{'--x': string, '--y': string, '--width': string}> = reactive({
    '--x': '0px',
    '--y': '0px',
    '--width': '0px',
})

// 切换css
watchEffect(() => {
    posInfo['--x'] = data.x + 'px'
    posInfo['--y'] = data.y + 'px'
    if (body.value) {
        posInfo['--width'] = body.value.offsetWidth + 'px'
    }

    // 出界处理
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
export interface UserInfoPan {
    open: (user: IUser|number, x: number, y: number) => void
    close: () => void
}
</script>

<style scoped>
.member-info {
    margin-left: var(--x);
    margin-top: var(--y);
}
.member-info-enter-active, .member-info-leave-active {
    animation: none 0.2s;
}
.member-info-enter-active > .ss-card, .member-info-leave-active > .ss-card {
    transition: all 0.2s;
    transform-origin: top;
}
.member-info-enter-from > .ss-card, .member-info-leave-to > .ss-card {
    opacity: 0;
    transform: scaleY(0) translate(-20px, calc(-100% - 0.8rem));
}
.member-info-enter-to > .ss-card, .member-info-leave-from > .ss-card {
    opacity: 1;
    transform: scaleY(1) translate(-20px, calc(-100% - 0.8rem));
}
</style>
