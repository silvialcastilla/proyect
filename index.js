const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const nodeMailer = require('nodemailer');
const MongoClient = require('mongodb').MongoClient;
const databaseUrl = "mongodb://localhost:27017/";
const jwt = require('jwt-simple');

const { maketoken } = require('../proyect/config.js')
const { artc } = require('../../artc')

const server = express();
const listenPort = 8080;
const domain = `http://localhost:${listenPort}`

server.use(express.static('public'))

server.use(bodyParser.urlencoded({ extended: false }));
server.use(bodyParser.json());

function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


/**/

function sendMailWithToken(adress, uri) {

    let transporter = nodeMailer.createTransport({
        service: 'hotmail',
        auth: {
            // should be replaced with real sender's account
            user: 'silvia.2@hotmail.com.ar',
            pass: artc
        }
    });
    let mailOptions = {
        // should be replaced with real recipient's account
        to: adress,
        subject: "You successfully enter in our page",
        text: `Para verificar tu cuenta entra en ${uri}`
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message %s sent: %s', info.messageId, info.response);
    });
}

function sendMailVerified(adress, uri) {
    let transporter = nodeMailer.createTransport({
        service: 'hotmail',
        auth: {
            // should be replaced with real sender's account
            user: 'silvia.2@hotmail.com.ar',
            pass: artc
        }
    });
    let mailOptions = {
        // should be replaced with real recipient's account
        to: adress,
        subject: "Registro Confirmado",
        text: `Entra aquí para registrarte ${uri}`
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message %s sent: %s', info.messageId, info.response);
    });
}

function logado(user) {
    const payload = {
        usuario: user.username,
        correo: user.motdepass
    }
    const SECRET_TOKEN = maketoken(15)

    return jwt.encode(payload, SECRET_TOKEN)
}

console.log(logado)


server.post('/signup', (req, res) => {

    let password = req.body.password;
    let regExppassword = /(?=.{0,}[A-Z])(?=.{0,}[a-z])(?=.{0,}[0-9])(?=.{0,}[!@#\$%\^&\*])[A-Za-z0-9!@#\$%\^&\*]{10,20}/g
    let testRegpassword = regExppassword.test(password)
    let email = req.body.email
    let regExpemail = /(?=^.{10,254}$)(([A-Za-z][\w_\.]*){3,})@(([A-Za-z][\w-]*){3,})\.[a-zA-Z]*/g
    let testRegemail = regExpemail.test(email)
    let raza = req.body.raza;
    let regExpraza = /(\W|^)(humano|elfo|hobbit|enano)(\W|$)/g
    let testRegraza = regExpraza.test(raza)

    if (testRegemail == false || testRegpassword == false || testRegraza == false) {
        res.redirect('/');
    } else {
        res.redirect('/ConfirmEmail');
        let token = makeid(10)
        sendMailWithToken(email, `${domain}/checkEmail?token=${token}`)

        MongoClient.connect(databaseUrl, (err, database) => {
            let exercice = database.db('exercice');
            let sectaobject = {
                email: req.body.email,
                password: req.body.password,
                raza: req.body.raza,
                token: token
            }
            exercice.collection('sectamembers').insertOne(sectaobject);
            database.close()
        });
    }
})

server.get('/ConfirmEmail', (req, res) => {
    res.sendFile(path.join(__dirname, '/public', 'confirm.html'));
})

server.get('/checkEmail', (req, res) => {

    async function validateToken() {
        try {
            client = await MongoClient.connect(databaseUrl)
            dbTokens = client.db('exercice')
            let member = dbTokens.collection('sectamembers')
            let comparetoken = req.query.token

            //let result = await member.find({ "token": comparetoken }).count();
            let result = await member.find({ "token": comparetoken }, { email: 1, _id: 0 }).toArray();
            console.log(result[0].email);

            console.log(comparetoken + " - " + result);
            if (result[0].email !== undefined) {
                sendMailVerified(result[0].email, `${domain}/Login`)
                member.update({ token: comparetoken }, { $unset: { 'token': '' } })
                res.redirect('/ConfirmedEmail')
            } else {
                console.log('No puedes acceder a los datos');
                res.redirect('/');
            }
        } catch (error) {
            console.error(error)
        } finally {
            client.close()
        }
    }
    validateToken()
})

server.get('/ConfirmedEmail', (req, res) => {
    res.sendFile(path.join(__dirname, '/public', 'confirmed.html'));
})

server.get('/Login', (req, res) => {
    res.sendFile(path.join(__dirname, '/public', 'login.html'));
})

server.post('/checkUser', (req, res) => {

    /*async function validateUser(email, password) {
        let compareemail = email
        let comparepassword = req.body.motdepass
        console.log(compareemail)
        try {
            client = await MongoClient.connect(databaseUrl)
            dbTokens = client.db('exercice')
            let member = dbTokens.collection('sectamembers')


            let resultemail = await member.find({ "email": compareemail }) //silvia@hotmail.com
            let resultpassword = await member.find({ "password": comparepassword }) //soy
            let notoken = await member.find({ "token": { $exist: false } })

            if ((resultemail.toArray().length > 0) || (resultpassword.toArray().length > 0) || notoken) {
                await member.aggregate({ $addFields: { "authtoken": logado() } }) //Pasarla por insert
                res.redirect('/dashboard');
            } else {
                res.redirect('/login');
            }
        } catch (error) {
            console.error(error)
        } finally {
            client.close()
        }
}; validateUser() */
})

server.listen(listenPort, () => console.log(`Server started listening on ${listenPort}`));