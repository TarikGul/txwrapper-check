import { Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import {
    construct,
    decode,
    deriveAddress,
    methods,
    PolkadotSS58Format,
    getRegistry
} from '@substrate/txwrapper-polkadot';

import { BlockNumber } from '@polkadot/types/interfaces';
import { signWith } from './util';
import { ApiPromise, WsProvider } from '@polkadot/api';

const KEY = ''

export async function polkadotExample(): Promise<void> {
    const api = await ApiPromise.create({
        provider: new WsProvider('wss://westend-asset-hub-rpc.polkadot.io')
    })

    await api.isReady;
    
    // Wait for the promise to resolve async WASM
    await cryptoWaitReady();
    // Create a new keyring, and add an "Alice" account
    const keyring = new Keyring();
    const sender = keyring.addFromMnemonic(KEY, { name: 'Alice' }, 'sr25519');
    console.log(
        "Alice's SS58-Encoded Address:",
        deriveAddress(sender.publicKey, PolkadotSS58Format.polkadot)
    );

    // Construct a balance transfer transaction offline.
    // To construct the tx, we need some up-to-date information from the node.
    // `txwrapper` is offline-only, so does not care how you retrieve this info.
    // In this tutorial, we simply send RPC requests to the node.
    const { block } = await api.rpc.chain.getBlock();
    const blockHash = await api.rpc.chain.getBlockHash();
    const genesisHash = await api.rpc.chain.getBlockHash(0);
    const metadataRpc = (await api.rpc.state.getMetadata()).toHex();
    const { specVersion, transactionVersion, specName } = await api.rpc.state.getRuntimeVersion();

    // Create Polkadot's type registry.
    const registry = getRegistry({
        chainName: 'Polkadot',
        specName: specName.toString() as 'statemint',
        specVersion: specVersion.toNumber(),
        metadataRpc,
        signedExtensions: ['ChargeAssetTxPayment']
    });

    // Now we can create our `balances.transferKeepAlive` unsigned tx. The following
    // function takes the above data as arguments, so can be performed offline
    // if desired.
    const unsigned = methods.balances.transferKeepAlive(
        {
            value: '100000000000',
            dest: {id: '5HBhDLa6ZUmRjmNKSgT2QPVZgaYqKYYKBPKSZswsDMpUtzGF'}, // Bob
        },
        {
            address: deriveAddress(sender.publicKey, PolkadotSS58Format.polkadot),
            blockHash: blockHash.toString(),
            blockNumber: (registry
                .createType('BlockNumber', block.header.number) as BlockNumber)
                .toNumber(),
            eraPeriod: 64,
            genesisHash: genesisHash.toString(),
            metadataRpc,
            nonce: 0, // Assuming this is Alice's first tx on the chain
            specVersion: specVersion.toNumber(),
            tip: 0,
            transactionVersion: transactionVersion.toNumber(),
        },
        {
            metadataRpc,
            registry,
        }
    );

    // Decode an unsigned transaction.
    const decodedUnsigned = decode(unsigned, {
        metadataRpc: metadataRpc,
        registry,
    });
    console.log(
        `\nDecoded Transaction\n  To: ${(decodedUnsigned.method.args.dest as { id: string })?.id
        }\n` + `  Amount: ${decodedUnsigned.method.args.value}`
    );

    // Construct the signing payload from an unsigned transaction.
    const signingPayload = construct.signingPayload(unsigned, { registry });
    console.log(`\nPayload to Sign: ${signingPayload}`);

    // Decode the information from a signing payload.
    const payloadInfo = decode(signingPayload, {
        metadataRpc: metadataRpc,
        registry,
    });
    console.log(
        `\nDecoded Transaction\n  To: ${(payloadInfo.method.args.dest as { id: string })?.id
        }\n` + `  Amount: ${payloadInfo.method.args.value}`
    );

    // Sign a payload. This operation should be performed on an offline device.
    const signature = signWith(sender, signingPayload, {
        metadataRpc: metadataRpc,
        registry,
    });
    console.log(`\nSignature: ${signature}`);

    // Serialize a signed transaction.
    const tx = construct.signedTx(unsigned, signature, {
        metadataRpc: metadataRpc,
        registry,
    });
    console.log(`\nTransaction to Submit: ${tx}`);

    // Derive the tx hash of a signed transaction offline.
    const expectedTxHash = construct.txHash(tx);
    console.log(`\nExpected Tx Hash: ${expectedTxHash}`);

    // Send the tx to the node. Again, since `txwrapper` is offline-only, this
    // operation should be handled externally. Here, we just send a JSONRPC
    // request directly to the node.
    await api.rpc.author.submitExtrinsic(tx);

    // Decode a signed payload.
    const txInfo = decode(tx, {
        metadataRpc: metadataRpc,
        registry,
    });
    console.log(
        `\nDecoded Transaction\n  To: ${(txInfo.method.args.dest as { id: string })?.id
        }\n` + `  Amount: ${txInfo.method.args.value}\n`
    );
}
