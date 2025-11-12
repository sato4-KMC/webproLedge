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
    const title = req.body.title;
    const amount = req.body.amount;
    const userId = req.body.userId;
    const postId = req.body.postId;
    
    await prisma.ITEMS.create({data: {
      title: title,
      amount: amount,
      postId: postId,
      userId: userId,
    }});
    
    res.status(200).redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating ");
  }
});

module.exports = router;