import Koa from 'koa';
import cors from '@koa/cors';
import { koaBody } from 'koa-body';
import router from './routes';
import { initDB } from './db';

const app = new Koa();

app.use(cors());
app.use(koaBody({ multipart: true }));
app.use(router.routes());
app.use(router.allowedMethods());

const PORT = 3001;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
