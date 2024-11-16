const  bcrypt  =  require("bcrypt");
const  pool  =  require("../db-config");
const  jwt  =  require("jsonwebtoken");


exports.register  =  async (req, res) => {
    const { name, email, password } =  req.body;
    try {
        const  data  =  await pool.query(`SELECT * FROM "Users" WHERE "Email" = $1;`, [email]);
        const  arr  =  data.rows;
        if (arr.length  !=  0) {
            req.flash('SubmissionError', 'A user is already registered with the given email.');
            res.redirect('/register');
        }
        else {
            bcrypt.hash(password, 10, (err, hash) => {
                if (err){
                    req.flash('SubmissionError', 'Server Error');
                    res.redirect('/register');
                }
                const created_date = new Date();
                const  user  = {
                    id: Date.now().toString(),
                    name,
                    email,
                    password: hash,
                    created_date: created_date
                };
                
                var  flag  =  1;

                pool.query(`INSERT INTO "Users" ("Id", "Name", "Email", "Password", "Created_date") VALUES ($1,$2,$3,$4,$5);`, [user.id, user.name, user.email, user.password, user.created_date], (err) => {
                    if (err) {
                        flag  =  0;
                        console.error(err);
                        req.flash('SubmissionError', 'Database error.');
                        res.redirect('/register');
                    } else {
                        flag  =  1;
                        req.flash('SubmissionSuccess', 'Registered successfully! Login below with your new credentials.');
                        res.redirect('/login');
                        //res.status(200).send({ message: 'User added to database, not verified' });
                    }
                });
                if (flag) {
                    const  token  = jwt.sign({ email: user.email }, process.env.JWT_SECRET );
                };
            });
        }
    } catch (err) {
        console.log(err);
        req.flash('SubmissionError', 'Database error during the registration.');
        res.redirect('/register');
    };
}