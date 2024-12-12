const express = require('express');
const session = require('express-session');
const flash = require('express-flash')
const cors = require('cors');

require('dotenv').config();
const env = process.env;

//const db = require('./db-config');

const app = express();
//app.use(express.cookieParser('keyboard cat'));
app.use(flash());
app.use(session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 14400000 } // 4 Hours
}));

app.use((req, res, next) => {
    res.locals.flashMessages = {
        error: req.flash('SubmissionError'),
        success: req.flash('SubmissionSuccess'),
        trackError: req.flash('ProjectError'),
        UpdateInsertTrackError: req.flash('UpdateInsertTrackError'),
        UpdateInsertTrackSuccess: req.flash('UpdateInsertTrackSuccess'),
        updateDeleteProjectErr: req.flash('updateDeleteProjectErr'),
        updateDeleteProjectSucc: req.flash('updateDeleteProjectSucc'),
    };
    next();
});

app.use(express.static("public"));

app.use(express.json());
app.use(cors());

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: true}));

const mainRoutes = require('./routes/index');
app.use('/', mainRoutes);

app.listen(env.PORT, () => {
    console.log('Listening on port ' + env.PORT);
});