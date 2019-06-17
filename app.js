const express = require('express')
const basicAuth = require('express-basic-auth')
const moment = require('moment');
const config = require('./lib/config');
const _ = require('lodash');
const fetcher = require('./lib/fetch/fetcher');
const CronJob = require('cron').CronJob;

const app = express()
const port = 3000

init();

// TODO !!!!
const hour = config().cron_hour;

// Lagom
new CronJob('5 * ' + hour + ' * * *', function () {
    console.log(new Date() + ' You will see this message every 5 second');
    fetchAndSave("3098719");
}, null, true);

// Monopolis
new CronJob('15 * ' + hour + ' * * *', function () {
    console.log(new Date() + ' You will see this message every 15 second');
    fetchAndSave("593197");
}, null, true);

// Helovesus
new CronJob('30 * ' + hour + ' * * *', function () {
    console.log(new Date() + ' You will see this message every 30 second');
    fetchAndSave("1045848");
}, null, true);

app.get('/', (req, res) => {

    // TODO ! Refactor for multi step 
    // fetchAndAnalyse(shopId);

    // fetchAction();

    res.json({ 'status': 'ok' });
})

app.get('/fetchs', (req, res) => {
    // Get the data from the DB
    res.json(getCollection('fetchs'));
})

app.get('/fetchs/latest', (req, res) => {
    var fetchs = getCollection('fetchs').value();

    var latestFetch =  _.maxBy(fetchs, 'fetch_time')
    res.json(new Date(latestFetch.fetch_time));
})


// TODO ! For each shop find the latest 2 fetches, and then compare it !
app.get('/analyse', (req, res) => {
    // Get the data from the DB
    var fetchs = getCollection('fetchs').value();
    var length = fetchs.length;

    var fetchTimes = _.map(fetchs, 'fetch_time');
    _.forEach(fetchs, el => {
        console.log(el.shop_id);
        console.log(new Date(el.fetch_time));
    });
    res.json(length);
})


app.get('/products', (req, res) => {
    // Get the data from the DB
    var products = getCollection('product');
    res.json(products);
})

function getCurrentTimestamp() {
    return (new Date()).getTime()
}

function appendShopId(arr, meta) {
    return _.map(arr, function (element) {
        return _.extend({}, element, meta);
    });
}

function init() {
    const securityEnabled = config().security_enabled;
    if (securityEnabled) {
        const uname = config().username;
        const password = config().password;
        var authUser = {};
        authUser[uname] = password;

        app.use(basicAuth({
            users: authUser
        }))
    }

}

function getCollection(collectionName) {
    const low = require('lowdb');
    const FileSync = require('lowdb/adapters/FileSync');
    const adapter = new FileSync('db/' + collectionName + '.json');
    const db = low(adapter);

    return db.defaults({ data: [] }).get('data');
}

const fetchs = getCollection('fetchs');
const shops = getCollection('shops').value();

// Possible solution : https://gist.github.com/bschwartz757/5d1ff425767fdc6baedb4e5d5a5135c8
function fetchAction() {
    // TODO !!!! Async call :( 
    shops.forEach(el => {
        fetchAndSave(el.id);
    })
}


// Main Logic to fetch from remote and save it to the DB
function fetchAndSave(shopId) {
    // Fetch data
    fetcher.getProductByShopId(shopId)

        .then(function (result) {

            console.log("HERE");

            var entry = {
                fetch_time: getCurrentTimestamp(),
                shop_id: shopId,
                value: result
            };

            fetchs.push(entry).write();
        }, function (err) {
            console.log(err);
        });
}

function fetchAndAnalyse(shopId) {
    const collection = getCollection('products');

    // Fetch data
    fetcher.getProductByShopId(shopId)
        .then(function (result) {
            // Get the data from the DB
            var orig = collection.value();

            // Find the difference by the shop id
            var diff = _.differenceBy(result.data.GetShopProduct.data, orig, 'product_id');
            console.log(diff);

            // Append the shop id + more information (created_at, updated_at)
            var toBeSaved = appendShopId(diff, { "shop_id": shopId, "created_at": (new Date()).getTime() });

            // Save the diffference to the DB
            collection
                .merge(toBeSaved)
                .write();

            var summary = {
                data_before: result.length,
                to_be_added: diff.length
            }

            res.json(summary);
        }, function (err) {
            console.log(err);
        });

}

app.listen(port, () => console.log(`Example app listening on port ${port}!`))