# ImmutableX Backend Minting




## How does it work?

This is a work in progress implementation of a working backend 
solution for minting this will create endpoints for validating and minting tokens to an address, getting transaction history for an address and also running automated scripts for unconfirmed transactions for both L1 and L2 transactions...
In the future I will also be creating different branches for different stacks such as using a mongoDB database and other implementations but currently this is the best solution that has worked out for me as of writing this..


## Enviorment Variables


```.env

TO=TREASUREY_WALLET_ADDRESS
WALLET_KEY=CONTRACT_WALLET_PRIVATE
CONTRACT=COLLECTION_ADDRESS
CONNECTION_STRING=POSTGRES_CONNECTION_STRING
ROYALTY=ROYALTY_RECIEVER
PERCENTAGE=ROYALTY_PERCENTAGE
PRICE=NFT_PRICE
CERT_PATH=PATH_TO_DB_CERT
WSWEB3=INFURA_WEBSOCKET_URL
WEB3=HTTPS_INFURA_URL
ACCOUNT=INURA_ACCOUNT_ADDRESS
NETWORK=ropsten
API_KEY=ALCHEMY_API_KEY
COLLECTION_SIZE=COLLECTION_SIZE
```


## Installation

Go into the root of the folder and install all the dependencies.
```bash
#Installs all dependencies
npm install

#Create database tables needed 
npm run create-tables

#Starts the API server to start acccepting mints and other requests.
npm start server

#Starts the script to validate transactions that were not yet confirmed  ​
npm start tx

#Starts pushing mints out that are in the queue after validating transaction
npm run queue

#Starts script to push mints that failed due to API failure issues (Not available as of writing this will be coming in the next code update)
npm run retry
```




