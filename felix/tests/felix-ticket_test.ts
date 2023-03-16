
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.5.0/index.ts';
import { resolve, join } from "https://deno.land/std@0.179.0/path/mod.ts";
import { build } from '../../felix-helper/template.ts';
import { range } from './helpers.ts';

// @TODO: fix types
// @TODO: calculate fee dynamically on the contract based on percentage
const fee = 'u3';
const ticketPrice = 'u97';
const numberOfTickets = 'u100';
const slotSize =  'u100000';
const numberOfSlots = 'u0';

(async () => {
    const contract = await build(resolve(join('./contracts/felix-ticket.clar.hbs')), {
        fee,
        ticketPrice,
        numberOfSlots,
        numberOfTickets,
        slotSize
    });

    if (!contract) {
        throw new Error('Contract template unavailable');
    }

    const setup = (chain: Chain, accounts: Map<string, Account>): void => {
        chain.mineBlock([
            Tx.deployContract('felix-test', contract, accounts.get('deployer')!.address),
        ]);
    }
    /**
     * mint
     */
    Clarinet.test({
        name: "Allows users to mint tickets for a given principle",
        fn(chain: Chain, accounts: Map<string, Account>) {
            setup(chain, accounts);
            const caller = accounts.get('wallet_3')!;
            const block = chain.mineBlock([
                Tx.contractCall('felix-test', 'mint', [types.principal(caller.address)], caller.address),
                Tx.contractCall('felix-test', 'get-owner', [types.uint(1)], caller.address)
            ]);
            block.receipts[0].result.expectOk().expectUint(1);
            block.receipts[1].result.expectOk().expectSome().expectPrincipal(caller.address);
        },
    });

    Clarinet.test({
        name: "Increments the ticket id after every mint",
        fn(chain: Chain, accounts: Map<string, Account>) {
            setup(chain, accounts);
            const caller = accounts.get('wallet_3')!;
            const block = chain.mineBlock([
                Tx.contractCall('felix-test', 'mint', [types.principal(caller.address)], caller.address),
                Tx.contractCall('felix-test', 'mint', [types.principal(caller.address)], caller.address),
                Tx.contractCall('felix-test', 'mint', [types.principal(caller.address)], caller.address)
            ]);
            block.receipts[0].result.expectOk().expectUint(1);
            block.receipts[1].result.expectOk().expectUint(2);
            block.receipts[2].result.expectOk().expectUint(3);
        },
    });

    Clarinet.test({
        name: "Throws an error if all tickets were already sold",
        fn(chain: Chain, accounts: Map<string, Account>) {
            setup(chain, accounts);
            const caller = accounts.get('wallet_3')!;
            const block = chain.mineBlock([
                ...range(0, 101).map(
                    () => Tx.contractCall('felix-test', 'mint', [types.principal(caller.address)], caller.address)),
            ]);
            block.receipts[99].result.expectOk().expectUint(100);
            block.receipts[100].result.expectErr();
        }
    });

    Clarinet.test({
        name: "Transfers the ticket price from the sender to the contract on mint",
        fn(chain: Chain, accounts: Map<string, Account>) {
            setup(chain, accounts);
            const lotteryCreator = accounts.get('deployer')!;
            const caller = accounts.get('wallet_3')!;
            const block = chain.mineBlock([
                Tx.contractCall('felix-test', 'mint', [types.principal(caller.address)], caller.address),
            ]);
            block.receipts[0].events.expectSTXTransferEvent(97, caller.address, `${lotteryCreator.address}.felix-test`);
        }
    });

    Clarinet.test({
        name: "Transfers the fee price from the sender to the main Felix address on mint",
        fn(chain: Chain, accounts: Map<string, Account>) {
            setup(chain, accounts);
            const caller = accounts.get('wallet_3')!;
            const felix = accounts.get('wallet_9')!;
            const block = chain.mineBlock([
                Tx.contractCall('felix-test', 'mint', [types.principal(caller.address)], caller.address),
            ]);
            block.receipts[0].events.expectSTXTransferEvent(3, caller.address, felix.address);
        }
    });

    Clarinet.test({
        name: "Mints a token on mint",
        fn(chain: Chain, accounts: Map<string, Account>) {
            setup(chain, accounts);
            const caller = accounts.get('wallet_3')!;
            const block = chain.mineBlock([
                Tx.contractCall('felix-test', 'mint', [types.principal(caller.address)], caller.address),
            ]);
            block.receipts[0].events.expectNonFungibleTokenMintEvent(types.uint(1), caller.address, accounts.get('deployer')?.address + '.felix-test', 'felixes');
        }
    });

    // /**
    //  * get-token-uri
    //  */
    Clarinet.test({
        name: "Returns the token URI",
        fn(chain: Chain, accounts: Map<string, Account>) {
            setup(chain, accounts);
            const minter = accounts.get('wallet_3')!;
            const caller = accounts.get('wallet_7')!;
            const block = chain.mineBlock([
                Tx.contractCall('felix-test', 'mint', [types.principal(minter.address)], minter.address),
                Tx.contractCall('felix-test', 'get-token-uri', [types.uint(1)], caller.address)
            ]);
            block.receipts[1].result.expectOk().expectNone();
        }
    });

    /**
     * get-owner
     */
    Clarinet.test({
        name: "Returns the token owner",
        fn(chain: Chain, accounts: Map<string, Account>) {
            setup(chain, accounts);
            const minter = accounts.get('wallet_3')!;
            const caller = accounts.get('wallet_7')!;
            const block = chain.mineBlock([
                Tx.contractCall('felix-test', 'mint', [types.principal(minter.address)], minter.address),
                Tx.contractCall('felix-test', 'get-owner', [types.uint(1)], caller.address)
            ]);
            block.receipts[1].result.expectOk().expectSome().expectPrincipal(minter.address);
        }
    });

    /**
     * transfer
     */
    Clarinet.test({
        name: "Transfers the token owner if the owner is requesting it",
        fn(chain: Chain, accounts: Map<string, Account>) {
            setup(chain, accounts);
            const minter = accounts.get('wallet_3')!;
            const caller = accounts.get('wallet_7')!;
            const block = chain.mineBlock([
                Tx.contractCall('felix-test', 'mint', [types.principal(minter.address)], minter.address),
                Tx.contractCall('felix-test', 'get-owner', [types.uint(1)], caller.address)
            ]);
            block.receipts[1].result.expectOk().expectSome().expectPrincipal(minter.address);
        }
    });

    /**
     * get-last-token-id
     */
    Clarinet.test({
        name: "Returns the last token id",
        fn(chain: Chain, accounts: Map<string, Account>) {
            setup(chain, accounts);
            const minter = accounts.get('wallet_3')!;
            const block = chain.mineBlock([
                Tx.contractCall('felix-test', 'mint', [types.principal(minter.address)], minter.address),
                Tx.contractCall('felix-test', 'mint', [types.principal(minter.address)], minter.address),
                Tx.contractCall('felix-test', 'mint', [types.principal(minter.address)], minter.address),
                Tx.contractCall('felix-test', 'get-last-token-id', [], minter.address),
            ]);
            block.receipts[3].result.expectOk().expectUint(3);
        }
    });

    /**
     * fund
     */
    Clarinet.test({
        name: "Allows deployer to fund the contract with the slot size",
        fn(chain: Chain, accounts: Map<string, Account>) {
            setup(chain, accounts);
            const deployer = accounts.get('deployer')!;
            const block = chain.mineBlock([
                Tx.contractCall('felix-test', 'fund', [], deployer.address),
            ]);
            block.receipts[0].result.expectOk().expectUint(slotSize);
            block.receipts[0].events.expectSTXTransferEvent(slotSize, deployer.address, `${deployer.address}.felix-test`);
        }
    });
})();