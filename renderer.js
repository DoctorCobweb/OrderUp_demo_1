// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const SerialPort = require('serialport')
const createTable = require('data-table')
const xmlParser = require('xml2json');
const prettyjson = require('prettyjson');
const parsers = SerialPort.parsers;

const r = require('rethinkdb');
const async = require('async');

const rethink_config = require(__dirname + '/rethink_config.js');

// async.waterfall();
console.log(rethink_config);








// you can have multiple parsers running. for now, we will just use
// delimiterParserEnd and basic JS string methods to find our orders in the <xml> data
const delimiterParserStart = new parsers.Delimiter({delimiter:'<epos-print'});
const delimiterParserEnd = new parsers.Delimiter({delimiter:'</epos-print>'});

// gotta make sure that the baudRate is matching what it actually is. 
// use serialport library to check this manually.

PORT_NAME = '/dev/tty.usbmodem1421';
const port = new SerialPort(PORT_NAME, {baudRate:9600});

port.on('open', () => {
    console.log('port open')
});

port.on('error', (err) => {
    console.log('error: ', err.message);
});


// hook up our parser
port.pipe(delimiterParserEnd);

delimiterParserEnd.on('data', (data) => {
    console.log('-------- PARSER </epos-print> -----------\n');

    try {
        var text = data.toString('utf8') + '</epos-print>';

        // check raw data before parsing to see if we will have malformed xml 
        // and hence an error will be thrown. usually have this at startup for the
        // first order
        console.log('CCCCCCCCCCCCCCCCCC');
        console.log('text (in XML):\n');
        console.log(text);
        console.log('CCCCCCCCCCCCCCCCCC');
        console.log('\n');

        var startOfOrder = text.indexOf('<epos-print ');
        var order = text.substring(startOfOrder, text.length);
        var jsonOrder = xmlParser.toJson(order);

        extractOrder(jsonOrder);
    }
    catch (error) {
        console.log("ERROR: couldnt parse order to JSON", error);
    }
});

function extractOrder (jsonOrder) {
    var textAttr = JSON.parse(jsonOrder) ['epos-print']['text'];
    var items = [];
    for (var i=0 ; i < textAttr.length; i++) {
        if (typeof textAttr[i] == "string") {
            items.push(textAttr[i]);
        }
    }

    console.log('Data (in JSON):\n');
    console.log(jsonOrder);
    console.log('\n');
    console.log('text attribute in JSON:\n');
    console.log(textAttr);
    console.log('\n');
    console.log(items);
    console.log('\n');

    // add meal to db

}

// this goes into the webpage
SerialPort.list((err, ports) => {
  console.log('ports', ports);
  if (err) {
    document.getElementById('error').textContent = err.message
    return
  } else {
    document.getElementById('error').textContent = ''
  }

  if (ports.length === 0) {
    document.getElementById('error').textContent = 'No ports discovered'
  }

  const headers = Object.keys(ports[0])
  const table = createTable(headers)
  tableHTML = ''
  table.on('data', data => tableHTML += data)
  table.on('end', () => document.getElementById('ports').innerHTML = tableHTML)
  ports.forEach(port => table.write(port))
  table.end();
})




// YOU CAN RUN MULTIPLE PARSERS AT ONCE IF YOU DESIRE
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
