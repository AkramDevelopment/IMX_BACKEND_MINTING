const { Pool } = require("pg");
const fs = require("fs");
const { sleep } = require("@imtbl/imx-sdk");

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

const insertTransaction = (hash, from, quantity, type) => {
  return new Promise(async (resolve, reject) => {
    const query = {
      text: 'INSERT INTO "launchpad_tx"("hash","from",quantity,type)VALUES($1,$2,$3,$4)',
      values: [hash, from, quantity, type],
    };

    try {
      await client.query(query);
      console.log(`${hash} <------ Hash added to the database`);
      resolve({
        success: `${hash} has been added to the database...`,
      });
    } catch (err) {
      console.log(err);
      console.error(
        `${hash} <---- There was an error inserting into the database..`
      );
      reject({
        status: 500,
        msg: "There was an error executing insertTransaction query",
      });
    }
  });
};

const updateStatus = (hash, from, status, paid) => {
  return new Promise(async (resolve, reject) => {
    const query = {
      text: 'UPDATE launchpad_tx SET status=$1, amount_paid=$2 WHERE "hash"=$3 AND "from"=$4',
      values: [status, paid, hash, from],
    };

    try {
      await client.query(query);
      console.log(`${hash} <------ TX Has been updated to ` + status);
      resolve("Status updated");
    } catch {
      console.log(err);
      console.error(
        `${hash} <---- There was an error upadting in the database`
      );
      reject({
        status: 500,
        msg: "There was an error updating status of hash",
        hash,
      });
    }
  });
};

const updateMint = async (hash, from, status) => {
  const query = {
    text: 'UPDATE launchpad_tx SET status=$1 WHERE "hash"=$2 AND "from"=$3',
    values: [status, hash, from],
  };

  try {
    await client.query(query);
    console.log(`${hash} <------ TX Has been updated to ` + status);
  } catch {
    console.log(err);
    console.error(`${hash} <---- There was an error upadting in the database`);
  }
};

const getDuplicateTransaction = (tx_hash) => {
  return new Promise(async (resolve, reject) => {
    const query = {
      text: "SELECT * FROM launchpad_tx WHERE hash=$1",
      values: [tx_hash],
    };

    try {
      const transactions = await client.query(query);
      resolve(transactions.rows);
    } catch {
      console.error("There was an error checking for tx hash: ", tx_hash);
      reject({
        status: 500,
        msg: "There was an issue getting duplicate hashes.",
      });
    }
  });
};

const insertToken = () => {
  return new Promise((resolve, reject) => {
    const query = {
      text: 'INSERT INTO launchpad_nfts("minted")VALUES($1)',
      values: ["false"],
    };

    client
      .query(query)
      .then((res) => {
        console.log(res);
      })

      .catch((err) => {
        console.log(err);
      });
  });
};

const getTokens = () => {
  return new Promise(async (resolve, reject) => {
    const query = {
      text: "INSERT INTO launchpad_nfts(minted) VALUES($1)  RETURNING *",
      values: ["false"],
    };

    try {
      const availableTokens = await client.query(query);
      resolve(availableTokens.rows);
    } catch {
      reject({
        status: 500,
        msg: "There was an issue getting available tokens from the database.",
      });
    }
  });
};

const getLeft = () => {
  return new Promise(async (resolve, reject) => {
    const query = {
      text: "SELECT * FROM launchpad_nfts",
    };

    try {
      left = await client.query(query);
      resolve(left.rowCount);
    } catch {
      console.log("Unable to get tokens available");
      reject({
        status: 500,
        msg: "There was an issue getting tokens left!",
      });
    }
  });
};

//This method needs a little bit of work need to clean it up
const assignTokens = async (q, address, hash) => {
  await sleep(5000);
  return new Promise((resolve, reject) => {
    getTokens(q).then((data) => {
      data.forEach((element) => {
        const query = {
          text: 'UPDATE launchpad_nfts SET "to"=$1, "tx_hash"=$2 WHERE "id"=$3',
          values: [address, hash, element.id],
        };

        client
          .query(query)
          .then(() => {
            console.log("Updated token id's of " + element.id);
            resolve(data);
          })

          .catch((err) => {
            console.log(err);
            reject({
              error:
                "There was an error querying the database at assignToken function..",
            });
          });
      });
    });
  });
};

const setMinted = async (tokenID) => {
  return new Promise(async (resolve, reject) => {
    const query = {
      text: 'UPDATE launchpad_nfts SET "minted"=$1 WHERE "id"=$2',
      values: [true, tokenID],
    };

    try {
      console.log(tokenID);
      await client.query(query);
      resolve({
        success: `successfuly changed status of token ID ${tokenID} to minted=true`,
      });
    } catch {
      console.log("There was an error");
      reject({
        err: "There was an issue executing query in setMinted",
      });
    }
  });
};

const whitelisted = (address) => {
  return new Promise(async (resolve, reject) => {
    const query = {
      text: 'SELECT * from launchpad_whitelist WHERE "address"=$1',
      values: [address.toLowerCase()],
    };
    try {
      const whitelisted = await client.query(query);

      if (whitelisted.rowCount > 0) {
        resolve(true);
      } else {
        reject(false);
      }
    } catch (err) {
      console.error(err);
      reject({
        status: 500,
        msg: "There was an issue querying the whitelist database",
      });
    }
  });
};

const getallTx = (address) => {
  return new Promise(async (resolve, reject) => {
    const query = {
      text: 'SELECT * from launchpad_tx WHERE "from"=$1',
      values: [address.toLowerCase()],
    };
    const txData = await client.query(query);
    resolve(txData.rows);
  });
};

const getSaleInfo = () => {
  return new Promise(async (resolve, reject) => {
    const query = {
      text: "SELECT * FROM launchpad_sale",
    };
    try {
      const salesData = await client.query(query);
      resolve(salesData.rows);
    } catch (err) {
      console.log(err);
      console.error("There was an error getting sale information ");
      reject({
        status: 500,
        msg: "There was an issue getting sales information from the database..",
      });
    }
  });
};

const getNumberMinted = (address) => {
  //This method is a little scuffed need to come back to it and clean it up..

  return new Promise((resolve, reject) => {
    let quantity = 0;

    const query = {
      text: 'SELECT * FROM launchpad_tx WHERE "from"=$1 AND ("status"=$2 OR "status"=$3)',
      values: [address, "pending", "success"],
    };

    client
      .query(query)
      .then(async (data) => {
        data.rows.forEach((element) => {
          quantity = quantity + parseInt(element.quantity);
        });
        await sleep(1000);
      })
      .then(() => {
        resolve(quantity);
      })

      .catch((err) => {
        console.log(err);
        console.error("There was an error getting sale information ");
      });
  });
};

const gettxStatus = (hash) => {
  return new Promise(async (resolve, reject) => {
    const query = {
      text: 'SELECT * FROM launchpad_tx WHERE "hash"=$1',
      values: [hash],
    };

    try {
      const status = await client.query(query);
      resolve(status.rows);
    } catch (err) {
      console.error(err);
      reject({
        status: 500,
        msg: "There was an issue getting txStatus: gettxStatus function...",
      });
    }
  });
};

const filterTX = (status) => {
  return new Promise(async (resolve, reject) => {
    const query = {
      text: 'SELECT * FROM launchpad_tx WHERE "status"=$1',
      values: [status],
    };
    try {
      const result = await client.query(query);
      resolve(result.rows);
    } catch (err) {
      console.error(err);
      reject({
        status: 500,
        msg: "There was an issue querying database for filterTX function..",
      });
    }
  });
};

const getUnminted = () => {
  return new Promise(async (resolve, reject) => {
    console.log(hash);
    const query = {
      text: 'SELECT * FROM launchpad_nfts WHERE minted=$1',
      values: ["false"],
    };
    try {
      const res = await client.query(query);
      resolve(res.rows);
    } catch (err) {
      console.log(err);
      console.log("There was an error");
    }
  });
}




module.exports.getUnminted = getUnminted;
module.exports.filterTX = filterTX;
module.exports.updateMint = updateMint;
module.exports.setMinted = setMinted;
module.exports.gettxStatus = gettxStatus;
module.exports.getNumberMinted = getNumberMinted;
module.exports.getSaleInfo = getSaleInfo;
module.exports.whitelisted = whitelisted;
module.exports.getallTx = getallTx;
module.exports.assignTokens = assignTokens;
module.exports.updateStatus = updateStatus;
module.exports.insertTransaction = insertTransaction;
module.exports.getDuplicateTransaction = getDuplicateTransaction;
module.exports.getLeft = getLeft;
