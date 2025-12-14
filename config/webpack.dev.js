// config/webpack.dev.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    devtool: 'inline-source-map',
    
    entry: './src/index.js',
    
    output: {
        filename: 'main.bundle.js',
        path: path.resolve(__dirname, '../dist'),
        publicPath: '/',
    },

    // Electron/Preact uyumluluğu için kritik aliaslar
    resolve: {
        alias: {
            'react': 'preact/compat',
            'react-dom': 'preact/compat',
        },
        extensions: ['.js', '.jsx'],
    },
    
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            '@babel/preset-env', 
                            // Preact için JSX pragma'sı
                            ['@babel/preset-react', { pragma: 'h', pragmaFrag: 'Fragment' }] 
                        ],
                    },
                },
            },
            // CSS veya diğer yükleyiciler buraya eklenebilir
        ],
    },
    
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html',
        }),
    ],

    devServer: {
        host: '0.0.0.0',
        port: 8088, 
        hot: true,
        static: {
             directory: path.resolve(__dirname, '../src'), 
             publicPath: '/',
        },
    },
};