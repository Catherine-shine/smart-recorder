import { Context } from 'koa';
import { getDB } from '../db';
import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';

export const uploadRecording = async (ctx: Context) => {
  const files = ctx.request.files;
  if (!files || !files.audio || !files.trajectory) {
    ctx.status = 400;
    ctx.body = { error: 'Missing audio or trajectory file' };
    return;
  }

  const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
  const trajectoryFile = Array.isArray(files.trajectory) ? files.trajectory[0] : files.trajectory;

  // Read trajectory to calculate hash
  const trajectoryBuffer = await fs.readFile(trajectoryFile.filepath);
  const hash = crypto.createHash('sha256').update(trajectoryBuffer).digest('hex').substring(0, 12);

  const db = await getDB();
  const existing = await db.get('SELECT * FROM recordings WHERE id = ?', hash);

  if (existing) {
    ctx.body = { hashid: hash, message: 'Recording already exists' };
    return;
  }

  // Move files to uploads directory
  const uploadDir = path.join(__dirname, '../../uploads');
  await fs.ensureDir(uploadDir);

  const audioExt = path.extname(audioFile.originalFilename || 'audio.webm');
  const trajectoryExt = path.extname(trajectoryFile.originalFilename || 'trajectory.json');

  const savedAudioPath = path.join(uploadDir, `${hash}${audioExt}`);
  const savedTrajectoryPath = path.join(uploadDir, `${hash}${trajectoryExt}`);

  await fs.move(audioFile.filepath, savedAudioPath);
  await fs.move(trajectoryFile.filepath, savedTrajectoryPath);

  await db.run(
    'INSERT INTO recordings (id, trajectory_path, audio_path, created_at) VALUES (?, ?, ?, ?)',
    hash,
    savedTrajectoryPath,
    savedAudioPath,
    Date.now()
  );

  ctx.body = { hashid: hash };
};

export const getRecording = async (ctx: Context) => {
  const { hashid } = ctx.params;
  const db = await getDB();
  const recording = await db.get('SELECT * FROM recordings WHERE id = ?', hashid);

  if (!recording) {
    ctx.status = 404;
    ctx.body = { error: 'Recording not found' };
    return;
  }

  const trajectoryContent = await fs.readJSON(recording.trajectory_path);
  
  ctx.body = {
    hashid: recording.id,
    trajectory: trajectoryContent,
    audioUrl: `/api/recordings/${hashid}/audio`,
    createdAt: recording.created_at
  };
};

export const getAudio = async (ctx: Context) => {
    const { hashid } = ctx.params;
    const db = await getDB();
    const recording = await db.get('SELECT * FROM recordings WHERE id = ?', hashid);
  
    if (!recording) {
      ctx.status = 404;
      return;
    }

    const src = fs.createReadStream(recording.audio_path);
    ctx.type = 'audio/webm'; 
    ctx.body = src;
}
