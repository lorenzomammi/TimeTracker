const express = require('express');
const {newProject, updateProject, deleteProject, getAllProjects, runTracker, pauseTracker, setActiveTimer, getAllTracks} = require("../controllers/Projects");
const {updateTrack, insertTrack, deleteTrack, trackReport} = require("../controllers/Tracks");
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
    res.render('register.ejs');
});

router.get('/login', checkSessionLogReg, (req, res) => {
    res.render('login.ejs');
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
router.post('/updateProject', updateProject);
router.post('/deleteProject', deleteProject);

/* Timer Routes */
router.post('/pause', pauseTracker);
router.post('/run', runTracker);

/* Tracks Routes */
router.post('/updateTrack', updateTrack);
router.post('/newTrack', insertTrack);
router.post('/deleteTrack', deleteTrack);


module.exports = router;