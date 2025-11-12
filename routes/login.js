var express = require('express');
var router = express.Router();

const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('login');
});

router.post('/', async function(req, res) {
  try {
    const emailRaw = (req.body?.email || '').toString().trim();
    const passwordRaw = (req.body?.password || '').toString();
    const remember = !!req.body?.remember; // "1" or "on" expected

    if (!emailRaw || !passwordRaw) {
      return res.status(400).render('login', { error: 'メール・パスワードを入力してください', emailPrefill: emailRaw });
    }

    // 既存アカウント必須
    const user = await prisma.USERS.findFirst({ where: { email: emailRaw } });
    if (!user) {
      return res.status(404).render('login', { error: 'アカウントが見つかりません', emailPrefill: emailRaw });
    }
    if ((user.password ?? '') !== passwordRaw) {
      return res.status(401).render('login', { error: 'メールまたはパスワードが違います', emailPrefill: emailRaw });
    }

    const userId = user.id;

    // 2) set cookies (httpOnly for security; extend if remember)
    const baseOpts = { httpOnly: true, sameSite: 'lax' };
    const maxAge = remember ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 4; // 30 days or 4 hours

    res.cookie('userId', String(userId), { ...baseOpts, maxAge });
    res.cookie('email', emailRaw, { ...baseOpts, maxAge });

    return res.redirect('/');
  } catch (err) {
    console.error('POST /login error', err);
    return res.status(500).send('internal error');
  }
});

module.exports = router;
