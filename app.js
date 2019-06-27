const express = require('express')
const basicAuth = require('express-basic-auth')
const config = require('./lib/config');
const _ = require('lodash');
const fetcher = require('./lib/fetch/fetcher');
const rp = require('request-promise-native');
const request = require('request-promise-native');

const app = express()
const port = 3000


init();

function getCollection(collectionName) {
    const low = require('lowdb');
    const FileSync = require('lowdb/adapters/FileSync');
    const adapter = new FileSync('db/' + collectionName + '.json');
    const db = low(adapter);

    return db.defaults({ data: [] }).get('data');
}

const shops = getCollection('shops').value();

app.get('/', async (req, res) => {

    var result = await magic();

    res.json(result);
    // res.json({ 'status': 'ok' });
})


app.get('/diff', (req, res) => {

    magic();
    res.json(magic());
    // res.json({ 'status': 'ok' });
})
async function magic() {
    // TODO ! Refactor for multi step 
    // fetchAndAnalyse(shopId);
    var result = [];
    shops.forEach(async (el) => {
        result.push(await main(el));
    });

    return Promise.resolve(result);
}

async function main(shop) {
    var shopId = shop.id;
    var lastTwoProducts = await doSomething(shopId);
    var diff = calculateDifference(lastTwoProducts);

    var result = { "shop_id": shop.name, "diff": diff };
    console.debug(result);
    return Promise.resolve(result);
}


function calculateDifference(lastTwoProducts) {
    const diff = _.differenceBy(lastTwoProducts[0], lastTwoProducts[1], 'product_id');
    return diff;
}

async function doSomething(shopId) {
    var lastTwoProducts = await getLastTwoProductByShop(shopId);


    // Clean last two products
    var cleanedProducts = await _.map(lastTwoProducts, 'value.data.GetShopProduct.data');

    _.forEach(cleanedProducts[0], el => {
        el.timestamp = lastTwoProducts[0].createdAt;
        el.price_tag = el.price.text_idr;
        el.type = "stocked";
    })

    _.forEach(cleanedProducts[1], el => {
        el.timestamp = lastTwoProducts[1].createdAt;
        el.price_tag = el.price.text_idr;
        el.type = "sold";
    })

    console.debug("DONE Getting Products from the shop : " + shopId);
    return Promise.resolve(cleanedProducts);
}
app.get('/fetch', (req, res) => {
    fetchAction();
})

// app.get('/fetchs/:shopName', (req, res) => {
//     var shop = getCollection('shops').find({alias: req.params.shopName}).value();
//     // Get the data from the DB
//     res.json(getCollection('fetchs').find({shop_id: shop.id}).size().value);
// })

app.get('/fetch', (req, res) => {
    fetchAction();
})


app.get('/fetchs/latest', (req, res) => {
    var fetchs = getCollection('fetchs').value();

    var latestFetch = _.maxBy(fetchs, 'fetch_time')
    res.json(new Date(latestFetch.fetch_time));
})

app.get('/now', (req, res) => {
    // Get the data from the DB
    res.json(new Date());
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


// Possible solution : https://gist.github.com/bschwartz757/5d1ff425767fdc6baedb4e5d5a5135c8
async function fetchAction() {
    // TODO !!!! Async call :( 
    await shops.forEach(async (el) => {
        const doneSaving = await fetchAndSave(el.id);
        console.debug("DONE for {}, with {}", el.id, doneSaving);
    })

}

// Main Logic to fetch from remote and save it to the DB
async function fetchAndSave(shopId) {
    // Fetch data
    const products = await fetcher.getProductByShopId(shopId);
    console.debug("Products for {} are {}", shopId, products);

    var entry = {
        shop_id: shopId,
        value: products
    };

    await saveToStrapi(entry);

}

async function saveToStrapi(entry) {
    console.debug("Sending to backend")

    const baseUrl = config().backend_base_url + "fetches";
    await rp.post(baseUrl, { json: true, body: entry });
    console.debug("[DONE] Sending to backend");
}

// TODO
function fetchAndAnalyse(shopId) {
    const collection = getCollection('products');

    // Fetch data
    fetcher.getProductByShopId(shopId)
        .then(function (result) {
            // Get the data from the DB
            var orig = collection.value();

            // Find the difference by the shop id
            var diff = _.differenceBy(result.data.GetShopProduct.data, orig, 'product_id');
            console.log(iff);

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

/**
 * DAO For Fetchs-Table
 */
async function getLastTwoProductByShop(shopId) {
    const baseUrl = config().backend_base_url + "fetches?_sort=createdAt:DESC&_limit=2&shop_id_contains=" + shopId;

    const lastTwoProduct = await request.get(baseUrl, { json: true });

    return Promise.resolve(lastTwoProduct);
}

app.listen(port, () => console.log(`Example app listening on port ${port}!`))