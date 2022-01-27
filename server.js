const express = require("express");
const { eligableMint } = require("./imxMethods/checkTransactions");
const cors = require("cors");
const { mintNFT, sleep } = require("./imxMethods/mint");
const {
  assignTokens,
  getallTx,
  getSaleInfo,
  whitelisted,
  getNumberMinted,
  getLeft,
  updateMint,
} = require("./db/db");
const { gettxStatus } = require("./db/db");
const helmet = require("helmet");
require("dotenv").config();

app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

app.get("/api/v1/sale/:address", async (req, res) => {
  const SALE_INFO = await getSaleInfo();

  const REMAINING_NFT = await getLeft();

  console.log(SALE_INFO);
  console.log(REMAINING_NFT);
  if (REMAINING_NFT >= process.env.COLLECTION_SIZE) {
    res.status(401).send({
      sale: "SOLD OUT",
    });
  } else if (SALE_INFO[0].presale == true) {
    try {
      await whitelisted(req.params.address);

      if (SALE_INFO[0].limit > 0) {
        const NUMBER_MINTED = await getNumberMinted(req.params.address);

        const ELIGABLE_AMOUNT = SALE_INFO[0].limit - NUMBER_MINTED;

        if (ELIGABLE_AMOUNT <= 0) {
          res.status(401).send({
            sale: "Sale Limit Exceeded",
          });
        } else {
          res.send({
            sale: ELIGABLE_AMOUNT,
          });
        }
      } else {
        res.send({
          sale: "Sale does not have a limit",
        });
      }
      // res.send({success:"Authorized.."})
    } catch {
      res.status(401).send({
        error: "Unauthorized",
      });
    }
  } else if (SALE_INFO[0].public == true) {
    res.send({
      sale: "Public sale is live!",
    });
  } else if (SALE_INFO[0].public == false && SALE_INFO[0].presale == false) {
    res.status(401).send({
      sale: "Sale has ended",
    });
  }
});

app.get("/api/v1/tx/:address", async (req, res) => {
  const result = await getallTx(req.params.address);
  res.send(result);
});

app.get("/api/v1/count", async (req, res) => {
  const remaining = await getLeft();
  res.send({
    count: remaining,
  });
});

app.post("/api/v1/mint", eligableMint, async (req, res) => {
  console.log("Initiating mints for ", req.body.address);
  const hashStatus = await gettxStatus(req.body.hash);
  let errs = false;

  try {
    if (hashStatus[0].status == "mintQueue") {
      for (i = 0; i < req.body.quantity; i++) {
        await sleep(1000 + parseInt(`${i}000`));

        try {
          const assignedTokens = await assignTokens(
            1,
            req.body.address.toLowerCase(),
            req.body.hash
          );

          const mintResult = await mintNFT(
            req.body.address.toLowerCase(),
            assignedTokens[0].id
          );
          console.log(
            `${mintResult.token} has been minted to the address of ${req.body.address}`
          );
        } catch (err) {
          console.log(err);
          errs = true;
          updateMint(req.body.hash, req.body.address, "pending_retry");
          console.log(
            req.body.address.toLowerCase(),
            "<------ There was an issue with token ID",
            assignedTokens[0].id
          );
        }
      }

      if (errs) {
        res.send({
          status: "Tokens being processed!",
        });
      } else {
        updateMint(req.body.hash, req.body.address, "success");
        res.send({
          success: "Tokens have been proccessed!",
        });
      }
    }
  } catch (err) {
    res.send({
      err: "There was an error",
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, (err) => {
  console.log(`MINT SERVICE IS RUNNING ON PORT: ${PORT}`);
});
