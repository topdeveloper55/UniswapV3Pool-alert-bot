const { ethers } = require('ethers');
const axios = require("axios");
const UNISWAP_V3_FACTORY_ABI = require("./factory.json");
const ERC20_ABI = require("./erc20.json");
const POOL_ABI = require("./pool.json");

const Web3 = require('web3');
const { Telegraf } = require('telegraf');
const inform_id = 5479145008;
const tg_token = "5960334191:AAFuJA3kkeJVjCSmulvbUzKs_VTMM0Op4iM";
const bot = new Telegraf(tg_token);

const PROJECT_ID = "0139f91d218346548c4a00315cf34d08";
const COIN_API_KEY = "bff61857-86dd-45c8-90c1-0ce399c5dcf1";

// Connect to Ethereum network
const provider = new ethers.providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${PROJECT_ID}`);

// return the token price of a specific token symbol
const getPrice = async (tokenSymbol) => {
  const response = await axios.get(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${tokenSymbol}&convert=USD`, {
    headers: {
      'X-CMC_PRO_API_KEY': COIN_API_KEY,
    },
  });
  return response.data.data[tokenSymbol]?.quote.USD.price || 0;
}

const getTokenBalance = async (token, owner) => {
  const tokenContract = new ethers.Contract(token, ERC20_ABI, provider);
  const bal = await tokenContract.balanceOf(owner);
  const dec = await tokenContract.decimals();
  return Number(bal) / (10 ** Number(dec));
}

// Create instance of Uniswap V3 factory contract
const uniswapV3FactoryContract = new ethers.Contract('0x1F98431c8aD98523631AE4a59f267346ea31F984', UNISWAP_V3_FACTORY_ABI, provider);

// Subscribe to PoolCreated event
uniswapV3FactoryContract.on('PoolCreated', async (token0, token1, fee, tickSpacing, pool, event) => {
  const tokenAContract = new ethers.Contract(token0, ERC20_ABI, provider);
  const tokenA_Symbol = await tokenAContract.symbol();

  const tokenBContract = new ethers.Contract(token1, ERC20_ABI, provider);
  const tokenB_Symbol = await tokenBContract.symbol();

  const aPrice = await getPrice(tokenA_Symbol);
  const bPrice = await getPrice(tokenB_Symbol);
  const aBal = await getTokenBalance(token0, pool);
  const bBal = await getTokenBalance(token1, pool);
  const usdValue = aPrice * aBal + bPrice * bBal;
  if(usdValue >= 1000) {
    bot.telegram.sendMessage(inform_id, `${tokenA_Symbol} : ${token0}\n${tokenB_Symbol} : ${token1}\nLP Address : ${pool}\nLiquidity Amount : $${usdValue.toFixed(1)}`, {
    });
  }
  console.log('Pool created:', pool);
  console.log('Token0 traded:', token0, tokenA_Symbol);
  console.log('Token1 traded:', token1, tokenB_Symbol);
  console.log("usdValue: ", usdValue);
});

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

bot.launch();
