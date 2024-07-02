import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from '@koa/router'
import axios from 'axios';
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
}).post('/api/text/antidirt', async (ctx) => {
    const res = await get_conn_id(ctx.request.header);
    console.log(`ctx`, res);
    ctx.body = {
        "result": res,
        "success": true,
    };

});

app.use(bodyParser());
app.use(router.routes());

const PORT = 8000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

async function get_conn_id(headers: any) {
    console.log("get_conn_id res1=", headers);
    const res = await axios.post('http://ws-push.dycloud-api.service/ws/get_conn_id', {
        "headers": {
            "Content-Type": "application/json",
        },
        "data": {
            service_id: headers['x-tt-serviceid'],
            env_id: headers['x-tt-envid'],
            token: headers['token']
        }
    });

    console.log("get_conn_id res2=", res);
    return res;
}
