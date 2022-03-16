import { ApiPromise, WsProvider } from '@polkadot/api';
import { typesBundle } from '@acala-network/type-definitions';


const main = async () => {
    const api = await ApiPromise.create({
        provider: new WsProvider('wss://karura-rpc-1.aca-api.network'),
        typesBundle
    });

    // Block 438151
    const result = await api.rpc.chain.getBlock('0xcb7f7866a14f88bb19fd2b2c04303c381bd569c32413b7eac719e5ef8a40ba9c')

    console.log(result.toHuman())
};

main().catch(err => console.log(err))

// import { ApiPromise, WsProvider } from '@polkadot/api';
// import { typesBundle } from 'moonbeam-types-bundle'

// const main = async () => {
//     const api = await ApiPromise.create({
//         provider: new WsProvider('wss://wss.moonriver.moonbeam.network'),
//         typesBundle
//     });

//     // Block 427542
//     const result = await api.rpc.chain.getBlock('0x9caa779d514cac6d60e51797f88f05a2d5cb839bb6695f039e0810cf21c7b046')

//     console.log(result.toHuman())
// };

// main().catch(err => console.log(err))