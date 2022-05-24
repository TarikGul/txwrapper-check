## Description
The goal of this check is to make sure that `txwrapper-polkadot` works correctly after the latest txwrapper-core release.

## Setup environment
First we need to build and start a polkadot dev node by following the steps below :

- Fetch the latest Substrate or Polkadot/Kusama node from this link https://github.com/paritytech/polkadot/
- Follow instructions to build it, and start a dev chain :

    ```bash
    target/release/polkadot --dev
    ```

## Check
Then we update the dependencies and run the example by executing the following commands :

```bash
# Update the deps
$ yarn up "@substrate/*"
$ yarn dedupe
$ yarn start
```

If there are no errors and txwrapper-polkadot works as is, then you're all good.
