

const {updateMint,assignTokens,filterTX,getAssigned } = require('./db/db');
const {mintNFT,sleep} = require("./imxMethods/mint")


const assignMint = (element)=> { 

    return new Promise( async (resolve,reject)=> { 
        let err = false

        for (i=0; i<element.quantity;i++)
        {   
            await sleep(parseInt(`${i}000`))  
            const assignedTokens = await assignTokens(1,element.from.toLowerCase(),element.hash)

            try 
            { 
                const mintResult = await mintNFT(element.from.toLowerCase(),assignedTokens[0].id)
                console.log(`${mintResult.token} has been minted to the address of ${element.from}`)
               
            }

            catch (err)
             {
                 err = true
                  console.log(err)
                  console.log(element.from.toLowerCase(),"<------ There was an issue with token ID", assignedTokens[0].id)
             }

        }

        if (err == true)
        { 
            updateMint(element.hash,element.from,"pending_retry")

        }

        if (err == false)
        { 
            updateMint(element.hash,element.from,"success")
        }

        resolve({retry:"done"})
    })
}





const start = async ()=> { 
    console.log("Starting start script")

    while (true) {
        await sleep(60000)
        filterTX("pending_mint")
        .then( async (data)=> { 
            data.forEach( async (element,index) => {
                await sleep(parseInt(`${index}000` + 1000))
                await assignMint(element)
        
            });
        })
    }

}

start()