## Solana TPS Test for Coin Transfer

##### Hardware: dedicated server at `nocix.net`

- Processor 2x E5-2660 @ 2.2GHz / 3GHz Turbo 16 Cores / 32 thread
- Ram 96 GB DDR3
- Disk 960 GB SSD
- Bandwidth 1Gbit Port: 200TB Transfer
- Operating System Ubuntu 18.04 (Bionic)

##### Network setup

- A cluster of 5 nodes was run.
- All nodes used the same IP, but different ports
- JSON-RPC server which is attached bootstrap (first) node, is used to query the block info

##### Test setup for native coin transfer

- 5000 accounts were created and funded from the faucet before spamming the network
- native coin txs were submitted to the network as fast as possible
  - Each tx moved 1 SOL between two different randomly chosen accounts
  - The number of accounts was chosen to be equal to the number of total txs so that there would be a low chance of a tx getting rejected due to another transaction from the same account still pending.

##### Test result

- Tests are taken starting from 150 tps to 1200 tps for 10 seconds. Time between the start of the test and the last block to process txs from the test was measured.
- Total txs/ Time taken = Average tps
  ```
   4500 / 10 = 450
   6000 / 12 = 500
   7500 / 14 = 535
   9000 / 17 = 529
  10500 / 18 = 583
  12000 / 21 = 571
  ```
- Estimated average tps is **500 - 600 TPS**

##### Instructions to recreate this test:

1.  Requirements
    1. [Rust](https://www.rust-lang.org/tools/install)
    2. [Solana Tool Suite](https://docs.solana.com/cli/install-solana-cli-tools)
    3. git clone [https://github.com/solana-labs/solana.git](https://github.com/solana-labs/solana.git)
    4. We will be referencing this testing on [Benchmark a Cluster](https://docs.solana.com/cluster/bench-tps)
2.  As described in the [Benchmark a Cluster](https://docs.solana.com/cluster/bench-tps), we will make a local cluster of 5 validators. Before starting the network, we need to change this config to let the user see the info about the transaction’s history.
    1. Open solana/multinode-demo/bootstrap-validator.sh file.
    2. Search “default_arg --[parameter]” in the code.
    3. Add this parameter “default_arg --enable-rpc-transaction-history” under that line.
3.  As described in the [Benchmark a Cluster](https://docs.solana.com/cluster/bench-tps), follow each step and start the network.

    1. Configure setup
       1. cargo build --release
       2. NDEBUG=1 ./multinode-demo/setup.sh
    2. Faucet
       1. NDEBUG=1 ./multinode-demo/faucet.sh
    3. Bootstrap Validator 4. NDEBUG=1 ./multinode-demo/bootstrap-validator.sh
    4. Multiple nodes
       1. To run a multi-node testnet, after starting a leader node, spin up some additional validators in separate shells:
       2. NDEBUG=1./multinode-demo/validator-x.sh
    5. Check validators info ( Wait for a bit for the network to sync up with the validators)

       1. solana config set --url localhost ( To point out the cli to local network)
       2. solana validators
          It would display something like “ 5 current validators ”

4.  Custom Scripts used for running transactions to the network

    1.  [https://gitlab.com/shardeum/smart-contract-platform-comparison/solana](https://gitlab.com/shardeum/smart-contract-platform-comparison/solana)
    2.  cd spam-client && npm install && npm link
    3.  To generate accounts and fund the accounts some balance from the faucet
        1. `spammer accounts --number [number]`
        2. Accounts creation and funding these accounts take time.
        3. Suggest to create accounts from many terminals.
    4.  Spam the network with these accounts and check the average TPS in each spam with step no.5.

        - `spammer spam --duration [number] --rate [number]`
          e.g. To spam the network for 5 seconds with 10 tps
          spammer spam --duration 5 --rate 10

    5.  Check the average TPS of the spam

        - `spammer check_tps --output [json_file_name]`
          e.g. spammer check_tps --output s1280.json

    6.  cd spam-client-orchestrator && npm install
    7.  The spam-client waits for each tx confirmation, so it takes a bit for all the transactions. The spam-client can hit with tps rate ( 50 tps ) . Though, we suggest using 15 tps rate in the spammer. If we test the spammer with 15 tps for 10 second; we can see in the log that spamming time is exactly 10 seconds. Higher tps can take much longer to spam all the transactions. So we used spam-client-orchestrator to spam with many terminals.
        Check out the README for usage.

5.  Before start spamming
    1. Open a terminal for `solana logs` - which will give the submitted transactions status
    2. Open a terminal for `solana block [slot]` - To see the block info
    3. Make sure you create accounts before spamming it
6.  Some useful commands for getting information from the network
    - solana config set --url localhost
    - solana slot
    - solana transaction-count
    - solana block
    - solana logs
    - solana validators
