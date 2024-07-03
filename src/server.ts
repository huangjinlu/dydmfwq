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
    ctx.body = `Nodejs koa demo project`;
}).get('/api/get_open_id', async (ctx) => {
    const value = ctx.request.header['x-tt-openid'] as string;
    if (value) {
        ctx.body = {
            success: true,
            data: value,
        }
    } else {
        ctx.body = {
            success: false,
            message: `lu--dyc-open-id not exist`,
        }
    }
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

async function get_conn_id(headers: any) {
    try {
        const res = await axios.post('http://ws-push.dycloud-api.service/ws/get_conn_id',
            {
                "service_id": headers['x-tt-serviceid'],
                "env_id": headers['x-tt-envid'],
                "token": headers['token']
            },
            {
                timeout: 1000,
                headers: {
                    "Content-Type": "application/json",
                }
            });
        // data: { data: '{"conn_id":"97382664194"}', err_msg: 'success', err_no: 0 } 
        console.log("get_conn_id 成功接收", res.data);
        return res.data.data['conn_id'];
    } catch (err) {
        console.error('get_conn_id 异常:', err);
    }
};

async function getRoomInfo(headers: any) {
    const res = await axios.post("https://webcast.bytedance.com/api/webcastmate/info",
        {
            "token": headers['token']
        },
        {
            timeout: 1000,
            headers: {
                "Content-Type": "application/json",
            }
        });
    if (res.data) {
        return res.data['info']['room_id'];
    }
    else {
        console.error("getRoomInfo res=", res);
        console.error('getRoomInfo headers=', headers);
    }
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
