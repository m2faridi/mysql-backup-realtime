With this program, you can completely copy the database at runtime

Edit user,pass host and table name

var masterDb = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "db1"
});

var mirorreDb = mysql.createPool({
  multipleStatements: true,

  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "db2"
});

