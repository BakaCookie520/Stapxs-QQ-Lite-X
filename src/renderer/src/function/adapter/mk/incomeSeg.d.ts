import { IncomingSegment } from '@saltify/milky-types'

// 具体的接收消息段类型
export type TextSeg = Extract<IncomingSegment, { type: 'text' }>
export type MentionSeg = Extract<IncomingSegment, { type: 'mention' }>
export type MentionAllSeg = Extract<IncomingSegment, { type: 'mention_all' }>
export type FaceSeg = Extract<IncomingSegment, { type: 'face' }>
export type ReplySeg = Extract<IncomingSegment, { type: 'reply' }>
export type ImageSeg = Extract<IncomingSegment, { type: 'image' }>
export type RecordSeg = Extract<IncomingSegment, { type: 'record' }>
export type VideoSeg = Extract<IncomingSegment, { type: 'video' }>
export type ForwardSeg = Extract<IncomingSegment, { type: 'forward' }>
export type MarketFaceSeg = Extract<IncomingSegment, { type: 'market_face' }>
export type LightAppSeg = Extract<IncomingSegment, { type: 'light_app' }>
export type XmlSeg = Extract<IncomingSegment, { type: 'xml' }>
export type FileSeg = Extract<IncomingSegment, { type: 'file' }>
