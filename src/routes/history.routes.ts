import express from 'express';
import passport from 'passport';
import { getListeningHistory } from '../controllers/history.controller';

const router = express.Router();

router.get("/history", passport.session(), getListeningHistory)