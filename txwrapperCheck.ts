import { multisigExample } from './multisig';
import { polkadotExample } from './polkadot';

const YELLOW = '\u001b[33m';
const RESET = '\u001b[0m';

async function main(): Promise<void> {
    console.log(`\n${YELLOW} ----------------- Running the Polkadot example ----------------- ${RESET}\n`);
    await polkadotExample();
    console.log(`\n${YELLOW} ----------------- Running the Multisig example ----------------- ${RESET}\n`);
    await multisigExample();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

