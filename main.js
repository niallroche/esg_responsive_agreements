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
    console.log("-------------------------------");
    // Configure accounts and client

    // test account code
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    // If we weren't able to grab it, we should throw a new error
    if (myAccountId == null ||
        myPrivateKey == null ) {
        throw new Error("Environment variables myAccountId and myPrivateKey must be present");
    }

    const operatorKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY)
    // const treasuryKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY)

    const client = Client.forTestnet();

    client.setOperator(myAccountId, myPrivateKey);

    // *************************
    // * Creates accounts for contract parties *
    // *************************

    //Create new keys for each party
    const contractorAccountPrivateKey = await PrivateKey.generateECDSA();
    const contractorAccountPublicKey = contractorAccountPrivateKey.publicKey;

    // const companyAccountPrivateKey = await PrivateKey.generateECDSA();
    // const companyAccountPublicKey = companyAccountPrivateKey.publicKey;
    const companyAccountPrivateKey = operatorKey;
    const companyAccountPublicKey = companyAccountPrivateKey.publicKey;
    // console.log(PublicKey.fromString(process.env.MY_PUBLIC_KEY));
    // console.log(companyAccountPublicKey);

    const charityAccountPrivateKey = await PrivateKey.generateECDSA();
    const charityAccountPublicKey = charityAccountPrivateKey.publicKey;
    
    //Create a new company account with 1000000 tinybar starting balance
    const companyAccountTransactionResponse = await new AccountCreateTransaction()
        .setKey(companyAccountPublicKey)
        .setInitialBalance(Hbar.fromTinybars(1000000))
        .execute(client);
    const getCompanyReceipt = await companyAccountTransactionResponse.getReceipt(client);
    const companyAccountId = getCompanyReceipt.accountId;

    //Create a new account with 1,000 tinybar starting balance
    const contractorAccountTransactionResponse = await new AccountCreateTransaction()
        .setKey(contractorAccountPublicKey)
        .setInitialBalance(Hbar.fromTinybars(1000))
        .execute(client);
    // Get the new account ID
    const getContractorReceipt = await contractorAccountTransactionResponse.getReceipt(client);
    const contractorAccountId = getContractorReceipt.accountId;
        
    //Create a new account with 1,000 tinybar starting balance
    const charityAccountTransactionResponse = await new AccountCreateTransaction()
        .setKey(charityAccountPublicKey)
        .setInitialBalance(Hbar.fromTinybars(1000))
        .execute(client);
    // Get the new account ID
    const getCharityReceipt = await charityAccountTransactionResponse.getReceipt(client);
    const charityAccountId = getCharityReceipt.accountId;

    console.log("The account ID is: " +myAccountId);
    console.log("The company account ID is: " +companyAccountId);
    console.log("The contractor account ID is: " +contractorAccountId);
    console.log("The charity account ID is: " +charityAccountId);
    
    // //Verify the account balance
    // const accountBalance = await new AccountBalanceQuery()
    //     .setAccountId(companyAccountId)
    //     .execute(client);
    
    // console.log("\nThe company account balance is: " +accountBalance.hbars.toTinybars() +" tinybar.");


    //Check the account balances
    const getNewBalanceCompany = await new AccountBalanceQuery()
        .setAccountId(companyAccountId)
        .execute(client);
    console.log("\nThe Company account balance is: " +getNewBalanceCompany.hbars.toTinybars() +" tinybar");

    const getNewBalanceContractor = await new AccountBalanceQuery()
        .setAccountId(contractorAccountId)
        .execute(client);
    console.log("The Contractor account balance is: " +getNewBalanceContractor.hbars.toTinybars() +" tinybar");

    const getNewBalanceCharity = await new AccountBalanceQuery()
        .setAccountId(charityAccountId)
        .execute(client);
    console.log("The Charity account balance is: " +getNewBalanceCharity.hbars.toTinybars() +" tinybar");


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

    console.log('storing contract on Hedera using HCS');
    let HCSData = {
      "payload": "\"" + hash + "\"",
      "submit": "direct"
    };
    const HEADER = {
      headers: { Accept: 'application/json' },
    };
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
    });

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
    const ESGWrappedResponse = await engine.trigger(clause, ESGRequest, contractState);
    const ESGResponse = ESGWrappedResponse.response;
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
    };
    console.log('storing contract invocation results on Hedera using HCS');
    axios
    .post('http://0.0.0.0:8080/v1/action/', HCSTransactionData, HEADER)
    .then((response) => {
      if (response.status === 201) {
        console.log('Req body:', response.data)
        console.log('Req header :', response.headers)
      } else if (response.status === 202) { console.log('Req Data :', response.data)}
      else { console.log('Req :', response)}
    })
    .catch((e) => {
      //console.error(e)
    });

    // *************************
    // * process token transfer and penalty payment using HTS *
    // *************************

    // TODO get this working with Emitted Payment Obligations in the future
    // check if there is a penalty to be paid
    // console.log(ESGResponse.penaltyAmountDeduction);
    if (ESGResponse.penaltyAmountDeduction > 0) {
        console.log("there is a penalty payment of:" + ESGResponse.penaltyAmountDeduction + " payable in:" + ESGResponse.penaltyCurrency + " to be sent to: " + ESGResponse.nameOfCharity)

        //Create the charity penalty transfer transaction (hardcoding tinybars and wallet address which should come from the contract)
        const sendHbar = await new TransferTransaction()
            // .addHbarTransfer(companyAccountId, Hbar.fromTinybars(-10))
            // .addHbarTransfer(charityAccountId, Hbar.fromTinybars(10))
            .addHbarTransfer(companyAccountId, Hbar.fromTinybars(-ESGResponse.penaltyAmountDeduction))
            .addHbarTransfer(charityAccountId, Hbar.fromTinybars(ESGResponse.penaltyAmountDeduction))
            .execute(client);
        
        //Verify the transaction reached consensus
        const transactionReceipt = await sendHbar.getReceipt(client);
        console.log("The penalty transfer transaction from the company account to the charity account was: " + transactionReceipt.status.toString());
    } else {
        console.log("there is no penalty payment");
    }
    console.log("processing contractor payment");
    //Create the contracter transfer transaction (hardcoding tinybars and wallet address which should come from the contract)
    const sendHbar = await new TransferTransaction()
        .addHbarTransfer(companyAccountId, Hbar.fromTinybars(-ESGResponse.paymentAmount))
        .addHbarTransfer(contractorAccountId, Hbar.fromTinybars(ESGResponse.paymentAmount))
        .execute(client);

    //Verify the transaction reached consensus
    const transactionReceipt = await sendHbar.getReceipt(client);
    console.log("The penalty transfer transaction from the company account to the charity account was: " + transactionReceipt.status.toString());


    //process the payment to the subcontractor
    //Check the account balances
    const getFinalBalanceCompany = await new AccountBalanceQuery()
        .setAccountId(companyAccountId)
        .execute(client);
    console.log("\nThe Company account balance after the transfer is: " +getFinalBalanceCompany.hbars.toTinybars() +" tinybar");

    const getFinalBalanceContractor = await new AccountBalanceQuery()
        .setAccountId(contractorAccountId)
        .execute(client);
    console.log("The Contractor account balance after the transfer is: " +getFinalBalanceContractor.hbars.toTinybars() +" tinybar");

    const getFinalBalanceCharity = await new AccountBalanceQuery()
        .setAccountId(charityAccountId)
        .execute(client);
    console.log("The Charity account balance after the transfer is: " +getFinalBalanceCharity.hbars.toTinybars() +" tinybar");
}
main();
