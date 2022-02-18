
// @ts-ignore
import {readFileSync, writeFileSync} from "fs";
// @ts-ignore
import axios from "axios-https-proxy-fix";
const jsonFile = readFileSync("./config.json")
const fileJson = JSON.parse(jsonFile.toString())
const blacklistWord = fileJson.black_word
const raffleWord = fileJson.raffle_word

const enableProxy = fileJson.proxy.enable
const proxyHost = fileJson.proxy.host
const proxyPort = fileJson.proxy.port
// @ts-ignore
import log4js from "log4js";
import {dcMessage, dingdingMsg} from "./MessageUtil";
// @ts-ignore
import * as timers from "timers";
let logger = log4js.getLogger();
logger.level = "debug";
const jsonWinFile = readFileSync("./winlog.json")
const winJson = JSON.parse(jsonWinFile.toString())

export class DcChannel {
    queuePostRaffle : Array<string> = new Array<string>()

    token : string = ""
    channelName : string= ""
    channelId : string = ""
    emojiClick : string = ""
    //属于哪个账号
    private accountFrom : string = ""
    private _discordLink : string = ""

    constructor(token : string, channelName : string, channelId : string, emojiClick : string) {
        this.token = token
        this.channelName = channelName
        this.channelId = channelId
        this.emojiClick = emojiClick
    }

    // @ts-ignore
    async raffle() {
        while (true) {
            let fullData = await this.getRemoteMessage(this.channelId, this.token)
            // @ts-ignore
            let messageResponse  = fullData.data
            // @ts-ignore
            let abort : boolean = fullData.abort
            if (abort) {
                logger.info(`账户${this.accountFrom} 终止频道监控 ${this.channelName}`)
                return
            }
            if (messageResponse === "") {
                continue
            }
            // @ts-ignore
            let data : any = messageResponse.data
            this.sendWinMessage(data)
            this.doRaffle(data)
            await DcChannel.sleep(10000)//1min
        }
    }


    static async sleep(ms: number) {
        return new Promise((resolve) => {
            timers.setTimeout(() => {
                resolve('');
            }, ms)
        });
    }


    /**
     * 抽奖
     * @param data
     * @private
     */
    // @ts-ignore
    private async doRaffle(data: any) {
        let length : number = data.length
        for (let index = 0; index < length; index ++) {
            let itemObject : any = data[index]
            let content : string = itemObject.content
            let embeds : any = itemObject.embeds
            if (embeds == null || embeds.length == 0) {
                continue
            }
            if (content == null || content == "") {
                content = embeds[0].description
            }
            let embedTitle = embeds[0].title
            if (this.isBlackList(embedTitle)) {
                continue
            }
            if (this.isRaffleWord(content)) {
                let embeds : any = itemObject.embeds
                let projectName : string = ""
                if (embeds != null && embeds.length > 0) {
                    let embed : any = embeds[0]
                    let author : any = embed.author
                    if (author != null) {
                        projectName = author.name
                    }
                    let title : string = embed.title
                    if (title != null && title != "") {
                        projectName = title
                    }
                } else {
                    let referencedMessage = itemObject.referenced_message
                    if (referencedMessage != null) {
                        let referEmbeds = referencedMessage.embeds
                        if (referEmbeds != null && referEmbeds.length > 0) {
                            let projectName = referEmbeds[0].author.name
                            if (projectName == null || projectName == "") {
                                projectName = referEmbeds[0].title
                            }
                        }
                    }
                }
                let reactions : any  = itemObject.reactions
                if (reactions == null || reactions.length <= 0) {
                    continue
                }
                let reaction : any = reactions[0]
                let me : boolean = reaction.me
                //已抽过 跳过
                if (me) {
                    continue
                }
                let emoji : any = reaction.emoji
                let emojiName : any = emoji.name
                let messageID : string = itemObject.id
                let encodeEmoji : string = encodeURI(emojiName)
                if (this.queuePostRaffle.indexOf(messageID) >= 0) {
                    continue
                }
                await this.doReactEmoji(messageID, encodeEmoji, projectName)
            }
        }
    }

    /**
     * 判断下是否是监测机器人的陷阱
     * @param content
     */
    isBlackList(content : string) : boolean {
        let length : number = blacklistWord.length
        for (let index = 0;index < length; index ++) {
            let item : string= blacklistWord[index]
            if (content.indexOf(item) >= 0) {
                return true
            }
        }
        return false
    }

    async getRemoteMessage(channelID : string, token : string) {
        try {

            let url = "https://discordapp.com/api/v6/channels/" + channelID + "/messages?limit=10"
            if (enableProxy) {
                // @ts-ignore
                return await axios.get(url, {
                    headers: {
                        "content-type": "application/json",
                        "authorization": token.toString(),
                    }
                    //这个是代理
                    , proxy: {
                        host: proxyHost,
                        port: proxyPort
                    }
                    //代理结束
                }).then((value: any) => {
                    return {data :value, abort : false}
                    // @ts-ignore
                }).catch(e=> {
                    if (e.response == null) {
                        return {data :"", abort : false}
                    }
                    let data = e.response.data
                    logger.info(JSON.stringify(data))
                    if (data.message == "Missing Access") {
                        logger.info(`账户${this.accountFrom} 无此频道权限 ${this.channelName}`)
                        return {data :"", abort : true}
                    }
                    return {data :"", abort : false}
                })
            } else {
                return await axios.get(url, {
                    headers: {
                        "content-type": "application/json",
                        "authorization": token.toString(),
                    }
                }).then((value: any) => {
                    return {data :value, abort : false}
                    // @ts-ignore
                }).catch(e=> {
                    if (e.response == null) {
                        return {data :"", abort : false}
                    }
                    let data = e.response.data
                    if (data.message == "Missing Access") {
                        logger.info(`账户${this.accountFrom} 无此频道权限 ${this.channelName}`)
                        return {data :"", abort : true}
                    }
                    return {data :"", abort : false}
                })
            }

        } catch (e) {
            logger.info(e)
            return ""
        }
    }

    /**
     * 点击表情
     * @param messageID
     * @param emoji
     * @param projectName
     */
    async doReactEmoji(messageID : string, emoji : any, projectName : string) {
        this.queuePostRaffle.push(messageID)
        let url = `https://discord.com/api/v9/channels/${this.channelId}/messages/${messageID}/reactions/${emoji}/%40me`
        if (enableProxy) {
            return await axios.put(url, "", {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": this.token.toString(),
                }
                //这个是代理
                ,proxy: {
                    host: proxyHost,
                    port: proxyPort
                }
                //代理结束
            }).then((value: any) => {
                let msg = `已成功成为分母～账户名：${this.accountFrom} 频道名:${this.channelName} 项目名 ${projectName}`
                logger.info(msg)
                dingdingMsg(msg)
                dcMessage(this.token, msg)
                return value
            }).catch((err: { message: any; }) => {
                logger.info(err.message)
                return ""
            })
        } else {
            return await axios.put(url, "",{
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": this.token.toString()
                }
            }).then((value: any) => {
                let msg = `已成功成为分母～账户名：${this.accountFrom} 频道名:${this.channelName} 项目名 ${projectName}`
                logger.info(msg)
                dingdingMsg(msg)
                dcMessage(this.token, msg)
                return value
            }).catch((err: { response: { statusText: string; }; }) => {
                logger.info("reaction error" + err.response.statusText)
                return ""
            })
        }
    }


    setAccountFrom(value: string) {
        this.accountFrom = value;
    }

    /**
     * 发送中奖信息
     * @param data
     * @private
     */
    // @ts-ignore
    private async sendWinMessage(data: any) {
        let length : number = data.length
        let username = this.accountFrom.split("#")[0]
        let discriminator = this.accountFrom.split("#")[1]
        for (let index = 0; index < length; index ++) {
            let itemObject : any = data[index]
            let content : string = itemObject.content
            if (content === "") {
                continue
            }
            let win1 : boolean = content.indexOf("Congratulations") >= 0
                || content.indexOf("congratulations") >= 0
            let mentions = itemObject.mentions
            if (mentions == null || mentions.length == 0) {
                continue
            }
            let win3 : boolean = false
            for (let index2 = 0; index2 < mentions.length; index2 ++) {
                let mention = mentions[index2]
                if (mention.username == username && mention.discriminator == discriminator) {
                    win3 = true
                    break
                }
            }
            let win : boolean = win1 && win3
            if (win) {
                let fullData = JSON.stringify(itemObject)
                let tempData = fullData.split("won the")
                if (tempData == null || tempData.length <= 1) {
                    continue
                }
                // @ts-ignore
                let prize : string = fullData.match("won the.*!")[0]
                if (prize == null || prize == "") {
                    continue
                }
                let item : string = this.accountFrom + "  " + this.channelName + "项目 " + prize
                let keyAccount = this.accountFrom
                let winArray = winJson.win
                let canBeInsert : boolean = true
                if (winArray != null && winArray.length > 0) {
                    for (let index = 0; index < winArray.length; index ++) {
                        let winItem : string = winArray[index]
                        if (winItem == item) {
                            canBeInsert = false
                            break
                        }
                    }
                    if (canBeInsert) {
                        let msg = `中奖了！！！ 账户 ${this.accountFrom} 频道名 ${this.channelName} 项目名 ${prize} 链接 ${this._discordLink}`
                        logger.info(msg)
                        dingdingMsg(msg)
                        dcMessage(this.token, msg)
                        winArray.push(item)
                        writeFileSync("./winlog.json", JSON.stringify(winJson))
                    }
                } else {
                    let msg = `中奖了！！！ 账户 ${this.accountFrom} 频道名 ${this.channelName} 项目名 ${prize} 链接 ${this._discordLink}`
                    logger.info(msg)
                    dingdingMsg(msg)
                    dcMessage(this.token, msg)
                    winArray.push(item)
                }

            }

        }
    }


    set discordLink(value: string) {
        this._discordLink = value;
    }

    /**
     * 是否是中奖的message
     * @param content
     * @private
     */
    private isRaffleWord(content: string) {
        let length : number = raffleWord.length
        for (let index = 0;index < length; index ++) {
            let item : string= raffleWord[index]
            if (content.indexOf(item) >= 0) {
                return true
            }
        }
        return false

    }
}