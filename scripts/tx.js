const Web3 = require("web3");
const fetch = require("node-fetch");
const { filterTX, updateStatus, updateMint } = require("../db/db");

function sleep(ms) {
  return new Promise((resolve) => {
    console.log("Sleeping for ", ms, " ms");
    setTimeout(resolve, ms);
  });
}

const NFT_PRICE = parseFloat(process.env.PRICE);

class TransactionChecker {
  web3;
  web3ws;
  account;
  subscription;

  constructor(account) {
    this.web3ws = new Web3(
      new Web3.providers.WebsocketProvider(process.env.WSWEB3)
    );
    this.web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3));
    this.account = account.toLowerCase;
  }

  async getTransactionUpdated(hash) {
    return new Promise(async (resolve, reject) => {
      try {
        const reciept = await this.web3.eth.getTransactionReceipt(hash);

        if (reciept == null) {
          console.log("No TX found for hash: ", hash);
          console.log("This is the null state...");

          reject({
            error: "There is no transaction with this hash yet!",
          });

          //res.status(401).send({"error":"Transaction Not Yet Confirmed..Added to the Queue"})
        } else {
          if (reciept.to.toLowerCase() === process.env.TO.toLowerCase()) {
            resolve({
              success: " Continuing with process..",
            });
          } else {
            console.log("Not a valid TX!" + ` ----->  ${hash}`);
            reject({
              error: "Invalid Transaction",
            });
          }
        }
      } catch (err) {
        reject({
          err: `There was an error proccessing payment for hash: ${hash} has been added to the tx queue`,
        });
      }
    });
  }
}

let txChecker = new TransactionChecker(process.env.ACCOUNT);

const checkMatch = async (element) => {
  return new Promise(async (resolve, reject) => {
    const txData = await txChecker.web3.eth.getTransaction(element.hash);

    const ETHER_PAID = txChecker.web3.utils.fromWei(txData.value, "ether");

    if (
      ETHER_PAID == NFT_PRICE * element.quantity &&
      txData.to.toLowerCase() == process.env.TO.toLowerCase()
    ) {
      updateMint(element.hash, element.from, "pending_mint");
      resolve(true);
    } else {
      reject(false);
    }
  });
};

const immutable = (element) => {
  return new Promise((resolve, reject) => {
    try {
      const options = {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      };
      fetch(
        `https://api.x.immutable.com/v1/transfers/${element.hash.toString()}`,
        options
      )
        .then((response) => response.json())
        .then((data) => {
          try {
            const ETHER_PAID = txChecker.web3.utils.fromWei(
              data.token.data.quantity,
              "ether"
            );
            const TO = data.receiver;
            const FROM = data.user;
            console.log(ETHER_PAID, TO, FROM);

            if (
              ETHER_PAID == NFT_PRICE * element.quantity &&
              TO.toLowerCase() == process.env.TO.toLowerCase()
            ) {
              updateStatus(element.hash, FROM, "pending_mint", ETHER_PAID);
              resolve("Done");
            } else {
              console.log("Not ready..");
              resolve("Done");
            }
          } catch {
            console.log(element.hash, "Still pending_tx");
            resolve("Done");
          }
        });
    } catch {
      console.log(element.hash, "Still pending_tx");
      resolve("Done");
    }
  });
};

const resolveTX = async () => {
  const tx = await filterTX("pending_tx");

  tx.forEach(async (element) => {
    try {
      if (element.type == "ETH") {
        const txr = await txChecker.getTransactionUpdated(element.hash);
        const eligable = checkMatch(element);
      } else if (element.type == "IMX") {
        await immutable(element);
      }
    } catch {
      console.log("Transaction Not Yet Verified", element);
    }
  });
};

const start = async () => {
  console.log("Starting Transaction Checker Script");
  while (true) {
    //Checks that database for pending transactions every 1 minute..
    await sleep(60000);
    console.log("Checking all pending Transactions");
    resolveTX();
  }
};

start();
