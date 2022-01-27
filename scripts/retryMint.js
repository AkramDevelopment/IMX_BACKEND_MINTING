/*/

This file will get all mints that failed and are pending retry
Come back for this method because there are some updates that need to happen before releasing!! 

/*/

const { getUnminted } = require("../db/db");
const { mintNFT, sleep } = require("../imxMethods/mint");

const startQueue = async () => {
  //1 minute sleep timer
  await sleep(60000);

  const results = await getUnminted();

  results.forEach(async (element, index) => {
    try {
      await mintNFT(element.to, element.id);
      console.log(
        element.id,
        "Has been minted to the address of:",
        element.to,
        "and has been pushed out of the minting queue"
      );
    } catch (err) {
      console.log(err);
      console.error(
        "There was an error minting token for token ID:",
        element.id,
        "will remain in the retry queue"
      );
    }
  });
};
