/**
 *
 * Created by shouhewu on 6/8/17.
 *
 */
var express = require("express");
var path = require('path');
var app = express();
var http = require('http').Server(app);
var bodyParser = require('body-parser');

require('./socket/websocketserver.js')(http)

var timer = require('./timer/timer.js')
timer.start()


var query = require('./app/query.js');
var ledgerMgr = require('./utils/ledgerMgr.js')

var statusMertics = require('./service/metricservice.js')

app.use(express.static(path.join(__dirname, 'client/build')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var query = require('./app/query.js')
var sql = require('./db/mysqlservice.js')

var config = require('./config.json');
var host = process.env.HOST || config.host;
var port = process.env.PORT || config.port;

var networkConfig = config["network-config"];
var org = Object.keys(networkConfig)[0];
var orgObj = config["network-config"][org];
var orgKey = Object.keys(orgObj);
var index = orgKey.indexOf("peer1");
var peer = orgKey[index];

// =======================   controller  ===================

app.post("/api/tx/getinfo", function (req, res) {

    let txid = req.body.txid
    if (txid != '0') {
        query.getTransactionByID(peer, ledgerMgr.getCurrChannel(), txid, org).then(response_payloads => {

            var header = response_payloads['transactionEnvelope']['payload']['header']
            var data = response_payloads['transactionEnvelope']['payload']['data']
            var signature = response_payloads['transactionEnvelope']['signature'].toString("hex")

            res.send({
                'tx_id': header.channel_header.tx_id,
                'timestamp': header.channel_header.timestamp,
                'channel_id': header.channel_header.channel_id,
                'type': header.channel_header.type,
            })
        })

    } else {
        res.send({})
    }


});

app.post("/api/tx/json", function (req, res) {

    let txid = req.body.number
    if (txid != '0') {
        query.getTransactionByID(peer, ledgerMgr.getCurrChannel(), txid, org).then(response_payloads => {

            var header = response_payloads['transactionEnvelope']['payload']['header']
            var data = response_payloads['transactionEnvelope']['payload']['data']
            var signature = response_payloads['transactionEnvelope']['signature'].toString("hex")

            var blockjsonstr = JSON.stringify(response_payloads['transactionEnvelope'])

            res.send(blockjsonstr)

        })

    } else {

        res.send({})

    }

});

app.post("/api/block/json", function (req, res) {

    let number = req.body.number
    query.getBlockByNumber(peer, ledgerMgr.getCurrChannel(), parseInt(number), org).then(block => {

        var blockjsonstr = JSON.stringify(block)

        res.send(blockjsonstr)
    })
});


app.post("/api/block/getinfo", function (req, res) {

    let number = req.body.number
    query.getBlockByNumber(peer, ledgerMgr.getCurrChannel(), parseInt(number), org).then(block => {
        res.send({
            'number': block.header.number.toString(),
            'previous_hash': block.header.previous_hash,
            'data_hash': block.header.data_hash,
            'transactions': block.data.data
        })
    })
});

app.post("/api/block/get", function (req, res) {
    let number = req.body.number
    sql.getRowByPkOne(`select blocknum ,txcount from blocks where channelname='${ledgerMgr.getCurrChannel()}' and blocknum='${number}'`).then(row => {
        if (row) {
            res.send({
                'number': row.blocknum,
                'txCount': row.txcount
            })
        }
    })

});

app.post("/api/block/list", function (req, res) {
    let lastblockid = req.body.lastblockid
    let maxblocks = req.body.maxblocks
    console.log('lastblockid' + lastblockid)
    console.log('maxblocks' + maxblocks)
    var MAX = 50;
    var rows = [];
    if (maxblocks === undefined) {
        maxblocks = MAX
    } else if (maxblocks > 50) {
        maxblocks = MAX
    }

    if (lastblockid === undefined) {
        res.send({rows})
    }

    if (lastblockid >= 0) {
        let sqlQuery = ` select blocknum ,txcount from blocks where channelname='${ledgerMgr.getCurrChannel()}' and blocknum <= ${lastblockid} order by blocknum desc limit ${maxblocks} `

        sql.getRowsBySQlQuery(sqlQuery)
            .then(rows => {
                if (rows) {
                    res.send({ rows })
                }
            })
    }
});
//return latest status
app.post("/api/status/get", function (req, res) {
    statusMertics.getStatus(ledgerMgr.getCurrChannel(), function (status) {
        res.send(status)
    })
});

app.post('/chaincodelist', function (req, res) {
    statusMertics.getTxPerChaincode(ledgerMgr.getCurrChannel(), function (data) {
        res.send(data)
    })
})

app.post('/changeChannel', function (req, res) {
    let channelName = req.body.channelName
    ledgerMgr.changeChannel(channelName)
    res.end()
})

app.post('/curChannel', function (req, res) {
    res.send({ 'currentChannel': ledgerMgr.getCurrChannel() })
})

app.post('/channellist', function (req, res) {
    query.getChannels(peer, org).then(channel => {
        res.send(channel);
    })
})

app.post("/peerlist", function (req, res) {
    statusMertics.getPeerList(ledgerMgr.getCurrChannel(), function (data) {
        res.send(data)
    })
});

// ============= start server =======================

var server = http.listen(port, function () {
    console.log(`Please open Internet explorer to access ：http://${host}:${port}/`);
});





