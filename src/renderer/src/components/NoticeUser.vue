<template>
    <a v-if="user.user_id === runtimeData.loginInfo.uin" class="me">
        {{ $t('你') }}
    </a>
    <a v-else
        v-long-hover
        @v-long-hover="userInfoPan?.open(
            user,
            ($event.detail as MenuEventData).x,
            ($event.detail as MenuEventData).y,
        )"
        @v-long-hover-end="userInfoPan?.close()">
        {{ user.name }}
    </a>
</template>

<script setup lang="ts">
import { MenuEventData } from '@renderer/function/elements/information'
import { IUser } from '@renderer/function/model/user'
import { runtimeData } from '@renderer/function/msg'
import { vLongHover } from '@renderer/function/utils/vcmd'
import { UserInfoPan } from './UserInfoPan.vue'

const { user } = defineProps<{
    user: IUser
    userInfoPan?: UserInfoPan
}>()
</script>