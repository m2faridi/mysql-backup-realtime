

const mysql = require('mysql');
const MySQLEvents = require('@rodrigogs/mysql-events');
var arrayQuery = [];
var masterDb = mysql.createPool({
host: "127.0.0.1",
user: "root",
password: "",
database: "db1",
charset : 'utf8mb4',
collation: 'utf8mb4_unicode_ci'
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
charset : 'utf8mb4',
collation: 'utf8mb4_unicode_ci'
});

mirorreDb.getConnection(function (err, connection) {
  if (!err) {
    connection.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;", () => {
      connection.release();
    });
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
      var db = event.schema;
      var q = {}
      q.db = db;
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

          if (_value == 1.1125369292536007e-308) {
            _value = 0;
          }

          _value = masterDb.escape(_value);

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
            query = "UPDATE `" + q.db + "`.`" + event.table + "` SET " + valueForUpdate + " ";
            query += "WHERE `id` = '" + event.affectedRows[i].before.id + "';";
          } else {
            query = "INSERT INTO `" + q.db + "`.`" + event.table + "` " + key + " VALUES ";
            query += value;
            query += " ON DUPLICATE KEY UPDATE " + valueForUpdate + " ;";
          }
          q.query = query;
          arrayQuery.push(q);
        }

        if (event.type == "INSERT") {
          query = "INSERT INTO `" + q.db + "`.`" + event.table + "` " + key + " VALUES ";

          query += value;

        }

        if (event.type == "DELETE") {

          if (arraykeysAndValues.id != null) {
            query = "DELETE FROM `" + q.db + "`.`" + event.table + "` WHERE `id`= " + arraykeysAndValues.id;
          } else {
            query = "DELETE FROM `" + q.db + "`.`" + event.table + "` WHERE " + valueForDelete;

          }
          q.query = query;
          arrayQuery.push(q);
        }
      }
      if (event.type == "INSERT") {
        query += ";"
        q.query = query;
        arrayQuery.push(q);

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
      querys += arrayQuery[i].query;
    }
    console.log("count: " + arrayQuery.length);

    mirorreDb.getConnection(function (err, connection) {
      if (!err) {
        connection.query(querys, function (error, results, fields) {
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
        });
      } else {
        console.log(querys);
        console.dir(err, { depth: null }); // `depth: null` ensures unlimited recursion
        isQuery = false;
      }

    });
  }
}, 50);

