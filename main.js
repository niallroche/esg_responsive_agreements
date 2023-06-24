console.clear();
require("dotenv").config();
const {
    AccountId,
    PrivateKey,
    Client,
    FileCreateTransaction,
    ContractCreateTransaction,
    ContractFunctionParameters,
    ContractExecuteTransaction,
    ContractCallQuery,
    AccountCreateTransaction,
    AccountBalanceQuery,
    TransferTransaction,
    Hbar, ContractId, FileAppendTransaction, FileId, ContractDeleteTransaction, PublicKey, CustomRoyaltyFee,
    CustomFixedFee, TokenCreateTransaction, TokenType, TokenSupplyType, TokenInfoQuery, TokenMintTransaction, TokenId,
    TokenBurnTransaction
} = require("@hashgraph/sdk");
const fs = require("fs");
const path = require("path");



async function main() {
    // Configure accounts and client
    // live account code
    // const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
    // const operatorKey = PrivateKey.fromString(process.env.OPERATOR_PVKEY);

    // const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    // test account code
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;
    // const myDelegateId = process.env.MY_DELEGATE_ADDRESS;
    // const myPublicKey = process.env.MY_PUBLIC_KEY;

    // If we weren't able to grab it, we should throw a new error
    if (myAccountId == null ||
        myPrivateKey == null ) {
        throw new Error("Environment variables myAccountId and myPrivateKey must be present");
    }

    // const operatorId = AccountId.fromString(myAccountId)
    // const treasuryId = AccountId.fromString(myAccountId)

    // // If we weren't able to grab it, we should throw a new error
    // const supplyKey = PrivateKey.fromString(process.env.MY_SUPPLY_KEY)
    // const adminKey = PrivateKey.fromString(process.env.MY_ADMIN_KEY)

    // if (supplyKey == null ||
    //     adminKey == null ) {
    //     console.log(`- Generating supply and adming keys`);
    //     const supplyKey = PrivateKey.generate()
    //     const adminKey = PrivateKey.generate()
    // }

    // console.log(`- The private supply key is: ${supplyKey} \n`);
    // console.log(`- The private admin key is: ${adminKey} \n`);

    const operatorKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY)
    const treasuryKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY)

    const client = Client.forTestnet();

    client.setOperator(myAccountId, myPrivateKey);

    // *************************
    // * Creates a new account *
    // *************************

    //Create new keys
    const newAccountPrivateKey = await PrivateKey.generateED25519();
    const newAccountPublicKey = newAccountPrivateKey.publicKey;
    
    //Create a new account with 1,000 tinybar starting balance
    const newAccountTransactionResponse = await new AccountCreateTransaction()
        .setKey(newAccountPublicKey)
        .setInitialBalance(Hbar.fromTinybars(1000))
        .execute(client);
    
    // Get the new account ID
    const getReceipt = await newAccountTransactionResponse.getReceipt(client);
    const newAccountId = getReceipt.accountId;
    
    console.log("The new account ID is: " +newAccountId);
    
    //Verify the account balance
    const accountBalance = await new AccountBalanceQuery()
        .setAccountId(newAccountId)
        .execute(client);
    
    console.log("The new account balance is: " +accountBalance.hbars.toTinybars() +" tinybar.");
    /*
    //Create the transfer transaction
    const sendHbar = await new TransferTransaction()
        .addHbarTransfer(myAccountId, Hbar.fromTinybars(-1000))
        .addHbarTransfer(newAccountId, Hbar.fromTinybars(1000))
        .execute(client);*/
    //
    // //Verify the transaction reached consensus
    // const transactionReceipt = await sendHbar.getReceipt(client);
    // console.log("The transfer transaction from my account to the new account was: " + transactionReceipt.status.toString());
    //
    // //Request the cost of the query
    // const queryCost = await new AccountBalanceQuery()
    //     .setAccountId(newAccountId)
    //     .getCost(client);
    //
    // console.log("The cost of query is: " +queryCost);
    //
    // //Check the new account's balance
    // const getNewBalance = await new AccountBalanceQuery()
    //     .setAccountId(newAccountId)
    //     .execute(client);
    //
    // console.log("The account balance after the transfer is: " +getNewBalance.hbars.toTinybars() +" tinybar.")


    // *************************
    // * load the Smart Legal Contract *
    // *************************
    const { Template, Clause, Contract } = require("@accordproject/cicero-core");
    const { Engine } = require("@accordproject/cicero-engine");
    const path = require("path");

    const archivePath = path.resolve(__dirname, "../esg", "esg_contract@0.0.1.cta");
    console.log("archivePath:" + archivePath);
    const buf = fs.readFileSync(archivePath);
    const template = await Template.fromArchive(
      buf
    );

    // load the legal contract params and text for the template
    const legalContractInput = fs.readFileSync(
        path.resolve(__dirname, "../esg", "new_sample.md"),
        "utf8"
    );

    const clause = new Clause(template);
    clause.parse(legalContractInput);

    // get the JSON object of contract variables from the parse operation
    const contractData = clause.getData();
    console.log(contractData);

    // *************************
    // * record the hash of contract using HCS Proof of Action microservice *
    // *************************
    const crypto = require('crypto')
    const axios = require('axios');

    let hash = crypto.createHash('md5').update(buf).digest("hex")
    console.log('contract hash is:' + hash);

    console.log('storing proof on Hedera');
    let HCSData = {
      "payload": "\"" + hash + "\"",
      "submit": "direct"
    }
    const HEADER = {
      headers: { Accept: 'application/json' },
    }
    axios
    .post('http://0.0.0.0:8080/v1/action/', HCSData, HEADER)
    .then((response) => {
      if (response.status === 201) {
        console.log('Req body:', response.data)
        console.log('Req header :', response.headers)
      } else if (response.status === 202) { console.log('Req Data :', response.data)}
      else { console.log('Req :', response)}
    })
    .catch((e) => {
      //console.error(e)
    })

    // *************************
    // * invoke the contract with some data from OpenESG *
    // *************************

    //in the future retrieve these values from OpenESG API using an Oracle when available
    const OpenESGScore = {
        "environmentalScore":20,
        "governanceScore":30,
        "socialScore":40,
        "verifiedScore": false
    };

    const ESGRequest = {
        $class:
          "com.thebuildingblocks.regulartech.esg.ESGScoreBreachRequest",
        score:OpenESGScore
      };
    console.log(ESGRequest);

    const contractState = {
        $class: "org.accordproject.runtime.State",
    };
    const engine = new Engine();
    const ESGResponse = await engine.trigger(clause, ESGRequest, contractState);
    console.log(ESGResponse);

    // *************************
    // * record the output of the contract invocation using HCS Proof of Action microservice *
    // *************************
    let HCSTransactionData = {
        "payload": {
            "OpenESGScore":OpenESGScore,
            "ESGResponse": ESGResponse
        },
        "submit": "direct"
    }

    axios
    .post('http://0.0.0.0:8080/v1/action/', HCSData, HEADER)
    .then((response) => {
      if (response.status === 201) {
        console.log('Req body:', response.data)
        console.log('Req header :', response.headers)
      } else if (response.status === 202) { console.log('Req Data :', response.data)}
      else { console.log('Req :', response)}
    })
    .catch((e) => {
      //console.error(e)
    })

    // *************************
    // * process token transfer and penalty payment using HTS *
    // *************************

    //TODO get this working with Emitted Payment Obligations in the future
    //check if there is a penalty to be paid
    // if (ESGResponse.penaltyAmountDeduction > 0.0)

    // }
   
}
main();
