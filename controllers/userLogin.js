const  bcrypt  =  require("bcrypt");
const  pool  =  require("../db-config");
const  jwt  =  require("jsonwebtoken");

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const data = await pool.query(`SELECT * FROM "Users" WHERE "Email" = $1;`, [email]) //Verifying if the user exists in the database
        const user = data.rows;
        if (user.length === 0) {
            req.flash('SubmissionError', 'User is not registered, sign up first!');
            res.redirect('/login');
        } else {
            bcrypt.compare(password, user[0].Password, (err, result) => { //Comparing the hashed password
                if (err) {
                    req.flash('SubmissionError', 'Server Error');
                    res.redirect('/login');
                } else if (result === true) { //Checking if credentials match
                    const token = jwt.sign( { email: email, }, process.env.JWT_SECRET );

                    req.session.isLoggedIn = true;
                    req.session.userId = user[0].Id;
                    req.session.name = user[0].Name;
                    req.session.email = email;
                    req.session.token = token;

                    res.redirect('/');
                }
                else {
                    //Declaring the errors
                    if (result != true){
                        req.flash('SubmissionError', 'The password is not correct');
                        res.redirect('/login');
                    }
                }
            })
        }
    } catch (err) {
        console.log(err);
        req.flash('SubmissionError', 'Database error occurred while signing in!');
        res.redirect('/login');
    };
};