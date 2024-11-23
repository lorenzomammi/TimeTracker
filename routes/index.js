const express = require('express');
const {newProject, getAllProjects, runTracker, pauseTracker, setActiveTimer, getAllTracks} = require("../controllers/Projects");
const {updateTrack, insertTrack, trackReport} = require("../controllers/Tracks");
const {register} = require("../controllers/userRegister");
const {login} = require("../controllers/userLogin");
const {getSelectProjects} = require("../functions/globFunctions");


const router = express.Router();

// Middleware per il controllo della sessione sulle pagine statiche
function checkSessionStatic(req, res, next) {
    if (req.session.isLoggedIn && req.session.token) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Middleware per il controllo della sessione sulle pagine di login/register
function checkSessionLogReg(req, res, next) {
    if (!req.session.isLoggedIn && !req.session.token) {
        next();
    } else {
        res.redirect('/');
    }
}

/* GET ROUTES */
router.get('/', checkSessionStatic, async (req, res) => {

    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    try{ 
        const projects = await getAllProjects(req.session.userId);
        const ActiveTimer = await setActiveTimer(req.session.userId);
        const AllTracks = await getAllTracks(req.session.userId, page, limit);
        const Report = await trackReport(req.session.userId);
        const selectProjects = await getSelectProjects(req.session.userId);

        if(Object.keys(AllTracks).length != 0){
            AllTracks.currentPage = page;
        }

        res.render('index', { 
            username: req.session.name, 
            email: req.session.email, 
            error: req.flash('SubmissionError'), 
            success: req.flash('SubmissionSuccess'),
            trackError: req.flash('ProjectError'),
            UpdateInsertTrackError: req.flash('UpdateInsertTrackError'),
            UpdateInsertTrackSuccess: req.flash('UpdateInsertTrackSuccess'),
            projects,
            ActiveTimer,
            AllTracks,
            reportData: Report,
            selectProjects
        });

    }catch(e){
        console.error("Errore durante il recupero dei progetti:", e);
        res.status(500).send("Errore interno del server");
    }
});

router.get('/register', checkSessionLogReg, (req, res) => {
    res.render('register.ejs', { error: req.flash('SubmissionError') });
});

router.get('/login', checkSessionLogReg, (req, res) => {
    res.render('login.ejs', { error: req.flash('SubmissionError'), success: req.flash('SubmissionSuccess') });
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.log(err);
      } else {
        res.redirect('/login');
      }
    });
  });


/* POST ROUTES */
/* Login/register Routes */
router.post('/register', register);
router.post('/login', login);

/* Projects Routes */
router.post('/newProject', newProject);

/* Timer Routes */
router.post('/pause', pauseTracker);
router.post('/run', runTracker);

/* Tracks Routes */
router.post('/updateTrack', updateTrack);
router.post('/newTrack', insertTrack);


module.exports = router;