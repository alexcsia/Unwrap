import express from 'express';
import passport from 'passport';
import { getListeningHistory } from '../controllers/history.controller';

const router = express.Router();

router.get("/history", passport.session(), async (req, res) => {
    if(!req.isAuthenticated()) return res.redirect("/");

    const user: any = req.user;
    let history = await getListeningHistory(user)
    res.render("history", { history: history })
})

export default router;