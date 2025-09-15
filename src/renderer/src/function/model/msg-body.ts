/*
 * @FileDescription: MsgBody.vue 所使模块用的通用的消息显示相关
 * @Author: Stapxs
 * @Date: 2022/11/29
 * @Version: 1.0
 * @Description: 此模块抽离出了本来在 MsgBody.vue 中的一些较为通用的方法便于进行多 Bot 适配。
 */

import xss from 'xss'

import { openLink } from '@renderer/function/utils/appUtil'
import { getDeviceType } from '@renderer/function/utils/systemUtil'
import app from '@renderer/main'
import { backend } from '@renderer/runtime/backend'
import { Logger } from '../base'
import { linkView } from '../utils/linkViewUtil'
import { JsonSeg, XmlSeg } from './seg'

interface CardMessageInterface {
	item: JsonSeg | XmlSeg,
	$emit: (emit: 'page-view', arg1: any, arg2: any) => void,
}

export class MsgBodyFuns {
    /**
     * 判断消息块是否需要行内显示
     * @param typeName 消息类型
     * @returns T / F
     */
    static isMsgInline(typeName: string) {
        switch (typeName) {
            case 'at':
            case 'atall':
            case 'text':
            case 'face':
                return true
            case 'bface':
            case 'image':
            case 'record':
            case 'video':
            case 'file':
            case 'json':
            case 'xml':
                return false
        }
        return false
    }
    /**
     * 尝试解析渲染 XML 消息
     * @param xml 原始的 XML 消息内容
     * @param id  XML 消息 ID（暂时不知道有什么用）
     * @param msgid 消息 ID
     * @returns 处理完成的 HTML 代码
     */
    static buildXML(xml: string, id: string, msgid: string) {
        try {
            // <msg> 标签内的为本体
            let item = xml.substring(
                xml.indexOf('<item'),
                xml.indexOf('</msg>'),
            )
            // 尝试转换标签为 html
            // item = item.replaceAll('/>', '>')
            item = item.replaceAll('item', 'div') // item
            item = item.replaceAll('<div', '<div class="msg-xml"')
            item = item.replaceAll('title', 'p') // title
            item = item.replaceAll('summary', 'a') // summary
            item = item.replaceAll('<a', '<a class="msg-xml-summary"')
            item = item.replaceAll('<picture', '<img class="msg-xml-img"') // picture
            // 将不正确的参数改为 dataset
            item = item.replaceAll('size=', 'data-size=')
            item = item.replaceAll('linespace=', 'data-linespace=')
            item = item.replaceAll('cover=', 'src=')
            // 处理出处标签
            item = item.replace('source name=', 'source data-name=')
            // 处理错误的 style 位置
            const div = document.createElement('div')
            div.id = 'xml-' + msgid
            div.dataset.id = id
            div.innerHTML = item
            for (const element of div.children[0].children) {
                if (element.nodeName === 'P') {
                    const pBody = element as HTMLParagraphElement
                    pBody.style.fontSize =
                        (Number(pBody.dataset.size) / 30).toString() + 'rem'
                    pBody.style.marginBottom =
                        Number(pBody.dataset.size) / 5 + 'px'
                    break
                }
            }
            // 解析 msg 消息体
            let msgHeader =
                xml.substring(xml.indexOf('<msg'), xml.indexOf('<item')) +
                '</msg>'
            msgHeader = msgHeader.replace('msg', 'div')
            msgHeader = msgHeader.replace('m_resid=', 'data-resid=')
            msgHeader = msgHeader.replace('url=', 'data-url=')
            const header = document.createElement('div')
            header.innerHTML = msgHeader
            // 处理特殊的出处
            let sourceBody = undefined as HTMLElement | undefined
            for (const element of div.children) {
                if (element.nodeName === 'SOURCE') {
                    sourceBody = element as HTMLElement
                }
            }
            if (sourceBody !== undefined) {
                const source = sourceBody.dataset.name
                if (source === '群投票') return (
                    '<a class="msg-unknow">（' +
                    app.config.globalProperties.$t(
                        'chat_xml_unsupport',
                    ) +
                    '：' +
                    source +
                    '）</a>'
                )
            }
            // 附带链接的 xml 消息处理
            if ((header.children[0] as HTMLElement).dataset.url !== undefined) {
                div.dataset.url = (
                    header.children[0] as HTMLElement
                ).dataset.url
                div.style.cursor = 'pointer'
            }
            return div.outerHTML
        } catch (ex) {
            new Logger().error(ex as Error, 'xml 消息解析错误')
            return (
                '<span v-else class="msg-unknown">( ' +
                app.config.globalProperties.$t('解析消息错误') +
                ': xml )</span>'
            )
        }
    }

    /**
     * 获取 JSON 消息的有效信息（通用）
     * @param data JSON 消息（已解析）
     * @returns appInfo
     */
    static getJSON(json: any) {
        // 解析 JSON
        const body = json.meta[Object.keys(json.meta)[0]]
        // App 信息
        const app = {} as { [key: string]: any }

        app.name = body.tag === undefined ? body.title : body.tag
        app.icon = body.icon === undefined ? body.source_icon : body.icon

        app.title = body.title
        app.desc = body.desc

        app.preview = body.preview
        if (app.preview !== undefined && app.preview.indexOf('http') === -1)
            app.preview = '//' + app.preview

        app.url = body.qqdocurl === undefined ? body.jumpUrl : body.qqdocurl

        return app
    }

    /**
     * 获取具体的 JSON 消息类型用于特殊处理
     * @param card CardMessage 实例
     * @returns { type: string, app: any }
     */
    static getJSONType(card: CardMessageInterface) {
        const msg = card.item
        if (msg.type != 'xml') {
            const data = msg.data
            const json = JSON.parse(data)
            const info = this.getJSON(json)
            let type = 'default'
            const append = {} as { [key: string]: any }

            // 下面就是一大堆特殊判定
            if (json.desc === '群公告') {
                info.title = json.desc
                info.desc = json.prompt
                info.preview = undefined
                info.icon = ''
                info.name = json.desc
            }
            switch (json.app) {
                // 群公告
                case 'com.tencent.mannounce':
                    // base64 编码的群公告
                    info.title = this.decodeBase64Unicode(json.meta.mannounce.title)
                    info.desc = this.decodeBase64Unicode(json.meta.mannounce.text).replaceAll('\n', '<br>')
                    info.icon = ''
                    info.preview = undefined
                    info.name = this.decodeBase64Unicode(json.meta.mannounce.title)
                    break
                // 地图
                case 'com.tencent.map':
                    info.title = json.meta['Location.Search'].name
                    append.urlOpenType = '_self'
                    switch (getDeviceType()) {
                        case 'Android':
                            info.url =
                                'geo:' +
                                json.meta['Location.Search'].lat +
                                ',' +
                                json.meta['Location.Search'].lng
                            break
                        case 'iOS':
                        case 'MacOS':
                            info.url =
                                'http://maps.apple.com/?ll=' +
                                json.meta['Location.Search'].lat +
                                ',' +
                                json.meta['Location.Search'].lng +
                                '&q=' +
                                json.meta['Location.Search'].name
                            break
                    }
                    info.desc = json.meta['Location.Search'].address
                    type = 'tencent.map'
                    break
                // b站
                case 'com.tencent.miniapp_01':
                    if (info.name == '哔哩哔哩') {
                        backend.call('Onebot', 'sys:getFinalRedirectUrl', true, info.url)
                        .then((fistLink) => {
                            linkView.bilibili(fistLink).then((result) => {
                                card.$emit('page-view', fistLink, result)
                            })
                        })
                        if (!backend.isWeb()) {
                            return null
                        }
                    }
                    break
            }

            return { type, app: info, append }
        }
        return null
    }

    /**
     * xml, json 消息的点击事件
     * @param bodyId 用来寻找 DOM 的 ID
     */
    static cardClick(bodyId: string) {
        const sender = document.getElementById(bodyId)

        if (!sender) return

        // 如果存在 url 项，优先打开 url
        if (
            sender.dataset.url !== undefined &&
            sender.dataset.url !== 'undefined' &&
            sender.dataset.url !== ''
        ) {
            const openType =
                sender.dataset.urlOpenType || sender.dataset.urlopentype
            if (openType == '_self') {
                window.open(sender.dataset.url, '_self')
            } else {
                // 默认都以 _blank 打开
                openLink(sender.dataset.url)
            }
        }
    }

    /**
     * 处理纯文本消息（处理换行，转义字符并进行 xss 过滤便于高亮链接）
     * @param { string } text 文本
     * @returns 处理完成的文本
     */
    static parseText(text: string) {
        // 把 r 转为 n
        text = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
        // 还原转义字符
        text = text.replace(/&([^;]+);/g, '&amp;$1;')
        // XSS 过滤
        text = xss(text, { whiteList: { a: ['href', 'target'] } })
        // 返回
        return text
    }

    /**
     * 处理纯文本消息和链接预览
     * @param text 纯文本消息
     */
    static parseTextMsg(text: string): { text: string, links: string[] } {
        const { $t } = app.config.globalProperties
        text = MsgBodyFuns.parseText(text)
        // 防止大量的重复字符
        const filtedText = text.replace(/(.)(\1{10,})/g, '$1<span style="opacity:0.7;margin-right:10px;">...</span>')
        if (filtedText != text) {
            const style = 'display:block;margin-top:10px;opacity:0.7;cursor:pointer;'
            text = filtedText + '<a style="' + style + '" data-raw="' + text + '" onclick="this.parentNode.innerText = this.dataset.raw;return false;">' + $t('显示原始消息') + '</a>'
        }
        // 链接判定
        const reg = /(http|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-.,@?^=%&:/~+#]*[\w\-@?^=%&/~+#])?/gi
        text = text.replaceAll(reg, '<a href="" data-link="$&" onclick="return false">$&</a>')
        const linkList = text.match(reg)
        return {
            text: text,
            links: linkList ?? [],
        }
	}

    static decodeBase64Unicode(base64) {
        const binary = atob(base64)
        const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0))
        return new TextDecoder().decode(bytes)
    }
}
