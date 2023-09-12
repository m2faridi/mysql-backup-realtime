

const mysql = require('mysql');
const MySQLEvents = require('@rodrigogs/mysql-events');
var arrayQuery = [];
var masterDb = mysql.createPool({
host: "127.0.0.1",
user: "root",
password: "",
database: "db1",
charset : 'utf8mb4'
});
masterDb.getConnection(function (err, connection) {
if (!err) {
  console.log("MYSQL masterDb Is Connected!");
} else {
  console.log(err);

}
});
var mirorreDb = mysql.createPool({
multipleStatements: true,

host: "127.0.0.1",
user: "root",
password: "",
database: "db2",
charset : 'utf8mb4'
});

mirorreDb.getConnection(function (err, connection) {
  if (!err) {
    console.log("MYSQL Mirrore Is Connected!");
  } else {
    console.log(err);

  }
});
const program = async () => {


  const instance = new MySQLEvents(masterDb, {
    startAtEnd: true,
    excludedSchemas: {
      mysql: true,
    },
  });

  await instance.start();

  instance.addTrigger({
    name: 'TEST',
    expression: '*',
    statement: MySQLEvents.STATEMENTS.ALL,
    onEvent: (event) => { // You will receive the events here

      if (event.table == "notifcation_sender") return;

      let query = "";

      let value = "";

      for (let i = 0; i < event.affectedRows.length; i++) {
        let valueForUpdate = "";
        let valueForDelete = "";

        let arraykeysAndValues = [];
        if (event.type == "INSERT" || event.type == "UPDATE") arraykeysAndValues = event.affectedRows[i].after;
        if (event.type == "DELETE") arraykeysAndValues = event.affectedRows[i].before;

        let keys = Object.keys(arraykeysAndValues);
        let values = Object.values(arraykeysAndValues);

        if (event.type == "UPDATE" || event.type == "DELETE") {
          value = "";
          query = "";
        }
        value += "("
        let key = "("

        for (let i2 = 0; i2 < keys.length; i2++) {

          let _value = values[i2];
          if (typeof _value === 'string' || _value instanceof String) {
            // _value=_value.substring(1,_value.length-1)
          }
          if (_value instanceof Date && !isNaN(_value)) { // isNaN wont accept a date in typescript, use date.getTime() instead to produce a number

            // var month=_value.getMonth()+1;
            // //if(month==0)month=12;
            // var dateToString=
            // _value.getFullYear()+"-"+
            // ("0" + month).slice(-2)+"-"+
            // ("0" + _value.getDate()).slice(-2)+" " 
            // +("0" + _value.getHours()).slice(-2)+
            // ":"+("0" + _value.getMinutes()).slice(-2)
            // +":"+("0" + _value.getSeconds()).slice(-2);

            // _value= dateToString;
          }

          if (_value == 1.1125369292536007e-308) {
            _value = 0;
          }

          _value = mirorreDb.escape(_value);



          if (_value === null) {
            valueForUpdate += " `" + keys[i2] + "` =" + _value;
            valueForDelete += " `" + keys[i2] + "` =" + _value;
            value += _value

          } else {
            valueForUpdate += " `" + keys[i2] + "` =" + _value + "";
            valueForDelete += " `" + keys[i2] + "` =" + _value + "";
            value += "" + _value + ""

          }
          if (i2 != values.length - 1) {
            valueForUpdate += ","
            valueForDelete += " AND "
          }
          key += "`" + keys[i2] + "`"
          if (i2 != keys.length - 1) {
            key += ","
          }

          if (i2 != values.length - 1) {
            value += ","
          }
        }

        key += ")";
        value += ")";

        if (i != event.affectedRows.length - 1) {
          if (event.type == "INSERT") {
            value += ",";

          }
        }

        if (event.type == "UPDATE") {
          if (event.affectedRows[i].before.id != event.affectedRows[i].after.id) {
            query = "UPDATE `" + event.table + "` SET " + valueForUpdate + " ";
            query += "WHERE `id` = '" + event.affectedRows[i].before.id + "';";
          } else {
            query = "INSERT INTO `" + event.table + "` " + key + " VALUES ";
            query += value;
            query += " ON DUPLICATE KEY UPDATE " + valueForUpdate + " ;";
          }
          arrayQuery.push(query);
        }

        if (event.type == "INSERT") {
          query = "INSERT INTO `" + event.table + "` " + key + " VALUES ";

          query += value;

        }

        if (event.type == "DELETE") {

          if (arraykeysAndValues.id != null) {
            query = "DELETE FROM `" + event.table + "` WHERE `id`= " + arraykeysAndValues.id;
          } else {
            query = "DELETE FROM `" + event.table + "` WHERE " + valueForDelete;

          }
          arrayQuery.push(query);
        }
      }
      if (event.type == "INSERT") {
        query += ";"
        arrayQuery.push(query);

      }

    },
  });

  instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
  instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);
};

program()
  .then(() => console.log('Waiting for database events...'))
  .catch(console.error);
const insertDb = 1;
var isQuery = false;
setInterval(function A() {


  if (arrayQuery.length != 0 && isQuery == false) {

    isQuery = true;
    var querys = "";
    var count = insertDb;

    if (arrayQuery.length < insertDb) {
      count = arrayQuery.length;
    }

    for (var i = 0; i < count; i++) {
      querys += arrayQuery[i];
    }
      console.log("count: "+arrayQuery.length);
    
    // console.log(querys);
    mirorreDb.getConnection(function (err, connection) {
      if (!err) {

        connection.query(querys, function (error, results, fields) {
          // When done with the connection, release it.
          connection.release();

          if (error) {
            console.dir(error, { depth: null }); // `depth: null` ensures unlimited recursion
            if (error.message.indexOf("Duplicate entry") != -1) {
              arrayQuery.splice(0, count);
            }
          } else {
            arrayQuery.splice(0, count);

          }
          isQuery = false;
          // Don't use the connection here, it has been returned to the pool.
        });
      } else {
        console.dir(err, { depth: null }); // `depth: null` ensures unlimited recursion
        isQuery = false;

      }

    });


  }
}, 50);

