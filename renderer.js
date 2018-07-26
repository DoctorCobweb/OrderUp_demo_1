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
const moment = require('moment');



// ------------------------------------------------------------
// rethinkdb stuff 
// ------------------------------------------------------------

const ORDER_UP_DB_NAME = 'order_up';
const ORDER_UP_TABLE_NAME = 'orders';

const dummy_data = {
        "location_area": "Bar",
        "location_table": 23,
        "time_of_order": moment().format("MMMM Do YYYY, h:mm:ss a"),
        "person_who_took_order":"dre",
        "order_original_state":{"away_on_mains": false,
                                "away_on_desserts": false,
                                "entrees":["2 chips", "garlic bread"],
                                "mains": ["2 salmon", "3 nasi"],
                                "desserts":["ice cream"]},
        "order_current_state":{"order_complete":false,
                                "away_on_mains": false,
                                "away_on_desserts": false,
                                "entrees":["2 chips", "garlic bread"],
                                "mains": ["2 salmon", "3 nasi"],
                                "desserts":["ice cream"]}
};


r.connect({
    host: 'localhost',
    port: 28015
})
.then((conn) => {
    //check to see if the 'order_up' db already exists.
    //if it does, skip the dbCreate call
    r.dbList().run(conn)
        .then((results) => {
            //see if results contains ORDER_UP_DB_NAME
            var db_matches = results.filter(result => result === ORDER_UP_DB_NAME);
            if (db_matches.length > 0) {
                //db exists already
                console.log("'order_up' db already exists, skipping creating it");
                createOrderUpTableMaybe(conn) 
            } else {
                // need to create the database
                console.log('need to create "order_up" db, creating it...');
                createOrderUpDatabase(conn);
            }
        })
        .catch((error) => {
            throw error;
        })
})
.catch((error) => {
    throw error;
});


function createOrderUpDatabase (conn) {
    r.dbCreate().run(conn)
        .then((result) => {
            console.log('created the "order_up" db');
            console.log(result);
            createOrderUpTableMaybe(conn);
        })
        .catch((error) => {
            throw error;
        });
}


function createOrderUpTableMaybe (conn) {
    // the db exists, check if the table exists
    r.db(ORDER_UP_DB_NAME).tableList().run(conn)
        .then((results) => {
            var table_matches = results.filter(result => result === ORDER_UP_TABLE_NAME);
            if (table_matches.length > 0) {
                //table exists already
                console.log('"orders" table already exists, skipping creating it');
                // insertData(conn, dummy_data);
                startListeningToSerialPort(conn);
            } else {
                // need to create the table
                console.log('"orders" table does not exist. creating it...');
                createOrderUpTable(conn);
            }
        })
        .catch((error) => {
            throw error;
        })
}


function createOrderUpTable (conn) {
    r.db(ORDER_UP_DB_NAME).tableCreate(ORDER_UP_TABLE_NAME).run(conn)
        .then((result) => {
            console.log('created the "orders" table');
            startListeningToSerialPort(conn);
            // insertData(conn, dummy_data);
        })
        .catch((error) => {
            throw error;
        });
}


function insertData (conn, data) {
    console.log('in insertData, attempting to insert some data into "orders" table...');

    r.db(ORDER_UP_DB_NAME).table(ORDER_UP_TABLE_NAME)
        .insert(data)
        .run(conn)
        .then((results) => {
            console.log('SUCCESS: inserted some data');
            console.log(results);
        })
        .catch((error) => {
            throw error;
        
        });
}



// const rethink_config = require(__dirname + '/rethink_config.js');
// async.waterfall();
// console.log(rethink_config);





// ------------------------------------------------------------
// serialport stuff 
// ------------------------------------------------------------

// 1. find the available ports
// 2. look for the arduino port
// 3. open it
// 4. once open, begin taking data and parsing it

function startListeningToSerialPort(conn) {

    SerialPort.list()
        .then((ports) => {
            console.log('PORTS AVAILABLE: ', ports);

            var arduinoPort = ports.filter(port => port.manufacturer === "Arduino (www.arduino.cc)")[0];
            console.log('arduinoPort: ' , arduinoPort);

            if (arduinoPort) {
                const PORT_NAME = arduinoPort.comName;

                // TODO: i think serialport automatically sets the baudRate for us when we
                //       open a port...it uses the BaseBinding.getBaudRate() function todo this.
                //       ==> DOUBLE CHECK THIS
                const port = SerialPort(PORT_NAME);

                port.on('open', () => {
                    console.log('ARDUINO PORT is now open')
                    console.log('calling delimiterSetupAndParse()');
                    delimiterSetupAndParse(port,conn);

                    // old stuff -- will remove soon
                    electronSerialportDemoStuff();
                });

                port.on('error', (err) => {
                    console.log('error: ', err.message);
                });
            }
        })
        .catch((err) => {
            throw err;
        });
}


function delimiterSetupAndParse(port, conn) {
    const delimiterParserEnd = new parsers.Delimiter({delimiter:'</epos-print>'});

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

            extractOrder(jsonOrder, conn);
        }
        catch (error) {
            console.log("ERROR: couldnt parse order to JSON", error);
        }
    });
}


function extractOrder (jsonOrder, conn) {
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

    const simpleData = {"items":items}

    // add meal to db
    insertData(conn, simpleData);


}


// code from the electron-serialport github project
// https://github.com/johnny-five-io/electron-serialport
function electronSerialportDemoStuff() {
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
}


// ------------------------------------------------------------
// OLDER STUFF
// ------------------------------------------------------------
//
// YOU CAN RUN MULTIPLE PARSERS AT ONCE IF YOU DESIRE
// here's another one which works at finding the start of the order xml tag.
// const delimiterParserStart = new parsers.Delimiter({delimiter:'<epos-print'});
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
