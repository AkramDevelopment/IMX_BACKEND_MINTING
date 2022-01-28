const {stopSale} = require("../db/db")



const stopSales = async ()=> 
{ 
    await stopSale()
    console.log("All sales have been stopped")
    process.exit()
}


stopSales()