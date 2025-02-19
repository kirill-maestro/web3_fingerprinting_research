const Web3TrackingAnalyzer = require('./tracking-analyzer');

const DAPPS_TO_ANALYZE = [
    'https://app.uniswap.org',
    'https://balancer.fi/swap/ethereum/ETH',
    'https://pancakeswap.finance/',
    'https://swap.cow.fi/#/1/swap/WETH',
    'https://app.1inch.io/#/1/simple/swap/ETH',
    'https://moonwell.fi/discover',
    'https://app.morpho.org/',
    'https://app.sky.money/',
    'https://app.odos.xyz/',
    'https://curve.fi/#/ethereum/swap',
    'https://www.jito.network/',
    'https://holdstation.exchange/trading?p=BTCUSD',
    'https://app.camelot.exchange/',
    'https://sun.io/?lang=en-US#/v3/swap?type=swap',
    'https://pump.fun/board',
    'https://trade-signal.net/',
    'https://quickswap.exchange/#/swap?currency0=ETH&currency1=0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619&swapIndex=0',
    'https://app.across.to/bridge?',
    'https://app.ethena.fi/buy',
    'https://app.paraswap.xyz/#/swap/',
    'https://www.sushi.com/ethereum/swap',
    'https://jumper.exchange/',
    'https://app.pendle.finance/trade/markets',
    'https://app.kanalabs.io/',
    'https://lfj.gg/avalanche/trade',
    'https://woofi.com/',
    'https://app.bemo.fi/',
    'https://stargate.finance/',
    'https://app.lynex.fi/',
    'https://meson.fi/',
    //'https://polkastarter.com',
    // Add more dapps
];

async function runAnalysis() {
    const analyzer = new Web3TrackingAnalyzer();
    
    for (const dapp of DAPPS_TO_ANALYZE) {
        await analyzer.analyze(dapp);
    }
    
    const report = analyzer.generateReport();
    console.log('Analysis Complete!');
    console.log(JSON.stringify(report, null, 2));
}
runAnalysis().catch(console.error);