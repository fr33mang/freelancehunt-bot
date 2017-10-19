var express = require('express');
var app = express();
var crypto = require('crypto')
var Curl = require('node-libcurl' ).Curl
var TelegramBot = require('node-telegram-bot-api');
var winston = require('winston')
var fs = require('fs')

winston.add(winston.transports.File, { filename: 'telegram_bot.log' });

var DEBUG = process.env.DEBUG || true;

try {
  if (DEBUG)
  var config = require('./test-conf.json')
  else
  var config = require('./dev-conf.json')
}
catch (e) {
}

var telegram_token = process.env.telegram_token || config.telegram_token;
var api_token = process.env.api_token || config.api_token;
//console.log(api_token);
var api_secret = process.env.api_secret || config.api_secret;
//console.log(api_secret);
//console.log(telegram_token)

var id = config.destination_chat_id;

var bot = new TelegramBot(telegram_token, {polling: true});

function sendNews(){
  winston.info("id: " + id);
  var url = 'https://api.freelancehunt.com/my/feed'
  var signature = crypto.createHmac('sha256', api_secret).update(url+'GET').digest('base64');
  var curl = new Curl();

  curl.on( 'end', function( statusCode, body, headers ) {
    winston.info( statusCode );
    winston.info( '---' );
    if (statusCode != 200){
      winston.log('error', body );
    }
    else {
      winston.info('News:\n');
      json = JSON.parse(body);

      for (var i = 0; i < json.length; i++){
        if (json[i].is_new){
          var message = "<b>"+ json[i].from.login +"</b> " + json[i].message.replace(/<img .*?>/g,"").replace("href=\"","href=\"http:\/\/freelancehunt.com");
          bot.sendMessage(id, message, {"parse_mode": "HTML"});
          winston.info(message+ "/n");
        }
      }
    }
    winston.info( '---' );

    this.close();
    curl.close.bind(curl);
  });

  curl.on( 'error', function() {
    winston.log('error', "Curl error");
    curl.close.bind( curl );
  });

  curl.setOpt('URL', url);
  curl.setOpt('USERPWD', api_token + ":" + signature)
  curl.perform();
}

var timer = setInterval(sendNews, 30*1000);

bot.onText(/\/log/, function (msg) {
  if (msg.chat.id == config.admin_id)
  {
    bot.sendDocument(config.admin_id, './telegram_bot.log', { 
'caption': 'log file!'});
  }
  else {
    bot.sendMessage(msg.chat.id, 'Get out!')
  }
});
