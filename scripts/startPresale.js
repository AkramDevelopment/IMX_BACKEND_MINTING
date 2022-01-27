const {startPresale} = require("../db/db")



const Presale = async ()=> 
{ 
    await startPresale()
    console.log("Presale is now live!")
    process.exit()
}


Presale()