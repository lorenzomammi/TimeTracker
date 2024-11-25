const pool  =  require("../db-config");
const moment = require('moment-timezone');
const {formatTimer, trackTimeDiff, updateTrackTimeSpent, deleteTrackTimeSpent} = require("../functions/globFunctions");

exports.updateTrack = async (req, res) => {

    const {track_id, start_time, end_time, description, project_id} = req.body;
    const startTimeFormatted = start_time.replace("T", " ");
    const endTimeFormatted = end_time.replace("T", " ");

    const time1 = moment(startTimeFormatted).tz('Europe/Rome');
    const time2 = moment(endTimeFormatted).tz('Europe/Rome');

    try{
        if(time2 > time1 && time2 != time1){
            
            const total_time = trackTimeDiff(time1, time2);

            const updateTrack = await pool.query(
                `UPDATE "Track" 
                    SET "Start_time" = $1, "End_time" = $2, "Description" = $3, "Total_time" = $4
                    WHERE "Id" = $5;`,
                [startTimeFormatted, endTimeFormatted, description, total_time, track_id]
            );
            if(updateTrack.rowCount > 0){

                if(await updateTrackTimeSpent(project_id, req, track_id, 'update')){
                    res.redirect('/');
                }

            }else{
                req.flash('UpdateInsertTrackError', 'Errore in fase di update');
                res.redirect('/');
            }
        }else{
            req.flash('UpdateInsertTrackError', 'C\è un problema con le date e gli orari inseriti');
            res.redirect('/');
        }
        
    }catch(e){
        console.log(e);
        res.redirect('/');
    }
}

exports.insertTrack = async (req, res) => {
    const {track_project_id, track_start_time, track_end_time, track_description} = req.body;
    const startTimeFormatted = track_start_time.replace("T", " ");
    const endTimeFormatted = track_end_time.replace("T", " ");

    const time1 = moment(startTimeFormatted).tz('Europe/Rome');
    const time2 = moment(endTimeFormatted).tz('Europe/Rome');

    try{
        if(time2 > time1 && time2 != time1){

            const total_time = trackTimeDiff(time1, time2);
            const newTrackId = Date.now().toString();

            await pool.query(`INSERT INTO "Track" ("Id", "Project_id", "Start_time", "End_time", "Total_time", "User_id", "Description") VALUES ($1,$2,$3,$4,$5,$6,$7);`, 
                [newTrackId, track_project_id, startTimeFormatted, endTimeFormatted, total_time, req.session.userId, track_description]);

            if(await updateTrackTimeSpent(track_project_id, req, newTrackId, 'insert')){
                res.redirect('/');
            }

        }else{
            req.flash('UpdateInsertTrackError', 'C\è un problema con le date e gli orari inseriti');
            res.redirect('/');
        }
    }catch(e){
        console.log(e);
        req.flash('UpdateInsertTrackError', 'Database error.');
        res.redirect('/');
    }
}

exports.deleteTrack = async (req, res) => {
    const track_id = req.body.track_id;
    try{
        if(track_id){
            const updateProjectTS = await deleteTrackTimeSpent(track_id, req);
            if(updateProjectTS == true){
                const deleteTrack = await pool.query(
                    `DELETE FROM "Track" 
                    WHERE "Id" = $1;`,
                    [track_id]
                );
                if(deleteTrack.rowCount > 0){
                    req.flash('UpdateInsertTrackSuccess', 'Track con id: '+ track_id +' cancellato con successo');
                    res.redirect('/');
                }else{
                    req.flash('UpdateInsertTrackError', 'Errore in fase di cancellazione');
                    res.redirect('/');
                }
            }else{
                req.flash('UpdateInsertTrackError', 'Errore di database');
                res.redirect('/');
            }
            
        }else{
            req.flash('UpdateInsertTrackError', 'L\'eliminazione del record non è andata a buon fine.');
            res.redirect('/');
        }
        
    }catch(e){
        console.log(e);
        res.redirect('/');
    }
}

exports.trackReport = async (userId) => {
    try{
        const getTrackData = await pool.query(`
            SELECT 
                p."Name", 
                TO_CHAR(SUM("Total_time"::INTERVAL), 'HH24:MI:SS') AS Total_time, 
                TO_CHAR(t."End_time", 'FMMonth') AS Month_name,
                EXTRACT(MONTH FROM t."End_time") AS Month,
                EXTRACT(YEAR FROM t."End_time") as Year
            FROM "Track" as t
                INNER JOIN "Projects" as p on p."Id" = t."Project_id"
            WHERE t."User_id" = $1 AND t."Total_time" is not null
            GROUP BY p."Name", Month, Year, Month_name
            ORDER BY Year, Month DESC;`, [userId]);

            if(getTrackData.rows.length > 0){

            // Ristruttura i dati in un oggetto annidato per anno e mese
            const reportData = {};

            getTrackData.rows.forEach(row => {
                const { year, month_name, Name, total_time } = row;
                
                // Verifica se l'anno esiste già nell'oggetto
                if (!reportData[year]) {
                    reportData[year] = {};
                }
                
                // Verifica se il mese esiste già all'interno dell'anno
                if (!reportData[year][month_name]) {
                    reportData[year][month_name] = [];
                }
                
                // Aggiungi il progetto alla lista del mese
                reportData[year][month_name].push({
                    projectName: Name,
                    totalTime: formatTimer(total_time)
                });
            });

            return reportData

            }else{
                return {};
            }

    }catch(e){
        console.log(e);
    }
}