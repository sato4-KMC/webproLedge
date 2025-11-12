//route/create.js
var express = require("express");
var router = express.Router();

const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

function requireAuth(req, res, next) {
  const { userId, email } = req.cookies || {};
  if (!userId || !email) {
    // ログインしていなければログインページへ
    return res.redirect('/login');
  }
  // 下層で便利に使えるように
  res.locals.currentUser = { userId: String(userId), email: String(email) };
  next();
}

router.get('/', requireAuth, function(req, res, next) {
  res.send('respond with a resource');
});

// フォーム表示提出後の処理
router.post("/", requireAuth, async function (req, res, next) {
  try {
    const title = req.body.title?.toString() || '';
    const userId = Number(res.locals.currentUser?.userId || req.cookies?.userId);
    const amount = Number(req.body.amount || 0);
    const createdAtStr = req.body.createdAt;
    const createdAt = createdAtStr ? new Date(createdAtStr) : new Date();

    await prisma.POSTS.create({
      data: {
        title,
        amount,
        userId,
        createdAt,
      },
    });
    res.status(200).redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating ");
  }
});

module.exports = router;