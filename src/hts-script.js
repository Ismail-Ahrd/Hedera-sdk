const { 
    PrivateKey, 
    AccountCreateTransaction, 
    TokenCreateTransaction, 
    TokenType, 
    AccountBalanceQuery, 
    TokenSupplyType, 
    Hbar,
    CustomRoyaltyFee,
    TokenMintTransaction,
    TokenAssociateTransaction,
    TransferTransaction,
    TokenFeeScheduleUpdateTransaction, 
} = require("@hashgraph/sdk")
const dotenv = require("dotenv");
const initialSetup = require('./helpers/initialSetup');

dotenv.config();

async function createAccount (privateKey, client){
    const account = await new AccountCreateTransaction()
        .setKey(privateKey.publicKey)
        .setInitialBalance(Hbar.from(10))
        .execute(client);
    return account;    
}

async function showOperatorBalance(client, tokenId){   
    const balanceQuery = new AccountBalanceQuery().setAccountId(process.env.OPERATOR_ID);     
    const accountBalance = await balanceQuery.execute(client);
    console.log("The hbar account balance for operator account is " +accountBalance.hbars); 
    if (tokenId) {
        console.log(
            `The token account balance with id: ${tokenId} for operator account is ${accountBalance.tokens.get(tokenId)}`
        );  
    }   
}

async function showAccountBalance(accountId, client, tokenId){
    const balanceQuery = new AccountBalanceQuery().setAccountId(accountId);     
    const accountBalance = await balanceQuery.execute(client);
    console.log(`The hbar account balance for ${accountId} is ${accountBalance.toJSON().hbars}`); 
    if (tokenId && accountBalance.tokens.get(tokenId)) {
        console.log(
            `The token account balance with id: ${tokenId} for ${accountId} account is ${accountBalance.tokens.get(tokenId)}`
        );  
    }
}

const main = async () => {
    console.log('---------------------Create Accounts---------------------');
    const client = initialSetup();
    await showOperatorBalance(client);
    const privateKey = PrivateKey.generateED25519();

    const accountB = await createAccount(privateKey, client);
    const accountBReceipt = await accountB.getReceipt(client);
    console.log(`Account B created with id: ${accountBReceipt.accountId}`);
    await showAccountBalance(accountBReceipt.accountId, client);

    const accountC = await createAccount(privateKey, client);
    const accountCReceipt = await accountC.getReceipt(client);
    console.log(`Account C created with id: ${accountCReceipt.accountId}`);
    await showAccountBalance(accountCReceipt.accountId, client);

    console.log('---------------------Create NFT Collection---------------------');
    // Define a royalty fee of 5%
    const customFee = new CustomRoyaltyFee()
        .setNumerator(1)
        .setDenominator(20)
        .setFeeCollectorAccountId(client.operatorAccountId)

    const adminKey = PrivateKey.generateED25519();
    const feeScheduleKey = PrivateKey.generateED25519();    
    
    let tokenCreateTx = new TokenCreateTransaction()
        .setTokenName("MyNFT")
        .setTokenSymbol("MNFT")
        .setTokenMemo("My first NFT")
        .setTokenType(TokenType.NonFungibleUnique)
        .setMaxTransactionFee(100)
        .setInitialSupply(0)
        .setTreasuryAccountId(client.operatorAccountId)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(5)
        .setSupplyKey(client.operatorPublicKey)
        .setCustomFees([customFee])
        .setFeeScheduleKey(feeScheduleKey)
        .setAdminKey(adminKey)
        .freezeWith(client);

    //const tokenCreateSign = await tokenCreateTx.sign(feeScheduleKey);
    const tokenCreateSign = await tokenCreateTx.sign(adminKey);
    const tokenCreateSubmit = await tokenCreateSign.execute(client);
    const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
    const tokenId = tokenCreateRx.tokenId;
    console.log('Create NFT Transaction status: '+ tokenCreateRx.status.toString());
    console.log(`Created NFT collection with ID: ${tokenId}`);

    console.log('------Accounts balances------')
    await showOperatorBalance(client, tokenId);
    await showAccountBalance(accountBReceipt.accountId, client, tokenId);
    await showAccountBalance(accountCReceipt.accountId, client, tokenId);
    console.log('-----------------------------');

    console.log('---------------------Mint 2 Nfts---------------------');
    const tokenMintTx = new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata([
            Buffer.from('firstToken'),
            Buffer.from('SecondToken')
        ]).freezeWith(client);
    // To mint a token the transaction should be signed with the supply key
    // In our case the supply key is the operator key (client) so will call the execute method directly
    // because it will sign the transaction with the operator key. 
    const tokenMintSubmit = await tokenMintTx.execute(client);
    const tokenMintReceipt = await tokenMintSubmit.getReceipt(client);
    console.log('Mint NFT Transaction status: '+ tokenMintReceipt.status.toString());
    
    console.log('------Accounts balances------')
    await showOperatorBalance(client, tokenId);
    await showAccountBalance(accountBReceipt.accountId, client, tokenId);
    await showAccountBalance(accountCReceipt.accountId, client, tokenId);
    console.log('-----------------------------');

    console.log('---------------------Associate the token with the two accounts---------------------');
    
    // Associate token to Account B
    const tokenAssociateTxB = new TokenAssociateTransaction()
        .setAccountId(accountBReceipt.accountId)
        .setTokenIds([tokenId])
        .freezeWith(client);
    // Sign the transaction with Account B private key.
    const signTokenAssociateB = await tokenAssociateTxB.sign(privateKey);
    const tokenAssociateSubmitB = await signTokenAssociateB.execute(client);
    const tokenAssociateReceiptB = await tokenAssociateSubmitB.getReceipt(client);
    console.log('Token Associate Transaction to Account B status: '+ tokenAssociateReceiptB.status.toString());
    
    // Associate token to Account C
    const tokenAssociateTxC = new TokenAssociateTransaction()
        .setAccountId(accountCReceipt.accountId)
        .setTokenIds([tokenId])
        .freezeWith(client);
    // Sign the transaction with Account B private key.
    const signTokenAssociateC = await tokenAssociateTxC.sign(privateKey);
    const tokenAssociateSubmitC = await signTokenAssociateC.execute(client);
    const tokenAssociateReceiptC = await tokenAssociateSubmitC.getReceipt(client);
    console.log('Token Associate Transaction to Account C status: '+ tokenAssociateReceiptC.status.toString());
    
    console.log('------Accounts balances------')
    await showOperatorBalance(client, tokenId);
    await showAccountBalance(accountBReceipt.accountId, client, tokenId);
    await showAccountBalance(accountCReceipt.accountId, client, tokenId);
    console.log('-----------------------------');

    console.log('---------------------Transfer of 2 NFT from the Oprator account to Account B---------------------');
    const transferNftTx = new TransferTransaction()
        .addNftTransfer(tokenId, 1, client.operatorAccountId, accountBReceipt.accountId)
        .addNftTransfer(tokenId, 2, client.operatorAccountId, accountBReceipt.accountId)
        .addHbarTransfer(client.operatorAccountId, Hbar.from(5))
        .addHbarTransfer(accountBReceipt.accountId, Hbar.from(-5))
        .freezeWith(client);

    // Sign the transaction with the private key of Account B    
    const signTransferNftTx = await transferNftTx.sign(privateKey);
    const transferNftSubmit = await signTransferNftTx.execute(client);
    const transferNftReceipt = await transferNftSubmit.getReceipt(client);
    console.log('Token Transfer Transaction from Operator to Account B status: '+ transferNftReceipt.status.toString()); 
    
    console.log('------Accounts balances------')
    await showOperatorBalance(client, tokenId);
    await showAccountBalance(accountBReceipt.accountId, client, tokenId);
    await showAccountBalance(accountCReceipt.accountId, client, tokenId);
    console.log('-----------------------------');

    console.log('---------------------Transfer of 1 NFT from Account B to Account C---------------------');
    const transferNftTx2 = new TransferTransaction()
        .addNftTransfer(tokenId, 2, accountBReceipt.accountId, accountCReceipt.accountId)
        .addHbarTransfer(accountBReceipt.accountId, Hbar.from(5))
        .addHbarTransfer(accountCReceipt.accountId, Hbar.from(-5))
        .freezeWith(client);

    // Sign the transaction with the private key of Account C and the private Key of Account B
    // In our case the two accounts have the same private key.    
    const signTransferNftTx2 = await transferNftTx2.sign(privateKey);
    const transferNftSubmit2 = await signTransferNftTx2.execute(client);
    const transferNftReceipt2 = await transferNftSubmit2.getReceipt(client);
    console.log('Token Transfer Transaction from Operator to Account B status: '+ transferNftReceipt2.status.toString()); 
    
    console.log('------Accounts balances------')
    await showOperatorBalance(client, tokenId);
    await showAccountBalance(accountBReceipt.accountId, client, tokenId);
    await showAccountBalance(accountCReceipt.accountId, client, tokenId);
    console.log('-----------------------------');

    console.log('---------------------Modify the custom royalty fee from 5% to 10%---------------------');
    // Define a royalty fee of 10%
    customFee.setDenominator(10)    

    const tokenUpdateTx = new TokenFeeScheduleUpdateTransaction()
        .setTokenId(tokenId)
        .setCustomFees([customFee])
        .freezeWith(client)
    
    // To update the token custom fees the transaction should be signed by the fess schedule key
    const signTokenUpdate = await tokenUpdateTx.sign(feeScheduleKey);
    const tokenUpdateSubmit = await signTokenUpdate.execute(client);
    const tokenUpdateReceipt = await tokenUpdateSubmit.getReceipt(client);
    console.log('Update Token Custom Fee Transaction: '+ tokenUpdateReceipt.status.toString());
      
    console.log('---------------------Transfer of 1 NFT from Account C to Operator---------------------');
    const transferNftTx3 = new TransferTransaction()
    .addNftTransfer(tokenId, 2, accountCReceipt.accountId, client.operatorAccountId)
    .addHbarTransfer(accountCReceipt.accountId, Hbar.from(5))
    .addHbarTransfer(client.operatorAccountId, Hbar.from(-5))
    .freezeWith(client);

    // Sign the transaction with the private key of Account C and the private Key of Account B
    // In our case the two accounts have the same private key.    
    const signTransferNftTx3 = await transferNftTx3.sign(privateKey);
    const transferNftSubmit3 = await signTransferNftTx3.execute(client);
    const transferNftReceipt3 = await transferNftSubmit3.getReceipt(client);
    console.log('Token Transfer Transaction from Operator to Account B status: '+ transferNftReceipt3.status.toString()); 

    console.log('------Accounts balances------')
    await showOperatorBalance(client, tokenId);
    await showAccountBalance(accountBReceipt.accountId, client, tokenId);
    await showAccountBalance(accountCReceipt.accountId, client, tokenId);
    console.log('-----------------------------');

    console.log('---------------------Transfer of 1 NFT from Account B to Account C---------------------');
    const transferNftTx4 = new TransferTransaction()
        .addNftTransfer(tokenId, 1, accountBReceipt.accountId, accountCReceipt.accountId)
        .addHbarTransfer(accountBReceipt.accountId, Hbar.from(5))
        .addHbarTransfer(accountCReceipt.accountId, Hbar.from(-5))
        .freezeWith(client);

    // Sign the transaction with the private key of Account C and the private Key of Account B
    // In our case the two accounts have the same private key.    
    const signTransferNftTx4 = await transferNftTx4.sign(privateKey);
    const transferNftSubmit4 = await signTransferNftTx4.execute(client);
    const transferNftReceipt4 = await transferNftSubmit4.getReceipt(client);
    console.log('Token Transfer Transaction from Operator to Account B status: '+ transferNftReceipt4.status.toString()); 
    
    console.log('------Accounts balances------')
    await showOperatorBalance(client, tokenId);
    await showAccountBalance(accountBReceipt.accountId, client, tokenId);
    await showAccountBalance(accountCReceipt.accountId, client, tokenId);
    console.log('-----------------------------');
    
    process.exit();
}

main();