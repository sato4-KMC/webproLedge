// routes/detail.js
var express = require("express");
var router = express.Router();

const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// --- auth (copy & paste ok) ---
function requireAuth(req, res, next) {
  const { userId, email } = req.cookies || {};
  if (!userId || !email) {
    return res.redirect('/login');
  }
  res.locals.currentUser = { userId: String(userId), email: String(email) };
  next();
}

// GET /detail?id=123
router.get('/', requireAuth, async function (req, res) {
  try {
    const id = Number(req.query.id);
    if (!id || !Number.isInteger(id)) {
      return res.status(400).render('detail', { item: null, error: '不正なIDです' });
    }
    const userId = Number(res.locals.currentUser?.userId || req.cookies?.userId);

    const item = await prisma.POSTS.findFirst({ where: { id, userId } });
    if (!item) {
      return res.status(404).render('detail', { item: null, items: [], error: 'データが見つかりません' });
    }

    // ITEMS: same userId, same postId
    const items = await prisma.ITEMS.findMany({
      where: { postId: id, userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.render('detail', { item, items, error: null });
  } catch (e) {
    console.error('GET /detail error', e);
    return res.status(500).render('detail', { item: null, error: '内部エラーが発生しました' });
  }
});

// POST /detail/edit?id=123  （タイトル/金額/日時の更新）
router.post('/edit', requireAuth, async function (req, res) {
  try {
    const id = Number(req.query.id);
    if (!id || !Number.isInteger(id)) {
      return res.status(400).send('invalid id');
    }
    const userId = Number(res.locals.currentUser?.userId || req.cookies?.userId);

    // 受け取り
    const title = (req.body?.title || '').toString();
    let amountNum = Number(req.body?.amount || 0); // 入力は数字のみ（絶対値）
    const qType = (req.body?.qType || '').toString();
    // qTypeに応じて符号を調整（負=支出、正=収入）
    if (qType === '支出') amountNum = -Math.abs(amountNum);
    else if (qType === '収入') amountNum = Math.abs(amountNum);
    const createdAtRaw = req.body?.createdAt;

    const data = { title, amount: amountNum };
    if (createdAtRaw) {
      const dt = new Date(createdAtRaw);
      if (!isNaN(dt.getTime())) data.createdAt = dt;
    }

    // セキュリティ（本人のレコードに限定）
    await prisma.POSTS.updateMany({ where: { id, userId }, data });

    return res.redirect(`/detail?id=${id}`);
  } catch (e) {
    console.error('POST /detail/edit error', e);
    return res.status(500).send('edit failed');
  }
});

// POST /detail/items/add?id=123  （ITEMS の追加：メモ用途、金額バリデなし）
router.post('/items/add', requireAuth, async function (req, res) {
  try {
    const postId = Number(req.query.id);
    if (!postId || !Number.isInteger(postId)) {
      return res.status(400).send('invalid id');
    }
    const userId = Number(res.locals.currentUser?.userId || req.cookies?.userId);

    const title = (req.body?.title || '').toString();
    let amountNum = Number(req.body?.amount || 0); // 入力は数字のみ（絶対値）
    const qType = (req.body?.qType || '').toString();
    if (qType === '支出') amountNum = -Math.abs(amountNum);
    else if (qType === '収入') amountNum = Math.abs(amountNum);
    const createdAtRaw = req.body?.createdAt;

    const data = { title: title, amount: amountNum, postId: postId, userId: userId };
    if (createdAtRaw) {
      const dt = new Date(createdAtRaw);
      if (!isNaN(dt.getTime())) data.createdAt = dt;
    }

    await prisma.ITEMS.create({ data });
    return res.redirect(`/detail?id=${postId}`);
  } catch (e) {
    console.error('POST /detail/items/add error', e);
    return res.status(500).send('items add failed');
  }
});

// POST /detail/items/:itemId/delete?id=123  （ITEMS の削除）
router.post('/items/:itemId/delete', requireAuth, async function (req, res) {
  try {
    const postId = Number(req.query.id);
    const itemId = Number(req.params.itemId);
    if (!postId || !Number.isInteger(postId) || !itemId || !Number.isInteger(itemId)) {
      return res.status(400).send('invalid id');
    }
    const userId = Number(res.locals.currentUser?.userId || req.cookies?.userId);

    await prisma.ITEMS.deleteMany({ where: { id: itemId, postId: postId, userId: userId } });
    return res.redirect(`/detail?id=${postId}`);
  } catch (e) {
    console.error('POST /detail/items/:itemId/delete error', e);
    return res.status(500).send('items delete failed');
  }
});

// POST /detail/delete?id=123
router.post('/delete', requireAuth, async function (req, res) {
  try {
    const id = Number(req.query.id);
    if (!id || !Number.isInteger(id)) {
      return res.status(400).send('invalid id');
    }
    const userId = Number(res.locals.currentUser?.userId || req.cookies?.userId);

    await prisma.POSTS.deleteMany({ where: { id, userId } });
    return res.redirect('/');
  } catch (e) {
    console.error('POST /detail/delete error', e);
    return res.status(500).send('delete failed');
  }
});

module.exports = router;