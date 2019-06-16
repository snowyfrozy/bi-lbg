const request = require('request');
const fs = require('fs');
const config = require('../config');

class Fetcher {
    getProductByShopId(id) {
        
        var baseUrl = config().baseUrl;

        // TODO Recursive for page more than 1! 
        var param = {
            "variables": {
                "sid": id,
                "page": 1,
                "perPage": 3000,
                "etalaseId": "etalase",
                "sort": 5
            },
            "query": "query ShopProducts($sid: String!, $page: Int, $perPage: Int, $keyword: String, $etalaseId: String,  $sort: Int){\n  GetShopProduct(shopID: $sid, filter: { page: $page, perPage: $perPage, fkeyword: $keyword, fmenu: $etalaseId, sort: $sort }){\n    status\n    errors\n    links {\n      prev\n      next\n    }\n    data {\n      name\n      product_url\n      product_id\n      price {\n        text_idr\n      }\n      primary_image{\n        original\n        thumbnail\n        resize300\n      }\n      flags{\n        isSold\n        isPreorder\n        isWholesale\n        isWishlist\n      }\n      campaign {\n        discounted_percentage\n        original_price_fmt\n        start_date\n        end_date\n      }\n      label{\n        color_hex\n        content\n      }\n      badge{\n        title\n        image_url\n      }\n      stats{\n        reviewCount\n        rating\n      }\n      category{\n        id\n      }\n    }\n  }\n}",
            "operationName": null
        };

        return new Promise(function (resolve, reject) {
            // Do async job
            request.post(baseUrl, { json: true, body: param }, function (err, resp, body) {
                console.log(resp.statusCode)
                if (err) {
                    reject(err);
                } else {
                    resolve(body);
                }
            })
        })
    }
}

module.exports = new Fetcher();