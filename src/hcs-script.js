const { PrivateKey, TopicCreateTransaction, TopicInfoQuery, TopicUpdateTransaction, TopicMessageSubmitTransaction, TopicMessageQuery } = require('@hashgraph/sdk')
const dotenv = require("dotenv");
const initialSetup = require('./helpers/initialSetup');

dotenv.config();

const main = async () => {
    const client = initialSetup();

    console.log("--------------------Creation of the topic--------------------");

    // Creation of adminKey and submitKey
    const adminKey = PrivateKey.generateED25519();
    const submitKey = PrivateKey.generateED25519();
    console.log("Submit key: ", submitKey.toString())

    // Create the transaction that create a topic
    const topicCreateTx = new TopicCreateTransaction()
        .setAdminKey(adminKey.publicKey)
        .setSubmitKey(submitKey.publicKey)
        .setTopicMemo("My first topic")
        .freezeWith(client);
    // Sign the transaction with the admin key: required!
    const signTpoicCreateTx = await topicCreateTx.sign(adminKey);
    // Send the transaction to Hedera network to be executed.
    const executeTopicCreateTx = await signTpoicCreateTx.execute(client);
    // Get the transaction receipt
    const topicCreateTxReceipt = await executeTopicCreateTx.getReceipt(client);
    const topicId = topicCreateTxReceipt.topicId;

    console.log(`Create Topic transaction status: ${topicCreateTxReceipt.status.toString()}`);
    console.log(`Id of the created Tpic: ${topicId}`);

    // Query for the topic informations.
    const topicInfoQuery = new TopicInfoQuery().setTopicId(topicId);
    const topicInfos = await topicInfoQuery.execute(client);
    
    console.log(`Topic Memo: ${topicInfos.topicMemo}`);

    console.log("--------------------Modification of the topic--------------------");

    const topicUpdateTx = new TopicUpdateTransaction()
        .setTopicId(topicId)
        .setTopicMemo("Updated topic")
        .freezeWith(client);

    const signTopicUpdateTx = await topicUpdateTx.sign(adminKey);
    const executeTopicUpdateTx = await signTopicUpdateTx.execute(client);
    const topicUpdateTxReceipt = await executeTopicUpdateTx.getReceipt(client);
    
    console.log(`Update Topic transaction status: ${topicUpdateTxReceipt.status.toString()}`);

    const updatedTopicInfoQuery = new TopicInfoQuery().setTopicId(topicId);
    const updatedTopicInfos = await updatedTopicInfoQuery.execute(client);
    
    console.log(`Updated Topic Memo: ${updatedTopicInfos.topicMemo}`);

    console.log("--------------------Submit a message to the topic--------------------");

    const submitMessageTx = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage("Hello, this is my first message!")
        .freezeWith(client);
    // To submit a message in a topic we shoul sign it with the submit key    
    const signSubmitMessageTx = await submitMessageTx.sign(submitKey);
    const executeSubmitMessageTx = await signSubmitMessageTx.execute(client);
    const submitMessageTxReceipt = await executeSubmitMessageTx.getReceipt(client);

    console.log(`Submit message to the Topic transaction status: ${submitMessageTxReceipt.status.toString()}`);

    console.log("--------------------Read a message to the topic--------------------");

    const topicMessageQuery = await new TopicMessageQuery()
        .setTopicId(topicId)
        .setStartTime(0)
        .setLimit(5)
        .subscribe(client,null,(message) => {
            const messageAsString = Buffer.from(message.contents, "utf8").toString();
            console.log(`Received: ${messageAsString}`);
            process.exit();
        })
}

main();