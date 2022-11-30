// const fetch = require('node-fetch');
const express = require('express');
const line = require('@line/bot-sdk');
const product = require("./api/product");

// const bodyParser = require('body-parser')
const middleware = require('@line/bot-sdk').middleware
const JSONParseError = require('@line/bot-sdk').JSONParseError
const SignatureValidationFailed = require('@line/bot-sdk').SignatureValidationFailed
require('dotenv').config();

const cors = require('cors');
const process = require('process');

const config = {
    channelAccessToken: process.env.Access_Token,
    channelSecret: process.env.Secret_KEY
  };
const client = new line.Client(config);
const app = express();
const fs = require('fs').promises;
const path = require('path');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
// app.use(bodyParser.urlencoded({ extended: true }))
// app.use(bodyParser.json())
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}
async function listMajors(auth) {
      const sheets = google.sheets({version: 'v4', auth});
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: '1ljqb7iWKF9KVKGyrg2YQgtO6o3t6Z8s9HumZnYXpj8k',
        range: 'A2:F',
      });
      const rows = res.data.values;
      return rows;
      // if (!rows || rows.length === 0) {
      //   console.log('No data found.');
      //   return;
      // }else{
      //   return rows
      // }
  }
  app.use(cors({ origin: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
app.get('/',(req,res) =>{
  res.send('hello')
})

app.post("/webhook", middleware(config),(req, res) => {
    Promise
      .all(req.body.events.map(handleEvent))
      .then((result) => res.json(result))
      .catch((err) => {
        console.error(err);
        res.status(500).end();
      });
  });
  app.use((err, req, res, next) => {
    if (err instanceof SignatureValidationFailed) {
      res.status(401).send(err.signature)
      return
    } else if (err instanceof JSONParseError) {
      res.status(400).send(err.raw)
      return
    }
    next(err) // will throw default 500
  })


// event handler
function handleEvent(event) {
       var echo ;


    if (event.type === 'message') {
        var getMessage = event.message.text;
        if(getMessage.slice(0, 4).charAt(0).toUpperCase()+ getMessage.slice(1, 4) === "Name"){
          echo = { type: 'text', text: getMessage.slice(0, 3).charAt(0).toUpperCase()+ getMessage.slice(1, 4)  };
          googlSheetFunc(event,"Name")

        }else if(getMessage.slice(0, 2).toUpperCase() === "NN"){
          echo = { type: 'text', text: getMessage.slice(0, 2).toUpperCase() };
          googlSheetFunc(event,"NN")
        }else{
          return client.replyMessage(event.replyToken,  { type: 'text', text: event.message.text });
        }
      //  googlSheetFunc();
      // client.replyMessage(event.replyToken, echo);
        // echo = { type: 'text', text: event.message.text };
      // ignore non-text-message event
    }
  
    // create a echoing text message
  
    // use reply API
    // return client.replyMessage(event.replyToken, echo);
  }
  
  function googlSheetFunc(event,type){
    var getMessage = event.message.text;
    var restult = authorize().then(listMajors).catch();
    var getName,column;
    var typeCheck =type;
    var listName = [];
    restult.then(function(val) {
      val.forEach((val2, index) => {
        if(typeCheck === "Name"){
          getName = getMessage.slice(4).replaceAll(' ','');
          if(val2[2].includes(getName)){
            column =   {
              "title": val2[2]+" ("+val2[3]+")",
              "text": "Contact",
              "actions": [
                {
                  "type": "message",
                  "label": "Email Company",
                  "text": val2[4]
                },
                {
                  "type": "message",
                  "label": "เบอร์โทร",
                  "text": val2[5]
                }
              ]
            }
            listName.push(column)
          }
        }else{
          getName = getMessage.slice(2).replaceAll(' ','');
          if(val2[3].includes(getName)){
            column =   {
              "title": val2[2]+" ("+val2[3]+")",
              "text": "Contact",
              "actions": [
                {
                  "type": "message",
                  "label": "Email Company",
                  "text": val2[4]
                },
                {
                  "type": "message",
                  "label": "เบอร์โทร",
                  "text": val2[5]
                }
              ]
            }
            listName.push(column)
          }

        }
        // console.log('Index: ' + index + ' Value: ' + val2);
    });
    // console.log(listName)
      // listName.forEach((val, index) => {
      //   console.log(val)
      //   const message = {
      //     type: 'text',
      //     text: val[3] +" :" +val[2]
      //   };
      //   client.pushMessage(event.source.userId, message);
      // })
      const message = {
        "type": "template",
        "altText": "this is a carousel template",
        "template": {
          "type": "carousel",
          "columns": listName
        }
      } 
      client.pushMessage(event.source.userId, message);

   })

  //  return client.replyMessage(event.replyToken, echo);
  }

  // listen on port
  app.listen(5001)
  module.exports = app;