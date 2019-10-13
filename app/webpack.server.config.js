const path = require("path");
const TerserPlugin = require('terser-webpack-plugin');

const nodeExternals = require('webpack-node-externals');

module.exports = [
    {
        entry: './server/src/main/ts/index.ts',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: [{
                        loader: 'ts-loader',
                        options: {
                            configFile: "tsconfig.server.json"
                        }
                    }],
                    exclude: /node_modules/,
                }
            ]
        },
        externals: [nodeExternals()],
        target: 'node',
        node: {
            __dirname: false,
            __filename: false,
        },
        resolve: {
            extensions: [ '.ts', '.tsx', '.js' ],
            alias: {
                common: path.resolve(__dirname, 'common/src/main/ts/'),
            }
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'index.js'
        },
        optimization: {
            minimizer: [new TerserPlugin()],
        },
    },
];
