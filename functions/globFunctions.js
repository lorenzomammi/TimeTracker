const pool  =  require("../db-config");
const moment = require('moment-timezone');

exports.formatTimer = (timer) => {
    const [hours, minutes, seconds] = timer.split(':').map(Number);

    let formattedTime = '';

    formattedTime += hours > 0 ? hours+'h ' : '';
    formattedTime += minutes > 0 ? minutes+'m ' : '';
    formattedTime += seconds > 0 ? seconds+'s ' : '';

    return formattedTime.trim();
}

exports.getSelectProjects = async (userId) => {
    try{
        const getProjects = await pool.query(`SELECT "Id", "Name" FROM "Projects" WHERE "User_id" = $1;`, [userId]);
        if (getProjects.rows.length > 0) {
            return getProjects.rows;
        }else{
            return {};
        }
    }catch(e){
        console.log(e);
        return {};
    }
}

exports.trackTimeDiff = (time1, time2) => {
    const timeDiff = moment.duration(time2.diff(time1));

    const total_time = [
        String(timeDiff.hours()).padStart(2, '0'),
        String(timeDiff.minutes()).padStart(2, '0'),
        String(timeDiff.seconds()).padStart(2, '0')
    ].join(':');

    return total_time;
}

exports.updateTrackTimeSpent = async (project_id, req, track_id, method) => {
    const Track = await pool.query(`SELECT "Total_time" FROM "Track" WHERE "Project_id" = $1 AND "User_id" = $2;`, [project_id, req.session.userId]);
    const flashLabel = method == 'insert' ? 'inserimento' : 'update';
    if (Track.rows.length > 0) {
        let baseDuration = moment.duration();

        Track.rows.forEach(row => {
            const duration = moment.duration(row.Total_time);
            baseDuration.add(duration);
        });

        const totalTimeSpent = [
            String(baseDuration.hours()).padStart(2, '0'),
            String(baseDuration.minutes()).padStart(2, '0'),
            String(baseDuration.seconds()).padStart(2, '0')
        ].join(':');

        console.log(totalTimeSpent);

        const updateProject = await pool.query(
            `UPDATE "Projects" 
                SET "Time_spent" = $1
                WHERE "Id" = $2;`,
            [totalTimeSpent, project_id]);

        if(updateProject.rowCount > 0){
            if(method == 'insert'){
                req.flash('UpdateInsertTrackSuccess', 'Track con id: '+ track_id +' inserito con successo');
                return true;
            }else{
                req.flash('UpdateInsertTrackSuccess', 'Track con id: '+ track_id +' modificato con successo');
                return true;
            }
        }else{
            req.flash('UpdateInsertTrackError', 'Errore in fase di ' + flashLabel);
            return true;
        }

    }else{
        req.flash('UpdateInsertTrackError', 'Errore in fase di ' + flashLabel);
        return true;
    }
}


exports.deleteTrackTimeSpent = async (track_id, req) => {
    const Track = await pool.query(`SELECT "Total_time", "Project_id" FROM "Track" WHERE "Id" = $1;`, [track_id]);
    if(Track.rows.length > 0){
        const Project = await pool.query(`SELECT "Time_spent" FROM "Projects" WHERE "Id" = $1 AND "User_id" = $2;`, [Track.rows[0].Project_id, req.session.userId]);
        if(Project.rows.length > 0){
            const time1 = moment.duration(Project.rows[0].Time_spent);
            const time2 = moment.duration(Track.rows[0].Total_time);
            const timeDiff = time1.subtract(time2);

            const totalTimeSpent = [
                String(timeDiff.hours()).padStart(2, '0'),
                String(timeDiff.minutes()).padStart(2, '0'),
                String(timeDiff.seconds()).padStart(2, '0')
            ].join(':');

            const updateProject = await pool.query(
                `UPDATE "Projects" 
                    SET "Time_spent" = $1
                    WHERE "Id" = $2;`,
                [totalTimeSpent, Track.rows[0].Project_id]);

            if(updateProject.rowCount > 0){
                return true;
            }else{
                return false;
            }
        }else{
            return false;
        }
    }else{
        return false;
    }

}