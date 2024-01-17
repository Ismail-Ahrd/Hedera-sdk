const { TopicMessageSubmitTransaction, PublicKey, PrivateKey } = require('@hashgraph/sdk')
const dotenv = require("dotenv");
const initialSetup = require('./helpers/initialSetup');

dotenv.config();

const main = async () => {
    const client = initialSetup();
    const key="302e020100300506032b657004220420cacb3086bfdcd4b78f4d9afa2f6e63f59426820a4fdb0b8b70fd9fab47d335e3"
    const submitKey = PrivateKey.fromStringED25519(key)

    const submitMessageTx = new TopicMessageSubmitTransaction({
        topicId: "0.0.7654900",
        message: "Test !"
    }).freezeWith(client);
    // To submit a message in a topic we shoul sign it with the submit key    
    const signSubmitMessageTx = await submitMessageTx.sign(submitKey);
    const executeSubmitMessageTx = await signSubmitMessageTx.execute(client);
    const submitMessageTxReceipt = await executeSubmitMessageTx.getReceipt(client);

    console.log(`Submit message to the Topic transaction status: ${submitMessageTxReceipt.status.toString()}`);
    process.exit();
}

main();