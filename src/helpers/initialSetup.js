const { AccountId, PrivateKey, Client } = require('@hashgraph/sdk')

module.exports =  initialSetup = () => {
    if (!process.env.OPERATOR_ID || !process.env.OPERATOR_KEY) {
        console.log("Please set the operator id and key");
        process.exit();
    }
    const accountId = AccountId.fromString(process.env.OPERATOR_ID);
    const privateKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
    const client = Client.forTestnet().setOperator(accountId, privateKey);
    return client;
}