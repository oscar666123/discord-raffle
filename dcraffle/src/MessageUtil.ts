
// @ts-ignore
import axios from "axios-https-proxy-fix";
// @ts-ignore
import log4js from "log4js";
// @ts-ignore
import {readFileSync} from "fs";
const jsonFile = readFileSync("./config.json")
const fileJson = JSON.parse(jsonFile.toString())
const enableProxy = fileJson.proxy.enable
const proxyHost = fileJson.proxy.host
const proxyPort = fileJson.proxy.port
const channelId = fileJson.notification_discord_channelid
const dingdingToken  = fileJson.notification_dingding
let logger = log4js.getLogger();
logger.level = "debug";

export async function dingdingMsg(text:string)  {
    if (dingdingToken == null || dingdingToken == "") {
        return ""
    }
    try {
        await axios.post(dingdingToken, {
            "msgtype": "text",
            "at": {
                "atMobiles": [
                    "11111"
                ],
                "isAtAll": false
            },
            "text": {
                "content": "【警报】" + text
            }
        }).then( () => {
        }).catch( (err: any)=>{
            logger.info(err)
        });
    } catch (error) {
        logger.info(error)
    }
}

export async function dcMessage(token : string, messag : string) {
    if (channelId == null || channelId == "") {
        return ""
    }
    let message_data = {
        "content": messag,
        "tts": "false",
    }
    try {
        let url = "https://discordapp.com/api/v6/channels/" + channelId + "/messages"
        if (enableProxy) {
            await axios.post(url, message_data, {
                headers: {
                    "content-type": "application/json",
                    "authorization": token.toString()
                }
                ,proxy: {
                    host: proxyHost,
                    port: proxyPort
                }
            }).then(() => {

            }).catch((err: { message: any; }) => {
                logger.info(err.message)
            })
        } else {
            await axios.post(url, message_data, {
                headers: {
                    "content-type": "application/json",
                    "authorization": token.toString()
                }
            }).then(() => {

            }).catch((err: { message: any; }) => {
                logger.info(err.message)
            })
        }

    } catch (e) {
        logger.info(e)
    }
}

