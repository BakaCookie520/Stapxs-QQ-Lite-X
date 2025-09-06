/*
 * @FileDescription: Session 收纳盒
 * @Author: Mr.Lee
 * @Date: 2025/08/02
 * @Version: 1.0
 * @Description: 提供分组的收纳盒
 */

import { v4 as uuid } from 'uuid'
import { Name } from './data'
import {
    shallowReactive,
    ShallowReactive,
    shallowRef,
    ShallowRef,
    watchEffect,
    computed,
    ComputedRef
} from 'vue'
import { Message } from './message'
import { GroupSession, Session } from './session'
import { runtimeData } from '../msg'
import option from '../option'
import { Msg } from './msg'

// 对于会话而言，收纳盒是有序的，对于收纳盒，会话是无序的，所以不把content塞到这个表里
export interface SessionBoxData {
    id: string
    name: string
    icon: string
    color: number

    alwaysTop: boolean
}

/**
 * @todo
 *  * preMessage
 *  * highlightInfo
 *  * showNotice
 */
export class SessionBox {
    readonly type = 'box'
    // 基础属性
    id: string = uuid()
    _name: ShallowRef<Name>
    _icon: ShallowRef<string>
    _color: ShallowRef<number>
    _content: Set<Session> = shallowReactive(new Set())
    // 设置
    _alwaysTop: ShallowRef<boolean> = shallowRef(false)

    // 缓存
    _preMessage: ShallowRef<Message|undefined> = shallowRef(undefined)
    highlightInfo: string[] = shallowReactive([])
    _showNotice: ComputedRef<boolean> = computed(()=>{
        // 如果有置顶会话，则不显示通知
        for (const session of this._content) {
            if (session.alwaysTop) continue
            if (session.showNotice) return true
        }
        return false
    })
    _newMsg: ComputedRef<number> = computed(() => {
        let out = 0
        for (const session of this._content)
            out += session.newMsg
        return out
    })
    _isActive: ComputedRef<boolean> = computed(() => {
        // 如果有置顶会话，则不显示通知
        for (const session of this._content) {
            if (session.isActive) return true
        }
        return false
    })

    // 静态缓存
    static sessionBoxes: ShallowReactive<SessionBox[]> = shallowReactive([])
    static alwaysTopBoxes: ShallowReactive<Set<SessionBox>> = shallowReactive(new Set())
    constructor(name: string, icon: string, color: number) {
        this._name = shallowRef(new Name(name))
        this._icon = shallowRef(icon)
        this._color = shallowRef(color)

        // 显示的内容排序
        watchEffect(()=>{
            this.sortContent()
        })
    }

    //#region == 静态工具 ==============================================================
    /**
     * 保存新的收纳盒
     * @param box 新盒子
     */
    static addBox(box: SessionBox): void {
        SessionBox.sessionBoxes.push(shallowReactive(box))
        SessionBox.saveData()
    }
    /**
     * 清空收纳盒
     */
    static clear(): void {
        SessionBox.sessionBoxes.length = 0
        SessionBox.alwaysTopBoxes.clear()
    }
    static getBoxById(id: string): SessionBox | undefined {
        return this.sessionBoxes.find(box => box.id === id)
    }
    //#endregion

    //#region == 保存加载 ==============================================================
    /**
     * 从缓存数据里读取
     */
    static parse(data: SessionBoxData): SessionBox {
        const box = new SessionBox(data.name, data.icon, data.color)
        box.id = data.id

        // 设置属性
        box.setAlwaysTop(data.alwaysTop, false)

        // 记录到缓存里
        this.sessionBoxes.push(shallowReactive(box))
        return box
    }
    /**
     * 加载所有的收纳盒
     * @returns
     */
    static load(): void {
        const selfId = runtimeData.loginInfo.uin.toString()
        const cfgs = runtimeData.sysConfig.boxes as {
            [key: string]: {[key: string]: SessionBoxData}
        }
        if (!cfgs) return
        const userBoxes = cfgs[selfId]
        if (!userBoxes) return

        // 读取所有的收纳盒
        for (const id in userBoxes) {
            this.parse(userBoxes[id])
        }

        // 读取群组对应的收纳盒
        const sessionBoxes = runtimeData.sysConfig.sessionBoxes as {
            [key: string]: {[key: string]: SessionBoxData}
        }
        if (!sessionBoxes) return
        const userSessionBoxes = sessionBoxes[selfId] as unknown as {[key: string]: string[]}
        if (!userSessionBoxes) return

        // 读取所有的群组收纳盒
        for (const id in userSessionBoxes) {
            const session = Session.getSessionById(Number(id))
            if (!session) continue
            for (const boxId of userSessionBoxes[id]) {
                const box = this.getBoxById(boxId)
                if (!box) continue
                box.putSession(session)
            }
        }
    }
    /**
     * 保存当前收纳盒的状态
     */
    static saveData(): void {
        // 检查前提条件
        if (!runtimeData.loginInfo.uin) return
        const selfId = runtimeData.loginInfo.uin.toString()

        // == 保存收纳盒数据 =========================================================
        {
        // 序列化全部数据
        const datas = {}
        for (const box of this.sessionBoxes) {
            const data = box.toData()
            datas[data.id] = data
        }

        // 更新配置
        const cfgs = runtimeData.sysConfig.boxes ?? {} as {
            [key: string]: {[key: string]: SessionBoxData}
        }
        cfgs[selfId] = datas

        // 保存到配置
        option.save('boxes', cfgs)
        }
        // == 保存群组对应收纳盒数据 ====================================================
        {
        const datas = {}
        for (const session of Session.sessionList) {
            if (session.boxes.length === 0) continue
            datas[session.id] = session.boxes.map(box => box.id)
        }

        // 更新配置
        const cfgs = runtimeData.sysConfig.sessionBoxes ?? {} as {
            [key: string]: {[key: string]: SessionBoxData}
        }
        cfgs[selfId] = datas

        option.save('sessionBoxes', cfgs)
        }
    }
    /**
     * 将自身转化为往配置文件存储的数据
     * @returns
     */
    toData(): SessionBoxData {
        return {
            id: this.id,
            name: this._name.value.toString(),
            icon: this._icon.value,
            color: this._color.value,
            alwaysTop: this.alwaysTop,
        }
    }
    //#endregion

    //#region == 设置相关 ==============================================================
    setAlwaysTop(value: boolean, saveCfg: boolean = true): void {
        this.alwaysTop = value

        // 更新缓存列表
        if (value && !SessionBox.alwaysTopBoxes.has(this))
            SessionBox.alwaysTopBoxes.add(this)
        else if (!value && SessionBox.alwaysTopBoxes.has(this))
            SessionBox.alwaysTopBoxes.delete(this)

        if (!saveCfg) return
        SessionBox.saveData()
    }
    //#endregion

    //#region == 管理会话 ==============================================================
    /**
     * 设置为已读状态
     */
    setRead(): void {
        for (const s of this._content) {
            s.setRead()
        }
    }
    /**
     * 卸载
     */
    unactive(): void {
        this.preMessage = undefined
        this.highlightInfo.length = 0
        for (const session of this._content) session.unactive()
    }
    /**
     * 将会话加入到收纳盒
     * @param session 放入的会话
     */
    putSession(session: Session): void {
        if (this._content.has(session)) return
        // 加入到收纳盒
        this._content.add(session)
        session.addBox(this)
        // 更新预览消息
        if (this.preMessage === undefined)
            this.preMessage = session.preMessage

        // 自动离开群收纳盒
        if (runtimeData.sysConfig.bubble_sort_user &&
            session.type === 'group')
            BubbleBox.instance.removeSession(session)
    }
    /**
     * 将会话从收纳盒中移除
     * @param session 会话
     * @returns
     */
    removeSession(session: Session): void {
        // 离开收纳盒
        if (!this._content.has(session)) return
        this._content.delete(session)
        session.leaveBox(this)
        // 更新预览消息
        if (this.preMessage?.session?.id === session.id)
            this.preMessage = undefined
        // 更新当前收纳盒
        if (runtimeData.nowChat?.id === session.id &&
            runtimeData.nowBox?.id === this.id)
            runtimeData.nowBox = undefined


        if (runtimeData.sysConfig.bubble_sort_user &&
            session.type === 'group' &&
            session.boxes.length === 0)
            BubbleBox.instance.putSession(session)
    }
    /**
     * 会话上报自身新消息
     * @param session 上报会话
     * @param newMsg 新消息
     */
    sessionNewMessage(session: Session, newMsg: Message): void {
        // 更新预览消息
        if (session.preMessage === newMsg)
            this.preMessage = newMsg

        // 置顶会话不更新是否有通知 | 高亮信息（重复显示了）
        if (session.alwaysTop) return
        // 更新高亮信息
        for (const info of session.highlightInfo) {
            if (!this.highlightInfo.includes(info)) {
                this.highlightInfo.push(info)
            }
        }
    }
    /**
     * 会话上报自身已读状态
     * @param readMsg 已读消息数量
     */
    sessionSetReaded(): void {
        // 更新高亮信息
        this.highlightInfo.length = 0
        for (const s of this._content) {
            // 过滤置顶会话
            if (s.alwaysTop) continue
            for (const info of s.highlightInfo) {
                if (this.highlightInfo.includes(info)) continue
                this.highlightInfo.push(info)
            }
        }
    }
    //#endregion

    // 杂项
    /**
     * 删除自身
     * @returns
     */
    remove(): void {
        const id = SessionBox.sessionBoxes.findIndex(box => box.id === this.id)
        if (id === -1) return
        // 从缓存中删除
        SessionBox.sessionBoxes.splice(id, 1)
        // 清空会话
        for (const session of this._content) this.removeSession(session)
        // 保存数据
        SessionBox.saveData()
    }

    match(query: string): boolean {
        return this._name.value.matchStr(query)
    }

    get showName(): string {
        return this._name.value.toString()
    }

    get showNamePy(): string {
        return this._name.value.py
    }

    get name(): string {
        return this._name.value.toString()
    }

    set name(value: string) {
        this._name.value = new Name(value)
    }

    get icon(): string {
        return this._icon.value
    }

    set icon(value: string) {
        this._icon.value = value
    }

    get color(): string {
        if (runtimeData.tags.darkMode) return `hsl(${this._color.value}deg, 50%, 35%)`
        return `hsl(${this._color.value}deg, 50%, 90%)`
    }

    set color(value: number) {
        this._color.value = value
    }

    get alwaysTop(): boolean {
        return this._alwaysTop.value
    }

    set alwaysTop(value: boolean) {
        this._alwaysTop.value = value
    }

    get preMessage(): Message | undefined {
        return this._preMessage.value
    }

    set preMessage(value: Message | undefined) {
        this._preMessage.value = value
    }

    get showNotice(): boolean {
        return this._showNotice.value
    }

    private _sortContentByName: ShallowRef<Session[]> = shallowRef([])
    private _sortContentByTime: ShallowRef<Session[]> = shallowRef([])

    get sortContentByName(): Session[] {
        return this._sortContentByName.value
    }
    get sortContentByTime(): Session[] {
        return this._sortContentByTime.value
    }

    get newMsg(): number {
        return this._newMsg.value
    }

    get length(): number {
        return this._content.size
    }

    get isActive(): boolean {
        return this._isActive.value
    }

    get preMsg(): string {
        if (!this.preMessage) return ''
        let txt: string
        if (this.preMessage instanceof Msg)
            txt = this.preMessage.plaintext()
        else
            txt = this.preMessage.preMsg
        return this.preMessage.session?.showName + ':' + txt
    }

    private sortContent(): void {
        this._sortContentByName.value = [...this._content].sort(
            (a, b) => a.showNamePy.localeCompare(b.showNamePy)
        )
        this._sortContentByTime.value = [...this._content].sort(
            (a, b) => {
                if (!a.preMessage?.time && b.preMessage?.time) return 1
                if (a.preMessage?.time && !b.preMessage?.time) return -1
                if (a.preMessage?.time && b.preMessage?.time) {
                    return b.preMessage.time.time - a.preMessage.time.time
                }
                return a.showNamePy.localeCompare(b.showNamePy)
            }
        )
    }
}

export class BubbleBox extends SessionBox {
    static instance: BubbleBox = new BubbleBox()
    // 这玩意里的元素都是激活的，按照里面有没有元素算就行了
    override _isActive: ComputedRef<boolean> = computed(()=>{
        return this._content.size > 0
    })

    protected constructor() {
        super('群收纳盒', 'user-group', 0)
        SessionBox.sessionBoxes.pop() // 给自己删了

        setTimeout(()=>{
            // 添加到群收纳盒
            Session.afterActiveHook.push((session: Session) => {
                if (!runtimeData.sysConfig.bubble_sort_user) return
                if (session.alwaysTop) return
                if (session.boxes.length > 0) return
                if (!(session instanceof GroupSession)) return
                this.putSession(session)
            })

            // 卸载时移除
            Session.afterUnactiveHook.push((session: Session) => {
                if (this._content.has(session))
                    this.removeSession(session)
            })
        }, 0)
    }

    /**
     * 将会话加入到收纳盒
     * @param session 放入的会话
     */
    override putSession(session: Session): void {
        if (this._content.has(session)) return
        // 加入到收纳盒
        this._content.add(session)
        session.addBox(this)

        // 更新预览消息
        if (this.preMessage === undefined)
            this.preMessage = session.preMessage
    }

    /**
     * 将会话从收纳盒中移除
     * @param session 会话
     * @returns
     */
    override removeSession(session: Session): void {
        // 离开收纳盒
        if (!this._content.has(session)) return
        this._content.delete(session)
        session.leaveBox(this)

        // 更新预览消息
        if (this.preMessage?.session?.id === session.id)
            this.preMessage = undefined
    }

    override get color(): string {
        return 'var(--color-card-2)'
    }

    override set color(_: number) {
        // 不允许修改颜色
        throw new Error('群收纳盒禁止修改颜色')
    }
}
