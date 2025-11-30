import Router from 'koa-router';
import { uploadRecording, getRecording, getAudio } from './controllers/recording';

const router = new Router({ prefix: '/api' });

router.post('/recordings', uploadRecording);
router.get('/recordings/:hashid', getRecording);
router.get('/recordings/:hashid/audio', getAudio);

export default router;
