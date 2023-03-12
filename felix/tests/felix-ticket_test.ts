
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.4.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';
import { range } from './helpers.ts';

/**
 * mint
 */
Clarinet.test({
    name: "Allows users to mint tickets for a given principle",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const caller = accounts.get('wallet_3')!;
        assertEquals(caller.balance, 100000000000000);
        const block = chain.mineBlock([
            Tx.contractCall('felix-ticket', 'mint', [types.principal(caller.address)], caller.address)
        ]);
        assertEquals(block.receipts[0].result, types.ok(types.uint(1)));
        const block2 = chain.mineBlock([
            Tx.contractCall('felix-ticket', 'get-owner', [], caller.address)
        ]);
        assertEquals(block2.receipts[0].result, types.ok(types.principal(caller.address)));
    },
});

Clarinet.test({
    name: "Increments the ticket id after every mint",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const caller = accounts.get('wallet_3')!;
        const block = chain.mineBlock([
            Tx.contractCall('felix-ticket', 'mint', [types.principal(caller.address)], caller.address),
            Tx.contractCall('felix-ticket', 'mint', [types.principal(caller.address)], caller.address),
            Tx.contractCall('felix-ticket', 'mint', [types.principal(caller.address)], caller.address)
        ]);
        assertEquals(block.receipts[0].result, types.ok(types.uint(1)));
        assertEquals(block.receipts[1].result, types.ok(types.uint(2)));
        assertEquals(block.receipts[2].result, types.ok(types.uint(3)));
    },
});

Clarinet.test({
    name: "Throws an error if all tickets were already sold",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const caller = accounts.get('wallet_3')!;
        const block = chain.mineBlock([
            ...range(0, 101).map(
                () => Tx.contractCall('felix-ticket', 'mint', [types.principal(caller.address)], caller.address)),
        ]);
        assertEquals(block.receipts[99].result, types.ok(types.uint(100)));
        block.receipts[100].result.expectErr();
    }
});

Clarinet.test({
    name: "Transfers the ticket price from the sender to the contract on mint",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const lotteryCreator = accounts.get('deployer')!;
        const caller = accounts.get('wallet_3')!;
        const block = chain.mineBlock([
            Tx.contractCall('felix-ticket', 'mint', [types.principal(caller.address)], caller.address),
        ]);
        block.receipts[1].events.expectSTXTransferEvent(97, caller.address, `${lotteryCreator.address}.felix-ticket`);
    }
});

Clarinet.test({
    name: "Transfers the fee price from the sender to the main Felix address on mint",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const caller = accounts.get('wallet_3')!;
        const felix = accounts.get('wallet_9')!;
        const block = chain.mineBlock([
            Tx.contractCall('felix-ticket', 'mint', [types.principal(caller.address)], caller.address),
        ]);
        block.receipts[0].events.expectSTXTransferEvent(3, caller.address, felix.address);
    }
});

Clarinet.test({
    name: "Mints a token on mint",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const caller = accounts.get('wallet_3')!;
        const block = chain.mineBlock([
            Tx.contractCall('felix-ticket', 'mint', [types.principal(caller.address)], caller.address),
        ]);
        block.receipts[0].events.expectNonFungibleTokenMintEvent(types.uint(1), caller.address, accounts.get('deployer')?.address + '.felix-ticket', 'felixes');
    }
});

/**
 * get-token-uri
 */
Clarinet.test({
    name: "Returns the token URI",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const minter = accounts.get('wallet_3')!;
        const caller = accounts.get('wallet_7')!;
        const block = chain.mineBlock([
            Tx.contractCall('felix-ticket', 'mint', [types.principal(minter.address)], minter.address),
            Tx.contractCall('felix-ticket', 'get-token-uri', [types.uint(1)], caller.address)
        ]);
        assertEquals(block.receipts[1].result, types.ok(types.none()));
    }
});

/**
 * get-owner
 */
Clarinet.test({
    name: "Returns the token owner",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const minter = accounts.get('wallet_3')!;
        const caller = accounts.get('wallet_7')!;
        const block = chain.mineBlock([
            Tx.contractCall('felix-ticket', 'mint', [types.principal(minter.address)], minter.address),
            Tx.contractCall('felix-ticket', 'get-owner', [types.uint(1)], caller.address)
        ]);
        assertEquals(block.receipts[1].result, types.ok(types.some(minter.address)));
    }
});

/**
 * transfer
 */
Clarinet.test({
    name: "Transfers the token owner if the owner is requesting it",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const minter = accounts.get('wallet_3')!;
        const caller = accounts.get('wallet_7')!;
        const block = chain.mineBlock([
            Tx.contractCall('felix-ticket', 'mint', [types.principal(minter.address)], minter.address),
            Tx.contractCall('felix-ticket', 'get-owner', [types.uint(1)], caller.address)
        ]);
        assertEquals(block.receipts[1].result, types.ok(types.some(minter.address)));
    }
});

/**
 * get-last-token-id
 */
Clarinet.test({
    name: "Returns the last token id",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const minter = accounts.get('wallet_3')!;
        const block = chain.mineBlock([
            Tx.contractCall('felix-ticket', 'mint', [types.principal(minter.address)], minter.address),
            Tx.contractCall('felix-ticket', 'mint', [types.principal(minter.address)], minter.address),
            Tx.contractCall('felix-ticket', 'mint', [types.principal(minter.address)], minter.address),
            Tx.contractCall('felix-ticket', 'get-last-token-id', [], minter.address),
        ]);
        assertEquals(block.receipts[3].result, types.ok(types.uint(3)));
    }
});

/**
 * fund
 */
Clarinet.test({
    name: "Allows deployer to fund the contract with the slot size",
    fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const slotSize = 1000000000;
        const block = chain.mineBlock([
            Tx.contractCall('felix-ticket', 'fund', [], deployer.address),
        ]);
        assertEquals(block.receipts[0].result, types.ok(types.uint(slotSize)));
        block.receipts[0].events.expectSTXTransferEvent(slotSize, deployer.address, `${deployer.address}.felix-ticket`);
    }
});