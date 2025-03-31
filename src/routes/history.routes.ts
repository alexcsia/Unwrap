import express from 'express';
import passport from 'passport';
import multer from 'multer';
import { getListeningHistory, processZipFile } from '../controllers/history.controller';

const router = express.Router();
const upload = multer({dest: "/uploads"})

router.get("/history", passport.session(), async (req, res) => {
    if(!req.isAuthenticated()) return res.redirect("/");

    const user: any = req.user;
    let history = await getListeningHistory(user)
    res.render("history", { history: history })
});

router.get("/upload", (req, res) => {
    res.render("upload");
});

router.post("/upload", upload.single("history"), passport.session(), (req, res, next) => {
    console.log(`Recieved file ${req.file}`)
    next()
}, processZipFile);

export default router;