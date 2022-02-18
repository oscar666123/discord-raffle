
import {DcChannel} from "./DcChannel";
// @ts-ignore
import log4js from "log4js";
let logger = log4js.getLogger();
logger.level = "debug";

export class DcAccount {
    accountName : string = ""
    token : string = ""
    arrayChannel : Array<DcChannel>

    constructor(accountName : string, token : string, arrayChannel : Array<DcChannel>) {
        this.accountName = accountName
        this.token = token
        this.arrayChannel = arrayChannel
    }

    // @ts-ignore
    async monitor() {
        let length = this.arrayChannel.length
        for (let index = 0; index < length; index ++) {
            let channel = this.arrayChannel[index]
            logger.info(`开始监控～账户名：${this.accountName} 监控频道名:${channel.channelName}`)
            channel.raffle().then(r => {
            })
        }
    }
}