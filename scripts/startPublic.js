const {startPublic} = require("../db/db")



const startPublicSale = async ()=> 
{ 
    await startPublic()
    console.log("Public sale is now live!")
    process.exit()
}


startPublicSale()