'use strict';

const xmlParser = require('xml2json');
const prettyjson = require('prettyjson');
const SerialPort = require('serialport');
const parsers = SerialPort.parsers;
const delimiterParserStart = new parsers.Delimiter({delimiter:'<epos-print'});
const delimiterParserEnd = new parsers.Delimiter({delimiter:'</epos-print>'});
const byteParser = new parsers.ByteLength({length: 8});
const port = new SerialPort('/dev/tty.usbmodem1421', {baudRate:9600});

port.pipe(delimiterParserEnd);
delimiterParserEnd.on('data', (data) => {
    console.log('-------- PARSER </epos-print> -----------\n');
    var text = data.toString('utf8') + '</epos-print>';
    var startOfOrder = text.indexOf('<epos-print ');
    var order = text.substring(startOfOrder, text.length);
    var jsonOrder = xmlParser.toJson(order);
    var textAttr = JSON.parse(jsonOrder) ['epos-print']['text'];

    var items = [];
    for (var i=0 ; i < textAttr.length; i++) {
        if (typeof textAttr[i] == "string") {
            items.push(textAttr[i]);
        }
    }

    console.log('Data (in XML):\n');
    console.log(order);
    console.log('\n');
    console.log('Data (in JSON):\n');
    console.log(jsonOrder);
    console.log('\n');
    console.log('text attribute in JSON:\n');
    console.log(textAttr);
    console.log('\n');
    console.log(items);
    console.log('\n');
});

port.on('open', () => console.log('port open'));

port.on('error', function (err) {
    console.log('error: ', err.message);
});







// port.pipe(byteParser);
// byteParser.on('data', (data) => {console.log(data.toString('utf8'))});

// port.pipe(delimiterParserStart);
// delimiterParserStart.on('data', (data) => {
//     var text = data.toString('utf8') + '<epos-print';
//     // var jsonText = xmlParser.toJson(text);

//     console.log('-------- PARSER <epos-print> -----------\n');
//
//     console.log('Data (in XML):\n');
//     console.log(text);
//     console.log('\n');
//     // console.log('Data (in JSON):\n');
//     // console.log(jsonText);
//     // console.log('\n');
// });

// port.on('data', function (data) {
//     console.log('Data : ', data.toString('utf8'));
// });

// port.write('robot, please repsond');

// port.on('open', function (){
//     console.log('port /dev/tty.usbmodem1421 OPEN...');
// });

// // port.on('readable', function () {
// //     console.log('Data: ', port.read());
// // });
