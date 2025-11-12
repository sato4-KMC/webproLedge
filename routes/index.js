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

// --- helpers ---
function buildWhereFromQuery(q) {
  const where = {};
  const qType = q.qType;
  const qDateStart = q.qDateStart;
  const qDateEnd = q.qDateEnd;
  // amount filter based on qType
  if (qType === "支出") {
    where.amount = { gte: 0 };
  } else if (qType === "収入") {
    where.amount = { lt: 0 };
  }
  // createdAt filters
  if (qDateStart || qDateEnd) {
    where.createdAt = {};
    if (qDateStart) where.createdAt.gte = new Date(qDateStart);
    if (qDateEnd) {
      const end = new Date(qDateEnd);
      // include the whole end day if a date (no time) is provided
      if (/^\d{4}-\d{2}-\d{2}$/.test(qDateEnd)) {
        end.setHours(23,59,59,999);
      }
      where.createdAt.lte = end;
    }
  }
  return where;
}

function computeTotals(posts) {
  let expense = 0; // amount <= 0 の合計
  let incomeAbs = 0; // amount > 0 の絶対値合計
  for (const p of posts || []) {
    const raw = p?.amount ?? 0;
    const n = Number(raw);
    if (Number.isFinite(n)) {
      if (n <= 0) expense += Math.abs(n);
      else incomeAbs += Math.abs(n);
    }
  }
  const total = incomeAbs - expense; // フィルター中 = 支出と収入(絶対値)の合計
  return { expense, incomeAbs, total };
}

// 新規作成用のフォーム表示
router.get("/", requireAuth, async function (req, res, next) {
  try {
    const userId = Number(res.locals.currentUser?.userId || req.cookies?.userId);
    const posts = await prisma.POSTS.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
    });
    const { expense, incomeAbs, total } = computeTotals(posts);
    res.render("index", {
      result: posts,
      qType: "",
      qDateStart: "",
      qDateEnd: "",
      expenseTotal: expense,
      incomeTotal: incomeAbs,
      totalFiltered: total,
    });
  } catch (e) {
    console.error(e);
    // 失敗しても result は必ず渡す
    res.render("index", { result: [] });
  }
});

// フォーム表示提出後の処理
router.post("/", requireAuth, async function (req, res, next) {
  try {
    const userId = Number(res.locals.currentUser?.userId || req.cookies?.userId);
    const where = buildWhereFromQuery(req.body);
    where.userId = userId;
    console.log('DEBUG / filter where =', JSON.stringify(where));

    const filteredPosts = await prisma.POSTS.findMany({ where, orderBy: { createdAt: "desc" } });

    const { expense, incomeAbs, total } = computeTotals(filteredPosts);

    res.render("index", {
      qType: req.body.qType || "",
      qDateStart: req.body.qDateStart || "",
      qDateEnd: req.body.qDateEnd || "",
      result: filteredPosts,
      expenseTotal: expense,
      incomeTotal: incomeAbs,
      totalFiltered: total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching posts");
  }
});

module.exports = router;