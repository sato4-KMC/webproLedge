var express = require('express');
var router = express.Router();

const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('register');
});

router.post('/', async function(req, res) {
  try {
    const emailRaw = (req.body?.email || '').toString().trim();
    const passwordRaw = (req.body?.password || '').toString();
    const remember = !!req.body?.remember;

    if (!emailRaw || !passwordRaw) {
      return res.status(400).render('register', { error: 'メール・パスワードを入力してください', emailPrefill: emailRaw });
    }

    // 既存チェック
    const exists = await prisma.USERS.findFirst({ where: { email: emailRaw } });
    if (exists) {
      return res.status(409).render('register', { error: 'このメールアドレスは既に登録されています', emailPrefill: emailRaw });
    }

    // 作成: Prisma の schema で id が autoincrement でない場合があるため、明示的に次IDを採番
    const last = await prisma.USERS.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
    const nextId = (last?.id ?? 0) + 1;

    const created = await prisma.USERS.create({
      data: { id: nextId, username: emailRaw, email: emailRaw, password: passwordRaw },
    });

    // サインアップ後はそのままログインさせる（cookieセット）
    const baseOpts = { httpOnly: true, sameSite: 'lax' };
    const maxAge = remember ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 4; // 30日 or 4時間
    res.cookie('userId', String(created.id), { ...baseOpts, maxAge });
    res.cookie('email', emailRaw, { ...baseOpts, maxAge });

    return res.redirect('/');
  } catch (err) {
    console.error('POST /register error', err);
    return res.status(500).render('register', { error: '内部エラーが発生しました' });
  }
});

module.exports = router;
