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

    //load the Smart Legal Contract
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
    console.log(data);

    // const engine = new Engine();
    // load the actual ESG values into a request to trigger the contract
    const ESGContractInput = fs.readFileSync(
        path.resolve(__dirname, "../esg", "request.json"),
        "utf8"
    );

    const requestData = readFileSync(path.resolve(__dirname, "../esg", "request.json"));
    const ESGRequest = JSON.parse(requestData);
    console.log(ESGRequest);

    const contractState = {};
    const ESGResponse = await engine.trigger(clause, ESGRequest, contractState);
    console.log(ESGResponse);

   
}
main();
