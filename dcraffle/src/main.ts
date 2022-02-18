
// @ts-ignore
import {readFileSync} from "fs";
import {DcChannel} from "./DcChannel";
import {DcAccount} from "./DcAccount";
const jsonFile = readFileSync("./config.json")
const fileJson = JSON.parse(jsonFile.toString())

// @ts-ignore
import log4js from "log4js";
import {dingdingMsg} from "./MessageUtil";
let logger = log4js.getLogger();
logger.level = "debug";
// @ts-ignore
async function main() {
    let lengthAccount = fileJson.dc_account.length
    let jsonArrayChannel = fileJson.monitor_channel
    for (let index = 0; index < lengthAccount; index ++) {
        let account = fileJson.dc_account[index];
        let token = account.token
        let name : string = account.name
        let lengthChannel = jsonArrayChannel.length
        let channelArray = new Array<DcChannel>()
        for (let indexChannel = 0 ; indexChannel < lengthChannel; indexChannel ++) {
            let jsonChannel = jsonArrayChannel[indexChannel]
            let channelName = jsonChannel.channel_name
            let channelId = jsonChannel.channel_id
            let emojiClick = jsonChannel.emoji_click
            let discordLink = jsonChannel.discord_link
            let channel : DcChannel = new DcChannel(token, channelName, channelId, emojiClick)
            // @ts-ignore
            channel.setAccountFrom(name)
            channel.discordLink = discordLink
            channelArray.push(channel)
        }
        let accountObject = new DcAccount(name, token, channelArray)
        accountObject.monitor()
    }
}

main()
