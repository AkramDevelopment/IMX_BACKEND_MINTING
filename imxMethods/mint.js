
   
const providers = require("@ethersproject/providers");
const wallet= require("@ethersproject/wallet");
const { ImmutableXClient, MintableERC721TokenType, ERC721TokenType } =  require('@imtbl/imx-sdk');
const provider = new providers.AlchemyProvider(process.env.NETWORK, process.env.API_KEY);
const signer = new wallet.Wallet(process.env.WALLET_KEY).connect(provider);
const {setMinted} = require("../db/db")
require('dotenv').config()



function sleep(ms) {
    return new Promise(async (resolve,reject) => {
      setTimeout(resolve, ms);
    });
  } 


  let IMXURL 
  let STARK
  let REGISTRATION

  if (process.env.PROD == true)
  {
       IMXURL = "https://api.x.immutable.com/v1"
       STARK = "0x5FDCCA53617f4d2b9134B29090C87D01058e27e9"
       REGISTRATION = "0x72a06bf2a1CE5e39cBA06c0CAb824960B587d64c"
       
  }
  else 
  { 

      STARK="0x4527BE8f31E2ebFbEF4fCADDb5a17447B27d2aef"
      IMXURL = "https://api.ropsten.x.immutable.com/v1"
      REGISTRATION="0x6C21EC8DE44AE44D0992ec3e2d9f1aBb6207D864"
    
    }


/*/
INPUTS 
--------------------------
reciever,token
MintNFT will process the mint and send a request to ImmutableX
It will be sure that the the transaction went through and 
and change the minted column to true

If an error is caught it will reject with an error and the token will remain false in the database field 
This will be so that we know to go back later and re-process the request when the network is less conjested 
/*/

  const mintNFT = (toAddress,token) => { 
        return new Promise( async (resolve,reject)=> {

        const client = await ImmutableXClient.build({
            publicApiUrl: IMXURL,
            signer: signer,
            starkContractAddress: STARK,
            registrationContractAddress: REGISTRATION
        })

            
            await sleep(5000)
       
            try 
            {   
          
                const result = await client.mintV2([{
    
            contractAddress: process.env.CONTRACT.toLowerCase(),
            
                royalties: [ 
                        {
                        recipient: process.env.ROYALTY.toLowerCase(),
                        percentage: parseFloat(process.env.PERCENTAGE)
                        }
                    ],
                    
                users: [
                    { 

                    etherKey: `${toAddress}`.toLowerCase(),
        
                    tokens: [{
                        id:`${token}`,
                        blueprint:`${token}`
                        }]
                    }
                ]
                }])


                await setMinted(token)
                
                resolve({status:"success",token:token})
            }   

            catch  (err)
        { 

        if (err.message == '{"code":"bad_request","message":"error inserting asset, duplicate id and token address"}')
        { 

        console.log("Duplicate Entry for token",token)
        reject({err:"There was a duplicate entry now entering into the queue.",code:409})

        }
        else { 

        console.log(err)
        reject({err:"There was an error",code:500})
        console.error(`There was an issue minting token for the address ${toAddress}`)

        }
}
        })
  }

module.exports.mintNFT = mintNFT
module.exports.sleep = sleep