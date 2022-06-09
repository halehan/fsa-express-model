import * as dotenv from "dotenv"; 
const sql = require("mssql");

let db;


const configSworm = {
    driver: "mssql",
    config: {
     user: process.env.DB_USER,
     password: process.env.DB_PASSWORD,
     server: process.env.DB_HOST,
     database: process.env.DB_NAME,
     log: true }
};

const connect = async () => {
	return new Promise<void>((resolve, reject) => {
		db = new sql.ConnectionPool(configSworm, err => {
			if (err) {
				console.error("Connection failed.", err);
				reject(err);
			} else {
				console.log("Database pool #1 connected.");
				resolve();
			}
		});
	});
};

module.exports = {
	connect
};


