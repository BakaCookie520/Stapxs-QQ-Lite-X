import driver from '@renderer/function/driver'
import { GroupFile } from '@renderer/function/model/file'
import { Msg } from '@renderer/function/model/msg'
import { GroupSession, Session, UserSession } from '@renderer/function/model/session'
import { Member } from '@renderer/function/model/user'
import {
    AdapterInterface,
    AtAllSegData,
    AtSegData,
    BanEventData,
    BanLiftEventData,
    EssenceData,
    EssenceSeg,
    EventData,
    FaceSegData,
    FilesData,
    ForwardNodeData,
    ForwardSegData,
    FriendData,
    GroupAnnouncementData,
    GroupData,
    ImgSegData,
    ImplInfo,
    JoinEventData,
    JsonSegData,
    LeaveEventData,
    LoginInfo,
    MemberData,
    MfaceSegData,
    MsgData,
    MsgEventData,
    PokeEventData,
    RecallEventData,
    ReplySegData,
    ResponseEventData,
    SegData,
    SenderData,
    SessionData,
    TextSegData,
    UnknownSegData,
    UserData,
    VideoSegData,
    XmlSegData
} from '../interface'

import { Logger } from '@renderer/function/base'
import { handleEvent } from '@renderer/function/event'
import { Resource } from '@renderer/function/model/ressource'
import { AtAllSeg, AtSeg, FaceSeg, ForwardSeg, ImgSeg, JsonSeg, MfaceSeg, ReplySeg, Seg, TxtSeg, UnknownSeg, VideoSeg, XmlSeg } from '@renderer/function/model/seg'
import { queueWait } from '@renderer/function/utils/systemUtil'
import * as MilkyType from '@saltify/milky-types'
import {
    Event,
    IncomingForwardedMessage,
    IncomingMessage,
    IncomingSegment,
    OutgoingForwardedMessage,
    OutgoingSegment
} from '@saltify/milky-types'
import { Component } from 'vue'
import z from 'zod'
import * as ISeg from './incomeSeg'
import MkInfo from './MkInfo.vue'
import * as OSeg from './outgoingSeg'
import { $t, createSender, getGender, getRole } from './utils'


// 提取输出类型的工具类型
type ExtractMilkyTypes<T, suffix extends string> = {
    [K in keyof T]: K extends `${string}${suffix}`
    ? T[K] extends z.ZodType<infer U>
    ? U
    : never
    : never
}[keyof T]

// 从MilkyType中提取所有输出类型
type MilkyApiOutputTypes = ExtractMilkyTypes<typeof MilkyType, 'Output'>

// 动态创建API对象，支持包的变更
const createApiSchemas = <T extends Record<string, any>>(schemas: T) => {
    const result = {} as Record<string, any>

    for (const [key, schema] of Object.entries(schemas)) {
        if ((key.endsWith('Input') || key.endsWith('Output')) && schema && typeof schema.strict === 'function') {
            result[key] = schema.strict()
        }
    }

    return result as {
        [K in keyof T]: T[K]
    }
}

// 动态生成的API schemas
const Api = createApiSchemas(MilkyType)
interface MkOkResponse<T extends MilkyApiOutputTypes> {
    status: 'ok'
    retcode: 0
    data: T
}

interface MkErrorResponse {
    status: 'failed'
    retcode: number
    message: string
}

type MkResponse<T extends MilkyApiOutputTypes> = MkOkResponse<T> | MkErrorResponse

const logger = new Logger()

// 定义 API 装饰器：在方法外层包裹 try/catch，失败时返回 undefined
function api(
    _: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
) {
    const original = descriptor.value
    descriptor.value = async function (...args: any[]) {
        try {
            return await original.apply(this, args)
        } catch (err) {
            logger.error(err as Error, `[API ${propertyKey} 调用失败]:`)
            return undefined
        }
    }
}

export class MilkyAdapter implements AdapterInterface {
    readonly name = 'Milky'
    readonly version = '0.0.1'
    readonly protocol = 'mk'

    constructor() {
        this.init()
    }

    protected init() {
        this.segParsers['text'] = this.textParser.bind(this)
        this.segParsers['image'] = this.imageParser.bind(this)
        this.segParsers['face'] = this.faceParser.bind(this)
        this.segParsers['market_face'] = this.marketFaceParser.bind(this)
        this.segParsers['mention'] = this.mentionParser.bind(this)
        this.segParsers['mention_all'] = this.mentionAllParser.bind(this)
        this.segParsers['video'] = this.videoParser.bind(this)
        this.segParsers['forward'] = this.forwardParser.bind(this)
        this.segParsers['reply'] = this.replyParser.bind(this)
        // this.segParsers['poke'] = this.pokeParser.bind(this)
        this.segParsers['xml'] = this.xmlParser.bind(this)
        this.segParsers['light_app'] = this.lightAppParser.bind(this)

        this.segSerializer['text'] = this.textSerializer.bind(this)
        this.segSerializer['image'] = this.imageSerializer.bind(this)
        this.segSerializer['face'] = this.faceSerializer.bind(this)
        this.segSerializer['mface'] = this.mfaceSerializer.bind(this)
        this.segSerializer['at'] = this.atSerializer.bind(this)
        this.segSerializer['atall'] = this.atallSerializer.bind(this)
        this.segSerializer['video'] = this.videoSerializer.bind(this)
        this.segSerializer['forward'] = this.forwardSerializer.bind(this)
        this.segSerializer['reply'] = this.replySerializer.bind(this)
        // this.segSerializer['poke'] = this.pokeSerializer.bind(this)
        this.segSerializer['xml'] = this.xmlSerializer.bind(this)
        this.segSerializer['json'] = this.jsonSerializer.bind(this)

        this.eventProcessers['message_receive'] = this.messageReceiveEvent.bind(this)
        this.eventProcessers['group_member_increase'] = this.groupMemberIncreaseEvent.bind(this)
        this.eventProcessers['group_member_decrease'] = this.groupMemberDecreaseEvent.bind(this)
        this.eventProcessers['group_mute'] = this.groupBanEvent.bind(this)
        this.eventProcessers['message_recall'] = this.recallEvent.bind(this)
        this.eventProcessers['group_nudge'] = this.pokeEvent.bind(this)
        this.eventProcessers['group_message_reaction'] = this.groupMessageReaction.bind(this)
    }

    optInfo(): Component {
        return MkInfo
    }

    /**
     * 连接到协议段
     * @param url 协议层路径
     * @param ssl 是否使用 SSL
     * @param token 访问令牌
     * @returns 是否连接成功
     */
    async connect(
        url: string,
        ssl: boolean,
        token: string
    ): Promise<boolean> {
        driver.reset(url, ssl, token, 'event')
        driver.onMessage(this.handleEvent.bind(this))
        return await driver.open()
    }
    async close(): Promise<true | undefined> {
        await driver.close()
        return true
    }
    /**
     * 重定向到其他适配器
     */
    async redirect?(): Promise<AdapterInterface | undefined>

    /**
     * 获取当前适配器信息
     */
    async getAdapterInfo(): Promise<{[key: string]: string} | undefined> {
        return await this.getImplInfoRaw()
    }
    //#region == API ===============================================
    //#region  == 基础信息 =====================
    /**
     * 获取登陆基本信息
     * @return 返回登录信息(uin, 昵称)
     */
    @api
    async getLoginInfo(): Promise<LoginInfo | undefined> {
        const data = await this.callApi(
            'get_login_info',
            {},
            Api.GetLoginInfoOutput
        )
        return {
            uin: data.uin,
            nickname: data.nickname
        }
    }
    /**
     * 获取协议段信息
     */
    @api
    async getImplInfo(): Promise<ImplInfo> {
        const data = await this.getImplInfoRaw()
        return {
            name: data.impl_name,
            version: data.impl_version,
        }
    }
    @api
    async getImplInfoRaw(): Promise<z.infer<typeof Api.GetImplInfoOutput>> {
        const data = await this.callApi(
            'get_impl_info',
            {},
            Api.GetImplInfoOutput
        )
        return data
    }
    //#endregion

    //#region == 获取信息 ======================
    /**
     * 获取好友列表
     * @param useCache 是否使用缓存
     */
    @api
    async getFriendList(useCache: boolean = true): Promise<FriendData[] | undefined> {
        const data = await this.callApi(
            'get_friend_list',
            Api.GetFriendListInput.parse({ no_cache: !useCache }),
            Api.GetFriendListOutput
        )
        return data.friends.map(friend => ({
            user_id: friend.user_id,
            nickname: friend.nickname,
            remark: friend.remark === friend.nickname ? undefined : friend.remark,
            class_id: friend.category?.category_id ?? 495,
            class_name: friend.category?.category_name ?? '未分组的好友',
        }))
    }
    /**
     * 获取群组列表
     * @param useCache 是否使用缓存
     */
    @api
    async getGroupList(useCache: boolean = true): Promise<GroupData[] | undefined> {
        const data = await this.callApi(
            'get_group_list',
            Api.GetGroupListInput.parse({ no_cache: !useCache }),
            Api.GetGroupListOutput
        )
        return data.groups.map(group => ({
            group_id: group.group_id,
            group_name: group.group_name,
            member_count: group.member_count,
            max_member_count: group.max_member_count,
        }))
    }
    /**
     * 获取用户信息
     * @param userId 用户id
     * @param useCache 是否使用缓存
     */
    @api
    async getUserInfo(userId: number, _?: boolean): Promise<UserData | undefined> {
        const data = await this.callApi(
            'get_user_profile',
            Api.GetUserProfileInput.parse({ user_id: userId }),
            Api.GetUserProfileOutput
        )
        return {
            id: userId,
            remark: data.remark,
            nickname: data.nickname,
            longNick: data.bio,
            qid: data.qid,
            country: data.country,
            city: data.city,
            regTime: Date.now(),
            qqLevel: data.level ?? 0,
            age: data.age,
            sex: getGender(data.sex),
        }
    }
    /**
     * 获取群成员信息
     * @param group 群组会话
     * @param useCache 是否使用缓存
     */
    @api
    async getMemberList(group: GroupSession, useCache: boolean = true): Promise<MemberData[] | undefined>{
        const data = await this.callApi(
            'get_group_member_list',
            Api.GetGroupMemberListInput.parse({ group_id: group.id, no_cache: !useCache }),
            Api.GetGroupMemberListOutput
        )
        return data.members.map(member => ({
            age: 0,
            card: member.card === '' ? undefined : member.card,
            group_id: group.id,
            join_time: member.join_time,
            last_sent_time: member.last_sent_time,
            level: String(member.level),
            nickname: member.nickname,
            role: getRole(member.role),
            sex: getGender(member.sex),
            title: member.title,
            user_id: member.user_id,
            unfriendly: false,
            banTime: member.shut_up_end_time ?? undefined,
        }))
    }
    /**
     * 获取群公告信息
     * @param group
     */
    @api
    async getGroupAnnouncement(group: GroupSession): Promise<GroupAnnouncementData[]> {
        const data = await this.callApi(
            'get_group_announcements',
            Api.GetGroupAnnouncementsInput.parse({
                group_id: group.id,
            }),
            Api.GetGroupAnnouncementsOutput
        )
        return data.announcements.map(item => ({
            content: item.content ?? undefined,
            img: item.image_url ?? undefined,
            time: item.time,
            sender: item.user_id,
        }))
    }
    /**
     * 获取群精华消息
     * @param group
     * @todo TODO:加分页
     */
    @api
    async getGroupEssence(group: GroupSession): Promise<EssenceData[]> {
        const data = await this.callApi(
            'get_group_essence_messages',
            Api.GetGroupEssenceMessagesInput.parse({
                group_id: group.id,
                page_index: 0,
                page_size: 999,
            }),
            Api.GetGroupEssenceMessagesOutput
        )

        const out: Promise<EssenceData>[] = []
        for (const item of data.messages) {
            out.push((async () => ({
                sender: createSender(item.sender_id, item.sender_name),
                sender_time: item.message_time,
                operator: createSender(item.operator_id, item.operator_name),
                operator_time: item.operation_time,
                content: (await this.parseSeg(item.segments)) as EssenceSeg[],
            }))())
        }

        return await Promise.all(out)
    }
    /**
     * 获取用户自定义表情
     * @param userId
     */
    // @api
    async getCustomFace?(): Promise<string[] | undefined>
    /**
     * 获取资源url
     * @param id 资源id
     */
    @api
    async getResource(id: string): Promise<string|undefined> {
        const data = await this.callApi(
            'get_resource_temp_url',
            Api.GetResourceTempUrlInput.parse({ resource_id: id }),
            Api.GetResourceTempUrlOutput
        )
        return data.url
    }
    //#endregion

    //#region == 群聊相关 ======================
    /**
     * 设置群名称
     * @param group 群组
     * @param name 新名称
     */
    @api
    async setGroupName(group: GroupSession, name: string): Promise<true> {
        await this.callApi(
            'set_group_name',
            Api.SetGroupNameInput.parse({
                group_id: group.id,
                new_group_name: name,
            })
        )
        return true
    }
    /**
     * 为群成员设置新的群内名称
     * @param group 群组
     * @param mem 群成员
     * @param card 新名称
     */
    @api
    async setMemberCard(group: GroupSession, mem: Member, card: string): Promise<true> {
        await this.callApi(
            'set_group_member_card',
            Api.SetGroupMemberCardInput.parse({
                group_id: group.id,
                user_id: mem.user_id,
                card: card,
            })
        )
        return true
    }
    /**
     * 为群成员设置头衔,头衔为''或者没有时表示清除头衔
     * @param group
     * @param mem
     * @param title
     */
    @api
    async setMemberTitle(group: GroupSession, mem: Member, title: string): Promise<true> {
        await this.callApi(
            'set_group_member_special_title',
            Api.SetGroupMemberSpecialTitleInput.parse({
                group_id: group.id,
                user_id: mem.user_id,
                special_title: title,
            })
        )
        return true
    }
    /**
     * 群禁言
     * @param group 群组
     * @param mem 被禁言的成员
     * @param time 禁言时间
     */
    @api
    async banMember(group: GroupSession, mem: Member, time: number): Promise<true> {
        await this.callApi(
            'set_group_member_mute',
            Api.SetGroupMemberMuteInput.parse({
                group_id: group.id,
                user_id: mem.user_id,
                duration: time,
            })
        )
        return true
    }
    /**
     * 踢出群成员
     * @param group 群组
     * @param mem 群成员
     */
    @api
    async kickMember(group: GroupSession, mem: Member): Promise<true> {
        await this.callApi(
            'kick_group_member',
            Api.KickGroupMemberInput.parse({
                group_id: group.id,
                user_id: mem.user_id,
                reject_add_request: false,
            })
        )
        return true
    }
    /**
     * 退出群组
     * @param group 群组
     */
    @api
    async leaveGroup(group: GroupSession): Promise<true> {
        await this.callApi(
            'quit_group',
            Api.QuitGroupInput.parse({
                group_id: group.id,
            })
        )
        return true
    }
    //#endregion

    //#region == 消息相关 ======================
    /**
     * 设置已读消息
     * @param session 目标会话
     * @param msg 目标消息
     */
    @api
    async setMsgReaded(session: Session, msg: Msg): Promise<true> {
        await this.callApi(
            'mark_message_as_read',
            Api.MarkMessageAsReadInput.parse({
                message_scene: this.getScene(session.type),
                peer_id: session.id,
                message_seq: Number(msg.message_id)
            })
        )

        return true
    }
    /**
     * 获取消息
     * @param session 会话
     * @param msgId 消息id
     */
    @api
    async getMsg(session: Session, msgId: string): Promise<MsgData | undefined> {
        const data = await this.callApi(
            'get_message',
            Api.GetMessageInput.parse({
                message_scene: this.getScene(session.type),
                peer_id: session.id,
                message_seq: Number(msgId)
            }),
            Api.GetMessageOutput
        )
        return this.parseMsg(data.message)
    }
    /**
     * 获取消息历史
     * @param session 会话
     * @param count 获取消息数量
     * @param start 起始消息
     */
    @api
    async getHistoryMsg(session: Session, count: number, start?: Msg): Promise<MsgData[]> {
        let out: IncomingMessage[] = []
        let startId: number | undefined = start?.message_id ? Number(start.message_id) : undefined

        while (out.length < count) {
            // 拉消息
            const data = await this._getHistoryMsg(
                session,
                startId,
                count - out.length,
            )
            if (!data || data.messages.length === 0) break

            // 保存头部消息
            startId = data.next_message_seq ?? data.messages.at(0)?.message_seq
            if (!startId) break

            out = [...data.messages, ...out]
        }
        return await Promise.all(out.map(item => this.parseMsg(item)))
    }
    /**
     * 发送消息
     * @param session 目标会话
     * @param msg 消息内容
     */
    @api
    async sendMsg(msg: Msg): Promise<string> {
        let data: z.infer<typeof Api.SendGroupMessageOutput> | z.infer<typeof Api.SendPrivateMessageOutput>
        if (msg.session?.type === 'group') {
            data = await this.callApi(
                'send_group_message',
                Api.SendGroupMessageInput.parse({
                    group_id: msg.session.id,
                    message: await this.serializeMsg(msg),
                }),
                Api.SendGroupMessageOutput
            )
        }else if (msg.session?.type === 'user') {
            data = await this.callApi(
                'send_private_message',
                Api.SendPrivateMessageInput.parse({
                    user_id: msg.session.id,
                    message: await this.serializeMsg(msg),
                }),
                Api.SendPrivateMessageOutput
            )
        } else {
            throw new Error('milky 不支持发送临时会话消息')
        }

        if (data.message_seq <= 0) throw new Error('发送消息失败')

        return data.message_seq.toString()
    }
    /**
     * 撤回消息
     * @param msg 要撤回的消息
     */
    @api
    async recallMsg(msg: Msg): Promise<true> {
        if (msg.session?.type === 'group') {
            await this.callApi(
                'recall_group_message',
                Api.RecallGroupMessageInput.parse({
                    group_id: msg.session.id,
                    message_seq: Number(msg.message_id),
                }),
            )
        }else if (msg.session?.type === 'user') {
            await this.callApi(
                'recall_private_message',
                Api.RecallPrivateMessageInput.parse({
                    user_id: msg.session.id,
                    message_seq: Number(msg.message_id),
                })
            )
        }else {
            throw new Error('milky 不支持撤回临时会话消息')
        }
        return true
    }
    /**
     * 群聊发送戳一戳
     * @param session 当前会话
     * @param target 目标成员
     */
    @api
    async sendGroupPoke(session: GroupSession, target: Member): Promise<true> {
        await this.callApi(
            'send_group_nudge',
            Api.SendGroupNudgeInput.parse({
                group_id: session.id,
                user_id: target.user_id,
            })
        )
        return true
    }
    /**
     * 私聊发送戳一戳
     * @param session
     */
    @api
    async sendPrivatePoke(session: UserSession): Promise<true> {
        await this.callApi(
            'send_friend_nudge',
            Api.SendFriendNudgeInput.parse({
                user_id: session.id,
            })
        )
        return true
    }
    /**
     * 设置消息表情响应
     * @param msg 要设置表情的消息
     * @param emojiId 表情ID
     * @param add 是否添加表情,如果为false则表示删除表情
     * @returns 返回是否成功
     */
    @api
    async setResponse(msg: Msg, emojiId: string, add?: boolean): Promise<true> {
        await this.callApi(
            'send_group_message_reaction',
            Api.SendGroupMessageReactionInput.parse({
                group_id: msg.session!.id,
                message_seq: Number(msg.message_id),
                reaction: emojiId,
                is_add: add,
            })
        )

        return true
    }
    /**
     * 获取合并转发内容
     * @param id
     * @returns
     */
    @api
    async getForwardMsg(id: string): Promise<ForwardNodeData[]> {
        const data = await this.callApi(
            'get_forwarded_messages',
            Api.GetForwardedMessagesInput.parse({ forward_id: id }),
            Api.GetForwardedMessagesOutput
        )
        return Promise.all(data.messages.map(node => this.nodeParser(node)))
    }
    //#endregion

    //#region == 文件相关 ======================
    /**
     * 获取群文件根目录
     * @param group 群组会话
     */
    @api
    async getGroupFile(group: GroupSession): Promise<FilesData>{
        const data = await this.callApi(
            'get_group_files',
            Api.GetGroupFilesInput.parse({
                group_id: group.id,
            }),
            Api.GetGroupFilesOutput
        )
        return this.parseFiles(data)
    }
    /**
     * 获取群文件夹内容
     * PS: 文件夹对象塞GroupSession不知道为啥会报循环错误,所以用的是groupId
     * @param groupId 群组id
     * @param folderId 文件夹id
     */
    @api
    async getGroupFolderFile(group: GroupSession, folderId: string): Promise<FilesData> {
        const data = await this.callApi(
            'get_group_files',
            Api.GetGroupFilesInput.parse({
                group_id: group.id,
                parent_folder_id: folderId,
            }),
            Api.GetGroupFilesOutput
        )
        return this.parseFiles(data)
    }
    /**
     * 获取文件下载连接
     * @param file 要下载的文件
     */
    @api
    async getGroupFileUrl(file: GroupFile): Promise<string>{
        const data = await this.callApi(
            'get_group_file_download_url',
            Api.GetGroupFileDownloadUrlInput.parse({
                group_id: file.group.id,
                file_id: file.id
            }),
            Api.GetGroupFileDownloadUrlOutput
        )

        return data.download_url
    }
    //#endregion
    //#region == 个人信息 ======================
    /**
     * 设置昵称
     * @param nickname 新昵称
     */
    // @api
    setNickname?(nickname: string): Promise<true | undefined>
    /**
     * 设置个性签名
     * @param sign 新签名
     */
    // @api
    setSign?(sign: string): Promise<true | undefined>
    //#endregion
    //#endregion

    //#region == 消息相关 ===========================================
    /**
     * 解析消息
     * @param data 收到的消息
     * @returns 标准消息数据
     */
    async parseMsg(data: IncomingMessage): Promise<MsgData> {
        const message = await this.parseSeg(data.segments)

        // 组装发送者信息
        let sender: SenderData
        switch (data.message_scene) {
            case 'friend':
                sender = {
                    id: data.sender_id,
                    nickname: data.friend.nickname,
                    sex: getGender(data.friend.sex),
                }
                break
            case 'group':
                sender = {
                    id: data.sender_id,
                    nickname: data.group_member.nickname,
                    sex: getGender(data.group_member.sex),
                }
                break
            case 'temp':
                sender = createSender(data.sender_id)
                break
        }

        return {
            message_id: data.message_seq.toString(),
            session: this.parseSession(data),
            sender: sender,
            time: data.time,
            message: message,
            isDelete: this.isDelete(data),
        }
    }
    /**
     * 分析收到消息的会话
     * @param data 收到的消息
     * @returns 会话数据
     */
    parseSession(data: IncomingMessage): SessionData {
        // 组装会话信息
        switch (data.message_scene) {
            case 'friend':
                return {
                    id: data.peer_id,
                    type: 'user',
                }
            case 'group':
                return {
                    id: data.peer_id,
                    type: 'group',
                }
            case 'temp':
                return {
                    id: data.peer_id,
                    group_id: data.group?.group_id,
                    type: 'temp',
                }
        }
    }
    /**
     * 序列化消息
     * @param msg 消息
     * @returns 发送消息数据
     */
    async serializeMsg(msg: Msg): Promise<OutgoingSegment[]> {
        return await Promise.all(msg.message.map(seg => this.serializeSeg(seg)))
    }
    //#region == 反序列化 ===========================
    segParsers: Record<string, ((data: any)=>Promise<SegData>)> = {}
    async parseSeg(data: IncomingSegment): Promise<SegData>
    async parseSeg(data: IncomingSegment[]): Promise<SegData[]>
    async parseSeg(data: IncomingSegment | IncomingSegment[]): Promise<SegData | SegData[]> {
        if (Array.isArray(data)) {
            return await Promise.all(data.map(d => this.parseSeg(d)))
        } else {
            try {
                const parser = this.segParsers[data.type]
                if (parser) return await parser(data)
                return this.unknownParser(data)
            } catch (err) {
                logger.error(err as Error, '消息段解析失败:' + JSON.stringify(data))
                return {type: 'error'}
            }
        }
    }
    async textParser(data: ISeg.TextSeg): Promise<TextSegData> {
        return {
            type: 'text',
            text: data.data.text
        }
    }
    async imageParser(data: ISeg.ImageSeg): Promise<ImgSegData> {
        return {
            type: 'image',
            url: Resource.fromUrl(data.data.temp_url, data.data.resource_id),
            isFace: data.data.sub_type === 'sticker',
        }
    }
    async marketFaceParser(data: ISeg.MarketFaceSeg): Promise<MfaceSegData> {
        // TODO: summary 有问题
        return {
            type: 'mface',
            url: data.data.url,
            summary: '[动画表情]',
            packageId: 0,
            id: '',
            key: '',
        }
    }
    async faceParser(data: ISeg.FaceSeg): Promise<FaceSegData> {
        return {
            type: 'face',
            id: Number(data.data.face_id),
        }
    }
    async mentionParser(data: ISeg.MentionSeg): Promise<AtSegData> {
        return {
            type: 'at',
            user_id: data.data.user_id,
        }
    }
    async mentionAllParser(_: ISeg.MentionAllSeg): Promise<AtAllSegData> {
        return {
            type: 'atall',
        }
    }
    async videoParser(data: ISeg.VideoSeg): Promise<VideoSegData> {
        return {
            type: 'video',
            file: $t('[视频]'),
            url: Resource.fromUrl(data.data.temp_url, data.data.resource_id),
        }
    }
    async forwardParser(data: ISeg.ForwardSeg): Promise<ForwardSegData> {
        const id: string = data.data.forward_id
        const nodes = await this.getForwardMsg(id)
        if (!nodes) throw new Error('获取合并转发消息失败')
        return {
            type: 'forward',
            id,
            content: nodes,
        }
    }
    async replyParser(data: ISeg.ReplySeg): Promise<ReplySegData> {
        return {
            type: 'reply',
            id: data.data.message_seq.toString(),
        }
    }
    async mfaceParser(data: ISeg.MarketFaceSeg): Promise<MfaceSegData> {
        return {
            type: 'mface',
            url: data.data.url,
            summary: '[动画表情]',
            packageId: 0,
            id: '',
            key: '',
        }
    }
    // async fileParser(data: ISe): Promise<FileSegData> {
    //     return {
    //         type: 'file',
    //         name: data.data.file_name,
    //         size: 0,
    //         url: data.data.url,
    //         file_id: data.data.file_id,
    //     }
    // }
    // async pokeParser(_: ObPokeSeg): Promise<PokeSegData> {
    //     return { type: 'poke' }
    // }
    async xmlParser(data: ISeg.XmlSeg): Promise<XmlSegData> {
        return {
            type: 'xml',
            data: data.data.xml_payload,
            id: data.data.service_id.toString(),
        }
    }
    async lightAppParser(data: ISeg.LightAppSeg): Promise<JsonSegData> {
        return {
            type: 'json',
            data: data.data.json_payload,
            id: data.data.app_name,
        }
    }

    unknownParser(data: IncomingSegment): UnknownSegData {
        return {
            type: 'unknown',
            segType: data.type,
            data: data
        }
    }
    async nodeParser(data: IncomingForwardedMessage): Promise<ForwardNodeData> {
        return {
            sender: {
                nickname: data.sender_name,
                face: data.avatar_url,
            },
            content: await this.parseSeg(data.segments),
        }
    }
    //#endregion

    //#region == 序列化 =============================
    segSerializer: Record<string, ((data: any) => Promise<OutgoingSegment>)> = {}
    async serializeSeg(seg: Seg): Promise<OutgoingSegment>
    async serializeSeg(seg: Seg[]): Promise<OutgoingSegment[]>
    async serializeSeg(seg: Seg | Seg[]): Promise<OutgoingSegment | OutgoingSegment[]> {
        if (Array.isArray(seg)) {
            return Promise.all(seg.map(d => this.serializeSeg(d)))
        } else {
            const serializer = this.segSerializer[seg.type]
            if (serializer) return await serializer(seg)
            return this.unmatchSerializer(seg)
        }
    }
    async textSerializer(seg: TxtSeg): Promise<OSeg.TextSeg> {
        return {
            type: 'text',
            data: {
                text: seg.text
            }
        }
    }
    async imageSerializer(seg: ImgSeg): Promise<OSeg.ImageSeg> {
        return {
            type: 'image',
            data: {
                uri: seg.rawUrl,
                sub_type: seg.isFace ? 'sticker' : 'normal',
            }
        }
    }
    async faceSerializer(seg: FaceSeg): Promise<OSeg.FaceSeg> {
        return {
            type: 'face',
            data: {
                face_id: seg.id.toString(),
            },
        }
    }
    async atSerializer(seg: AtSeg): Promise<OSeg.MentionSeg> {
        return {
            type: 'mention',
            data: {
                user_id: seg.user_id,
            },
        }
    }
    async atallSerializer(_: AtAllSeg): Promise<OSeg.MentionAllSeg> {
        return {
            type: 'mention_all',
            data: {}
        }
    }
    async videoSerializer(seg: VideoSeg): Promise<OSeg.VideoSeg> {
        return {
            type: 'video',
            data: {
                uri: seg.rawUrl,
            },
        }
    }
    async forwardSerializer(seg: ForwardSeg): Promise<OSeg.ForwardSeg> {
        const msgs = seg.content
        const messagesList = await Promise.all(msgs.map(msg => this.serializeMsg(msg)))
        const out: OSeg.ForwardSeg = {
            type: 'forward',
            data: {
                messages: [],
            }
        }
        for (let i = 0; i < messagesList.length; i++) {
            out.data.messages.push({
                user_id: msgs[i].sender.user_id,
                sender_name: msgs[i].sender.name,
                segments: messagesList[i],
            })
        }

        return out
    }
    async replySerializer(seg: ReplySeg): Promise<OSeg.ReplySeg> {
        return {
            type: 'reply',
            data: {
                message_seq: Number(seg.id),
            }
        }
    }
    async mfaceSerializer(data: MfaceSeg): Promise<OSeg.ImageSeg> {
        return {
            type: 'image',
            data: {
                'uri': data.rawUrl,
                'sub_type': 'sticker',
                'summary': data.summary,
            }
        }
    }
    // async pokeSerializer(_: PokeSeg): Promise<ObPokeSeg> {
    //     return {
    //         type: 'poke',
    //         data: {
    //             type: '1',
    //             id: '-1',
    //         }
    //     }
    // }
    async xmlSerializer(_: XmlSeg): Promise<OSeg.XmlSeg> {
        throw new Error('不支持发送xml消息')
    }
    async jsonSerializer(_: JsonSeg): Promise<OSeg.LightAppSeg> {
        throw new Error('不支持发送json消息')
    }
    async unknownSerializer(seg: UnknownSeg): Promise<OutgoingSegment> {
        return seg.data as OutgoingSegment
    }

    async nodeSerializer(msg: Msg): Promise<OutgoingForwardedMessage> {
        return {
                sender_name: msg.sender.name,
                user_id: msg.sender.user_id,
                segments: await this.serializeSeg(msg.message),
        }
    }
    unmatchSerializer(seg: Seg): OutgoingSegment {
        const data = {}
        for (const key in seg) {
            if (key === 'type') continue
            data[key] = seg[key]
        }
        return {
            type: seg.type as any,
            data: data
        }
    }

    /**
     * 序列化构造合并转发
     * @param seg
     * @returns
     */
    async customForwardSerializer(seg: ForwardSeg): Promise<OSeg.ForwardSeg[]> {
        const msgs = seg.content
        const messagesList = await Promise.all(msgs.map(msg => this.serializeMsg(msg)))
        const out: OSeg.ForwardSeg = {
            type: 'forward',
            data: {
                messages: [],
            }
        }
        for (let i = 0; i < messagesList.length; i++) {
            out.data.messages.push({
                user_id: msgs[i].sender.user_id,
                sender_name: msgs[i].sender.name,
                segments: messagesList[i],
            })
        }
        return [out]
    }
    //#endregion
    //#endregion

    //#region == 事件处理 ===========================================
    eventProcessers: Record<Event['event_type'], (event: Event, data: any) => Promise<EventData | undefined>> = {} as any
    async messageReceiveEvent(
        event: Event,
        data: IncomingMessage
    ): Promise<MsgEventData> {
        const process = async (data: IncomingMessage) => {
            const msgData = await this.parseMsg(data)
            const out: MsgEventData = {
                type: 'msg',
                message: msgData,
                message_id: msgData.message_id!,
                session: msgData.session,
                time: event.time,
            }
            return out
        }
        return await queueWait(process(data), `${data.message_scene}-${data.peer_id}`)
    }
    async groupMemberIncreaseEvent(
        event: Event,
        data: MilkyType.GroupMemberIncreaseEvent
    ): Promise<JoinEventData> {
        return {
            type: 'join',
            session: {
                id: data.group_id,
                type: 'group',
            },
            user: createSender(data.user_id),
            operator: data.operator_id ? createSender(data.operator_id) : undefined,
            invitor: data.invitor_id ? createSender(data.invitor_id) : undefined,
            time: event.time,
        }
    }
    async groupMemberDecreaseEvent(
        event: Event,
        data: MilkyType.GroupMemberDecreaseEvent
    ): Promise<LeaveEventData> {
        return {
            type: 'leave',
            session: {
                id: data.group_id,
                type: 'group',
            },
            user: createSender(data.user_id),
            operator: createSender(data.operator_id ?? data.user_id),
            time: event.time,
        }
    }
    async groupBanEvent(
        event: Event,
        data: MilkyType.GroupMuteEvent
    ): Promise<BanEventData|BanLiftEventData> {
        if (data.duration > 0) {
            return {
                type: 'ban',
                session: {
                    id: data.group_id,
                    type: 'group',
                },
                user: createSender(data.user_id),
                operator: createSender(data.operator_id),
                duration: data.duration,
                time: event.time,
            }
        }else {
            return {
                type: 'banLift',
                session: {
                    id: data.group_id,
                    type: 'group',
                },
                user: createSender(data.user_id),
                operator: createSender(data.operator_id),
                time: event.time,
            }
        }
    }
    async recallEvent (
        event: Event,
        data: MilkyType.MessageRecallEvent
    ): Promise<RecallEventData> {
        return {
            type: 'recall',
            session: {
                id: data.peer_id,
                type: this.parseScene(data.message_scene),
            },
            user: createSender(data.sender_id),
            operator: createSender(data.operator_id),
            recallId: data.message_seq.toString(),
            time: event.time,
            suffix: data.display_suffix ?? '',
        }
    }
    async pokeEvent(
        event: Event,
        data: MilkyType.GroupNudgeEvent
    ): Promise<PokeEventData> {
        return {
            type: 'poke',
            session: {
                id: data.group_id,
                type: 'group',
            },
            sender: createSender(data.sender_id),
            target: createSender(data.receiver_id),
            action: data.display_action ?? '戳了戳',
            suffix: data.display_suffix ?? '',
            ico: data.display_action_img_url ?? 'https://tianquan.gtimg.cn/nudgeaction/item/0/expression.jpg',
            time: event.time,
        }
    }
    async groupMessageReaction(
        event: Event,
        data: MilkyType.GroupMessageReactionEvent
    ): Promise<ResponseEventData> {
        return {
            type: 'response',
            session: {
                id: data.group_id,
                type: 'group',
            },
            operator: createSender(data.user_id),
            message_id: data.message_seq.toString(),
            emojiId: data.face_id,
            add: data.is_add,
            time: event.time,
        }
    }

    async handleEvent(json: string): Promise<void> {
        const data = Event.parse(JSON.parse(json))
        const processor = this.eventProcessers[data.event_type]
        if (!processor) return
        const eventData = await processor(data, data.data)
        if (!eventData) return
        handleEvent(eventData)
    }
    //#endregion

    //#region == 私有工具 ===========================================
    protected async callApi(apiName: string, args: object): Promise<void>
    protected async callApi<T extends MilkyApiOutputTypes>(apiName: string, args: object, type: z.ZodType<T>): Promise<T>
    protected async callApi<T extends MilkyApiOutputTypes>(apiName: string, args: object, type?: z.ZodType<T>): Promise<T | void> {
        const json = await driver.post(`api/${apiName}`, args)
        if (!json) throw new Error('未与协议段连接')
        const data = JSON.parse(json) as MkResponse<T>
        if (data.status === 'ok') {
            if (type)
                return type.parse(data.data)
            return
        }

        throw new Error(`API调用失败: ${data.message} (retcode: ${data.retcode})`)
    }
    @api
    protected async _getHistoryMsg(session: Session, startId: number | undefined, limit: number): Promise<z.infer<typeof Api.GetHistoryMessagesOutput>> {
        const data = await this.callApi(
            'get_history_messages',
            Api.GetHistoryMessagesInput.parse({
                message_scene: this.getScene(session.type),
                peer_id: session.id,
                start_message_seq: startId,
                limit: limit,
            }),
            Api.GetHistoryMessagesOutput
        )
        if (data.messages.at(-1)?.message_seq === startId)
            data.messages.pop() // 移除起始消息
        return data
    }
    protected getScene(type: 'user' | 'group' | 'temp'): 'friend' | 'group' | 'temp' {
        switch (type) {
            case 'user': return 'friend'
            case 'group': return 'group'
            case 'temp': return 'temp'
        }
    }
    protected parseScene(type: 'group' | 'temp' | 'friend'): 'user' | 'group' | 'temp' {
        switch (type) {
            case 'friend': return 'user'
            case 'group': return 'group'
            case 'temp': return 'temp'
        }
    }
    protected parseFiles(data: z.infer<typeof Api.GetGroupFilesOutput>): FilesData {
        return {
            files: data.files.map(file => ({
                file_id: file.file_id,
                file_name: file.file_name,
                size: file.file_size,
                download_times: file.downloaded_times,
                dead_time: file.expire_time ?? undefined,
                upload_time: file.uploaded_time,
                uploader_id: file.uploader_id,
            })),
            folders: data.folders.map(folder => ({
                folder_id: folder.folder_id,
                folder_name: folder.folder_name,
                count: folder.file_count,
                create_time: folder.created_time,
                creater_id: folder.creator_id,
            })),
        }
    }
    protected isDelete(msg: IncomingMessage): boolean {
        return msg.sender_id === 0
    }
    //#endregion
}

export default new MilkyAdapter()
