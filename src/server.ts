import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from '@koa/router'
import axios from 'axios';

interface Data {
    err_no?: number;
    err_msg?: string;
    data?: any;
}

const app = new Koa();
const router = new Router();

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
    // 发送一个 POST 请求
    const res = axios.request({
        method: 'post',
        url: 'https://www.huangjinlu.cn',
        data: data
    });

    // ctx.body = res
    ctx.body = `Nodejs koa demo project`;
}).post('/api/get_open_id', async (ctx) => {
    var res = 'res';
    // const value = ctx.request.header['x-tt-openid'] as string;

    await post_u("https://webcast.bytedance.com/api/webcastmate/info",
        { "token": ctx.request.header['token'] },
        { "Content-Type": "application/json" }, (data: any) => {
            console.log('res:', data)
            res = data;
        });
    console.log('res11:')
    ctx.body = res;
}).post('/api/start_game', async (ctx) => {
    const conn_id = await get_conn_id(ctx.request.header);
    if (!conn_id)
        return 'err conn_id';
    console.log('conn_id=', conn_id);

    const roomId = await getRoomInfo(ctx.request.header);
    if (!roomId)
        return 'err roomId';

    console.log('roomId=', roomId);

    let startLive = await startLiveDataTaskAll(ctx.request.header);
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
                timeout: 1000,
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
                timeout: 1000,
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

async function startLiveDataTaskAll(headers: any) {
    let appId = headers['x-tt-appid'];
    try {
        let msgTypes = ['live_comment', 'live_like', 'live_gift'];
        for (const msgType of msgTypes) {
            let res = await startLiveDataTask(appId, headers, msgType);
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
                timeout: 1000,
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
    const req = https.request(options, (res) => {
        console.log('statusCode:', res.statusCode);
        console.log('headers:', res.headers);
        var _data = '';
        res.on('data', (chunk) => {
            _data += chunk;
        });
        res.on('end', () => {
            console.error('end:', _data);
            fn != undefined && fn(_data);
        });
        req.on('error', (e) => {
            console.error(e);
        });
    });
    req.write(content);
    req.end();

}
