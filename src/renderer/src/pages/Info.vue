<!--
 * @FileDescription: 群 / 好友信息页面
 * @Author: Stapxs
 * @Date: missing
 * @Version: 1.0
-->

<template>
    <div class="chat-info-pan">
        <div :class="'chat-info-base ' + chat.type">
            <div>
                <img :src="chat.face">
                <div>
                    <a>{{ chat.showName }}</a>
                    <span>{{ chat.id }}</span>
                </div>
                <div style="display: flex;align-items: center;justify-content: center;cursor: pointer;"
                    @click="copyText(chat.id)">
                    <font-awesome-icon :icon="['fas', 'copy']" />
                </div>
            </div>
            <div v-if="chat.type === 'group'"
                v-show="false">
                <!-- <header>
                    <span>{{ $t('介绍') }}</span>
                </header>
                <span v-html=" chat.info.group_info.gIntro === undefined || chat.info.group_info.gIntro === '' ?
                    $t('群主很懒，还没有群介绍哦～') : chat.info.group_info.gIntro" />
                <div class="tags">
                    <div v-for="item in chat.info.group_info.tags" :key="item.md">
                        {{ item.tag }}
                    </div>
                </div> -->
            </div>
            <div v-else-if="chat instanceof UserSession && userInfo">
                <header>
                    <span>QID</span>
                </header>
                <span>{{ userInfo.qid }}</span>
                <header>
                    <span>{{ $t('等级') }}</span>
                </header>
                <span>{{ userInfo.level }}</span>
                <header v-if="userInfo.regTime">
                    <span>{{ $t('注册时间') }}</span>
                </header>
                <span>{{ userInfo.regTime.format('year', 'year') }}</span>
                <header>
                    <span>{{ $t('签名') }}</span>
                </header>
                <span>{{ userInfo.longNick ? userInfo.longNick : $t("这个人很懒什么都没有写～") }}</span>
                <header>
                    <span>{{ $t('其他信息') }}</span>
                </header>
                <div class="outher">
                    <span v-if="userInfo.birthday_year">{{ $t('生日') }}:
                        <span>
                            {{ Intl.DateTimeFormat(trueLang, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                            }).format(new Date(
                                `${userInfo.birthday_year}-${
                                    userInfo.birthday_month}-${
                                    userInfo.birthday_day}`,
                            )) }}
                        </span>
                    </span>
                    <span v-if="userInfo.country">{{ $t('地区') }}:
                        <span>
                            {{
                                `${userInfo.country}-
                                ${userInfo.province}-
                                ${userInfo.city}`
                            }}
                        </span>
                    </span>
                </div>
                <!-- <template v-if="!chat.show.temp">
                    <header>
                        <span>{{ $t('设置') }}</span>
                    </header>
                    <OptInfo
                        :type="'number'"
                        :chat="chat" />
                </template> -->
            </div>
        </div>
        <BcTab v-if="chat instanceof GroupSession"
            class="chat-info-tab">
            <div :name="$t('成员')">
                <div class="chat-info-tab-member">
                    <input
                        class="search-view"
                        v-search="userSearchInfo!"
                        :placeholder="$t('搜索 ……')">
                    <div v-if="(userSearchInfo!.isSearch ? userSearchInfo!.query : chat.memberList).length > 0">
                        <div v-for="member in userSearchInfo!.isSearch ? userSearchInfo!.query : chat.memberList"
                            :key="'chatinfomlist-' + member.user_id" class="edit">
                            <img alt="nk" loading="lazy"
                                :src="member.face">
                            <div>
                                <a @click="startChat(member)">{{ member.name }}</a>
                                <font-awesome-icon v-if="member.role === 'owner'" :icon="['fas', 'crown']" />
                                <font-awesome-icon v-if="member.role === 'admin'" :icon="['fas', 'star']" />
                            </div>
                            <!-- 在手机端戳 id 就能触发 -->
                            <span @click="clickMember(member)">{{ member.user_id }}</span>
                            <font-awesome-icon v-if="canEditMember(member.role)" :icon="['fas', 'wrench']" @click="clickMember(member)" />
                            <font-awesome-icon v-else :icon="['fas', 'copy']" @click="clickMember(member)" />
                        </div>
                    </div>
                    <div v-else class="null">
                        <font-awesome-icon :icon="['fas', 'inbox']" />
                        {{ $t('空空如也') }}
                    </div>
                </div>
            </div>
            <div :name="$t('公告')">
                <div class="bulletins">
                    <template v-if="anns">
                        <input
                            class="search-view"
                            v-search="annSearchInfo!"
                            :placeholder="$t('搜索 ……')">
                        <div v-if="(annSearchInfo!.isSearch ? annSearchInfo!.query : anns).length > 0">
                            <BulletinBody
                                v-for="(item, index) in annSearchInfo!.isSearch ? annSearchInfo!.query : anns"
                                :key="'bulletins-' + index"
                                :data="item"
                                :index="index" />
                        </div>
                        <div v-else class="null">
                            <font-awesome-icon :icon="['fas', 'inbox']" />
                            {{ $t('空空如也') }}
                        </div>
                    </template>
                    <div v-else class="loading" style="opacity: 0.9;">
                        <font-awesome-icon :icon="['fas', 'spinner']" />
                        {{ $t('加载中') }}
                    </div>
                </div>
            </div>
            <div :name="$t('文件')">
                <div class="group-files">
                    <template v-if="fileInfo">
                        <input
                            class="search-view"
                            v-search="fileSearchInfo!"
                            :placeholder="$t('搜索 ……')">
                        <div v-if="(fileSearchInfo!.isSearch ? fileSearchInfo!.query : fileInfo)?.length > 0">
                            <div v-for="item in fileSearchInfo!.isSearch ? fileSearchInfo!.query : fileInfo"
                                :key="'file-' + item.id">
                                <FileBody :item="markRaw(item)" />
                            </div>
                        </div>
                        <div v-else class="null">
                            <font-awesome-icon :icon="['fas', 'inbox']" />
                            {{ $t('空空如也') }}
                        </div>
                    </template>
                    <div v-else class="loading" style="opacity: 0.9;">
                        <font-awesome-icon :icon="['fas', 'spinner']" />
                        {{ $t('加载中') }}
                    </div>
                </div>
            </div>
            <div :name="$t('设置')">
                <div style="padding: 0 20px">
                    <OptInfo :type="'group'" :chat="chat"
                        @update_member_card="updateMemberCard" />
                </div>
            </div>
        </BcTab>
        <div v-if="configMember && chat instanceof GroupSession" class="ss-card user-config show">
            <div>
                <img alt="nk" :src="configMember.face">
                <div>
                    <a>{{ configMember.name }}</a>
                    <span>{{ configMember.user_id }}</span>
                </div>
                <font-awesome-icon
                    style="margin-right: 20px;"
                    :icon="['fas', 'copy']"
                    @click="copyText(configMember.user_id)" />
                <font-awesome-icon :icon="['fas', 'angle-down']" @click="configMember = undefined" />
            </div>
            <div>
                <header>{{ $t('成员信息') }}</header>
                <div class="opt-item">
                    <font-awesome-icon :icon="['fas', 'clipboard-list']" />
                    <div>
                        <span>{{ $t('成员昵称') }}</span>
                        <span>{{
                            $t('啊吧啊吧……')
                        }}</span>
                    </div>
                    <input v-model.trim="configCard"
                        style="width: 50%"
                        class="ss-input"
                        type="text"
                        @change="updateMemberCard(configMember as Member, configCard)">
                </div>
                <div v-if="chat.getMe().role === 'owner'" class="opt-item">
                    <font-awesome-icon :icon="['fas', 'clipboard-list']" />
                    <div>
                        <span>{{ $t('成员头衔') }}</span>
                        <span>{{
                            $t('猪咪猪咪')
                        }}</span>
                    </div>
                    <input v-model.trim="configTitle"
                        style="width: 50%"
                        class="ss-input"
                        type="text"
                        @change="updateMemberTitle(configMember as Member, configTitle)">
                </div>
                <template v-if="canEditMember(configMember.role)">
                    <header>{{ $t('操作') }}</header>
                    <div class="opt-item">
                        <font-awesome-icon :icon="['fas', 'clipboard-list']" />
                        <div>
                            <span>{{ $t('禁言成员') }}</span>
                            <span>{{
                                $t('要让小猫咪不许说话几分钟呢？')
                            }}</span>
                        </div>
                        <input v-model.number="configBanMin"
                            style="width: 50%"
                            class="ss-input"
                            type="text"
                            @change="banMember(configMember as Member, configBanMin)">
                    </div>
                    <button class="ss-button"
                        @click="removeUser(configMember as Member)">
                        {{ $t('移出群聊') }}
                    </button>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import BulletinBody from '@renderer/components/BulletinBody.vue'
import FileBody from '@renderer/components/FileBody.vue'
import app from '@renderer/main'
import BcTab from 'vue3-bcui/packages/bc-tab'
import OptInfo from './options/OptInfo.vue'

import { Role } from '@renderer/function/adapter/enmu'
import { PopInfo, PopType } from '@renderer/function/base'
import { Ann } from '@renderer/function/model/ann'
import { GroupFile, GroupFileFolder } from '@renderer/function/model/file'
import { GroupSession, Session, UserSession } from '@renderer/function/model/session'
import { Member, User } from '@renderer/function/model/user'
import { runtimeData } from '@renderer/function/msg'
import { changeSession } from '@renderer/function/utils/msgUtil'
import { closePopBox, ensurePopBox, textPopBox } from '@renderer/function/utils/popBox'
import { copyToClipboard, delay, getTrueLang } from '@renderer/function/utils/systemUtil'
import { vSearch } from '@renderer/function/utils/vcmd'
import {
    markRaw,
    nextTick,
    shallowReactive,
    shallowRef,
    ShallowRef,
    watchEffect,
} from 'vue'

const { chat } = defineProps<{
    chat: Session
}>()
const emit = defineEmits<{
    close: []
}>()
const userInfo: ShallowRef<User | undefined> = (
    chat instanceof UserSession ? chat.useUserInfo() : shallowRef(undefined)
)
const anns: ShallowRef<Ann[]> = (
    chat instanceof GroupSession ? chat.useAnn() : shallowRef([])
)
const fileInfo: ShallowRef<(GroupFileFolder | GroupFile)[] | undefined> = (
    chat instanceof GroupSession ? chat.useFile() : shallowRef(undefined)
)

const userSearchInfo =  chat instanceof GroupSession ? shallowReactive({
    originList: chat.memberList,
    query: shallowReactive([] as Member[]),
    isSearch: false,
}) : undefined

const annSearchInfo =  chat instanceof GroupSession ? shallowReactive({
    originList: [] as Ann[],
    query: shallowReactive([] as Ann[]),
    isSearch: false,
}) : undefined

const fileSearchInfo =  chat instanceof GroupSession ? shallowReactive({
    originList: [] as (GroupFileFolder | GroupFile)[],
    query: shallowReactive([] as (GroupFileFolder | GroupFile)[]),
    isSearch: false,
}) : undefined

watchEffect(() => {
    if (!(chat instanceof GroupSession)) return
    fileSearchInfo!.originList = fileInfo.value ?? []
    annSearchInfo!.originList = anns.value ?? []
})

const configMember = shallowRef<Member | undefined>(undefined)
const configTitle = shallowRef<string>('')
const configCard = shallowRef<string>('')
const configBanMin = shallowRef<number>(0)

const trueLang = getTrueLang()

function $t(key: string, option: {[key: string]: string}={}) {
    return app.config.globalProperties.$t(key, option)
}

/**
 * 移出群聊
 */
async function removeUser(mem: Member) {
    const ensure = await ensurePopBox($t('真的要将 {user} 移出群聊吗', { user: mem.name }))

    if (!ensure) return

    if (!runtimeData.nowAdapter?.kickMember) {
        new PopInfo().add(PopType.INFO, $t('当前适配器不支持移除群成员'))
        return
    }

    await runtimeData.nowAdapter.kickMember(chat as GroupSession, mem)

    await checkSetMemInfoResult()
}

function copyText(text: string | number) {
    const popInfo = new PopInfo()
    copyToClipboard(String(text))
        .then(
            () => popInfo.add(PopType.INFO, $t('复制成功'))
        ).catch(
            () => popInfo.add(PopType.ERR, $t('复制失败'))
        )
}

async function banMember(mem: Member, banTime: number) {
    // TODO: 解除禁言
    if (banTime > 0) {
        const ensure = await ensurePopBox($t('确认禁言？'))

        if (!ensure) return

        closeChatInfoPan()

        if (!runtimeData.nowAdapter?.banMember) {
            new PopInfo().add(PopType.INFO, $t('当前适配器不支持禁言成员'))
            return
        }

        await runtimeData.nowAdapter.banMember(chat as GroupSession, mem, banTime * 60)
    }
}

async function updateMemberCard(mem: Member, newValue: string) {
    const ensure = await ensurePopBox($t('确认修改昵称？'))

    if (!ensure) return

    closeChatInfoPan()

    if (!runtimeData.nowAdapter?.setMemberCard) {
        new PopInfo().add(PopType.INFO, $t('当前适配器不支持修改群昵称'))
        return
    }
    await runtimeData.nowAdapter.setMemberCard(chat as GroupSession, mem, newValue)

    await checkSetMemInfoResult()
}

async function updateMemberTitle(mem: Member, value: string) {
    if (mem.title?.toString() === configTitle.value) return

    const ensure = await ensurePopBox($t('确认修改头衔？'))

    if (!ensure) return

    closeChatInfoPan()

    if (!runtimeData.nowAdapter?.setMemberTitle) {
        new PopInfo().add(PopType.INFO, $t('当前适配器不支持修改群头衔'))
        return
    }
    await runtimeData.nowAdapter.setMemberTitle(chat as GroupSession, mem, value)

    await checkSetMemInfoResult()
}

/**
 * 关闭面板
 */
function closeChatInfoPan() {
    configMember.value = undefined
    emit('close')
}

/**
 * 发起聊天
 */
function startChat(mem: Member) {
    // 如果是自己的话就忽略
    if (mem.user_id == runtimeData.loginInfo.uin) return

    // 检查这个人是不是好友
    let session: Session | undefined = mem?.user

    // 没了创建一个临时聊天
    if (!session)
        session = Session.getSession('temp', mem.user_id, chat.id)

    // 激活会话
    if (!session.activate) session.activate()
    // 切换到这个聊天
    nextTick(() => {
        changeSession(session)
    })
}

function openMoreConfig(mem: Member) {
    configMember.value = mem
    configCard.value = mem.card?.toString() ?? ''
    configTitle.value = mem.title?.toString() ?? ''
    configBanMin.value = Math.ceil((mem.banTime?.time ?? 0) / 1000 / 60)
}

function clickMember(mem: Member) {
    if(canEditMember(mem.role)) {
        openMoreConfig(mem)
    } else {
        copyText(mem.user_id)
    }
}

function canEditMember(role: string) {
    const me = (chat as GroupSession).getMe()
    return me.canAdmin(role as Role)
}

async function checkSetMemInfoResult() {
    const popId = textPopBox($t('正在确认操作……'), { title: $t('操作'), allowAutoClose: false })
    await delay(1000)
    await (chat as GroupSession).reloadUserList(false)
    closePopBox(popId)
}

defineExpose({
    openMoreConfig
})
</script>

<style scoped>
    .search-view {
        width: calc(100% - 20px);
        background: var(--color-card-1);
        border-radius: 7px;
        margin-bottom: 10px;
        padding: 0 10px;
        min-height: 35px;
        border: 0;
    }
</style>
