import { Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import {
    construct,
    decode,
    deriveAddress,
    getRegistry,
    methods,
    PolkadotSS58Format
} from '@substrate/txwrapper-polkadot';

import { KeyringPair } from '@polkadot/keyring/types';
import { EXTRINSIC_VERSION } from '@polkadot/types/extrinsic/v4/Extrinsic';
import { createMetadata, OptionsWithMeta } from '@substrate/txwrapper-polkadot';
import { BlockNumber } from '@polkadot/types/interfaces';
import fetch from 'node-fetch';

/**
 * Send a JSONRPC request to the node at http://localhost:9933.
 *
 * @param method - The JSONRPC request method.
 * @param params - The JSONRPC request params.
 */
export function rpcToLocalNode(
    method: string,
    params: any[] = []
): Promise<any> {
    return fetch('http://127.0.0.1:9933', {
        body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            method,
            params,
        }),
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
    })
        .then((response) => response.json())
        .then(({ error, result }) => {
            if (error) {
                throw new Error(
                    `${error.code} ${error.message}: ${JSON.stringify(error.data)}`
                );
            }

            return result;
        });
}

/**
 * Signing function. Implement this on the OFFLINE signing device.
 *
 * @param pair - The signing pair.
 * @param signingPayload - Payload to sign.
 */
export function signWith(
    pair: KeyringPair,
    signingPayload: string,
    options: OptionsWithMeta
): `0x${string}` {
    const { registry, metadataRpc } = options;
    // Important! The registry needs to be updated with latest metadata, so make
    // sure to run `registry.setMetadata(metadata)` before signing.
    registry.setMetadata(createMetadata(registry, metadataRpc));

    const { signature } = registry
        .createType('ExtrinsicPayload', signingPayload, {
            version: EXTRINSIC_VERSION,
        })
        .sign(pair);

    return signature;
}

async function main(): Promise<void> {
    // Wait for the promise to resolve async WASM
    await cryptoWaitReady();
    // Create a new keyring, and add an "Alice" account
    const keyring = new Keyring();
    const sender = keyring.addFromUri('//Alice', { name: 'Alice' }, 'sr25519');
    console.log(
        "Alice's SS58-Encoded Address:",
        deriveAddress(sender.publicKey, PolkadotSS58Format.polkadot)
    );

    // Construct a balance transfer transaction offline.
    // To construct the tx, we need some up-to-date information from the node.
    // `txwrapper` is offline-only, so does not care how you retrieve this info.
    // In this tutorial, we simply send RPC requests to the node.
    const { block } = await rpcToLocalNode('chain_getBlock');
    const blockHash = await rpcToLocalNode('chain_getBlockHash');
    const genesisHash = await rpcToLocalNode('chain_getBlockHash', [0]);
    const metadataRpc = await rpcToLocalNode('state_getMetadata');
    const { specVersion, transactionVersion, specName } = await rpcToLocalNode(
        'state_getRuntimeVersion'
    );

    // Create Polkadot's type registry.
    const registry = getRegistry({
        chainName: 'Polkadot',
        specName: specName,
        specVersion: specVersion,
        metadataRpc: metadataRpc,
    });

    // Now we can create our `balances.transferKeepAlive` unsigned tx. The following
    // function takes the above data as arguments, so can be performed offline
    // if desired.
    const unsigned = methods.balances.transferKeepAlive(
        {
            value: '1000000000',
            dest: '5HBhDLa6ZUmRjmNKSgT2QPVZgaYqKYYKBPKSZswsDMpUtzGF', // Bob
        },
        {
            address: deriveAddress(sender.publicKey, PolkadotSS58Format.polkadot),
            blockHash: blockHash,
            blockNumber: (registry
                .createType('BlockNumber', block.header.number) as BlockNumber)
                .toNumber(),
            eraPeriod: 64,
            genesisHash,
            metadataRpc,
            nonce: 0, // Assuming this is Alice's first tx on the chain
            specVersion,
            tip: 0,
            transactionVersion,
        },
        {
            metadataRpc: metadataRpc,
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
    const actualTxHash = await rpcToLocalNode('author_submitExtrinsic', [tx]);
    console.log(`Actual Tx Hash: ${actualTxHash}`);

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

main().catch((error) => {
    console.error(error);
    process.exit(1);
});