let kafka = require("kafka-node");
global.config = require('./env/local.json');

const events_1 = require("events");
try {
    process.setMaxListeners(0);
    events_1.EventEmitter.defaultMaxListeners = Infinity;
}
catch (e) {
    console.log('error:', e)
}

var options = {
    autoCommitIntervalMs:100,
    fetchMaxWaitMs: 1000,
    autoCommit: true, 
    kafkaHost: global.config.brokerUrl, // connect directly to kafka broker (instantiates a KafkaClient)
    ssl: true, // optional (defaults to false) or tls options hash
    groupId: global.config.groupId,
    sessionTimeout: 15000,  //session is restarted after every 15 seconds
    // An array of partition assignment protocols ordered by preference.
    // 'roundrobin' or 'range' string for built ins (see below to pass in custom assignment protocol)
    protocol: ['roundrobin'],
    fromOffset: 'latest', // default
    commitOffsetsOnFirstJoin: true, // on the very first time this consumer group subscribes to a topic, record the offset returned in fromOffset (latest/earliest)
    // how to recover from OutOfRangeOffset error (where save offset is past server retention) accepts same value as fromOffset
    outOfRangeOffset: 'latest', // default
    onRebalance: (isAlreadyMember, callback) => { callback(); } // or null
    // Callback to allow consumers with autoCommit false a chance to commit before a rebalance finishes
    // isAlreadyMember will be false on the first connection, and true on rebalances triggered after that
};


var consumer = new kafka.ConsumerGroup(options, global.config.topic);

consumer.on("ready", async (message) => {
    console.log('I am ready bring it on !!!!!!', message)
});
consumer.on("rebalanced", async () => {
    console.log(`consumer rebalanced !!!! at ${Date.now().toString()} kafkaUrl ${options.kafkaHost}`);
});

consumer.on("rebalancing", async () => {
    console.log('consumer rebalancing......');
});
consumer.on("error", async (message) => {
    console.log('error in consumer', message)
});

global.totalMess = 0
global.startTime = 0
consumer.on("message", async (message) => {
    if(!global.startTime){
        global.startTime = Date.now()
    } 
    // Read string into a buffer.
    // console.log("-----message: ", message)
    if (!message.value) return
    // console.log("------", message)
    message = JSON.parse(message.value)
    message.message = JSON.parse(message.message)
    console.log("id: ", message.message._id)
    // console.log('--------count', message.count, 'start', message.startTime, 'now', Date.now(), 'timediff', (Date.now() - message.startTime) );
    global.diffTime = (Date.now() - global.startTime)/1000
    console.log('total time in sec: '+global.diffTime+'total message:'+global.totalMess++)
});

consumer.on("error", async (err) => {
    consumer.commit(function(error, data) {
        console.log("error", error);
    });
    console.log("error", err);
});

process.on("SIGINT", async () => {
    consumer.close(true, async () => {
        process.exit();
    });
});
