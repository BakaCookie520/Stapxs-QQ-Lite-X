import { GroupFile } from '@renderer/function/model/file'
import { Msg } from '@renderer/function/model/msg'
import { Resource } from '@renderer/function/model/ressource'
import { FileSeg, ForwardSeg, ImgSeg, MdSeg, MfaceSeg } from '@renderer/function/model/seg'
import { GroupSession, Session, UserSession } from '@renderer/function/model/session'
import { Member } from '@renderer/function/model/user'
import { runtimeData } from '@renderer/function/msg'
import { EssenceData, EssenceSeg, FilesData, FileSegData, ForwardNodeData, ForwardSegData, FriendData, GroupAnnouncementData, ImgSegData, ImplInfo, JsonSegData, MdSegData, MsgData, PokeEventData, ResponseEventData, UserData } from '../interface'
import { api, OneBotAdapter } from './adapter'
import { NcForwardData, NcObFetchCustomFace, NcObFileSeg, NcObForwardSeg, NcObGetEssenceMsgList, NcObGetFileUrl, NcObGetForwardMsg, NcObGetFriendsWithCategory, NcObGetGroupFile, NcObGetGroupNotices, NcObGetHistoryMsg, NcObGetStrangerInfo, NcObGroupMsgEmojiLikeEvent, NcObImgSeg, NcObMdSeg, NcObMfaceSeg, NcObPokeEvent, ObForwardNodeSeg, ObForwardSeg, ObGetVersionInfo, ObJsonSeg, ObMsg, ObSendMsg } from './type'
import { createSender, getGender, ObConnector } from './utils'

export default class NapCapOneBot extends OneBotAdapter {
    override name = 'NapCap OneBot'
    override version = '0.0.1'
    constructor(connector: ObConnector, botInfo?: ObGetVersionInfo) {
        super()
        this.connector = connector
        this.botInfo.value = botInfo
        connector.setOnMessageHook(this.onmessage.bind(this))
    }

    static match(implInfo: ImplInfo): boolean {
        return implInfo.name === 'NapCat.Onebot'
    }

    protected override init(): void {
        super.init()
        this.segParsers['markdown'] = this.mdParser.bind(this)
        this.segParsers['file'] = this.fileParser.bind(this)

        this.segSerializer['markdown'] = this.mdSerializer.bind(this)
        this.segSerializer['mface'] = this.mfaceSerializer.bind(this)
        this.segSerializer['file'] = this.fileSerializer.bind(this)

        this.noticeEventProcessers['group_msg_emoji_like'] = this.groupMsgEmojiLikeEvent.bind(this)
    }

    //#region == API ===============================================
    //#region == 获取信息 ======================
    @api
    override async getFriendList(_?: boolean): Promise<FriendData[]> {
        const data: NcObGetFriendsWithCategory = await this.connector.send('get_friends_with_category', {})
        const out: FriendData[] = []
        for (const category of data.data) {
            for (const friend of category.buddyList) {
                out.push({
                    user_id: friend.user_id,
                    nickname: friend.nickname,
                    remark: friend.remark,
                    class_id: category.categoryId,
                    class_name: category.categoryName,
                })
            }
        }
        return out
    }
    @api
    override async getUserInfo(userId: number, _?: boolean): Promise<UserData> {
        // 获取用户信息
        const data: NcObGetStrangerInfo = await this.connector.send('get_stranger_info', {
            user_id: userId,
        })
        const user = data.data
        if (!this.friendListCache) await this.getFriendList()
        return {
            id: userId,
            remark: user.remark === '' ? undefined : user.remark,
            nickname: user.nickname,
            longNick: user.long_nick === '' ? undefined : user.long_nick,
            qid: user.qid,
            country: user.country === '' ? undefined : user.country,
            province: user.province === '' ? undefined : user.province,
            city: user.city === '' ? undefined : user.city,
            regTime: user.reg_time,
            qqLevel: user.qqLevel,
            birthday_year: user.birthday_year === 0 ? undefined : user.birthday_year,
            birthday_month: user.birthday_month === 0 ? undefined : user.birthday_month,
            birthday_day: user.birthday_day === 0 ? undefined : user.birthday_day,
            age: user.age,
            sex: getGender(user.sex),
        }
    }
    /**
     * 获取群公告信息
     * @param group
     */
    @api
    async getGroupAnnouncement(group: GroupSession): Promise<GroupAnnouncementData[]> {
        // 获取群公告信息
        const data: NcObGetGroupNotices = await this.connector.send('_get_group_notice', { group_id: group.id })

        const out = data.data.map(item => ({
            content: item.message.text,
            img_id: item.message.image.at(0)?.id,
            time: item.publish_time,
            sender: item.sender_id,
        }))
        return out
    }
    @api
    async getGroupEssence(group: GroupSession): Promise<EssenceData[]> {
        const data: NcObGetEssenceMsgList = await this.connector.send('get_essence_msg_list', { group_id: group.id })

        const out: Promise<EssenceData>[] = []
        for (const item of data.data) {
            out.push((async () => ({
                sender: createSender(item.sender_id, item.sender_nick),
                sender_time: item.operator_time,
                operator: createSender(item.operator_id, item.operator_nick),
                operator_time: item.operator_time,
                content: (await this.parseSeg(item.content)) as EssenceSeg[]
            }))())
        }

        return await Promise.all(out)
    }
    @api
    async getCustomFace(): Promise<string[] | undefined> {
        const data: NcObFetchCustomFace = await this.connector.send('fetch_custom_face', {count: 500})

        return data.data
    }
    //#endregion
    //#region == 消息相关 ======================
    @api
    override async sendMsg(msg: Msg): Promise<string> {
        if (!this.isForward(msg)) return await super.sendMsg(msg)

        // 合并转发
        const message = await this.forwardSegSerializer(msg.message[0] as ForwardSeg)
        let data: ObSendMsg
        if (msg.session instanceof UserSession) {
            data = await this.connector.send('send_private_forward_msg', {
                user_id: msg.session.id,
                messages: message,
            })
        } else if (msg.session instanceof GroupSession) {
            data = await this.connector.send('send_group_forward_msg', {
                group_id: msg.session.id,
                messages: message,
            })
        } else {
            throw new Error('OneBot 不支持发送临时会话消息')
        }
        if (!data.data.message_id) throw new Error('发送消息失败，返回值无message_id')

        return data.data.message_id.toString()
    }

    @api
    async getHistoryMsg(session: Session, count: number, start?: Msg): Promise<MsgData[] | undefined> {
        let type: 'user' | 'group'

        if (session instanceof UserSession)
            type = 'user'
        else if (session instanceof GroupSession)
            type = 'group'
        else
            throw new Error('NapCat不支持临时会话')

        let data: NcObGetHistoryMsg

        if (type === 'user') {
            data = await this.connector.send('get_friend_msg_history', {
                user_id: session.id.toString(),
                count: count + 1,
                message_seq: start?.message_id,
                reverseOrder: true,
            })
        } else {
            data = await this.connector.send('get_group_msg_history', {
                group_id: session.id.toString(),
                count: count + 1,
                message_seq: start?.message_id,
                reverseOrder: true,
            })
        }

        if (start) data.data.messages.pop() // 去掉第一条，避免重复

        const out: Promise<MsgData>[] = data.data.messages.map(msg => this.parseMsg(msg))

        return await Promise.all(out)
    }
    @api
    async sendGroupPoke(session: GroupSession, target: Member): Promise<true | undefined> {
        await this.connector.send('send_poke', {
            group_id: session.id,
            user_id: target.user_id,
        })
        return true
    }
    @api
    async sendPrivatePoke(session: UserSession): Promise<true | undefined> {
        await this.connector.send('send_poke', {
            user_id: session.id,
        })
        return true
    }
    @api
    async setResponse(msg: Msg, emojiId: string, add?: boolean): Promise<true | undefined> {
        await this.connector.send('set_msg_emoji_like', {
            message_id: msg.message_id,
            emoji_id: emojiId,
            set: add, // 默认为添加表情
        })
        return true
    }
    @api
    override async getForwardMsg(forwardId: string): Promise<ForwardNodeData[]> {
        const { data }: NcObGetForwardMsg = await this.connector.send('get_forward_msg', {
            id: forwardId,
        })
        return await Promise.all(data.messages.map(node => this.ncNodeParser(node)))
    }
    //#endregion
    //#region == 群聊相关 ======================
    @api
    async setGroupName(group: GroupSession, name: string): Promise<true> {
        await this.connector.send('set_group_name', {
            group_id: group.id,
            group_name: name,
        })
        return true
    }
    @api
    async leaveGroup(group: GroupSession): Promise<true> {
        await this.connector.send('set_group_leave', { group_id: group.id })
        return true
    }
    //#endregion
    //#region == 文件相关 ======================
    @api
    async getGroupFile?(group: GroupSession): Promise<FilesData> {
        const data: NcObGetGroupFile = await this.connector.send('get_group_root_files', {
            group_id: group.id,
            file_count: 1000
        })
        return this.parseFileData(data)
    }

    @api
    async getGroupFolderFile(group: GroupSession, folderId: string): Promise<FilesData | undefined> {
        const data: NcObGetGroupFile = await this.connector.send('get_group_files_by_folder', {
            group_id: group.id,
            folder_id: folderId,
            file_count: 1000
        })
        return this.parseFileData(data)
    }

    @api
    async getGroupFileUrl(file: GroupFile): Promise<string | undefined> {
        const data: NcObGetFileUrl = await this.connector.send('get_group_file_url', {
            group_id: file.group.id,
            file_id: file.id,
        })

        return data.data.url
    }
    //#endregion
    //#region == 个人信息 ======================
    @api
    async setNickname(nickname: string): Promise<true | undefined> {
        const selfInfo = await this.getUserInfo(runtimeData.loginInfo.uin)
        await this.connector.send('set_qq_profile', {
            nickname: nickname,
            personal_note: selfInfo.longNick,
            sex: selfInfo.sex,
        })
        return true
    }
    @api
    async setSign(sign: string): Promise<true | undefined> {
        const selfInfo = await this.getUserInfo(runtimeData.loginInfo.uin)
        await this.connector.send('set_qq_profile', {
            nickname: selfInfo.nickname,
            personal_note: sign,
            sex: selfInfo.sex,
        })
        return true
    }
    //#endregion
    //#endregion

    //#region == 消息相关 ===========================================
    //#region == 反序列化 ===========================
    async mdParser(data: NcObMdSeg): Promise<MdSegData> {
        return {
            type: 'md',
            content: data.data.content,
        }
    }
    override async imageParser(data: NcObImgSeg): Promise<ImgSegData> {
        if (!('key' in data.data)) {
            return {
                type: 'image',
                url: Resource.fromUrl(data.data.url),
                isFace: data.data.sub_type === 7 || data.data.sub_type === 1,
                summary: data.data.summary,
            }
        }else {
            return {
                type: 'mface',
                url: data.data.url,
                summary: data.data.summary,
                packageId: data.data.emoji_package_id,
                id: data.data.emoji_id,
                key: data.data.key,
            } as any as ImgSegData
        }
    }
    async fileParser(data: NcObFileSeg): Promise<FileSegData> {
        return {
            type: 'file',
            name: data.data.file,
            size: data.data.file_size,
            url: data.data.url,
            file_id: data.data.file_id,
        }
    }
    override async forwardParser(_data: ObForwardSeg): Promise<ForwardSegData> {
            const data = _data as any as NcObForwardSeg
            const id = data.data.id
            const nodes = await Promise.all(data.data.content.map(node => this.ncNodeParser(node)))
            return {
                type: 'forward',
                id,
                content: nodes,
            }
    }
    override async jsonParser(data: ObJsonSeg): Promise<JsonSegData> {
        const jsonData = JSON.parse(data.data.data)
        if (jsonData['app'] !== 'com.tencent.multimsg') return super.jsonParser(data)

        const forwardId = jsonData['meta']['detail']['resid']

        const out: ForwardSegData = {
            type: 'forward',
            id: forwardId,
            content: await this.getForwardMsg(forwardId),
        }
        return out as any as JsonSegData
    }
    async ncNodeParser(data: NcForwardData): Promise<ForwardNodeData> {
        return {
            sender: {
                nickname: data.sender.nickname,
                face: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${data.sender.user_id}`,
            },
            content: await this.parseSeg(data.message),
        }
    }
    //#endregion

    //#region == 序列化 =============================
    async mdSerializer(seg: MdSeg): Promise<NcObMdSeg> {
        return {
            type: 'markdown',
            data: {
                content: seg.content,
            }
        }
    }
    override async imageSerializer(seg: ImgSeg): Promise<NcObImgSeg> {
        return {
            type: 'image',
            data: {
                url: seg.url,
                file: seg.url,
                sub_type: seg.isFace ? 7 : 0, // 0表示普通图片，7表示表情
                summary: seg.summary,
                file_size: 0,
            }
        }
    }
    async mfaceSerializer(seg: MfaceSeg): Promise<NcObMfaceSeg> {
        return {
            type: 'mface',
            data: {
                file: seg.url,
                url: seg.url,
                summary: seg.summary,
                key: seg.key,
                emoji_id: seg.id,
                emoji_package_id: seg.packageId,
            }
        }
    }
    async fileSerializer(seg: FileSeg): Promise<NcObFileSeg> {
        if (!seg.file_id) throw new Error('文件消息必须有 file_id')
        return {
            type: 'file',
            data: {
                file: seg.url,
                file_id: seg.file_id,
                file_size: seg.size,
                url: seg.url,
            }
        }
    }
    async forwardSegSerializer(seg: ForwardSeg): Promise<ObForwardNodeSeg[]> {
        const serializer = async (msg: Msg)=>{
            if (!this.isForward(msg)) return await this.serializeMsg(msg)
            else return this.forwardSegSerializer(msg.message[0] as ForwardSeg)
        }
        const msgs = seg.content
        const messagesList = await Promise.all(msgs.map(msg => serializer(msg)))
        const out: ObForwardNodeSeg[] = []
        for (let i = 0;i < messagesList.length;i++) {
            out.push({
                type: 'node',
                data: {
                    nickname: msgs[i].sender.name,
                    user_id: msgs[i].sender.user_id.toString(),
                    content: messagesList[i],
                }
            })
        }
        return out
    }
    //#endregion

    //#endregion

    //#region == 事件处理 ===========================================
    override async pokeEvent(event: NcObPokeEvent): Promise<PokeEventData> {
        const re = await super.pokeEvent(event)
        re.action = event.raw_info[2].txt
        re.suffix = event.raw_info[4].txt
        re.ico = event.raw_info[1].src
        re.time = event.time
        return re
    }
    async groupMsgEmojiLikeEvent(event: NcObGroupMsgEmojiLikeEvent): Promise<ResponseEventData> {
        return {
            type: 'response',
            session: {
                id: event.group_id,
                type: 'group',
            },
            operator: createSender(event.user_id),
            message_id: event.message_id.toString(),
            emojiId: event.likes[0].emoji_id,
            add: true,
            time: event.time,
        }
    }
    //#endregion

    override isDelete(msg: ObMsg): boolean {
        // 判断消息是否为[已删除]消息
        return msg.message.length === 0
    }

    /**
     * 判断一个消息是否为构建转发
     * @param msg
     * @returns
     */
    private isForward(msg: Msg): boolean {
        const firstSeg = msg.message.at(0)
        if (firstSeg instanceof ForwardSeg) return true
        return false
    }

    private parseFileData(data: NcObGetGroupFile): FilesData {
        return {
            files: data.data.files.map(file => ({
                file_id: file.file_id,
                file_name: file.file_name,
                size: file.file_size,
                download_times: file.download_times,
                dead_time: file.dead_time,
                upload_time: file.upload_time,
                uploader_name: file.uploader_name,
            })),
            folders: data.data.folders.map(folder => ({
                folder_id: folder.folder_id,
                folder_name: folder.folder_name,
                count: folder.total_file_count,
                create_time: folder.create_time,
                creater_name: folder.creator_name,
            }))
        }
    }
}
