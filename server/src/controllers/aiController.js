import { chat } from '../services/aiService.js';

async function reply(req, res, next) {
  try {
    const answer = await chat(req.body);
    res.status(200).json({ success: true, reply: answer });
  } catch (error) {
    next(error);
  }
}

export { reply };
