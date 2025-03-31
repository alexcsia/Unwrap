import express from 'express';
import passport from 'passport';

const router = express.Router();

router.use(passport.initialize());
router.use(passport.session());

router.get('/dashboard', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('dashboard', { user: req.user });
    } else {
        res.redirect('/auth/spotify');
    }
});

export default router;