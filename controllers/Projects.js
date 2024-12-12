const pool  =  require("../db-config");
const moment = require('moment-timezone');
const {formatTimer} = require("../functions/globFunctions");

/* Gestione dell'aggiornamento del timer in status Running o Paused + Creazione del track */
async function updateTimer(status, req, res){
    if(req.body.projectId && req.session.userId){
        if(status === 'Running'){
            const checkProjectRunning = await pool.query(`SELECT * FROM "Projects" WHERE "Status" = $1 AND "User_id" = $2;`, [status, req.session.userId]);
            if (checkProjectRunning.rows.length != 0) {
                req.flash('ProjectError', 'A project is still running. Stop it before running a new one');
                return res.redirect('/');
            }
        }
        const updateProject = await pool.query(
            `UPDATE "Projects" 
                SET "Status" = $1 
                WHERE "Id" = $2 AND "User_id" = $3;`,
            [status, req.body.projectId, req.session.userId]
        );
        if(updateProject.rowCount > 0){
            let Now = moment().tz('Europe/Rome');
            if(status === 'Running'){
                pool.query(`INSERT INTO "Track" ("Id", "Project_id", "Start_time", "User_id") VALUES ($1,$2,$3,$4);`, 
                    [Date.now().toString(), req.body.projectId, Now, req.session.userId], (err) => {
                    if (err) {
                        console.error(err);
                        req.flash('ProjectError', 'Database error.');
                        return res.redirect('/');
                    } else {
                        return res.redirect('/');
                    }
                });
            }else{
                const TrackData = await pool.query(`SELECT * FROM "Track" WHERE "Project_id" = $1 ORDER BY "Start_time" DESC LIMIT 1;`, [req.body.projectId]);
                if(TrackData.rows.length > 0){
                    const startTime = moment(TrackData.rows[0].Start_time).tz('Europe/Rome');
                    const timeDiff = moment.duration(Now.diff(startTime));

                    const formattedDuration = [
                        String(timeDiff.hours()).padStart(2, '0'),
                        String(timeDiff.minutes()).padStart(2, '0'),
                        String(timeDiff.seconds()).padStart(2, '0')
                    ].join(':');

                    const updateTrack = await pool.query(
                        `UPDATE "Track" 
                            SET "End_time" = $1, "Total_time" = $2, "Description" = $3
                            WHERE "Id" = $4`,
                        [Now, formattedDuration, req.body.projectDescription, TrackData.rows[0].Id]
                    );
                    if(updateTrack.rowCount > 0){
                        const Project = await pool.query(`SELECT * FROM "Projects" WHERE "Id" = $1 AND "User_id" = $2;`, [req.body.projectId, req.session.userId]);
                        if (Project.rows.length > 0) {
                            const time1 = moment.duration(Project.rows[0].Time_spent);
                            const time2 = moment.duration(formattedDuration);

                            const totalDuration = time1.add(time2);

                            const totalFormatted = moment.utc(totalDuration.asMilliseconds()).format("HH:mm:ss");

                            if(totalFormatted){
                                const updateTimeSpent = await pool.query(
                                    `UPDATE "Projects" 
                                        SET "Time_spent" = $1
                                        WHERE "Id" = $2`,
                                    [totalFormatted, req.body.projectId]
                                );
                                if(updateTimeSpent.rowCount > 0){
                                    return res.redirect('/');
                                }
                            }
                        }else{
                            req.flash('ProjectError', 'Error during the track operation.');
                            return res.redirect('/');
                        }
                    }
                }else{
                    req.flash('ProjectError', 'Error during the track operation.');
                    return res.redirect('/');
                }
                
            }
        }else{
            req.flash('ProjectError', 'Error during the track operation.');
            return res.redirect('/');
        }
    }else{
        req.flash('ProjectError', 'Error during the track operation.');
        return res.redirect('/');
    }
};

/* Controlla se vi è un track attivo e somma il time_spent di progetto con la differenza tra lo start_time e l'end_time del track */
exports.setActiveTimer = async (userId) => {
    try{
        const checkActiveTimer = await pool.query(`SELECT "Id", "Project_id", "Start_time" FROM "Track" WHERE "User_id" = $1 AND "End_time" is null;`, [userId]);

        if(checkActiveTimer.rows.length > 0){
            //const checkTimeSpent = await pool.query(`SELECT "Time_spent" FROM "Projects" WHERE "Id" = $1;`, [checkActiveTimer.rows[0].Project_id]);
            //if(checkTimeSpent.rows.length > 0){
                const Now = moment().tz('Europe/Rome');
                const startTime = moment(checkActiveTimer.rows[0].Start_time).tz('Europe/Rome');
                const timeDiff = moment.duration(Now.diff(startTime));

                const formattedSubstract = [
                    String(timeDiff.hours()).padStart(2, '0'),
                    String(timeDiff.minutes()).padStart(2, '0'),
                    String(timeDiff.seconds()).padStart(2, '0')
                ].join(':');

                //const time1 = moment.duration(checkTimeSpent.rows[0].Time_spent);
                //const time2 = moment.duration(formattedSubstract);

                //const totalDuration = time1.add(time2);
                //const totalFormatted = moment.utc(totalDuration.asMilliseconds()).format("HH:mm:ss");

                let res = {
                    projectId: checkActiveTimer.rows[0].Project_id,
                    timer: formattedSubstract
                }

            return res;
            /*}else{
                return {};
            }*/

        }else{
            return {};
        }
    }catch(e){
        console.log(e);
    }
}

/* Handler per creazione di un nuovo progetto */
exports.newProject = async (req, res) => {
    const { projectName, projectColor } = req.body;
    try{
        if(projectName && projectColor){
            const checkProject = await pool.query(`SELECT * FROM "Projects" WHERE "Name" = $1;`, [projectName]);
            if (checkProject.rows.length != 0) {
                req.flash('SubmissionError', 'There\'s already a project registered with the given name.');
                res.redirect('/');
            }else{
                const created_date = new Date();
                const project  = {
                    Id: Date.now().toString(),
                    User_id: req.session.userId,
                    Name: projectName,
                    Status: "Paused",
                    Time_spent: "00:00:00",
                    Color: projectColor,
                    Created_date: created_date
                };
                
                pool.query(`INSERT INTO "Projects" ("Id", "User_id", "Name", "Status", "Time_spent", "Color", "Created_date") VALUES ($1,$2,$3,$4,$5,$6,$7);`, 
                    [project.Id, project.User_id, project.Name, project.Status, project.Time_spent, project.Color, project.Created_date], (err) => {
                    if (err) {
                        console.error(err);
                        req.flash('SubmissionError', 'Database error.');
                        res.redirect('/');
                    } else {
                        req.flash('SubmissionSuccess', 'New project added successfully!');
                        res.redirect('/');
                    }
                });
            }
        }else{
            req.flash('SubmissionError', 'I campi sono tutti obbligatori!');
            res.redirect('/');
        }
    }catch(err){
        console.log(err);
        req.flash('SubmissionError', 'Database error occurred while creating new project!');
        res.redirect('/');
    }
};

/* Handler per update di un progetto esistente */
exports.updateProject = async (req, res) => {
    const { project_id, project_name, project_color } = req.body;

    try{
        if(project_id && project_name && project_color){

            const updateProject = await pool.query(
                `UPDATE "Projects" 
                    SET "Name" = $1, "Color" = $2
                    WHERE "Id" = $3;`,
                [project_name, project_color, project_id]
            );

            if(updateProject.rowCount > 0){
                req.flash('updateDeleteProjectSucc', 'Il progetto "'+ project_name +'" è stato aggiornato con successo!');
                res.redirect('/');
            }else{
                req.flash('updateDeleteProjectErr', 'Errore in fase di update');
                res.redirect('/');
            }

        }else{
            req.flash('updateDeleteProjectErr', 'I campi sono tutti obbligatori!');
            res.redirect('/');
        }
    }catch(err){
        console.log(err);
        req.flash('updateDeleteProjectErr', 'Database error occurred while updating a project!');
        res.redirect('/');
    }
};


/* Handler per la cancellazione di un progetto esistente */
exports.deleteProject = async (req, res) => {
    const { project_id } = req.body;

    try{
        if(project_id){

            const checkExistingTracks = await pool.query(`SELECT "Id" FROM "Track" WHERE "Project_id" = $1;`, [project_id])

            if(checkExistingTracks.rowCount == 0){
                const deleteProject = await pool.query(
                    `DELETE FROM "Projects" 
                    WHERE "Id" = $1;`,
                    [project_id]
                );
                if(deleteProject.rowCount > 0){
                    req.flash('updateDeleteProjectSucc', 'Il progetto con ID: "'+ project_id +'" è stato cancellato con successo!');
                    res.redirect('/');
                }else{
                    req.flash('updateDeleteProjectErr', 'Error during the project deletion');
                    res.redirect('/');
                }
            }else{
                req.flash('updateDeleteProjectErr', 'In order to delete the project you should delete all tracks associated to it before.');
                res.redirect('/');
            }
        }else{
            req.flash('updateDeleteProjectErr', 'I campi sono tutti obbligatori!');
            res.redirect('/');
        }
    }catch(err){
        console.log(err);
        req.flash('updateDeleteProjectErr', 'Database error occurred while deleting a project!');
        res.redirect('/');
    }
};

exports.getAllProjects = async (userId) => {
    try{
        const project = await pool.query(`SELECT * FROM "Projects" WHERE "User_id" = $1 ORDER BY "Name" ASC;`, [userId])
        if(project.rowCount > 0){
            project.rows.forEach(row => {
                if (row.Time_spent) {
                  row.Time_spent = formatTimer(row.Time_spent);
                }
              });
            return project.rows;
        }else{
            return {};
        }
        
    }catch(e){
        console.log(e);
    }
};

exports.pauseTracker = async (req, res) => {
    try{
        await updateTimer("Running", req, res);
    }catch(e){
        console.log(e);
        res.redirect('/');
    }
};


exports.runTracker = async (req, res) => {
    try{
        await updateTimer("Paused", req, res);
    }catch(e){
        console.log(e);
        res.redirect('/');
    }
};

/* Generazione dell'oggetto per mostrare i tracks con paginazione */
exports.getAllTracks = async (userId, page, limit) => {
    try{
        const offset = (page - 1) * limit;

        const getData = await pool.query(`
            SELECT t."Id", 
                t."Project_id", 
                p."Name", 
                "Description", 
                TO_CHAR("Start_time" AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY - HH24:MI:SS') as "Start_time", 
                TO_CHAR("End_time" AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY - HH24:MI:SS') as "End_time", 
                "Total_time" 
            FROM "Track" as t 
                INNER JOIN "Projects" as p ON p."Id" = t."Project_id" 
                WHERE t."User_id" = $1 ORDER BY t."Start_time" DESC LIMIT $2 OFFSET $3;`, [userId, limit, offset]);

        const getDataCount = await pool.query(`SELECT COUNT(*) FROM "Track" WHERE "User_id" = $1;`, [userId]);

        if(getData.rows.length > 0){

            getData.rows.forEach(row => {
                if (row.Total_time) {
                  row.Total_time = formatTimer(row.Total_time);
                }
                if (row.Start_time) {
                    const startUpdate = moment(row.Start_time, 'DD/MM/YYYY - HH:mm:ss').format('YYYY-MM-DDTHH:mm');
                    row.Start_time_update = startUpdate;
                }
        
                if (row.End_time) {
                    const endUpdate = moment(row.End_time, 'DD/MM/YYYY - HH:mm:ss').format('YYYY-MM-DDTHH:mm');
                    row.End_time_update = endUpdate;
                }
            });
            
            return {
                data: getData.rows,
                totalItems: parseInt(getDataCount.rows[0].count, 10),
                totalPages: Math.ceil(getDataCount.rows[0].count / limit)
            }

        }else{
            return {};
        }

    }catch(e){
        console.log(e);
    }
}
