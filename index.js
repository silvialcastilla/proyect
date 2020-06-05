const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const nodeMailer = require('nodemailer');
const validator = require("email-validator");
const MongoClient = require('mongodb').MongoClient;
const databaseUrl = "mongodb://localhost:27017/";

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


function sendMailWithToken(adress, uri) {
    let transporter = nodeMailer.createTransport({
        service: 'hotmail',
        auth: {
            // should be replaced with real sender's account
            user: 'silvia.2@hotmail.com.ar',
            pass: ''
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
            pass: ''
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

server.post('/signup', (req, res) => {

    let password = req.body.password;
    let email = req.body.email

    if ((password.length < 10 || password.length > 20) || (email.length < 10 || email.length > 40) || !validator.validate(email)) {
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
    res.sendFile(path.join(__dirname, '/public', 'confirmed.html'))

    MongoClient.connect(databaseUrl, (err, database) => {
        let exercice = database.db('exercice');
        let comparetoken = req.query.token

        let member = exercice.collection('sectamembers').findOne({ "token": comparetoken })

        if (member) {
            sendMailVerified(member.email, `${domain}/Login`)
            exercice.collection('sectamembers').delete(member.token)
        } else {
            console.log('No puedes acceder a los datos');
            res.redirect('/');
        }
        database.close()
            // [4509405950, 589934859043]

    });
})



server.listen(listenPort, () => console.log(`Server started listening on ${listenPort}`));