import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from '@koa/router'
import axios from 'axios';

// npm install json - bigint

interface Data {
    err_no?: number;
    err_msg?: string;
    data?: any;
}

const app = new Koa();
const router = new Router();

var g_test = 0;
// 解决大数字转换丢失问题  
function jsonParse(text: any) {
    text = text.replace(/([^"'\d])(\d{16,})/g, "$1\"$2\"")
    // text = text.replace(/(-?\d+)/g, '"$1"')
    ///(-?\d+)/g, '"$1"'
    return JSON.parse(text);
}
// var str = "风雨雪送春归飞雪迎春到，飞雪连天向天横";
// console.log(str.match(/春.*到/gi));
// console.log(Getsubstr(str, '春', '雪'));
function Getsubstr(str: string, f1: string, f2: string) {
    var s1 = str.indexOf(f1);
    if (s1 > -1) {
        s1 += f1.length;
        var s2 = str.indexOf(f2, s1);
        if (s2 > s1)
            return str.substring(s1, s2);
    }
}

router.get('/', ctx => {
    const fheaders = ctx.request.header;
    const data =
    {
        "service_id": 'aaaa',
        "env_id": 'bbbbb',
    };
    const headers = {
        "Content-Type": "application/json",
    }

    // formatResponseData
    // 发送一个 POST 请求
    const res = axios.request({
        method: 'post',
        url: 'https://www.huangjinlu.cn',
        data: data
    });
    res.then(
        // 成功时执行的回调
        (value) => {
            console.log(value); // 成功返回值
        },
        // 失败时执行的回调
        (reason) => {
            console.error(reason); // 出错了！
        }
    );

    console.log('res=', res);
    // ctx.body = res
    ctx.body = `Nodejs koa demo project`;
}).post('/api/get_open_id', async (ctx) => {

    let room_id = await getRoom_id(ctx.request.header);
    g_test++;
    ctx.body = { 'g_test': g_test, 'data': room_id };
}).post('/api/start_game', async (ctx) => {
    var theaders = ctx.request.header;
    const conn_id = await get_conn_id(theaders);
    if (!conn_id)
        return 'err conn_id';

    console.log('conn_id=', conn_id);

    const room_Id = await getRoom_id(theaders);
    if (!room_Id)
        return 'err room_Id';

    console.log('room_Id=', room_Id);

    let startLive = await startLiveDataTaskAll(room_Id, theaders);
    if (startLive != 'ok') {
        return 'err ' + startLive;
    }

    ctx.body = 'ok ' + conn_id;

});

app.use(bodyParser());
app.use(router.routes());

const PORT = 8000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

async function get_conn_id(fheaders: any) {
    const data =
    {
        "service_id": fheaders['x-tt-serviceid'],
        "env_id": fheaders['x-tt-envid'],
        "token": fheaders['token']
    };
    const headers = {
        "Content-Type": "application/json",
    }
    try {
        const res = await axios.post('http://ws-push.dycloud-api.service/ws/get_conn_id',
            data,
            {
                timeout: 10000,
                headers: headers
            });
        if (res.data.err_no == 0) {
            // data: { data: '{"conn_id":"97382664194"}', err_msg: 'success', err_no: 0 } 
            return JSON.parse(res.data.data)['conn_id'];
        } else {
            console.log("get_conn_id 成功接收 res.data:", res.data);
        }
    } catch (err) {
        console.error('get_conn_id 异常 err:', err);
    }
    console.error('get_conn_id 失败 data:', data);
};

async function getRoom_id(fheaders: any) {
    var room_id;
    await post_u("https://webcast.bytedance.com/api/webcastmate/info",
        { "token": fheaders['token'] },
        { "Content-Type": "application/json" }, (data: any) => {
            room_id = Getsubstr(data, '"room_id":', ',');
            // console.error('data:', room_id);
            if (!room_id)
                console.error('data:', data);
            // room_id = room_id ? room_id : data;
        });
    return room_id;
}

async function getRoomInfo(fheaders: any) {
    const data =
    {
        "token": fheaders['token']
    };
    const headers = {
        "Content-Type": "application/json",
    }
    try {
        const res = await axios.post("http://webcast.bytedance.com/api/webcastmate/info",
            data,
            {
                timeout: 10000,
                headers: headers
            });
        //getRoomInfo 成功接收 res.data: { errcode: 50036, errmsg: 'token parse failed', error: 4, message: '' } 
        console.log("getRoomInfo 成功接收 res.data:", res.data);
        console.log("getRoomInfo 成功接收 res:", res);
        if (res.data.data.info) {
            return res.data.data.info.room_id;
        }
        else {
            console.log("getRoomInfo 成功接收 res.data:", res.data);
        }
    } catch (err) {
        console.error('getRoomInfo 异常 err:', err);
    }
    console.error('getRoomInfo 失败 data:', data);
};

async function startLiveDataTaskAll(room_Id: string, headers: any) {
    let appId = headers['x-tt-appid'];
    try {
        let msgTypes = ['live_comment', 'live_like', 'live_gift'];
        for (const msgType of msgTypes) {
            let res = await startLiveDataTask(appId, room_Id, msgType);
            if (res != 'ok')
                return res;
        }
        return 'ok';
    } catch (err) {
        console.error('开启推送任务异常(All):', err);
    }
    return 'err';
};


async function startLiveDataTask(appId: string, roomId: string, msgType: string) {
    try {
        const res = await axios.post("http://webcast.bytedance.com/api/live_data/task/start",
            {
                "roomid": "" + roomId,
                "appid": appId,
                "msg_type": msgType
            },
            {
                timeout: 10000,
                headers: {
                    "Content-Type": "application/json",
                }
            });
        console.log('开启推送任务 res.data:', res.data);
        if (res.data.err_no === 0) {
            return 'ok'
        }
        console.log('开启推送任务失败:', res.data);
    } catch (err) {
        console.error('开启推送任务异常:', err);
    }
    return msgType;
};

import * as http from 'http';
import * as https from 'https';
import * as querystring from 'querystring';
import * as url from 'url';

async function post_u(url1: string, data: any, fheaders: any, fn: any) {
    data = data || {};
    var content = querystring.stringify(data);
    var parse_u = url.parse(url1, true);
    var isHttp = parse_u.protocol == 'http:';
    // fheaders = fheaders || {};
    fheaders['Content-Length'] = content.length;
    // if (!fheaders['Content-Type'])
    fheaders['Content-Type'] = 'application/x-www-form-urlencoded';
    var options = {
        host: parse_u.hostname,
        port: parse_u.port || (isHttp ? 80 : 443),
        path: parse_u.path,
        method: 'POST',
        headers: fheaders
    };

    console.log('fheaders:', fheaders);
    console.log('data:', data);

    await new Promise(async (resolve, reject) => {
        const req = https.request(options, (res) => {
            // console.log('statusCode:', res.statusCode);
            // console.log('headers:', res.headers);
            var _data = '';
            res.on('data', (chunk) => {
                _data += chunk;
            });
            res.on('end', () => {
                console.error('end:', _data);
                fn != undefined && fn(_data);
                resolve('ok');
            });
            req.on('error', (e) => {
                console.error(e);
                reject('err');
            });

        });

        req.write(content);
        req.end();
    });
}
