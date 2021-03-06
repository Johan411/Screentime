var express = require('express');
var app = express();
var yaml = require("js-yaml");
var fs = require("fs");
var bodyParser = require('body-parser');
var path = require('path');

var perm_store = require('./helper/perm_store.js');
var hash_code = require('./helper/hash.js');

app.set('views', './views');
app.use(express.static('./public'));
//config file data 
var config = yaml.load(fs.readFileSync("config.yml"));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({
    extended: true
})); // for parsing application/x-www-form-urlencoded


var listprocess = ["atom","firefox" ,"Brackets", "cmd", "OneDrive" , "powershell" , "notepad"];
perm_store.initialize(config.mysql_host, config.mysql_user, config.mysql_pass, config.mysql_db);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/views/home.html')
});

app.get('/demo', function(req, res) {
    res.sendFile(__dirname + '/views/demo.html')
});

app.get('/demo2', function(req, res) {
    res.sendFile(__dirname + '/views/demo2.html')
});

app.post('/api/android/signup/', function(req, res) {
    var user_id = req.body.user_id;
    var user_name = req.body.user_name;
    var pass = req.body.pass;

    console.log(req.body);
    perm_store.checkLogin(user_id, pass, function(info) {
        if (info == 'not_registered') {
            perm_store.signupUser(user_name, user_id, pass);
            res.send('done');
        } else {
            res.send('failed');
        }
    });
});



app.post('/api/login', function(req, res) {
    var user_id = req.body.user_id;
    var dev_id = req.body.device_id;
    var pass = req.body.pass;
    perm_store.checkLogin(user_id, pass, function(info) {
        if (info == "success") {
            perm_store.checkDeviceRegistration(user_id, dev_id, function(info) {
                if (info == 'failed') {
                    var hashValue = hash_code.getHash(user_id + ":" + dev_id);
                    perm_store.insertDevice(user_id, dev_id, hashValue, function(info) {
                        res.send(hashValue);
                    });
                } else {
                    res.send(info);
                }
            });
        } else {
            res.send(info);
        }
    });
});

app.post('/api/device/session/', function(req, res) {
	// console.log(req.body);
    var hash = req.body.hash;
    var data = req.body.session_data;

    for (var i = 0; i < data.length; i++) {
        var type = data[i].type;
        var start = data[i].start;
        var stop = data[i].stop;

        perm_store.insertSessionData(hash, type, start, stop, function(info) {});
    };
    res.send('updated');
});

function test(data){
    
    console.log(data);

    var hash;
    console.log(data.length);
    for (var i=0;i<data.length ;i++){
        if(data.charAt(i) == '\"'){
            startHash = i+1;
            while(data.charAt(++i) != '\"');
            hash = data.substr(startHash, i-startHash);
            console.log('hash:' + hash);
            break;
        }
    }
    var type,ptype;
    for (;i<data.length ;i++){
        if(data.charAt(i) == '\"'){
            var startString = i;
            while(data.charAt(++i) != '\"' && i<= data.length);
            if(i >= data.length){
                break;
            }
            session = data.substr(startString+1, i-startString-1);
            var sessionParameters = session.split(" ");
            if(sessionParameters.length == 3){
                type = sessionParameters[0];
                if(type === ptype){
                    //discarding
                }else{
                    console.log('accepting ' + type);
                    if(listprocess.indexOf(type) != -1){
                        startTime = sessionParameters[1].split('.')[0];
                        var hr,min,sec,msec;
                        timeElapsed = sessionParameters[2].split('.');
                        if(timeElapsed.length == 2){
                            day = 0;
                            hr = parseInt(timeElapsed[0].substr(0,2)) 
                            min = parseInt(timeElapsed[0].substr(3,2));
                            sec = parseInt(timeElapsed[0].substr(6,2));
                        }else if(timeElapsed.length == 3){
                            day = parseInt(timeElapsed[0]);
                            hr =parseInt(timeElapsed[1].substr(0,2));
                            min = parseInt(timeElapsed[1].substr(3,2));
                            sec = parseInt(timeElapsed[1].substr(6,2));
                        }
                        duration = sec + min*60  + hr*60*60 + day*24*60*60;
                        endTime = parseInt(startTime) + duration;
                        perm_store.insertSessionData(hash,type, startTime, endTime, function(info){

                        });
                    }
                }
                ptype = type;
            }
        }
    }
}

app.post('/api/windows/session/', function(req ,res){
    console.log();
    test(JSON.stringify(req.body));

    res.send('updated');
});

app.post('/api/getAllProcess/', function(req,res){

    perm_store.getAllProcess(function(info){
        res.send(info);
    });
});

app.post('/api/getDeviceDetails/', function(req, res) {
    perm_store.getDeviceData(req.body.hash, function(info) {
        res.send(info);
    });
});

app.post('/api/getUserDetails/', function(req, res) {
    perm_store.getUserData(req.body.email, function(info) {
        res.send(info);
    });
});

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '192.168.1.57'

app.listen(server_port, server_ip_address, function() {
    console.log("Listening on " + server_ip_address + "," + server_port)
});

