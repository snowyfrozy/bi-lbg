const express = require('express')
const basicAuth = require('express-basic-auth')
const moment = require('moment');
const config = require('./lib/config');
const _ = require('lodash');
const fetcher = require('./lib/fetch/fetcher');

const app = express()
const port = 3000

init();

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db/product.json')
const db = low(adapter)
const collection = db
    .defaults({ data: [] })
    .get('data')


app.get('/', (req, res) => {
    // Find the shop id
    const shopId = "3098719";

    // For every shop, do this things bellow

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
            db.get('data')
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

})


app.get('/products', (req, res) => {
    // Get the data from the DB
    var products = collection.value();
    res.json(products);
})

function getCurrentTimestamp() {
    return moment().format('YYMMDDD_h_mm_ss');
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

app.listen(port, () => console.log(`Example app listening on port ${port}!`))