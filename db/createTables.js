const { Pool } = require("pg");
const fs = require("fs");

require("dotenv").config();

const config = {
  connectionString: process.env.CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync(process.env.CERT_PATH).toString(),
  },
};

const client = new Pool(config);

client
  .connect()
  .then(() => {
    console.log("POSTGRES DATABASE CONNECTED");
  })

  .catch((err) => {
    console.log(
      "There was an error connecting to the database check your enviorment variables and make sure everything matches up!"
    );
    console.error(err);
  });

const txTable = `
    CREATE TABLE IF NOT EXISTS "launchpad_tx" (
	    "id" SERIAL,
	    "from" VARCHAR(100) NOT NULL,
	    "hash" VARCHAR(100) NOT NULL,
        "timestamp" timestamp NOT NULL DEFAULT NOW(),
        "amount_paid" FLOAT,
        "quantity" INT,
        "type" VARCHAR(20),
	    PRIMARY KEY ("id")
    );`;

const saleTable = `
    CREATE TABLE IF NOT EXISTS "launchpad_sale" (
	    "id" SERIAL,
	    "presale" BOOL NOT NULL DEFAULT FALSE,
        "limit" INT NOT NULL DEFAULT 0,
        "public" BOOL NOT NULL DEFAULT FALSE
    );`;

const createSale = `
    INSERT INTO launchpad_sale("presale","limit","public")VALUES(false,0,false)
    `;
const nftTable = `
    CREATE TABLE IF NOT EXISTS "launchpad_nfts" (
	    "id" SERIAL,
	    "minted" BOOL NOT NULL DEFAULT FALSE,
        "to" VARCHAR(255) NOT NULL,
	    "tx_hash" VARCHAR(255) NOT NULL,
	    PRIMARY KEY ("id")
    );`;

const wlTable = `
    CREATE TABLE IF NOT EXISTS "launchpad_whitelist" (
	    "id" SERIAL,
        "address" VARCHAR(255)
    );`;

const createTables = async () => {
  try {
    await client.query({ text: saleTable });
    await client.query({ text: createSale });
    await client.query({ text: txTable });
    await client.query({ text: nftTable });
    await client.query({ text: wlTable });
    console.log("Database tables have been created!")
    process.exit();
  } catch (err) {
    console.error(err);
    console.error("There was an issue creating database tables");
  }
};

createTables()