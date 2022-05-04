import '@polkadot/api-augment';
import { ApiPromise, WsProvider } from '@polkadot/api';

/**
 * Simple polkadot-js template to test and reproduce things locally
 */
const main = async () => {
    const api = await ApiPromise.create({
        provider: new WsProvider('wss://rpc.polkadot.io'),
    });

    const apiAt = await api.at('0x29e2e4f443a33bc347bfdcc045765c62f859ae9a008b846079713fc5e56f50b2')

    // Tests against v29
    console.log('Using api.at: ', apiAt.consts.system.blockWeights.toJSON());

    // Tests against v9180
    console.log('Using api: ', api.consts.system.blockWeights.toJSON())
};

main().catch(err => console.log(err)).finally(() => process.exit());
