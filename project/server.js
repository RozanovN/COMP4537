const mysql = require("mysql2");
const http = require("http");
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const axios = require('axios');
const strings = require("./strings");
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    swagger: '2.0',
    info: {
      title: 'Project API',
      version: '1.0.0',
    },
  },
  apis: ['./swagger.js'], // files containing annotations as above
};

const openapiSpecification = swaggerJsdoc(options);

var userCon;
var deleteCon;

const user = {
    host: 'localhost',
    user: 'user',
    password: '123!@#qwe',
    database: 'project',
    multipleStatements: true
};

const delete_user = {
    host: 'localhost',
    user: 'delete_user',
    password: '456$%^rty',
    database: 'project',
    multipleStatements: true
};

const stats = {
    '/COMP4537/project/api/v1/register': {'Requests': 0, 'Method': 'POST'},
    '/COMP4537/project/api/v1/login': {'Requests': 0, 'Method': 'POST'},
    '/COMP4537/project/api/v1/stats': {'Requests': 0, 'Method': 'GET'},
    "/COMP4537/project/api/v1/consumption": {'Requests': 0, 'Method': 'GET'},
    "/COMP4537/project/api/v1/convert_handwritten": {'Requests': 0, 'Method': 'POST'},
    "/COMP4537/project/api/v1/user": {'Requests': 0, 'Method': 'DELETE'},
    '/COMP4537/project/api/v1/forgot_password': {'Requests': 0, 'Method': 'POST'},
    '/COMP4537/project/api/v1/reset_password': {'Requests': 0, 'Method': 'PATCH'}
}

const transporter = nodemailer.createTransport({
    host: 'mail.nrsoftarch4537.com',
    port: 465,
    secure: true, 
    auth: {
      user: 'reset_password@nrsoftarch4537.com',
      pass: '123QWE!@#qwe'
    }
});

const secretKey = 'ff178d0a07f7478883cf80b1d504873d9b25d416a1c553dd093d08c9785151aa';
const passwordResetTokens = {};

function hash(originalStr) {
    return crypto.createHash('sha256').update(originalStr).digest('hex');
}

function isMissingFields(fields, data, res) {
    let missingFields = [];
    fields.forEach((x) => {
        if (!data[x]) {
            missingFields.push(x);
        }
    });
    if (missingFields.length > 0) {
        let message = strings.MISSING_FIELDS;
        missingFields.forEach((x, i) => {
            message += x;
            if (i < missingFields.length - 1) {
                message += ', ';
            }
        });
        message += ".";
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            "message": message,
            "entry": data,
        }));
        console.log(message);
        return true;
    }
    return false;
}

function handleRigestration(req, res) {
    let data = "";
    req.on("data", (chunk) => {
      if (chunk !== null) {
        data += chunk;
      }
    });
    req.on("end", () => {
        stats["/COMP4537/project/api/v1/register"].Requests += 1;
        data = JSON.parse(data);
        if (isMissingFields(['username', 'password', 'email'], data, res)) {
            return;
        }
        userCon.query(
            `INSERT INTO user (username, email, password, role) VALUES ('${data.username}', '${data.email}', '${hash(data.password)}', 'user'); INSERT INTO api_consumption (calls_made, userid) VALUES (1, (SELECT LAST_INSERT_ID()));`, (err, result) => {
            console.log(JSON.stringify(result));
            if (err) {
                console.error(err);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    "error": strings.SERVER_ERROR,
                }));
            } else {
                res.writeHead(201, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    "message": strings.REGISTER_SUCCESS,
                }));
            }
        });
    });
}

function auth(data, res) {
    data = JSON.parse(data);
    if (isMissingFields(['email', 'password'], data, res)) {
        return;
    }
    userCon.query(`SELECT * FROM user WHERE email = '${data.email}'  AND password = '${hash(data.password)}';`, (err, result) => {
        console.log(JSON.stringify(result));
        if (err) {
            console.error(err)
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                "error": strings.SERVER_ERROR,
            }));
        } else if (result.length === 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                "error": strings.NO_VALID_TOKEN + "; " + strings.INVALID_LOGIN,
            }));
        } else {
            console.log(result[0].userid);
            updateConsumption(result[0].userid);
            token = jwt.sign({'userId': result[0].userid}, secretKey);
            res.writeHead(200, { 
                "Content-Type": "application/json",
                'Set-Cookie': `${token}; HttpOnly;Max-Age=60`,
            });
            res.end(JSON.stringify({
                "message": strings.LOGIN_SUCCESS,
                "role": result[0].role
            }));
        }
    });
}

function handleLogin(req, res) {
    let data = "";
    req.on("data", (chunk) => {
      if (chunk !== null) {
        data += chunk;
      }
    });
    req.on("end", () => {
        stats["/COMP4537/project/api/v1/login"].Requests += 1;
        const cookie = req.headers.cookie;
        console.log(cookie);
        if (cookie) {    
            try {
                const decodedToken = jwt.verify(cookie, secretKey);
                console.log(decodedToken);
                const userId = decodedToken.userId;
                console.log(userId);
                userCon.query(`SELECT * FROM user WHERE userid=${userId};` , (err, result) => {
                    if (!err && result[0].role) {
                        updateConsumption(userId);
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({
                            "message": strings.LOGIN_SUCCESS,
                            "role": result[0].role
                        }));
                    } else {
                        console.error(err);
                        auth(data, res);
                    }
                });
            } catch (error) {
                console.error(error);
                auth(data, res);
            }
        } else {
            auth(data, res); 
        }
    });
}

function handleStats(req, res) {
    stats["/COMP4537/project/api/v1/stats"].Requests += 1;
    const cookie = req.headers.cookie;
    console.log(cookie);
    if (cookie) {    
        try {
            const decodedToken = jwt.verify(cookie, secretKey);
            console.log(decodedToken);
            const userId = decodedToken.userId;
            console.log(userId);
            userCon.query(`SELECT * FROM user WHERE userid=${userId};` , (err, result) => {
                if (err) {
                    console.error(err)
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        "error": strings.SERVER_ERROR,
                    }));
                } else if (result[0].role) {
                    if (result[0].role === 'admin') {
                        let send_stats = [];
                        Object.keys(stats).forEach(endpoint => {
                            let temp_stat = {'Endpoint': endpoint};
                            Object.keys(stats[endpoint]).forEach(key => {
                                temp_stat[key] = stats[endpoint][key];
                            });
                            send_stats.push(temp_stat);
                        });
                        updateConsumption(userId);
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({
                            "message": strings.STATS_SUCCESS,
                            "stats": send_stats
                        }));
                    } else {
                        res.writeHead(403, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({
                            "error": strings.INVALID_TOKEN + '; ' + strings.NOT_ADMIN,
                        }));
                    }
                } else {
                    res.writeHead(403, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        "error": strings.INVALID_TOKEN,
                    }))
                }
            });
        } catch (error) {
            console.error(error);
            res.writeHead(403, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                "error": strings.INVALID_TOKEN,
            }))
        }
    } else {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            "error": strings.NOT_ADMIN,
        }))
    }
}

function updateConsumption(userid) {
    userCon.query(`UPDATE api_consumption SET calls_made = calls_made + 1 WHERE userid = ${userid};` , (err, result) => {
        if (err) {
            console.error(err);
        } else {
            console.log(result);
        }
    });
}

function handleConsumption(req, res) {
    stats["/COMP4537/project/api/v1/consumption"].Requests += 1;
    const cookie = req.headers.cookie;
    console.log(cookie);
    if (cookie) {    
        try {
            const decodedToken = jwt.verify(cookie, secretKey);
            console.log(decodedToken);
            const userId = decodedToken.userId;
            console.log(userId);
            userCon.query(`SELECT * FROM user WHERE userid=${userId};` , (err, result) => {
                if (err) {
                    console.error(err)
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        "error": strings.SERVER_ERROR,
                    }));
                } else if (result[0].role) {
                    if (result[0].role === 'admin') {
                        updateConsumption(userId);
                        // query written by chatGPT
                        userCon.query(`SELECT u.email, COALESCE(ac.calls_made, 0) AS calls_made FROM user u LEFT JOIN api_consumption ac ON u.userid = ac.userid;`, (error, consumptionResult) => {
                            if  (error) {
                                res.writeHead(500, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({
                                    "error": err,
                                }));
                            } else {
                                res.writeHead(200, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({
                                    "message": strings.CONSUMPTION_SUCCESS,
                                    "consumption": consumptionResult
                                }));
                            }             
                        });
                    } else {
                        res.writeHead(403, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({
                            "error": strings.INVALID_TOKEN + '; ' + strings.NOT_ADMIN,
                        }));
                    }
                } else {
                    res.writeHead(403, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        "error": strings.INVALID_TOKEN,
                    }))
                }
            });
        } catch (error) {
            console.error(error);
            res.writeHead(403, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                "error": strings.INVALID_TOKEN,
            }))
        }
    } else {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            "error": strings.NOT_ADMIN,
        }))
    }
}

function makeAIRequest(res, imgUrl) {
    const apiUrl = 'https://73g2okhbm36yhna6lj2os56hl40qahqy.lambda-url.us-east-1.on.aws/'
    axios.post(apiUrl, {"url": imgUrl}, {"Content-type": "application/json", "Authorization": "vZJWqT2qaYaNOLACfsbju9MrSpnCHeTE9dxbMSqo"})
    .then(response => {
        console.log('Response:', response.data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            "message": strings.CONVERSION_SUCCESS,
            "text": response.data
        }));
    })
    .catch(error => {
        console.error('Error:', error.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            "error": strings.SERVER_ERROR,
        }));
    });
}

function handleConvert(req, res) {
    let data = "";
    req.on("data", (chunk) => {
      if (chunk !== null) {
        data += chunk;
      }
    });
    req.on("end", () => {
        stats["/COMP4537/project/api/v1/convert_handwritten"].Requests += 1;
        data = JSON.parse(data);
        if (isMissingFields(['imgUrl'], data, res)) {
            return;
        }
        const cookie = req.headers.cookie;
        console.log(cookie);
        if (cookie) {    
            try {
                const decodedToken = jwt.verify(cookie, secretKey);
                console.log(decodedToken);
                const userId = decodedToken.userId;
                console.log(userId);
                userCon.query(`SELECT * FROM user WHERE userid=${userId};` , (err, result) => {
                    if (err) {
                        console.error(err)
                        res.writeHead(500, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({
                            "error": strings.SERVER_ERROR,
                        }));
                    } else if (result[0]) {
                        updateConsumption(userId);
                        makeAIRequest(res, data.imgUrl);
                    } else {
                        res.writeHead(403, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({
                            "error": strings.INVALID_TOKEN
                        }));
                    }
                });
            } catch (error) {
                console.error(error);
                res.writeHead(403, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    "error": strings.INVALID_TOKEN
                }))
            }
        } else {
            res.writeHead(403, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                "error": strings.NOT_USER
            }))
        }
    });
}

function handleDelete(req, res) {
    let data = "";
    req.on("data", (chunk) => {
      if (chunk !== null) {
        data += chunk;
      }
    });
    req.on("end", () => {
        stats["/COMP4537/project/api/v1/user"].Requests += 1;
        data = JSON.parse(data);
        if (isMissingFields(['userid'], data, res)) {
            return;
        }
        const cookie = req.headers.cookie;
        console.log(cookie);
        if (cookie) {    
            try {
                const decodedToken = jwt.verify(cookie, secretKey);
                console.log(decodedToken);
                const userId = decodedToken.userId;
                console.log(userId);
                userCon.query(`SELECT * FROM user WHERE userid=${userId};` , (err, result) => {
                    if (err) {
                        console.error(err)
                        res.writeHead(500, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({
                            "error": strings.SERVER_ERROR,
                        }));
                    } else if (result[0].role) {
                        if (result[0].role === 'admin') {
                            updateConsumption(userId);
                            // query written by chatGPT
                            deleteCon.query(`DELETE  api_consumption FROM api_consumption WHERE userid = ${data.userid};
                                                DELETE  user FROM user WHERE userid = ${data.userid};`, (error, deleteResult) => {
                                if  (error) {
                                    console.error(error)
                                    res.writeHead(500, { "Content-Type": "application/json" });
                                    res.end(JSON.stringify({
                                        "error": strings.SERVER_ERROR,
                                    }));
                                } else {
                                    console.log(deleteResult);
                                    res.writeHead(200, { "Content-Type": "application/json" });
                                    res.end(JSON.stringify({
                                        "message": strings.DELETE_SUCCESS,
                                    }));
                                }             
                            });
                        } else {
                            res.writeHead(403, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({
                                "error": strings.INVALID_TOKEN + '; ' + strings.NOT_ADMIN,
                            }));
                        }
                    } else {
                        res.writeHead(403, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({
                            "error": strings.INVALID_TOKEN,
                        }))
                    }
                });
            } catch (error) {
                console.error(error);
                res.writeHead(403, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    "error": strings.INVALID_TOKEN,
                }))
            }
        } else {
            res.writeHead(403, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                "error": strings.NOT_ADMIN,
            }))
        }
    });
}

function handleForgotPassword(req, res) {
    let data = "";
    req.on("data", (chunk) => {
        if (chunk !== null) {
            data += chunk;
        }
    });
    req.on("end", () => {
        data = JSON.parse(data);
        if (isMissingFields(['email', 'username'], data, res)) {
            return;
        }
        userCon.query(`SELECT * FROM user WHERE email='${data.email}' AND username='${data.username}';` , (err, result) => {
            if (err) {
                console.error(err)
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    "error": strings.SERVER_ERROR,
                }));
            } else if (result[0]) {
                const token = jwt.sign({'email':  data.email, 'id': result[0].userid}, secretKey);
                passwordResetTokens[data.email] = token;
                const resetLink = `https://master--jocular-rugelach-660235.netlify.app/reset_password?token=${token}`;
                const mailOptions = {
                    from: 'reset_password@nrsoftarch4537.com',
                    to: data.email,
                    subject: 'Password Reset',
                    text: `Click the following link to reset your password: ${resetLink}`
                };
                transporter.sendMail(mailOptions, (error, info) => {
                    res.setHeader('Content-Type', 'application/json');
                    if (error) {
                        console.error(error);
                        res.writeHead(500, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({error: strings.SERVER_ERROR}));
                    } else {
                        console.log('Email sent: ' + info.response);
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({message: strings.PASSWORD_RESET}));
                    }
                });
            } else {
                console.error(err);
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    "error": strings.NOT_VALID_EMAIL,
                }))
            }
        });
    });
}

function handleResetPassword(req, res) {
    let data = "";
    req.on("data", (chunk) => {
        if (chunk !== null) {
            data += chunk;
        }
    });
    req.on("end", () => {
        data = JSON.parse(data);
        if (isMissingFields(['password', 'token'], data, res)) {
            return;
        }
        const token = data.token;
        const storedToken = passwordResetTokens[data.email];
        if (!storedToken && storedToken === token) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: 'Invalid token' }));
        } else {
            const decodedToken = jwt.verify(token, secretKey);
            console.log(decodedToken);
            const userId = decodedToken.id;
            console.log(userId);
            userCon.query(`UPDATE user SET password = '${hash(data.password)}' WHERE userid = ${userId};` , (err, result) => {
                if (err) {
                    console.error(err);
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: strings.SERVER_ERROR }));
                } else {
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        "message": strings.PASSWORD_RESET_SUCCESS,
                    }));
                }
            });
        }
    });
}

function handleDocs(req, res) {
    const swaggerUiAssetPath = path.join(require.resolve('swagger-ui'), '../dist');
    const swaggerIndex = fs.readFileSync(path.join(__dirname, 'swagger.html'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(swaggerIndex.replace('https://petstore.swagger.io/v2/swagger.json', '/swagger.json'));
}


http.createServer(function (req, res) {
    res.setHeader("Access-Control-Allow-Origin", "https://master--jocular-rugelach-660235.netlify.app");
    res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, POST, OPTIONS');
    userCon = mysql.createConnection(user);
    deleteCon = mysql.createConnection(delete_user);
    if (req.method === "OPTIONS") {
        res.end();  
    }

    console.log(req.url);
    userCon.connect(function (err) {
        if (err) throw err;

        const createUserTable = `CREATE TABLE IF NOT EXISTS user (
            userid INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(100) NOT NULL,
            username VARCHAR(100) NOT NULL,
            password VARCHAR(512) NOT NULL,
            role VARCHAR(50) NOT NULL);`;
  
        const createAPITable = `CREATE TABLE IF NOT EXISTS api_consumption (
            id INT AUTO_INCREMENT PRIMARY KEY,
            calls_made INT NOT NULL,
            userid INT NOT NULL,
            FOREIGN KEY (userid) REFERENCES user(userid));`;
        
        userCon.query(createUserTable, function (err, result) {
            if (err) throw err;
        });
        userCon.query(createAPITable, function (err, result) {
            if (err) throw err;
        });

        if (req.url === '/COMP4537/project/api/v1/register' && req.method === 'POST') {
            handleRigestration(req, res);
        } else if (req.url === '/COMP4537/project/api/v1/login' && req.method === 'POST') {
            handleLogin(req, res);
        } else if (req.url === '/COMP4537/project/api/v1/stats' && req.method === 'GET') {
            handleStats(req, res);
        } else if (req.url === '/COMP4537/project/api/v1/consumption' && req.method === 'GET') {
            handleConsumption(req, res);
        } else if (req.url === '/COMP4537/project/api/v1/convert_handwritten' && req.method === 'POST') {
            handleConvert(req, res);
        } else if (req.url === '/COMP4537/project/api/v1/forgot_password' && req.method === 'POST') {
            handleForgotPassword(req, res);
        } else if (req.url === '/COMP4537/project/api/v1/reset_password' && req.method === 'PATCH') {
            handleResetPassword(req, res);
        } else if (req.url === '/COMP4537/project/api/v1/user' && req.method === 'DELETE') {
            handleDelete(req, res);
        } else if (req.url === '/COMP4537/project/api/v1/docs') {
            handleDocs(req, res);
        } else if (req.url === '/COMP4537/project/api/v1/swagger.json') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            console.log(JSON.stringify(openapiSpecification, null, 2));
            res.end(JSON.stringify(openapiSpecification, null, 2));
        }
    });
    
}).listen();

// ,pzW!x[$dQc~ test email password