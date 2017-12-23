/**
 * @file webpack config
 */
'use strict';

let fs = require('fs');
let path = require('path');

let entryPath = __dirname + '/src/entry/';

let entry = fs.readdirSync(entryPath).reduce((r, fileName) => {
        r[fileName.replace(/\.js$/, '')] = entryPath + fileName;
        return r;
    }, {});

let nodeModulesDir = path.resolve(__dirname, 'node_modules');

module.exports = {
    entry: entry,
    output: {
        path: __dirname + '/dist/static/js',
        filename: '[name].js'
    },
    module: {
        preLoaders: [
            {
                test: /\.jsx?$/, loader: 'babel-loader',
                query: {
                    presets: [
                        'react',
                        'es2015'
                    ]
                }
            }
        ],
        loaders: [
            // LESS
            {
                test: /\.less$/,
                exclude: [nodeModulesDir],
                loader: 'style!css-loader!less-loader'
            },
            {
                test: /\.css$/,
                exclude: [nodeModulesDir],
                loader: 'style!css-loader?modules'
            },
            {
                test: /\.json$/,
                exclude: [nodeModulesDir],
                loader: 'json-loader'
            }
        ]
    }
};
