

/*/

This method is a little messy and needs some work to make it easier to understand
This method will check check transactions for both L1 and L2 payments it will make sure that all paramaters are met for a mint before proceeding 

* It will check to make sure that the amount paid matches up with NFT quantity 
* Validate that the transaction went through and was sent to the proper wallet

/*/

const Web3 = require('web3');
const fetch = require("node-fetch")
const {getDuplicateTransaction, insertTransaction,updateStatus, updateMint} = require("../db/db")


let IMXURL 

if (process.env.PROD == true)
{
     IMXURL = "https://api.x.immutable.com"
}
else 
{ 
    IMXURL = "https://api.ropsten.x.immutable.com"
}

function sleep(ms) {
    return new Promise((resolve) => {
      console.log("Sleeping for ", ms, " ms")
      setTimeout(resolve, ms);
    });
  } 

  
class TransactionChecker {
    web3;
    web3ws;
    account;
    subscription;

    constructor(account) {
        this.web3ws = new Web3(new Web3.providers.WebsocketProvider(process.env.WSWEB3));
        this.web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3));
        this.account = account.toLowerCase
    }

   async getTransactionUpdated(req,res)
   {       
          
    return new Promise( async (resolve,reject)=> { 
        await insertTransaction(req.body.hash,req.body.address.toLowerCase(),req.body.quantity,req.body.type)

        console.log(`Processing Transaction for ${req.body.hash}`)   
        try 
        {
            const reciept = await this.web3.eth.getTransactionReceipt(req.body.hash)
            if (reciept == null)
               { 
                   console.log("No TX found for hash: ", req.body.hash)
                   updateStatus(req.body.hash,req.body.address.toLowerCase(),"pending_tx")
                   res.status(401).send({"error":"Transaction Not Yet Confirmed..Added to the Queue"})   
                   reject({"error":"There is no transaction with this hash yet!"})
                   
                   
               }
               else 
               {
                   
                   if (reciept.to.toLowerCase() === process.env.TO.toLowerCase())
                   { 
                       
                       console.log(req.body.hash + " <----- Has been confirmed on the blockchain continuing with the rest of the checks.. ")
                       resolve({'success':" Continuing with process.."})
                  
                   }
                   else 
                   { 
                       //console.log(data)
                       console.log("Not a valid TX!" + ` ----->  ${req.body.hash}`)
                       updateStatus(req.body.hash,req.body.address.toLowerCase(),"failed")
                       reject ({"error":"Invalid Transaction"})
                   }
               }
        }

        catch (err)
        { 
            console.log(err)
          
            reject({err:`There was an error proccessing payment for hash: ${req.body.hash} has been added to the tx queue`})
        }
    })        
  }
}

//Be sure to change out the URL between Ropsten and Mainnet!!!

let txChecker = new TransactionChecker(process.env.ACCOUNT);


const eligableMint = async (req,res,next) => 
{   


    if(!req.body.hash)
     {
         console.warn("No Body Data Found Potential Attack.. Returning Not Found")
         res.status(404).send({"error":"Route Not Found"})
     }
     const duplicate = await getDuplicateTransaction(req.body.hash)
     console.log(duplicate)
     
     if (duplicate.length >= 1)
    { 
        console.log("Duplicate hash for ",req.body.hash)
        res.status(404).send({"error":"Route Not Found "})
    }

     else 
     {

        if (req.body.type == "ETH")
        { 
             await sleep(30000)

            try 
            { 
                await txChecker.getTransactionUpdated(req)
                const txData = await txChecker.web3.eth.getTransaction(req.body.hash)
                //console.log(txData)
                
                if (txData == null)
                {   const ETHER_PAID = txChecker.web3.utils.fromWei(txData.value,'ether')
                    console.log(`${req.body.hash} is still pending added to the queue...`)
                    res.status(401).send({"pending":"TX has been added to the queue"})
                    await updateStatus(req.body.hash,req.body.address.toLowerCase(),"pending_tx",ETHER_PAID)
                }
                else 
                { 
                    const ETHER_PAID = txChecker.web3.utils.fromWei(txData.value,'ether')
                    NFT_PRICE = process.env.PRICE

                    if (ETHER_PAID == NFT_PRICE * req.body.quantity && txData.to.toLowerCase() == process.env.TO.toLowerCase())
                    { 
                     await updateStatus(req.body.hash,req.body.address.toLowerCase(),"mintQueue",ETHER_PAID)
                     next()
                    }

                    else 
                    { 
                        res.status(500).send({err:"Invalid Transaction"})
                    }
                }
            }

            catch (error)
            { 
                res.status(401).send({"err":"Transaction not confirmed"})
                console.log(error)
            }
          
        }

        if(req.body.type == "IMX")
        { 
            await sleep(10000)
      
            //console.log(req.body)
            const options = {method: 'GET', headers: {Accept: 'application/json'}};
            fetch(`${IMXURL}/v1/transfers/${req.body.hash.toString()}`, options)
            .then(response => response.json())
            .then( async (data)=> { 
                if (data.code == `resource_not_found_code`)
                { 
                    await insertTransaction(req.body.hash,req.body.address.toLowerCase(),req.body.quantity,req.body.type)
                    updateMint(req.body.hash,req.body.address,"pending_tx")
                    console.log("No transaction found")
                    res.send({"error":"No transaction with that hash found."})
                }
                else 
                { 
                    insertTransaction(req.body.hash,req.body.address.toLowerCase(),req.body.quantity,req.body.type)
                    .then((_data)=> { 

                            //console.log(data)
                            const ETHER_PAID = txChecker.web3.utils.fromWei(data.token.data.quantity,'ether')
                            const TO = data.receiver
                            const FROM  = data.user
                            const NFT_PRICE = parseFloat(process.env.PRICE)
                            console.log(req.body.quantity)
                            console.log(NFT_PRICE)

                            if (ETHER_PAID == NFT_PRICE * req.body.quantity && TO.toLowerCase() == process.env.TO.toLowerCase())
                            { 

                                updateStatus(req.body.hash,req.body.address.toLowerCase(),"mintQueue",ETHER_PAID)
                                next()
                            }
                            else 
                            { 
                                updateStatus(req.body.hash,req.body.address.toLowerCase(),"failed",ETHER_PAID)
                                res.status(500).send({"error":"There was an error processing payment"})
                            }
                    }) 
                }
               
            })
            .catch((err)=> {
                
                res.status(500).send({"error":"There was an error"})
            })
      
        }
        
    }
}

exports.eligableMint = eligableMint
module.exports.TransactionChecker = TransactionChecker